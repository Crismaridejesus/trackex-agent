import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireDeviceAuth } from '@/lib/auth/device'
import { getRealtimeStore } from '@/lib/realtime/store'
import { z } from 'zod'
import { validateAgentVersion } from '@/lib/version-validator'
// REMOVED: getLiveCacheService import - cache invalidation removed for scalability
// The cache has a 3-5 second TTL which is sufficient for live data freshness.
// Invalidating on every heartbeat (1000 agents = 6000 invalidations/min) defeats caching.

export const dynamic = 'force-dynamic'

// ===== HEARTBEAT RATE LIMITING =====
// Prevents heartbeat flood from overwhelming database connections
// More lenient than events since heartbeats are lightweight
interface HeartbeatRateInfo {
  count: number
  resetTime: number
}

const heartbeatRateLimits = new Map<string, HeartbeatRateInfo>()
const MAX_HEARTBEATS_PER_MINUTE = 30 // ~1 heartbeat every 2 seconds max
const HEARTBEAT_RATE_WINDOW = 60 * 1000

function checkHeartbeatRateLimit(deviceId: string): boolean {
  const now = Date.now()
  const limit = heartbeatRateLimits.get(deviceId)
  
  if (!limit || now > limit.resetTime) {
    heartbeatRateLimits.set(deviceId, { count: 1, resetTime: now + HEARTBEAT_RATE_WINDOW })
    return true
  }
  
  if (limit.count >= MAX_HEARTBEATS_PER_MINUTE) {
    return false // Rate limited, but don't log every time to avoid log spam
  }
  
  limit.count++
  return true
}

// Default idle threshold in seconds (2 minutes)
// This should match the Team Policy's idle threshold
const DEFAULT_IDLE_THRESHOLD_SECONDS = 120

const heartbeatSchema = z.object({
  timestamp: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Invalid timestamp format"
  }),
  status: z.enum(['active', 'idle', 'away']),
  is_idle: z.boolean().optional(),
  // idle_time_seconds is sent by agent, used as fallback to determine idle status
  idle_time_seconds: z.number().optional(),
  currentApp: z.object({
    name: z.string(),
    app_id: z.string().nullish(),
    window_title: z.string().nullish(),
    url: z.string().nullish(),
    domain: z.string().nullish(),
  }).optional().nullable(),
  session_start_time: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Invalid session_start_time format"
  }).optional(),
  total_session_time_seconds: z.number().optional(),
  // Re-added: active_time_today_seconds and idle_time_today_seconds
  // These are now used to update WorkSession during active sessions
  active_time_today_seconds: z.number().optional(),
  idle_time_today_seconds: z.number().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // CRITICAL: Validate version FIRST before ANY database operations
    // This prevents old/buggy agents from creating database connections
    const versionError = validateAgentVersion(req);
    if (versionError) return versionError;

    // Authenticate device (only after version check passes)
    const { device } = await requireDeviceAuth(req)
    
    // Check heartbeat rate limit (lenient - just prevents flood)
    if (!checkHeartbeatRateLimit(device.id)) {
      // Silently accept but skip processing to prevent log spam
      // The agent doesn't need to know it's being rate limited for heartbeats
      return NextResponse.json({ 
        success: true,
        message: 'Heartbeat acknowledged',
        timestamp: new Date().toISOString(),
      })
    }

    const body = await req.json();
    
    const { 
      timestamp, 
      status, 
      is_idle,
      idle_time_seconds,
      currentApp,
      active_time_today_seconds,
      idle_time_today_seconds,
    } = heartbeatSchema.parse(body)

    // Determine if user is idle from heartbeat data
    // Priority: 1. explicit is_idle flag, 2. idle_time_seconds >= threshold, 3. status check
    // This ensures idle status is correctly detected even if is_idle is missing
    let userIsIdle: boolean
    if (typeof is_idle === 'boolean') {
      userIsIdle = is_idle
    } else if (typeof idle_time_seconds === 'number') {
      // Fallback: compute from idle_time_seconds
      userIsIdle = idle_time_seconds >= DEFAULT_IDLE_THRESHOLD_SECONDS
    } else {
      userIsIdle = status === 'idle'
    }

    // DEBUG: Log heartbeat details for idle troubleshooting
    console.log(`[Heartbeat] Device ${device.id}: is_idle=${is_idle}, idle_time_s=${idle_time_seconds}, status=${status}, computed_userIsIdle=${userIsIdle}, currentApp=${currentApp?.name || 'none'}`)

    // Track if idle status changed for cache invalidation
    let idleStatusChanged = false
    let previousIsIdle: boolean | undefined

    // OPTIMIZATION: Combine all database operations into a single transaction
    // This reduces the number of database round-trips from 3 to 1
    // With 1000 agents × 6 heartbeats/min = 6000 heartbeats/min
    // Previous: 18,000 DB operations/min → Now: 6,000 DB operations/min (3x reduction)
    await prisma.$transaction(async (tx) => {
      // First, get the current device to check previous idle status
      const currentDevice = await tx.device.findUnique({
        where: { id: device.id },
        select: { currentApp: true },
      })

      // Parse previous idle status from currentApp JSON
      if (currentDevice?.currentApp) {
        try {
          const parsed = JSON.parse(currentDevice.currentApp)
          previousIsIdle = parsed.is_idle === true
        } catch {
          // Ignore parse errors
        }
      }

      // Detect if idle status is changing
      if (previousIsIdle !== undefined && previousIsIdle !== userIsIdle) {
        idleStatusChanged = true
        console.log(`[Heartbeat] Idle status CHANGED for device ${device.id}: ${previousIsIdle} -> ${userIsIdle}`)
      }

      // 1. Update device last seen and current app (always)
      // Include is_idle in the currentApp JSON so Live View API can read it
      const currentAppJson = currentApp ? JSON.stringify({
        name: currentApp.name,
        app_id: currentApp.app_id || '',
        window_title: currentApp.window_title || '',
        url: currentApp.url || '',
        domain: currentApp.domain || '',
        is_idle: userIsIdle,
      }) : JSON.stringify({
        name: userIsIdle ? 'System Idle' : 'Unknown',
        is_idle: userIsIdle,
      })

      await tx.device.update({
        where: { id: device.id },
        data: { 
          lastSeen: new Date(timestamp),
          currentApp: currentAppJson,
        },
      })

      // 2. Update WorkSession time fields if we have time data from the agent
      if (active_time_today_seconds !== undefined || idle_time_today_seconds !== undefined) {
        const activeSession = await tx.workSession.findFirst({
          where: { 
            employeeId: device.employeeId, 
            deviceId: device.id, 
            clockOut: null 
          },
          orderBy: { clockIn: 'desc' },
        })

        if (activeSession) {
          const activeTime = active_time_today_seconds ?? 0
          const idleTime = idle_time_today_seconds ?? 0
          const totalWork = activeTime + idleTime

          await tx.workSession.update({
            where: { id: activeSession.id },
            data: {
              totalWork,
              activeTime,
              idleTime,
            },
          })
          
          console.log(`[Heartbeat] Updated WorkSession ${activeSession.id}: totalWork=${totalWork}s, activeTime=${activeTime}s, idleTime=${idleTime}s`)
        }
      }
    }, {
      timeout: 5000, // 5 second timeout for the transaction
    })

    // Update real-time presence data (outside transaction - Redis/in-memory is fast)
    // Use the computed userIsIdle value for consistency
    // CRITICAL: Include is_idle in currentApp to prevent it from being overwritten
    const realtimeStore = await getRealtimeStore();
    await realtimeStore.setPresence(device.id, {
      employeeId: device.employeeId,
      deviceId: device.id,
      status: userIsIdle ? 'idle' : 'online',
      currentApp: currentApp ? {
        name: currentApp.name,
        windowTitle: currentApp.window_title ?? undefined,
        url: currentApp.url ?? undefined,
        domain: currentApp.domain ?? undefined,
        is_idle: userIsIdle,  // Include idle status to preserve it in Device.currentApp
      } : userIsIdle ? { name: 'System Idle', is_idle: true } : undefined,
      lastSeen: new Date(timestamp),
      // Time calculations are now done in the Live View API from database
      activeTimeToday: 0,
      idleTimeToday: 0,
    })

    // SELECTIVE Cache invalidation for idle status changes
    // Only invalidate when idle status CHANGES (not on every heartbeat)
    // This is a low-frequency operation: max 2 times per 2-minute cycle per employee
    // (once when going idle, once when becoming active again)
    if (idleStatusChanged) {
      const { getLiveCacheService } = await import("@/lib/services/live-cache.service")
      const cacheService = getLiveCacheService()
      await cacheService.invalidatePattern('live:*')
      console.log(`[Heartbeat] Cache invalidated for idle status change (device: ${device.id})`)
    }

    return NextResponse.json({ 
      success: true,
      message: 'Heartbeat received',
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
        // Client disconnected before response - this is normal for heartbeats
        // Don't log as error to reduce noise
        console.log('[Heartbeat] Client disconnected before response')
        return NextResponse.json(
          { success: false, error: 'Client disconnected' },
          { status: 499 } // Client Closed Request (nginx convention)
        )
      }
    }
    
    console.error('Heartbeat error:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process heartbeat', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}