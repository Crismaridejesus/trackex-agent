import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireOwner } from "@/lib/auth/rbac"
import { logAuditEvent } from "@/lib/audit/logger"
import { registerDeviceSchema } from "@/lib/validations/device"
import { generateDeviceToken, hashDeviceToken } from "@/lib/utils/device-tokens"

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    await requireOwner()

    const body = await req.json()
    const validatedData = registerDeviceSchema.parse(body)

    // Check if employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: validatedData.employeeId },
    })

    if (!employee?.isActive) {
      return NextResponse.json(
        { error: "Employee not found or inactive" },
        { status: 404 }
      )
    }

    // Create device
    const device = await prisma.device.create({
      data: {
        employeeId: validatedData.employeeId,
        platform: validatedData.platform,
        deviceName: validatedData.deviceName,
        version: validatedData.version,
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

    await logAuditEvent(
      {
        action: "device_register",
        organizationId: employee.organizationId,
        targetType: "Device",
        targetId: device.id,
        details: {
          employeeName: employee.name,
          deviceName: device.deviceName,
          platform: device.platform,
        },
      },
      req
    )

    return NextResponse.json(
      {
        device: {
          id: device.id,
          deviceName: device.deviceName,
          platform: device.platform,
        },
        token,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Failed to register device:", error)
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    )
  }
}
