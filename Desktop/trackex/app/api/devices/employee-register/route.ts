import { logAuditEvent } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { generateDeviceToken, hashDeviceToken } from "@/lib/utils/device-tokens";
import { calculateTimeStatistics } from "@/lib/utils/time-calculations";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

// ===== ORPHANED SESSION CLEANUP =====
// Close any orphaned work sessions for a device during registration
// This prevents employees from appearing "Online Now" without explicitly clocking in

async function closeOrphanedSessionsForDevice(
  deviceId: string,
  previousLastSeen: Date | null
): Promise<number> {
  // Find any open work sessions for this device
  const orphanedSessions = await prisma.workSession.findMany({
    where: {
      deviceId: deviceId,
      clockOut: null, // Still open (orphaned)
    },
    include: {
      employee: {
        select: { email: true, name: true },
      },
    },
  })

  if (orphanedSessions.length === 0) {
    return 0
  }

  console.log(
    `[DeviceRegister] Closing ${orphanedSessions.length} orphaned sessions for device ${deviceId}`
  )

  for (const session of orphanedSessions) {
    // Use device's previous lastSeen as clock-out time, or session clockIn + 1 minute as fallback
    const clockOutTime =
      previousLastSeen || new Date(session.clockIn.getTime() + 60 * 1000)

    try {
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
        for (const appUsage of openAppUsages) {
          const duration = Math.floor(
            (clockOutTime.getTime() - appUsage.startTime.getTime()) / 1000
          )
          await prisma.appUsage.update({
            where: { id: appUsage.id },
            data: {
              endTime: clockOutTime,
              duration: Math.max(0, duration),
            },
          })
        }
      }

      // Calculate session totals from app usage entries
      const appUsageEntries = await prisma.appUsage.findMany({
        where: {
          employeeId: session.employeeId,
          deviceId: session.deviceId,
          startTime: { gte: session.clockIn, lte: clockOutTime },
        },
      })

      const mappedEntries = appUsageEntries.map((entry) => ({
        startTime: entry.startTime,
        endTime: entry.endTime,
        duration: entry.duration,
        category: entry.category,
        isIdle: entry.isIdle,
      }))

      const stats = calculateTimeStatistics(mappedEntries)

      // Close the orphaned session
      await prisma.workSession.update({
        where: { id: session.id },
        data: {
          clockOut: clockOutTime,
          totalWork: stats.totalWork,
          activeTime: stats.activeTime,
          idleTime: stats.idleTime,
        },
      })

      console.log(
        `[DeviceRegister] Closed orphaned session ${session.id} for ${session.employee?.email || "unknown"}`
      )
    } catch (error) {
      console.error(
        `[DeviceRegister] Failed to close orphaned session ${session.id}:`,
        error
      )
    }
  }

  return orphanedSessions.length
}

// ===== DEVICE REGISTRATION RATE LIMITING =====
// Prevent spam device registrations while allowing legitimate re-registrations

interface DeviceRegRateLimit {
  registrations: number
  resetTime: number
}

const deviceRegRateLimits = new Map<string, DeviceRegRateLimit>()
const MAX_REGISTRATIONS_PER_HOUR = 20 // Allow up to 20 device registrations per employee per hour
const REG_RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour

function checkDeviceRegRateLimit(employeeId: string): {
  allowed: boolean
  reason?: string
} {
  const now = Date.now()
  const limit = deviceRegRateLimits.get(employeeId)

  // Initialize or reset if window expired
  if (!limit || now > limit.resetTime) {
    deviceRegRateLimits.set(employeeId, {
      registrations: 1,
      resetTime: now + REG_RATE_LIMIT_WINDOW,
    })
    return { allowed: true }
  }

  // Check registration count
  if (limit.registrations >= MAX_REGISTRATIONS_PER_HOUR) {
    console.warn(
      `Device registration rate limit exceeded for employee ${employeeId}`
    )
    return {
      allowed: false,
      reason: "Too many device registrations. Please try again later.",
    }
  }

  // Increment and allow
  limit.registrations++
  return { allowed: true }
}

// Cleanup old entries on-demand (probabilistic cleanup)
// This avoids setInterval memory leaks in serverless environments
function cleanupDeviceRegRateLimits() {
  // Only cleanup 1% of requests to minimize overhead
  if (Math.random() < 0.01) {
    const now = Date.now()
    let cleaned = 0
    for (const [employeeId, limit] of deviceRegRateLimits.entries()) {
      if (now > limit.resetTime + REG_RATE_LIMIT_WINDOW) {
        deviceRegRateLimits.delete(employeeId)
        cleaned++
      }
    }
    if (cleaned > 0) {
      console.log(
        `Device registration rate limit cleanup: removed ${cleaned} expired entries`
      )
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    // Cleanup old rate limit entries on-demand
    cleanupDeviceRegRateLimits()

    const body = await req.json()
    const {
      employeeId,
      deviceName,
      platform,
      osVersion: _osVersion,
      deviceUuid,
    } = body

    if (!employeeId || !deviceName || !platform) {
      return NextResponse.json(
        { error: "Missing required fields: employeeId, deviceName, platform" },
        { status: 400 }
      )
    }

    // Check rate limit
    const rateLimitCheck = checkDeviceRegRateLimit(employeeId)
    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { error: rateLimitCheck.reason || "Too many registrations" },
        { status: 429 }
      )
    }

    // Check if employee exists and is active
    const employee = await prisma.employee.findUnique({
      where: {
        id: employeeId,
        isActive: true,
      },
      include: {
        organization: true,
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: "Employee not found or inactive" },
        { status: 404 }
      )
    }

    // NOTE: License validation removed from device registration
    // License is now checked in the desktop agent AFTER authentication
    // This allows employees to authenticate and reach MainView, where license
    // status is verified continuously during the session

    let existingDevice = null

    // PRIORITY 1: Try to match by device UUID first (most reliable)
    // This prevents duplicate devices when the same installation re-registers
    if (deviceUuid) {
      existingDevice = await prisma.device.findFirst({
        where: {
          employeeId: employeeId,
          deviceUuid: deviceUuid,
        },
      })

      if (existingDevice) {
        console.log(`Found existing device by UUID: ${deviceUuid}`)

        // Reactivate if it was previously deactivated
        if (!existingDevice.isActive) {
          await prisma.device.update({
            where: { id: existingDevice.id },
            data: {
              isActive: true,
              deviceName: deviceName, // Update device name in case it changed
              platform: platform,
              version: _osVersion || existingDevice.version,
              lastSeen: new Date(),
            },
          })
          console.log(
            `Reactivated device ${existingDevice.id} with UUID ${deviceUuid}`
          )
        }
      }
    }

    // PRIORITY 2: Try exact device name match (active devices only)
    if (!existingDevice) {
      existingDevice = await prisma.device.findFirst({
        where: {
          employeeId: employeeId,
          deviceName: deviceName,
          isActive: true,
        },
      })
    }

    // PRIORITY 3: Try normalized device name match (case-insensitive, active devices only)
    if (!existingDevice) {
      existingDevice = await prisma.device.findFirst({
        where: {
          employeeId: employeeId,
          deviceName: {
            equals: deviceName,
            mode: "insensitive",
          },
          isActive: true,
        },
      })
    }

    if (existingDevice) {
      // Return existing device token
      const existingToken = await prisma.deviceToken.findFirst({
        where: { deviceId: existingDevice.id },
        orderBy: { createdAt: "desc" },
      })

      if (existingToken) {
        // Generate a new token for existing device
        const newToken = generateDeviceToken()
        const newTokenHash = await hashDeviceToken(newToken)

        // CRITICAL: Close any orphaned sessions BEFORE updating lastSeen
        // This prevents false "Online Now" status from stale sessions
        const closedCount = await closeOrphanedSessionsForDevice(
          existingDevice.id,
          existingDevice.lastSeen
        )
        if (closedCount > 0) {
          console.log(
            `[DeviceRegister] Cleaned up ${closedCount} orphaned sessions during device re-registration`
          )
        }

        // Update the existing token and last_seen timestamp
        await prisma.deviceToken.update({
          where: { id: existingToken.id },
          data: { tokenHash: newTokenHash },
        })

        // Update device last_seen timestamp and UUID if provided
        await prisma.device.update({
          where: { id: existingDevice.id },
          data: {
            lastSeen: new Date(),
            // Update UUID if it wasn't set before (migration from old devices)
            ...(deviceUuid && !existingDevice.deviceUuid ? { deviceUuid } : {}),
          },
        })

        return NextResponse.json({
          device: {
            id: existingDevice.id,
            device_id: existingDevice.id, // Add for backward compatibility with old desktop apps
            deviceName: existingDevice.deviceName,
            platform: existingDevice.platform,
            token: newToken,
            device_token: newToken, // Add for backward compatibility with old desktop apps
          },
        })
      } else {
        // Existing device but no token - create new token for existing device
        const newToken = generateDeviceToken()
        const newTokenHash = await hashDeviceToken(newToken)

        // CRITICAL: Close any orphaned sessions BEFORE updating lastSeen
        // This prevents false "Online Now" status from stale sessions
        const closedCount = await closeOrphanedSessionsForDevice(
          existingDevice.id,
          existingDevice.lastSeen
        )
        if (closedCount > 0) {
          console.log(
            `[DeviceRegister] Cleaned up ${closedCount} orphaned sessions during device re-registration (no token)`
          )
        }

        await prisma.deviceToken.create({
          data: {
            deviceId: existingDevice.id,
            tokenHash: newTokenHash,
          },
        })

        // Update device last_seen timestamp and UUID if provided
        await prisma.device.update({
          where: { id: existingDevice.id },
          data: {
            lastSeen: new Date(),
            // Update UUID if it wasn't set before (migration from old devices)
            ...(deviceUuid && !existingDevice.deviceUuid ? { deviceUuid } : {}),
          },
        })

        return NextResponse.json({
          device: {
            id: existingDevice.id,
            device_id: existingDevice.id, // Add for backward compatibility with old desktop apps
            deviceName: existingDevice.deviceName,
            platform: existingDevice.platform,
            token: newToken,
            device_token: newToken, // Add for backward compatibility with old desktop apps
          },
        })
      }
    }

    // Create new device with UUID
    const device = await prisma.device.create({
      data: {
        employeeId: employeeId,
        platform: platform,
        deviceName: deviceName,
        deviceUuid: deviceUuid || null, // Store the stable device UUID
        version: _osVersion || null,
        lastSeen: new Date(), // Set initial last_seen timestamp
      },
    })

    // Generate device token
    const token = generateDeviceToken()
    const tokenHash = await hashDeviceToken(token)

    await prisma.deviceToken.create({
      data: {
        deviceId: device.id,
        tokenHash,
      },
    })

    // Log the device registration (skip audit logging if it fails to avoid blocking)
    try {
      await logAuditEvent(
        {
          action: "device_register",
          organizationId: employee.organizationId,
          targetType: "Device",
          targetId: device.id,
          details: JSON.stringify({
            employeeName: employee.name,
            employeeEmail: employee.email,
            deviceName: device.deviceName,
            platform: device.platform,
            organizationId: employee.organizationId || "unknown",
          }),
        },
        req
      )
    } catch (auditError) {
      console.warn(
        "Failed to log audit event for device registration:",
        auditError
      )
    }

    return NextResponse.json(
      {
        device: {
          id: device.id,
          device_id: device.id, // Add for backward compatibility with old desktop apps
          deviceName: device.deviceName,
          platform: device.platform,
          token,
          device_token: token, // Add for backward compatibility with old desktop apps
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to register device for employee:", error)
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    )
  }
}
