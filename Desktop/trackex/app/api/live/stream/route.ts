/**
 * Live View Stream API (Server-Sent Events)
 *
 * Provides real-time updates for the Live View dashboard using SSE.
 * This is more efficient than polling as the server pushes updates
 * only when there are changes.
 *
 * OPTIMIZATION: Now uses the same cache layer as /api/live/online
 * to avoid duplicate database queries. Previously, each SSE connection
 * polled the database independently every 3 seconds, which didn't scale.
 *
 * Usage:
 * - Connect: const eventSource = new EventSource('/api/live/stream?teamId=all')
 * - Listen: eventSource.onmessage = (event) => { const data = JSON.parse(event.data) }
 * - Close: eventSource.close()
 */

import { prisma } from "@/lib/db"
import { connections } from "@/lib/live-stream"
import { getLiveCacheService } from "@/lib/services/live-cache.service"
import { requireTenantContext } from "@/lib/tenant-context"
import { AppInfo, categorizeApp } from "@/lib/utils/categories"
import { AppRule, DomainRule } from "@prisma/client"
import { subHours } from "date-fns"
import { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Live view response structure (same as /api/live/online)
 */
interface LiveViewResponse {
  online: OnlineEmployee[]
  finishedSessions?: FinishedSession[]
  totalActiveTime: number
  totalIdleTime: number
  lastUpdated: string
}

interface OnlineEmployee {
  employeeId: string
  employeeName: string
  employeeEmail: string
  team: { name: string } | null
  platform: string
  deviceId: string
  deviceName: string
  currentApp: {
    name: string
    window_title?: string
    url?: string
    domain?: string
  } | null
  status: string
  productivityStatus?: string
  lastSeen: string
}

interface FinishedSession {
  sessionId: string
  employeeName: string
  employeeEmail: string
  team: { name: string } | null
  device: { platform: string; deviceName: string }
  totalWork: number
  clockIn: string
  clockOut: string
  activeTime: number
  idleTime: number
}

/**
 * GET /api/live/stream
 *
 * Establishes a Server-Sent Events connection for real-time updates
 */
export async function GET(req: NextRequest) {
  try {
    // Authenticate and get tenant context
    const context = await requireTenantContext()
    const { organizationId } = context

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("teamId") || "all"

    // Use orgId + teamId as connection key for proper isolation
    const connectionKey = `${organizationId}:${teamId}`

    // Create a readable stream for SSE
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        // Add this connection to the set for this org+team
        if (!connections.has(connectionKey)) {
          connections.set(connectionKey, new Set())
        }
        connections.get(connectionKey)!.add(controller)

        // Send initial connection message
        const connectMsg = `data: ${JSON.stringify({ type: "connected", teamId, timestamp: new Date().toISOString() })}\n\n`
        controller.enqueue(new TextEncoder().encode(connectMsg))

        // Start sending updates using the shared cache layer
        let updateCount = 0
        const intervalId = setInterval(async () => {
          try {
            const data = await fetchLiveDataWithCache(teamId, organizationId)
            // Log idle employees for debugging (only every 5 updates to reduce noise)
            updateCount++
            if (updateCount % 5 === 0) {
              const idleEmployees = data.online.filter(
                (e: OnlineEmployee) => e.productivityStatus === "idle"
              )
              if (idleEmployees.length > 0) {
                console.log(
                  `[LiveStream] Sending ${idleEmployees.length} idle employees:`,
                  idleEmployees
                    .map((e: OnlineEmployee) => e.employeeName)
                    .join(", ")
                )
              }
            }
            const message = `data: ${JSON.stringify({ type: "update", ...data })}\n\n`
            controller.enqueue(new TextEncoder().encode(message))
          } catch (error) {
            console.error("[LiveStream] Error fetching data:", error)
            const errorMsg = `data: ${JSON.stringify({ type: "error", message: "Failed to fetch data" })}\n\n`
            controller.enqueue(new TextEncoder().encode(errorMsg))
          }
        }, 3000) // Update every 3 seconds

        // Cleanup on close
        req.signal.addEventListener("abort", () => {
          clearInterval(intervalId)
          connections.get(connectionKey)?.delete(controller)
          if (connections.get(connectionKey)?.size === 0) {
            connections.delete(connectionKey)
          }
          try {
            controller.close()
          } catch {
            // Controller may already be closed
          }
        })
      },
      cancel() {
        // Connection was closed by the client
        console.log("[LiveStream] Connection closed by client")
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // Disable nginx buffering
      },
    })
  } catch (error) {
    console.error("[LiveStream] Error:", error)
    return new Response(
      JSON.stringify({ error: "Failed to establish stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}

/**
 * Fetch live data using the shared cache layer.
 *
 * OPTIMIZATION: Uses the same cache as /api/live/online to avoid
 * duplicate database queries. With 10 dashboard users, this means
 * 10 cache hits instead of 10 independent DB query sets per 3 seconds.
 */
async function fetchLiveDataWithCache(
  teamId: string,
  organizationId: string
): Promise<LiveViewResponse> {
  const cacheKey = `live:online:${organizationId}:${teamId}`
  const cacheService = getLiveCacheService()

  // Try cache first
  const cached = await cacheService.get<LiveViewResponse>(cacheKey)
  if (cached) {
    return cached
  }

  // Cache miss - query database (same logic as /api/live/online)
  const data = await fetchLiveDataFromDatabase(teamId, organizationId)

  // Store in cache for other SSE connections and /api/live/online requests
  await cacheService.set(cacheKey, data)

  return data
}

/**
 * Fetch live data directly from database (on cache miss)
 */
async function fetchLiveDataFromDatabase(
  teamId: string,
  organizationId: string
): Promise<LiveViewResponse> {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const twentyFourHoursAgo = subHours(new Date(), 24)
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // Parallelize queries for better performance
  const [activeSessionEmployeeIds, completedSessions] = await Promise.all([
    // Get active sessions
    // Filter to sessions created within last 24 hours to exclude very old orphaned sessions
    prisma.workSession.findMany({
      where: {
        clockOut: null,
        clockIn: {
          gte: twentyFourHoursAgo, // Defensive: only sessions from last 24 hours
        },
        employee: {
          isActive: true,
          organizationId, // Scope to organization
          ...(teamId !== "all" ? { teamId } : {}),
        },
      },
      select: {
        employeeId: true,
        deviceId: true,
        clockIn: true,
      },
    }),
    // Get completed sessions from today
    prisma.workSession.findMany({
      where: {
        clockIn: { gte: startOfToday },
        clockOut: { not: null },
        employee: {
          isActive: true,
          organizationId, // Scope to organization
          ...(teamId !== "all" ? { teamId } : {}),
        },
      },
      select: {
        activeTime: true,
        idleTime: true,
      },
    }),
  ])

  const activeEmployeeIds = activeSessionEmployeeIds.map((s) => s.employeeId)

  // Get online devices, app usage, app rules, and domain rules in parallel
  const [devices, appUsageRecords, appRules, domainRules] = await Promise.all([
    activeEmployeeIds.length > 0
      ? prisma.device.findMany({
          where: {
            lastSeen: { gte: fiveMinutesAgo },
            isActive: true,
            employeeId: { in: activeEmployeeIds },
          },
          include: {
            employee: {
              include: {
                team: { select: { name: true } },
              },
            },
          },
          orderBy: { lastSeen: "desc" },
        })
      : Promise.resolve([]),
    activeSessionEmployeeIds.length > 0
      ? prisma.appUsage.findMany({
          where: {
            employeeId: {
              in: activeSessionEmployeeIds.map((s) => s.employeeId),
            },
            deviceId: { in: activeSessionEmployeeIds.map((s) => s.deviceId) },
            startTime: { gte: startOfToday },
          },
          select: {
            employeeId: true,
            deviceId: true,
            startTime: true,
            duration: true,
            isIdle: true,
          },
        })
      : Promise.resolve([]),
    // Fetch app rules for productivity categorization (org-specific + global)
    prisma.appRule.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId }, { isGlobal: true }],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
    // Fetch domain rules for productivity categorization (higher priority than app rules)
    prisma.domainRule.findMany({
      where: {
        isActive: true,
        OR: [{ organizationId }, { isGlobal: true }],
      },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    }),
  ])

  // Calculate today's time from AppUsage for active sessions
  let totalActiveTime = 0
  let totalIdleTime = 0

  if (activeSessionEmployeeIds.length > 0) {
    const sessionMap = new Map(
      activeSessionEmployeeIds.map((s) => [
        `${s.employeeId}:${s.deviceId}`,
        s.clockIn,
      ])
    )

    for (const record of appUsageRecords) {
      const clockInTime = sessionMap.get(
        `${record.employeeId}:${record.deviceId}`
      )
      if (clockInTime && record.startTime >= clockInTime) {
        if (record.isIdle) {
          totalIdleTime += record.duration
        } else {
          totalActiveTime += record.duration
        }
      }
    }
  }

  // Add completed sessions from today
  for (const session of completedSessions) {
    totalActiveTime += session.activeTime || 0
    totalIdleTime += session.idleTime || 0
  }

  // Type for parsed currentApp JSON
  interface CurrentAppData {
    name?: string
    window_title?: string
    url?: string
    domain?: string
    is_idle?: boolean
  }

  // Format online employees
  const online: OnlineEmployee[] = devices.map((device) => {
    let currentApp: {
      name: string
      window_title?: string
      url?: string
      domain?: string
    } | null = null
    let isIdle = false

    if (device.currentApp) {
      try {
        const parsed = JSON.parse(device.currentApp) as CurrentAppData
        // CRITICAL: Check is_idle flag from the stored data
        isIdle = parsed.is_idle === true
        currentApp = {
          name: parsed.name || "Unknown",
          window_title: parsed.window_title,
          url: parsed.url,
          domain: parsed.domain,
        }
      } catch {
        // Ignore parse errors
      }
    }

    // Determine productivity status
    // PRIORITY: If user is idle, always show "idle" status regardless of current app
    // This ensures idle employees are visible with the correct yellow styling
    let productivityStatus: "idle" | "productive" | "neutral" | "unproductive" =
      "neutral"
    if (isIdle) {
      // User is idle - override any app categorization
      productivityStatus = "idle"
    } else if (currentApp) {
      // User is active - categorize based on current app
      const appInfo: AppInfo = {
        name: currentApp.name,
        windowTitle: currentApp.window_title,
        domain: currentApp.domain,
      }
      const category = categorizeApp(
        appInfo,
        appRules as AppRule[],
        domainRules as DomainRule[]
      )
      // Map AppCategory to productivityStatus (lowercase for frontend)
      productivityStatus = category.toLowerCase() as
        | "productive"
        | "neutral"
        | "unproductive"
    }

    return {
      employeeId: device.employee.id,
      employeeName: device.employee.name,
      employeeEmail: device.employee.email,
      team: device.employee.team,
      platform: device.platform,
      deviceId: device.id,
      deviceName: device.deviceName,
      currentApp,
      status: "online" as const,
      productivityStatus,
      lastSeen: device.lastSeen?.toISOString() || new Date().toISOString(),
    }
  })

  return {
    online,
    totalActiveTime,
    totalIdleTime,
    lastUpdated: new Date().toISOString(),
  }
}
