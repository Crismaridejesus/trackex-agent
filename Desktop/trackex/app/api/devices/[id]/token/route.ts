import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'
import { logAuditEvent } from '@/lib/audit/logger'
import { generateDeviceToken, hashDeviceToken } from '@/lib/utils/device-tokens'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const device = await prisma.device.findUnique({
      where: { id: params.id },
      include: {
        employee: true,
      },
    })

    if (!device) {
      return NextResponse.json(
        { error: 'Device not found' },
        { status: 404 }
      )
    }

    // Generate new token
    const token = generateDeviceToken()
    const tokenHash = await hashDeviceToken(token)

    // Deactivate existing tokens
    await prisma.deviceToken.updateMany({
      where: { 
        deviceId: device.id,
        isActive: true,
      },
      data: { isActive: false },
    })

    // Create new token
    const deviceToken = await prisma.deviceToken.create({
      data: {
        deviceId: device.id,
        tokenHash,
      },
    })

    await logAuditEvent({
      action: 'device_token_generate',
      organizationId: device.employee.organizationId,
      targetType: 'DeviceToken',
      targetId: deviceToken.id,
      details: { 
        employeeName: device.employee.name,
        deviceName: device.deviceName,
      },
    }, req)

    return NextResponse.json({ 
      token,
      tokenId: deviceToken.id,
      createdAt: deviceToken.createdAt,
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to generate device token:', error)
    return NextResponse.json(
      { error: 'Failed to generate device token' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const { searchParams } = new URL(req.url)
    const tokenId = searchParams.get('tokenId')

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      )
    }

    const deviceToken = await prisma.deviceToken.findUnique({
      where: { id: tokenId },
      include: {
        device: {
          include: {
            employee: true,
          },
        },
      },
    })

    if (!deviceToken || deviceToken.deviceId !== params.id) {
      return NextResponse.json(
        { error: 'Device token not found' },
        { status: 404 }
      )
    }

    await prisma.deviceToken.update({
      where: { id: tokenId },
      data: { isActive: false },
    })

    await logAuditEvent({
      action: 'device_token_revoke',
      organizationId: deviceToken.device.employee.organizationId,
      targetType: 'DeviceToken',
      targetId: tokenId,
      details: { 
        employeeName: deviceToken.device.employee.name,
        deviceName: deviceToken.device.deviceName,
      },
    }, req)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to revoke device token:', error)
    return NextResponse.json(
      { error: 'Failed to revoke device token' },
      { status: 500 }
    )
  }
}
