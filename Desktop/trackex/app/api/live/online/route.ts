/**
 * Live View API Endpoint
 *
 * Provides real-time data for the Live View dashboard:
 * - Online employees (currently active)
 * - Recently finished sessions (today)
 * - Today's active/idle time totals
 *
 * Optimization Strategy:
 * - Multi-tier caching (Memory → Redis → Database)
 * - Optimized database queries with proper indexes
 * - Parallelized queries for fast response times
 * - Rate limiting (120 req/min per user, 1000 req/min global)
 * - Circuit breaker (fail fast on errors)
 * - Request deduplication (coalesce concurrent requests)
 * - Graceful fallback on errors
 *
 * Performance Targets:
 * - P95 response time: <200ms
 * - Cache hit rate: >80%
 * - Error rate: <0.5%
 */

import { prisma } from "@/lib/db"
import { checkEmployeeLicenseStatus } from "@/lib/licensing"
import { getLiveCacheService } from "@/lib/services/live-cache.service"
import { getRateLimitService } from "@/lib/services/rate-limiter.service"
import { requireTenantContext } from "@/lib/tenant-context"
import { AppInfo, categorizeApp } from "@/lib/utils/categories"
import { AppRule, DomainRule } from "@prisma/client"
import { subHours } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Online employee data structure
 */
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
  productivityStatus: "idle" | "productive" | "neutral" | "unproductive"
  lastSeen: string
}

/**
 * Finished session data structure
 */
interface FinishedSession {
  sessionId: string
  employeeName: string
  employeeEmail: string
  team: { name: string } | null
  device: {
    platform: string
    deviceName: string
  }
  totalWork: number
  clockIn: string
  clockOut: string
  activeTime: number
  idleTime: number
}

/**
 * Live view response structure
 */
interface LiveViewResponse {
  online: OnlineEmployee[]
  finishedSessions: FinishedSession[]
  totalActiveTime: number
  totalIdleTime: number
  lastUpdated: string
}

/**
 * GET /api/live/online
 *
 * Returns live data for the dashboard with multi-tier caching,
 * rate limiting, and request deduplication
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now()

  try {
    // Authenticate and get tenant context with organization scope
    const context = await requireTenantContext()
    const { organizationId } = context
    const userId = context.user?.email || context.user?.id || "anonymous"

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("teamId") || "all"

    // Rate limiting and request deduplication (include orgId in cache key)
    const rateLimitService = getRateLimitService()
    const deduplicationKey = `live:online:${organizationId}:${teamId}:${userId}`

    const result = await rateLimitService.executeWithProtection(
      userId,
      deduplicationKey,
      async () => {
        // Try cache first (L1 Memory → L2 Redis) - include orgId in cache key
        const cacheKey = `live:online:${organizationId}:${teamId}`
        const cacheService = getLiveCacheService()
        const cached = await cacheService.get<LiveViewResponse>(cacheKey)

        if (cached) {
          const responseTime = Date.now() - startTime
          console.log(
            `[LiveView] Cache hit for org=${organizationId} team=${teamId}, responseTime=${responseTime}ms`
          )
          return cached
        }

        // Cache miss - query database
        console.log(
          `[LiveView] Cache miss for org=${organizationId} team=${teamId}, querying database`
        )

        // Parallelize all queries for optimal performance - pass organizationId
        const [
          onlineDevices,
          todayStats,
          recentSessions,
          appRules,
          domainRules,
        ] = await Promise.all([
          queryOnlineDevices(teamId, organizationId),
          queryTodayStatistics(teamId, organizationId),
          queryRecentFinishedSessions(teamId, organizationId),
          prisma.appRule.findMany({
            where: {
              isActive: true,
              OR: [{ organizationId }, { isGlobal: true }],
            },
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          }),
          prisma.domainRule.findMany({
            where: {
              isActive: true,
              OR: [{ organizationId }, { isGlobal: true }],
            },
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
          }),
        ])

        // Format response
        const response: LiveViewResponse = {
          online: await formatOnlineEmployees(
            onlineDevices,
            appRules,
            domainRules
          ),
          finishedSessions: formatFinishedSessions(recentSessions),
          totalActiveTime: todayStats.totalActiveTime,
          totalIdleTime: todayStats.totalIdleTime,
          lastUpdated: new Date().toISOString(),
        }

        // Store in cache for future requests
        await cacheService.set(cacheKey, response)

        const responseTime = Date.now() - startTime
        console.log(
          `[LiveView] Database query completed for team=${teamId}, ` +
            `online=${response.online.length}, finished=${response.finishedSessions.length}, ` +
            `responseTime=${responseTime}ms`
        )

        return response
      }
    )

    // Handle rate limit exceeded
    if (!result.success) {
      const responseTime = Date.now() - startTime
      console.warn(
        `[LiveView] ${result.error} for user=${userId}, team=${teamId}, responseTime=${responseTime}ms`
      )

      return NextResponse.json(
        {
          online: [],
          finishedSessions: [],
          totalActiveTime: 0,
          totalIdleTime: 0,
          lastUpdated: new Date().toISOString(),
          error: result.error,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": result.rateLimit.limit.toString(),
            "X-RateLimit-Remaining": result.rateLimit.remaining.toString(),
            "X-RateLimit-Reset": new Date(result.rateLimit.reset).toISOString(),
            "Retry-After": "60", // Retry after 60 seconds
          },
        }
      )
    }

    // Success - return data with rate limit headers
    return NextResponse.json(result.data, {
      headers: {
        "X-RateLimit-Limit": result.rateLimit.limit.toString(),
        "X-RateLimit-Remaining": result.rateLimit.remaining.toString(),
        "X-RateLimit-Reset": new Date(result.rateLimit.reset).toISOString(),
      },
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    console.error(
      "[LiveView] Error fetching live data:",
      error,
      `responseTime=${responseTime}ms`
    )

    // Check if circuit breaker is open
    const circuitState = getRateLimitService().getCircuitState()
    const isCircuitOpen = circuitState === "OPEN"

    // Return minimal safe response on error
    return NextResponse.json(
      {
        online: [],
        finishedSessions: [],
        totalActiveTime: 0,
        totalIdleTime: 0,
        lastUpdated: new Date().toISOString(),
        error: isCircuitOpen
          ? "Service temporarily unavailable. Circuit breaker is open."
          : "Failed to fetch live data",
      },
      { status: isCircuitOpen ? 503 : 500 }
    )
  }
}

/**
 * Query online devices (employees currently active)
 *
 * IMPORTANT: Only shows employees who are BOTH:
 * 1. Have an active work session (clocked in within last 24 hours, not clocked out)
 * 2. Device was seen within last 5 minutes
 *
 * The 24-hour filter is a defensive measure to prevent very old orphaned sessions
 * from incorrectly showing employees as "Online Now". The primary cleanup happens
 * during device registration, but this provides an additional safety net.
 *
 * Uses optimized index: Device(lastSeen, isActive, employeeId)
 * Filters: lastSeen within 5 minutes, isActive = true, has active session within 24h
 */
async function queryOnlineDevices(teamId: string, organizationId: string) {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const twentyFourHoursAgo = subHours(new Date(), 24)

  // First, get all employees with active work sessions (clocked in but not clocked out)
  // Filter to sessions created within last 24 hours to exclude very old orphaned sessions
  const activeSessionEmployeeIds = await prisma.workSession.findMany({
    where: {
      clockOut: null, // Active session (not clocked out)
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
    },
  })

  const activeEmployeeIds = activeSessionEmployeeIds.map((s) => s.employeeId)

  // If no active sessions, return empty array immediately
  if (activeEmployeeIds.length === 0) {
    return []
  }

  // Now get devices for employees with active sessions
  const devices = await prisma.device.findMany({
    where: {
      lastSeen: {
        gte: fiveMinutesAgo,
      },
      isActive: true,
      employeeId: {
        in: activeEmployeeIds, // Only employees with active work sessions
      },
    },
    include: {
      employee: {
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      lastSeen: "desc",
    },
  })

  return devices
}

/**
 * Query today's statistics (active/idle time totals)
 *
 * Calculates time from:
 * 1. Completed WorkSessions (using stored activeTime/idleTime)
 * 2. Active sessions: Calculate LIVE from AppUsage records
 *
 * This ensures we show real-time statistics for employees currently working
 */
async function queryTodayStatistics(teamId: string, organizationId: string) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // Get completed sessions (already have calculated times)
  const completedSessions = await prisma.workSession.findMany({
    where: {
      clockIn: {
        gte: startOfToday,
      },
      clockOut: {
        not: null, // Only completed sessions
      },
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
  })

  // Sum from completed sessions
  const completedActiveTime = completedSessions.reduce(
    (sum, session) => sum + (session.activeTime || 0),
    0
  )
  const completedIdleTime = completedSessions.reduce(
    (sum, session) => sum + (session.idleTime || 0),
    0
  )

  // Get active sessions (currently clocked in)
  const activeSessions = await prisma.workSession.findMany({
    where: {
      clockIn: {
        gte: startOfToday,
      },
      clockOut: null, // Active sessions only
      employee: {
        isActive: true,
        organizationId, // Scope to organization
        ...(teamId !== "all" ? { teamId } : {}),
      },
    },
    select: {
      id: true,
      employeeId: true,
      deviceId: true,
      clockIn: true,
    },
  })

  // Calculate live time from AppUsage for active sessions
  let liveActiveTime = 0
  let liveIdleTime = 0

  if (activeSessions.length > 0) {
    // Get AppUsage records for all active session employees since their clock-in
    const employeeIds = activeSessions.map((s) => s.employeeId)
    const deviceIds = activeSessions.map((s) => s.deviceId)

    // Create a map of employee+device to clock-in time for filtering
    const sessionMap = new Map(
      activeSessions.map((s) => [`${s.employeeId}:${s.deviceId}`, s.clockIn])
    )

    // Query AppUsage for all active employees today
    const appUsageRecords = await prisma.appUsage.findMany({
      where: {
        employeeId: { in: employeeIds },
        deviceId: { in: deviceIds },
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

    // Calculate time only for records after the employee's clock-in
    for (const record of appUsageRecords) {
      const clockInTime = sessionMap.get(
        `${record.employeeId}:${record.deviceId}`
      )
      if (clockInTime && record.startTime >= clockInTime) {
        if (record.isIdle) {
          liveIdleTime += record.duration
        } else {
          liveActiveTime += record.duration
        }
      }
    }
  }

  return {
    totalActiveTime: completedActiveTime + liveActiveTime,
    totalIdleTime: completedIdleTime + liveIdleTime,
  }
}

/**
 * Query recently finished sessions (last 10 completed today)
 *
 * Uses optimized index: WorkSession(clockOut, clockIn, employeeId)
 * Filters: clockOut IS NOT NULL, clockIn >= today
 */
async function queryRecentFinishedSessions(
  teamId: string,
  organizationId: string
) {
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const sessions = await prisma.workSession.findMany({
    where: {
      clockOut: {
        not: null,
        gte: startOfToday,
      },
      employee: {
        isActive: true,
        organizationId, // Scope to organization
        ...(teamId !== "all" ? { teamId } : {}),
      },
    },
    include: {
      employee: {
        include: {
          team: {
            select: {
              name: true,
            },
          },
        },
      },
      device: {
        select: {
          platform: true,
          deviceName: true,
        },
      },
    },
    orderBy: {
      clockOut: "desc",
    },
    take: 10,
  })

  return sessions
}

/**
 * Format online devices to match expected frontend structure
 */
interface CurrentAppData {
  name?: string
  window_title?: string
  url?: string
  domain?: string
  is_idle?: boolean
}

async function formatOnlineEmployees(
  devices: Array<{
    id: string
    platform: string
    deviceName: string
    currentApp: string | null
    lastSeen: Date | null
    employee: {
      id: string
      name: string
      email: string
      team: { name: string } | null
    }
  }>,
  appRules: AppRule[],
  domainRules: DomainRule[]
): Promise<OnlineEmployee[]> {
  // Fetch license tier data for all employees in parallel
  const employeeIds = devices.map((d) => d.employee.id)
  const licenseChecks = await Promise.all(
    employeeIds.map((id) => checkEmployeeLicenseStatus(id))
  )
  const licenseMap = new Map(
    employeeIds.map((id, index) => [id, licenseChecks[index]])
  )

  return devices.map((device) => {
    // Parse currentApp JSON if available
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
        // This flag is set by handleIdleChange (events) or heartbeat handler
        isIdle = parsed.is_idle === true
        currentApp = {
          name: parsed.name || "Unknown",
          window_title: parsed.window_title,
          url: parsed.url,
          domain: parsed.domain,
        }
      } catch (error) {
        console.error("[LiveView] Error parsing currentApp JSON:", error)
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
      console.log(
        `[LiveView] Employee ${device.employee.id} (${device.employee.name}): is_idle=true, productivityStatus=idle`
      )
    } else if (currentApp) {
      // User is active - categorize based on current app
      const appInfo: AppInfo = {
        name: currentApp.name,
        windowTitle: currentApp.window_title,
        domain: currentApp.domain,
      }
      const category = categorizeApp(appInfo, appRules, domainRules)
      // Map AppCategory to productivityStatus (lowercase for frontend)
      productivityStatus = category.toLowerCase() as
        | "productive"
        | "neutral"
        | "unproductive"
    }

    // Get license tier info for this employee
    const licenseInfo = licenseMap.get(device.employee.id)
    const licenseTier =
      (licenseInfo?.licenseTier as "STARTER" | "TEAM" | null) || null
    const canRequestScreenshot = licenseTier === "TEAM"

    return {
      employeeId: device.employee.id,
      employeeName: device.employee.name,
      employeeEmail: device.employee.email,
      team: device.employee.team,
      platform: device.platform,
      deviceId: device.id,
      deviceName: device.deviceName,
      currentApp,
      status: "online",
      productivityStatus,
      lastSeen: device.lastSeen?.toISOString() || new Date().toISOString(),
      licenseTier,
      canRequestScreenshot,
    }
  })
}

/**
 * Format finished sessions to match expected frontend structure
 */
function formatFinishedSessions(sessions: any[]): FinishedSession[] {
  return sessions.map((session) => ({
    sessionId: session.id,
    employeeName: session.employee.name,
    employeeEmail: session.employee.email,
    team: session.employee.team,
    device: {
      platform: session.device.platform,
      deviceName: session.device.deviceName,
    },
    totalWork: session.totalWork || 0,
    clockIn: session.clockIn.toISOString(),
    clockOut: session.clockOut?.toISOString() || new Date().toISOString(),
    activeTime: session.activeTime || 0,
    idleTime: session.idleTime || 0,
  }))
}

/**
 * HEAD /api/live/online
 *
 * Lightweight connectivity probe used by the Live View client
 * Kept unauthenticated for fast health checks
 */
export async function HEAD() {
  return new NextResponse(null, { status: 204 })
}
