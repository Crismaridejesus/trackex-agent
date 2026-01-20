import { prisma } from "@/lib/db"
import { subHours } from "date-fns"

/**
 * Clean up orphaned work sessions
 * Closes sessions where device hasn't sent heartbeat in > 4 hours
 */
export async function cleanupOrphanedSessions() {
  const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000)

  try {
    // Find work sessions that are still active but device hasn't been seen in 4+ hours
    const orphanedSessions = await prisma.workSession.findMany({
      where: {
        clockOut: null, // Still active
        device: {
          lastSeen: {
            lt: fourHoursAgo,
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
          },
        },
      },
    })

    if (orphanedSessions.length === 0) {
      console.log("[SessionCleanup] No orphaned sessions found")
      return { closed: 0 }
    }

    console.log(
      `[SessionCleanup] Found ${orphanedSessions.length} orphaned sessions`
    )

    // Close orphaned sessions
    const closedSessions = await Promise.all(
      orphanedSessions.map(async (session) => {
        // Use device's lastSeen time as clockOut time
        const clockOutTime = session.device.lastSeen || new Date()

        const workTime = Math.floor(
          (clockOutTime.getTime() - session.clockIn.getTime()) / 1000
        )

        // Calculate statistics for the session
        const appUsageStats = await prisma.appUsage.aggregate({
          where: {
            employeeId: session.employeeId,
            deviceId: session.deviceId,
            startTime: {
              gte: session.clockIn,
              lte: clockOutTime,
            },
            endTime: {
              not: null,
            },
          },
          _sum: {
            duration: true,
          },
        })

        const idleStats = await prisma.appUsage.aggregate({
          where: {
            employeeId: session.employeeId,
            deviceId: session.deviceId,
            startTime: {
              gte: session.clockIn,
              lte: clockOutTime,
            },
            endTime: {
              not: null,
            },
            isIdle: true,
          },
          _sum: {
            duration: true,
          },
        })

        const totalWork = appUsageStats._sum.duration || workTime
        const idleTime = idleStats._sum.duration || 0
        const activeTime = Math.max(0, totalWork - idleTime)

        // Update work session
        await prisma.workSession.update({
          where: { id: session.id },
          data: {
            clockOut: clockOutTime,
            totalWork,
            activeTime,
            idleTime,
          },
        })

        console.log(
          `[SessionCleanup] Closed orphaned session for ${session.employee.name} (${session.device.deviceName}), ` +
            `started: ${session.clockIn.toISOString()}, closed: ${clockOutTime.toISOString()}`
        )

        return session.id
      })
    )

    return { closed: closedSessions.length }
  } catch (error) {
    console.error(
      "[SessionCleanup] Error cleaning up orphaned sessions:",
      error
    )
    throw error
  }
}

/**
 * Clean up very old orphaned sessions (> 24 hours)
 * These are likely from crashes or network issues
 */
export async function cleanupVeryOldSessions() {
  const twentyFourHoursAgo = subHours(new Date(), 24)

  try {
    const result = await prisma.workSession.updateMany({
      where: {
        clockOut: null,
        clockIn: {
          lt: twentyFourHoursAgo,
        },
      },
      data: {
        clockOut: new Date(),
        totalWork: 0, // Mark as invalid
        activeTime: 0,
        idleTime: 0,
      },
    })

    if (result.count > 0) {
      console.log(
        `[SessionCleanup] Force-closed ${result.count} very old orphaned sessions (>24h)`
      )
    }

    return { closed: result.count }
  } catch (error) {
    console.error(
      "[SessionCleanup] Error cleaning up very old sessions:",
      error
    )
    throw error
  }
}
