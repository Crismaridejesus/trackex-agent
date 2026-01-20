import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getRealtimeStore } from '@/lib/realtime/store'
import { getLiveCacheService } from '@/lib/services/live-cache.service'
import { calculateTimeStatistics } from '@/lib/utils/time-calculations'

export const dynamic = 'force-dynamic'

// Orphan session timeout in minutes
// Sessions without heartbeat for this duration will be auto-closed
const ORPHAN_SESSION_TIMEOUT_MINUTES = 10

/**
 * POST /api/maintenance/cleanup-orphan-sessions
 * 
 * Cleans up orphan work sessions that have been abandoned.
 * An orphan session is one where:
 * - clockOut is null (session still open)
 * - Device lastSeen is older than ORPHAN_SESSION_TIMEOUT_MINUTES
 * 
 * This handles edge cases like:
 * - App crashes
 * - Force quits via Task Manager
 * - Network failures preventing clock-out
 * - Power outages
 * 
 * Should be called periodically via cron job (e.g., every 5 minutes)
 * Can also be called manually for maintenance.
 * 
 * Security: This endpoint uses a shared secret for authentication
 * to prevent abuse. Set MAINTENANCE_SECRET env var.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify maintenance secret
    const authHeader = req.headers.get('authorization')
    const maintenanceSecret = process.env.MAINTENANCE_SECRET
    
    if (maintenanceSecret && authHeader !== `Bearer ${maintenanceSecret}`) {
      console.warn('Unauthorized cleanup-orphan-sessions request')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const cutoffTime = new Date(Date.now() - ORPHAN_SESSION_TIMEOUT_MINUTES * 60 * 1000)
    
    console.log(`[Cleanup] Looking for orphan sessions older than ${cutoffTime.toISOString()}`)
    
    // Find orphan sessions: open sessions where device hasn't been seen recently
    const orphanSessions = await prisma.workSession.findMany({
      where: {
        clockOut: null, // Session still open
        device: {
          lastSeen: {
            lt: cutoffTime, // Device not seen recently
          },
        },
      },
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            lastSeen: true,
          },
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100, // Process in batches to avoid memory issues
    })
    
    if (orphanSessions.length === 0) {
      console.log('[Cleanup] No orphan sessions found')
      return NextResponse.json({
        success: true,
        message: 'No orphan sessions found',
        cleanedCount: 0,
      })
    }
    
    console.log(`[Cleanup] Found ${orphanSessions.length} orphan sessions to close`)
    
    const realtimeStore = getRealtimeStore()
    const cleanedSessions: string[] = []
    const errors: { sessionId: string; error: string }[] = []
    
    for (const session of orphanSessions) {
      try {
        // Use device lastSeen as the clock-out time (last known activity)
        const clockOutTime = session.device?.lastSeen || new Date()
        
        // Close any open app usage entries for this session
        const openAppUsages = await prisma.appUsage.findMany({
          where: {
            employeeId: session.employeeId,
            deviceId: session.deviceId,
            startTime: { gte: session.clockIn, lte: clockOutTime },
            endTime: null,
          },
        })
        
        if (openAppUsages.length > 0) {
          console.log(`[Cleanup] Closing ${openAppUsages.length} open app usages for session ${session.id}`)
          
          for (const appUsage of openAppUsages) {
            const duration = Math.floor((clockOutTime.getTime() - appUsage.startTime.getTime()) / 1000)
            await prisma.appUsage.update({
              where: { id: appUsage.id },
              data: {
                endTime: clockOutTime,
                duration: Math.max(0, duration),
              },
            })
          }
        }
        
        // Calculate session totals using app usage entries
        const appUsageEntries = await prisma.appUsage.findMany({
          where: {
            employeeId: session.employeeId,
            deviceId: session.deviceId,
            startTime: { gte: session.clockIn, lte: clockOutTime },
          },
        })
        
        // Map to the format expected by calculateTimeStatistics
        const mappedEntries = appUsageEntries.map((entry) => ({
          startTime: entry.startTime,
          endTime: entry.endTime,
          duration: entry.duration,
          category: entry.category,
          isIdle: entry.isIdle,
        }))
        
        const stats = calculateTimeStatistics(mappedEntries)
        
        // Close the work session
        await prisma.workSession.update({
          where: { id: session.id },
          data: {
            clockOut: clockOutTime,
            totalWork: stats.totalWork,
            activeTime: stats.activeTime,
            idleTime: stats.idleTime,
          },
        })
        
        // Remove device presence
        if (session.deviceId) {
          const store = await realtimeStore
          await store.removePresence(session.deviceId)
          await prisma.device.update({
            where: { id: session.deviceId },
            data: { isActive: false },
          })
        }
        
        console.log(`[Cleanup] Closed orphan session ${session.id} for ${session.employee?.email || 'unknown'} (device: ${session.device?.deviceName})`)
        cleanedSessions.push(session.id)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Cleanup] Failed to close session ${session.id}:`, error)
        errors.push({ sessionId: session.id, error: errorMessage })
      }
    }
    
    // Invalidate live cache if any sessions were cleaned
    if (cleanedSessions.length > 0) {
      const cacheService = getLiveCacheService()
      await cacheService.invalidatePattern('live:*')
    }
    
    console.log(`[Cleanup] Completed: ${cleanedSessions.length} sessions closed, ${errors.length} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Cleaned ${cleanedSessions.length} orphan sessions`,
      cleanedCount: cleanedSessions.length,
      cleanedSessions,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (error) {
    console.error('[Cleanup] Failed to cleanup orphan sessions:', error)
    return NextResponse.json(
      { error: 'Failed to cleanup orphan sessions' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/maintenance/cleanup-orphan-sessions
 * 
 * Check for orphan sessions without closing them (dry run)
 */
export async function GET(req: NextRequest) {
  try {
    // Verify maintenance secret
    const authHeader = req.headers.get('authorization')
    const maintenanceSecret = process.env.MAINTENANCE_SECRET
    
    if (maintenanceSecret && authHeader !== `Bearer ${maintenanceSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const cutoffTime = new Date(Date.now() - ORPHAN_SESSION_TIMEOUT_MINUTES * 60 * 1000)
    
    const orphanSessions = await prisma.workSession.findMany({
      where: {
        clockOut: null,
        device: {
          lastSeen: {
            lt: cutoffTime,
          },
        },
      },
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            lastSeen: true,
          },
        },
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: 100,
    })
    
    return NextResponse.json({
      orphanCount: orphanSessions.length,
      cutoffTime: cutoffTime.toISOString(),
      orphanSessions: orphanSessions.map(s => ({
        sessionId: s.id,
        employeeEmail: s.employee?.email,
        deviceName: s.device?.deviceName,
        clockIn: s.clockIn.toISOString(),
        deviceLastSeen: s.device?.lastSeen?.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to check orphan sessions:', error)
    return NextResponse.json(
      { error: 'Failed to check orphan sessions' },
      { status: 500 }
    )
  }
}
