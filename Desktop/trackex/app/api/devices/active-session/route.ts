import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireDeviceAuth } from '@/lib/auth/device'
import { validateAgentVersion } from '@/lib/version-validator'

export const dynamic = 'force-dynamic'

/**
 * GET /api/devices/active-session
 * 
 * Returns the active work session for the authenticated device.
 * This endpoint is used by the desktop agent to:
 * 1. Check if a session exists on the backend after app restart
 * 2. Sync local state with server state
 * 3. Resume real-time streaming by restarting background services
 * 
 * The agent should call this on startup when:
 * - User is authenticated (has valid device token)
 * - Local session state might be stale (after app restart/update)
 * 
 * Returns:
 * - { hasActiveSession: true, session: {...} } if there's an open session
 * - { hasActiveSession: false } if no active session exists
 */
export async function GET(req: NextRequest) {
  try {
    // CRITICAL: Validate version FIRST before ANY database operations
    const versionError = validateAgentVersion(req)
    if (versionError) return versionError

    const { device } = await requireDeviceAuth(req)

    // Find active work session for this device
    // An active session has clockIn set but clockOut is null
    const activeSession = await prisma.workSession.findFirst({
      where: {
        employeeId: device.employeeId,
        deviceId: device.id,
        clockOut: null, // Session is still open
      },
      orderBy: { clockIn: 'desc' },
      select: {
        id: true,
        clockIn: true,
        clockOut: true,
        totalWork: true,
        idleTime: true,
        activeTime: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (activeSession) {
      console.log(`Active session found for device ${device.id}: session ${activeSession.id}`)
      
      return NextResponse.json({
        hasActiveSession: true,
        session: {
          id: activeSession.id,
          clockIn: activeSession.clockIn.toISOString(),
          clockOut: null,
          totalWork: activeSession.totalWork,
          idleTime: activeSession.idleTime,
          activeTime: activeSession.activeTime,
        },
        device: {
          id: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
        },
      })
    }

    console.log(`No active session found for device ${device.id}`)
    return NextResponse.json({
      hasActiveSession: false,
      device: {
        id: device.id,
        deviceName: device.deviceName,
        platform: device.platform,
      },
    })
  } catch (error) {
    console.error('Failed to check active session:', error)

    const message = error instanceof Error ? error.message : ''
    const status = message.includes('authentication') ? 401 : 500
    const errorMsg = status === 401 ? 'Unauthorized' : 'Failed to check active session'

    return NextResponse.json({ error: errorMsg }, { status })
  }
}
