/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireDeviceAuth } from "@/lib/auth/device"
import { batchEventsSchema } from "@/lib/validations/device"
import { getRealtimeStore } from "@/lib/realtime/store"
import { categorizeApp, AppInfo } from "@/lib/utils/categories"
import { AppRule, DomainRule } from "@prisma/client"
import { validateAgentVersion } from "@/lib/version-validator"
import { createTimeTrackingService } from "@/lib/services/time-tracking.service"
import { getLiveCacheService } from "@/lib/services/live-cache.service"

export const dynamic = 'force-dynamic'

// ===== PRIORITY EVENT TYPES =====
// These events bypass rate limiting as they are critical for time tracking
// Priority order: clock_in/clock_out > screenshot > idle changes > app_focus
const PRIORITY_EVENT_TYPES = new Set([
  'clock_in',      // Critical: Must always succeed for time tracking
  'clock_out',     // Critical: Must always succeed for time tracking  
  'screenshot_taken',  // High priority: User-initiated or scheduled capture
  'screenshot_failed', // High priority: Track failures for debugging
])

// ===== ADVANCED RATE LIMITING & CIRCUIT BREAKER =====
// Protects against misbehaving desktop apps without limiting legitimate usage
// Note: Priority events (clock_in, clock_out, screenshots) bypass rate limiting

interface RateLimitInfo {
  count: number
  resetTime: number
  violations: number // Track how many times limit was exceeded
  lastViolation: number
}

const rateLimits = new Map<string, RateLimitInfo>()
const MAX_EVENTS_PER_MINUTE = 200 // Generous limit for normal usage (increased from 100)
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute in milliseconds
const VIOLATION_THRESHOLD = 3 // How many violations before circuit breaker activates
const CIRCUIT_BREAKER_DURATION = 5 * 60 * 1000 // 5 minutes circuit breaker cooldown

function checkRateLimit(deviceId: string): { allowed: boolean; reason?: string } {
  const now = Date.now()
  const limit = rateLimits.get(deviceId)

  // Initialize if first request or window expired
  if (!limit || now > limit.resetTime) {
    rateLimits.set(deviceId, { 
      count: 1, 
      resetTime: now + RATE_LIMIT_WINDOW,
      violations: limit?.violations || 0,
      lastViolation: limit?.lastViolation || 0
    })
    return { allowed: true }
  }

  // Check if circuit breaker is active (device is temporarily blocked)
  if (limit.violations >= VIOLATION_THRESHOLD) {
    const circuitBreakerExpiry = limit.lastViolation + CIRCUIT_BREAKER_DURATION
    if (now < circuitBreakerExpiry) {
      const remainingMinutes = Math.ceil((circuitBreakerExpiry - now) / 60000)
      console.warn(`Circuit breaker active for device ${deviceId}. ${remainingMinutes} minutes remaining.`)
      return { 
        allowed: false, 
        reason: `Too many requests. Please wait ${remainingMinutes} minutes and restart the app.` 
      }
    } else {
      // Circuit breaker expired, reset violations
      limit.violations = 0
      limit.count = 1
      limit.resetTime = now + RATE_LIMIT_WINDOW
      return { allowed: true }
    }
  }

  // Check rate limit
  if (limit.count >= MAX_EVENTS_PER_MINUTE) {
    limit.violations++
    limit.lastViolation = now
    console.warn(`Rate limit exceeded for device ${deviceId}. Violation count: ${limit.violations}/${VIOLATION_THRESHOLD}`)
    return { 
      allowed: false, 
      reason: `Rate limit exceeded. Maximum ${MAX_EVENTS_PER_MINUTE} events per minute.` 
    }
  }

  // Increment count and allow
  limit.count++
  return { allowed: true }
}

// Cleanup old rate limit entries on-demand (probabilistic cleanup)
// This avoids setInterval memory leaks in serverless environments
function cleanupRateLimits() {
  // Only cleanup 1% of requests to minimize overhead
  if (Math.random() < 0.01) {
    const now = Date.now()
    let cleaned = 0
    for (const [deviceId, limit] of rateLimits.entries()) {
      // Remove entries that haven't been accessed in 10 minutes
      if (now > limit.resetTime + (10 * 60 * 1000)) {
        rateLimits.delete(deviceId)
        cleaned++
      }
    }
    if (cleaned > 0) {
      console.log(`Rate limit cleanup: removed ${cleaned} expired entries`)
    }
  }
}

// --- Helper Functions ---

async function getActiveAppRules() {
  return prisma.appRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })
}

async function getActiveDomainRules() {
  return prisma.domainRule.findMany({
    where: { isActive: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  })
}

function categorizeAppFromEventData(eventData: Record<string, unknown>, appRules: AppRule[], domainRules: DomainRule[] = []): string {
  const appInfo: AppInfo = {
    name: (eventData.app_name as string) || "Unknown App",
    windowTitle: (eventData.window_title as string) || undefined,
    process: (eventData.process as string) || undefined,
    domain: (eventData.domain as string) || undefined,
  }
  // Domain rules take priority over app rules for browser activity
  return categorizeApp(appInfo, appRules, domainRules)
}

// --- Transactional Event Handlers ---

async function handleClockIn(tx: any, device: any, event: any) {
  await tx.workSession.create({
    data: {
      employeeId: device.employeeId,
      deviceId: device.id,
      clockIn: new Date(event.timestamp),
    },
  })
  return "set" as const
}

async function handleClockOut(tx: any, device: any, event: any) {
  const activeSession = await tx.workSession.findFirst({
    where: { employeeId: device.employeeId, deviceId: device.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  })

  if (!activeSession) return null

  const clockOutTime = new Date(event.timestamp)

  // Optimized: Close all open app_usage entries in a single batch operation
  // First, get all entries within this session (both open and closed) for end time calculation
  const allAppUsages = await tx.appUsage.findMany({
    where: {
      employeeId: device.employeeId,
      deviceId: device.id,
      startTime: { gte: activeSession.clockIn, lte: clockOutTime }
    },
    orderBy: { startTime: "asc" },
  })

  // Separate open entries from all entries
  const openAppUsages = allAppUsages.filter((usage: any) => usage.endTime === null)
  console.log(`Clock out: Found ${openAppUsages.length} open app usage entries to close`);

  if (openAppUsages.length > 0) {
    // Build sorted start times once for efficient lookup
    const sortedStartTimes = allAppUsages.map((u: any) => u.startTime.getTime()).sort((a: number, b: number) => a - b)
    
    // Prepare batch updates and deletes
    const toUpdate: { id: string; endTime: Date; duration: number }[] = []
    const toDelete: string[] = []

    for (const openAppUsage of openAppUsages) {
      const currentStartTime = openAppUsage.startTime.getTime()
      
      // Binary search for next start time (more efficient than findIndex for large arrays)
      let nextStartTime: number | null = null
      for (const time of sortedStartTimes) {
        if (time > currentStartTime) {
          nextStartTime = time
          break
        }
      }
      
      const endTime = nextStartTime ? new Date(nextStartTime) : clockOutTime
      const duration = Math.floor((endTime.getTime() - currentStartTime) / 1000)
      
      if (duration >= 0) {
        toUpdate.push({ id: openAppUsage.id, endTime, duration })
      } else {
        toDelete.push(openAppUsage.id)
        console.log(`Clock out: Marking invalid entry for ${openAppUsage.appName} for deletion (negative duration: ${duration}s)`);
      }
    }

    // Execute batch operations in parallel for better performance
    const operations: Promise<any>[] = []
    
    // Batch update valid entries
    for (const update of toUpdate) {
      operations.push(
        tx.appUsage.update({
          where: { id: update.id },
          data: { endTime: update.endTime, duration: update.duration },
        })
      )
    }
    
    // Batch delete invalid entries
    if (toDelete.length > 0) {
      operations.push(
        tx.appUsage.deleteMany({
          where: { id: { in: toDelete } },
        })
      )
    }

    await Promise.all(operations)
    console.log(`Clock out: Processed ${toUpdate.length} updates, ${toDelete.length} deletes`);
  }

  // Calculate statistics using centralized time tracking service
  const timeTrackingService = createTimeTrackingService(tx as any)
  const stats = await timeTrackingService.calculateSessionStatistics(activeSession.id, {
    currentTime: clockOutTime,
    includeOpenEntries: true,
  })

  console.log(`Clock out: Calculated totals - totalWork: ${stats.totalWork}s, activeTime: ${stats.activeTime}s, idleTime: ${stats.idleTime}s`);

  if (!stats.validation.valid) {
    console.warn(`Clock out: Validation errors found:`, stats.validation.errors)
  }

  // Update work session with calculated values
  await tx.workSession.update({
    where: { id: activeSession.id },
    data: {
      clockOut: clockOutTime,
      totalWork: stats.totalWork,
      activeTime: stats.activeTime,
      idleTime: stats.idleTime,
    },
  })
  
  console.log(`Clock out: Successfully updated work session ${activeSession.id}`);

  return "remove" as const
}

async function handleAppFocus(tx: any, device: any, event: any, appRules: AppRule[], domainRules: DomainRule[]) {
  
  // First, get the active work session to filter app usage entries
  const activeSession = await tx.workSession.findFirst({
    where: { employeeId: device.employeeId, deviceId: device.id, clockOut: null },
    orderBy: { clockIn: "desc" },
  })

  if (!activeSession) {
    console.log("App focus: No active work session found, skipping app focus event");
    return
  }

  const previous = await tx.appUsage.findFirst({
    where: { 
      employeeId: device.employeeId, 
      deviceId: device.id, 
      endTime: null,
      startTime: { gte: activeSession.clockIn } // Only entries within the current work session
    },
    orderBy: { startTime: "desc" },
  })
  console.log("handleAppFocus", event);
  const appData = event.data
  // Use domain rules for accurate browser activity classification
  const category = categorizeAppFromEventData(appData, appRules, domainRules)
  const currentAppName = appData.app_name || "Unknown App"
  const currentAppId = appData.app_id || null
  const currentWindowTitle = appData.window_title || null
  // Extract URL and domain from event data (sent by agent based on browserDomainOnly policy)
  const currentUrl = appData.url || null
  const currentDomain = appData.domain || null

  // ALWAYS close any previous open entry first to ensure no NULL endTime entries
  if (previous) {
    const endTime = new Date(event.timestamp)
    const duration = Math.floor((endTime.getTime() - previous.startTime.getTime()) / 1000)

    // Only update if duration is valid (positive)
    if (duration >= 0) {
      await tx.appUsage.update({ where: { id: previous.id }, data: { endTime, duration } })
      console.log(`App focus: Closed previous entry for ${previous.appName} with duration ${duration}s`);
    } else {
      // If duration is negative, delete this invalid entry
      await tx.appUsage.delete({ where: { id: previous.id } })
      console.log(`App focus: Deleted invalid previous entry for ${previous.appName} (negative duration)`);
    }
  }

  // ALWAYS create a new entry for the current app focus event
  // This ensures we always have a current entry to track ongoing app usage
  await tx.appUsage.create({
    data: {
      employeeId: device.employeeId,
      deviceId: device.id,
      appName: currentAppName,
      appId: currentAppId,
      windowTitle: currentWindowTitle,
      url: currentUrl,
      domain: currentDomain,
      category,
      startTime: new Date(event.timestamp),
      endTime: null,
      duration: 0,
      isIdle: false,
    },
  })
  
  console.log(`App focus: Created new entry for ${currentAppName}${currentDomain ? ` (${currentDomain})` : ''}`);
}

async function handleIdleChange(tx: any, device: any, event: any, isIdle: boolean) {
  console.log(`[handleIdleChange] START: device=${device.id}, isIdle=${isIdle}, timestamp=${event.timestamp}`)
  
  try {
    // ALWAYS update the device, even if we can't find it first
    // This ensures the is_idle flag is set reliably
    const currentDevice = await tx.device.findUnique({
      where: { id: device.id },
      select: { id: true, currentApp: true },
    })

    if (!currentDevice) {
      console.error(`[handleIdleChange] CRITICAL: Device ${device.id} not found in database!`)
      // Try to update anyway - maybe it exists but query failed
      return
    }

    // Parse existing currentApp or create new object
    let currentAppData: Record<string, any> = {}
    if (currentDevice.currentApp) {
      try {
        currentAppData = JSON.parse(currentDevice.currentApp)
      } catch {
        console.warn(`[handleIdleChange] Failed to parse currentApp JSON, creating new object`)
        currentAppData = {}
      }
    }

    // CRITICAL: Set the is_idle flag - this is the key field for productivity status
    const previousIsIdle = currentAppData.is_idle
    currentAppData.is_idle = isIdle
    
    // Ensure there's an app name for display
    if (!currentAppData.name) {
      currentAppData.name = isIdle ? 'System Idle' : 'Unknown App'
    }

    // Update the device record
    const updatedDevice = await tx.device.update({
      where: { id: device.id },
      data: {
        currentApp: JSON.stringify(currentAppData),
        lastSeen: new Date(event.timestamp),
      },
      select: { id: true, currentApp: true },
    })

    // Verify the update was successful
    const verifyParsed = JSON.parse(updatedDevice.currentApp || '{}')
    if (verifyParsed.is_idle !== isIdle) {
      console.error(`[handleIdleChange] VERIFICATION FAILED: Expected is_idle=${isIdle}, got is_idle=${verifyParsed.is_idle}`)
    } else {
      console.log(`[handleIdleChange] SUCCESS: Device ${device.id} is_idle changed from ${previousIsIdle} to ${isIdle}`)
    }
  } catch (error) {
    console.error(`[handleIdleChange] ERROR updating device ${device.id}:`, error)
    throw error // Re-throw to rollback transaction
  }

  // Find the current open app_usage entry
  const current = await tx.appUsage.findFirst({
    where: {
      employeeId: device.employeeId,
      deviceId: device.id,
      endTime: null,
    },
    orderBy: { startTime: "desc" },
  })

  if (current) {
    // Get idle time from event data (seconds since last activity)
    const idleTimeSeconds = event.data?.idle_time_seconds || 0
    const eventTime = new Date(event.timestamp)

    // For idle_start: backdate the split point by the idle_time_seconds
    // This ensures we don't lose the threshold period (typically 120 seconds)
    // Example: User stops at 10:00:00, idle detected at 10:02:00 with idle_time=120s
    //          Split point should be 10:00:00 (10:02:00 - 120s), not 10:02:00
    let splitTime: Date
    if (isIdle && idleTimeSeconds > 0) {
      // Backdate by the idle time to capture the threshold period
      splitTime = new Date(eventTime.getTime() - (idleTimeSeconds * 1000))
      console.log(`Idle start: Backdating split time by ${idleTimeSeconds}s (event: ${eventTime.toISOString()}, split: ${splitTime.toISOString()})`)
    } else {
      // For idle_end, use event time as-is
      splitTime = eventTime
    }

    // Close the current session at the split time
    const duration = Math.floor((splitTime.getTime() - current.startTime.getTime()) / 1000)

    // Only process if duration is valid (>= 0)
    if (duration >= 0) {
      await tx.appUsage.update({
        where: { id: current.id },
        data: {
          endTime: splitTime,
          duration,
        },
      })

      // Create a new app_usage entry for the same app with the new idle state
      // Starting at the split time (which may be backdated for idle_start)
      await tx.appUsage.create({
        data: {
          employeeId: device.employeeId,
          deviceId: device.id,
          appName: current.appName,
          appId: current.appId,
          windowTitle: current.windowTitle,
          category: current.category,
          startTime: splitTime,
          endTime: null,
          duration: 0,
          isIdle: isIdle,
        },
      })

      console.log(`Idle change: Split app usage at ${splitTime.toISOString()}, new entry isIdle=${isIdle}`)
    } else {
      // If duration is negative (out of order events), just update the idle flag
      console.warn(`Idle change: Negative duration (${duration}s), updating idle flag only`)
      await tx.appUsage.update({
        where: { id: current.id },
        data: { isIdle },
      })
    }
  } else {
    // No current app_usage entry - create one for tracking idle/active time
    // This ensures we don't lose time tracking data when there's no active app
    const eventTime = new Date(event.timestamp)
    const idleTimeSeconds = event.data?.idle_time_seconds || 0
    
    // For idle_start: backdate by idle_time_seconds to capture the threshold period
    let startTime: Date
    if (isIdle && idleTimeSeconds > 0) {
      startTime = new Date(eventTime.getTime() - (idleTimeSeconds * 1000))
      console.log(`Idle change (no prior entry): Creating backdated idle entry from ${startTime.toISOString()}`)
    } else {
      startTime = eventTime
    }
    
    // Create a new app_usage entry with isIdle flag set appropriately
    await tx.appUsage.create({
      data: {
        employeeId: device.employeeId,
        deviceId: device.id,
        appName: isIdle ? 'System Idle' : 'Unknown App',
        appId: null,
        windowTitle: null,
        category: 'NEUTRAL',
        startTime: startTime,
        endTime: null,
        duration: 0,
        isIdle: isIdle,
      },
    })
    
    console.log(`Idle change: Created new ${isIdle ? 'idle' : 'active'} entry starting at ${startTime.toISOString()}`)
  }
}

async function handleScreenshot(tx: any, device: any, event: any) {
  const jobId = event.data.jobId || event.data.job_id

  console.log('[handleScreenshot] Processing screenshot event:', {
    jobId,
    eventData: event.data,
  })

  // Extract Cloudinary fields (required)
  const cloudinaryPublicId = event.data.cloudinaryPublicId
  const cloudinaryUrl = event.data.cloudinaryUrl || event.data.cloudinarySecureUrl
  const width = event.data.width
  const height = event.data.height
  const format = event.data.format
  const bytes = event.data.bytes

  // Validate that we have Cloudinary data
  if (!cloudinaryUrl || !cloudinaryPublicId) {
    console.error('[handleScreenshot] Missing Cloudinary data:', { cloudinaryUrl, cloudinaryPublicId })
    throw new Error('Screenshot must be uploaded to Cloudinary')
  }

  if (jobId) {
    console.log('[handleScreenshot] Updating job to completed:', jobId)
    // Update job with Cloudinary completion data
    try {
      // First check if job exists to avoid P2025 errors
      const existingJob = await tx.job.findUnique({
        where: { id: jobId },
        select: { id: true, status: true },
      })

      if (existingJob) {
        console.log('[handleScreenshot] Found job:', { jobId, currentStatus: existingJob.status })
        await tx.job.update({
          where: { id: jobId },
          data: {
            status: "completed",
            completedAt: new Date(event.timestamp),
            result: JSON.stringify({
              cloudinaryPublicId,
              cloudinaryUrl,
              width,
              height,
              format,
              bytes,
              timestamp: event.timestamp,
              auto: event.data.auto || false,
            }),
          },
        })
        console.log('[handleScreenshot] Job updated successfully:', jobId)
      } else {
        console.warn('[handleScreenshot] Job not found in database:', jobId, '- skipping job update but will still create screenshot record')
      }
    } catch (err) {
      console.error('[handleScreenshot] Failed to update job:', jobId, err)
      // Don't throw - we still want to create the screenshot record even if job update fails
      // The screenshot was successfully captured and uploaded to Cloudinary
    }
  } else {
    console.warn('[handleScreenshot] No jobId provided, skipping job update')
  }

  // Create screenshot record with Cloudinary data
  await tx.screenshot.create({
    data: {
      employeeId: device.employeeId,
      deviceId: device.id,
      cloudinaryPublicId,
      cloudinaryUrl,
      width,
      height,
      format,
      bytes,
      isAuto: event.data.auto || false,
      takenAt: new Date(event.timestamp),
    },
  })
  console.log('[handleScreenshot] Screenshot record created')
}

async function handleScreenshotFailed(tx: any, device: any, event: any) {
  const jobId = event.data.jobId || event.data.job_id
  const error = event.data.error || 'Unknown error'

  console.log(`Screenshot failed for job ${jobId}: ${error}`)

  if (jobId) {
    try {
      // Check if job exists first
      const existingJob = await tx.job.findUnique({
        where: { id: jobId },
      })

      if (existingJob) {
        // Update job with failure status
        await tx.job.update({
          where: { id: jobId },
          data: {
            status: "failed",
            completedAt: new Date(event.timestamp),
            result: JSON.stringify({
              error,
              timestamp: event.timestamp,
              auto: event.data.auto || false,
            }),
          },
        })

        console.log(`Job ${jobId} marked as failed`)
      } else {
        console.warn(`Job ${jobId} not found in database, cannot mark as failed`)
      }
    } catch (jobError) {
      console.error(`Failed to update job ${jobId} status:`, jobError)
      // Don't throw - we still want to track the failure even if job update fails
    }
  }

  // Track screenshot failure metrics
  console.log(`Screenshot failure tracked for device ${device.id} (employee ${device.employeeId}): ${error}`)
}

// --- Main Handler ---

export async function POST(req: NextRequest) {
  try {
    // CRITICAL: Validate version FIRST before ANY database operations
    // This prevents old/buggy agents from creating database connections
    const versionError = validateAgentVersion(req);
    if (versionError) return versionError;

    // Cleanup old rate limit entries on-demand
    cleanupRateLimits()

    // Authenticate device (only after version check passes)
    const { device } = await requireDeviceAuth(req)

    const body = await req.json()
    const { events } = batchEventsSchema.parse(body)
    
    // Check if batch contains ONLY priority events (bypass rate limiting)
    const hasPriorityEvents = events.some((e: { type: string }) => PRIORITY_EVENT_TYPES.has(e.type))
    const hasOnlyPriorityEvents = events.every((e: { type: string }) => PRIORITY_EVENT_TYPES.has(e.type))
    
    // Only apply rate limiting to non-priority event batches
    // Priority events (clock_in, clock_out, screenshots) always get through
    if (!hasOnlyPriorityEvents) {
      const rateLimitCheck = checkRateLimit(device.id)
      if (!rateLimitCheck.allowed) {
        // If batch has mixed events, still process priority events
        if (hasPriorityEvents) {
          console.log(`Rate limited but processing ${events.filter((e: { type: string }) => PRIORITY_EVENT_TYPES.has(e.type)).length} priority events`)
          // Filter to only priority events
          const priorityEvents = events.filter((e: { type: string }) => PRIORITY_EVENT_TYPES.has(e.type))
          events.length = 0
          events.push(...priorityEvents)
        } else {
          console.warn(`Rate limit/circuit breaker triggered for device ${device.id}: ${rateLimitCheck.reason}`)
          return NextResponse.json(
            { error: rateLimitCheck.reason || "Too many requests" },
            { status: 429 }
          )
        }
      }
    }
    
    // Fetch both app rules and domain rules for accurate productivity classification
    const [appRules, domainRules] = await Promise.all([
      getActiveAppRules(),
      getActiveDomainRules()
    ])
    const results: unknown[] = []

    for (const event of events) {
      let presenceAction: "set" | "remove" | null = null
      let idleStatusChanged = false // Track idle status changes for cache invalidation

      const eventRecord = await prisma.$transaction(async (tx) => {
        const createdEvent = await tx.event.create({
          data: {
            employeeId: device.employeeId,
            deviceId: device.id,
            type: event.type,
            timestamp: new Date(event.timestamp),
            data: event.data ? JSON.stringify(event.data) : null,
          },
        })

        switch (event.type) {
          case "clock_in":
            presenceAction = await handleClockIn(tx, device, event)
            break
          case "clock_out":
            presenceAction = await handleClockOut(tx, device, event)
            break
          case "app_focus":
            if (event.data) await handleAppFocus(tx, device, event, appRules, domainRules)
            break
          case "idle_start":
            await handleIdleChange(tx, device, event, true)
            idleStatusChanged = true // Flag for cache invalidation
            break
          case "idle_end":
            await handleIdleChange(tx, device, event, false)
            idleStatusChanged = true // Flag for cache invalidation
            break
          case "screenshot_taken":
            console.log('[Events] Received screenshot_taken event:', { 
              hasData: !!event.data,
              dataKeys: event.data ? Object.keys(event.data) : [],
              jobId: event.data?.jobId || event.data?.job_id
            })
            if (event.data) await handleScreenshot(tx, device, event)
            break
          case "screenshot_failed":
            if (event.data) await handleScreenshotFailed(tx, device, event)
            break
          default:
            // no-op for pause_session, resume_session
            break
        }

        return createdEvent
      }, {
        timeout: 30000, // 30s timeout - extended to accommodate complex clock_out operations with many app_usage entries
        maxWait: 10000, // Max time to wait for a connection from the pool
      })

      // Realtime updates (outside transaction)
      const realtimeStore = await getRealtimeStore()
      if (presenceAction === "set") {
        await realtimeStore.setPresence(device.id, {
          employeeId: device.employeeId,
          deviceId: device.id,
          status: "online",
          lastSeen: new Date(event.timestamp),
        })
      } else if (presenceAction === "remove") {
        await realtimeStore.removePresence(device.id)
      } else if (idleStatusChanged) {
        // Update realtime store with idle/online status for immediate reflection
        const isIdleEvent = event.type === "idle_start"
        await realtimeStore.setPresence(device.id, {
          employeeId: device.employeeId,
          deviceId: device.id,
          status: isIdleEvent ? "idle" : "online",
          lastSeen: new Date(event.timestamp),
        })
      }

      // Invalidate live cache for critical events that must appear immediately on dashboards
      // - clock_in/clock_out: Presence changes (add/remove from Online Now)
      // - idle_start/idle_end: Idle status changes (update styling in Online Now)
      // These are relatively low-frequency events (max once per 2 min per employee for idle)
      if (presenceAction === "set" || presenceAction === "remove" || idleStatusChanged) {
        const cacheService = getLiveCacheService()
        await cacheService.invalidatePattern('live:*')
        if (idleStatusChanged) {
          console.log(`[Events] Cache invalidated for idle status change (device: ${device.id})`)
        }
      }

      results.push(eventRecord)
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    // Handle client disconnection gracefully (not a server error)
    if (error instanceof Error) {
      const errCode = (error as NodeJS.ErrnoException).code
      const isClientDisconnect = 
        error.message === 'aborted' ||
        errCode === 'ECONNRESET' ||
        errCode === 'EPIPE'
      
      if (isClientDisconnect) {
        console.log('[Events] Client disconnected before response')
        return NextResponse.json(
          { success: false, error: 'Client disconnected' },
          { status: 499 }
        )
      }
    }
    
    console.error("Events ingestion error:", error)
    const message = error instanceof Error ? error.message : ""
    const status = message.includes("authentication") ? 401 : 500
    const errorMsg = status === 401 ? "Unauthorized" : "Failed to process events"
    return NextResponse.json({ error: errorMsg }, { status })
  }
}
