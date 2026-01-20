import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'
import { logAuditEvent } from '@/lib/audit/logger'
import { updateEmployeeSchema } from '@/lib/validations/employee'
import { createTimeTrackingService } from '@/lib/services/time-tracking.service'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        team: true,
        policy: true,
        sessions: {
          orderBy: { clockIn: 'desc' },
          take: 10,
        },
        devices: {
          include: {
            tokens: {
              where: { isActive: true },
              select: { id: true, createdAt: true, lastUsed: true },
            },
          },
          orderBy: { lastSeen: 'desc' },
        },
        _count: {
          select: {
            sessions: true,
            screenshots: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Handle duplicate devices by keeping only the latest one for each device name
    const uniqueDevices = employee.devices.reduce((acc, device) => {
      const existingDevice = acc.find(d => d.deviceName === device.deviceName)
      if (!existingDevice || (device.lastSeen && existingDevice.lastSeen && device.lastSeen > existingDevice.lastSeen)) {
        // Remove existing device with same name if it exists
        const filtered = acc.filter(d => d.deviceName !== device.deviceName)
        filtered.push(device)
        return filtered
      }
      return acc
    }, [] as typeof employee.devices)

    // Update employee object with unique devices
    const employeeWithUniqueDevices = {
      ...employee,
      devices: uniqueDevices,
    }

    // Calculate session times using centralized service
    const now = new Date()
    const timeTrackingService = createTimeTrackingService(prisma)

    const sessionsWithCalculatedTimes = await Promise.all(
      employee.sessions.map(async (session) => {
        // Calculate statistics using centralized service
        const stats = await timeTrackingService.calculateSessionStatistics(session.id, {
          currentTime: now,
          includeOpenEntries: true,
        })

        return {
          ...session,
          totalWork: stats.totalWork,
          activeTime: stats.activeTime,
          idleTime: stats.idleTime,
        }
      })
    )

    const employeeWithCalculatedSessions = {
      ...employeeWithUniqueDevices,
      sessions: sessionsWithCalculatedTimes,
    }

    return NextResponse.json({ employee: employeeWithCalculatedSessions })
  } catch (error) {
    console.error('Failed to fetch employee:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const body = await req.json()
    const validatedData = updateEmployeeSchema.parse(body)

    const existingEmployee = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!existingEmployee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employee = await prisma.employee.update({
      where: { id: params.id },
      data: validatedData,
      include: {
        team: true,
        policy: true,
      },
    })

    await logAuditEvent({
      action: 'employee_update',
      organizationId: employee.organizationId,
      targetType: 'Employee',
      targetId: employee.id,
      details: JSON.stringify({ 
        employeeName: employee.name,
        changes: validatedData,
      }),
    }, req)

    return NextResponse.json({ employee })
  } catch (error) {
    console.error('Failed to update employee:', error)
    return NextResponse.json(
      { error: 'Failed to update employee' },
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

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Soft delete by setting isActive to false
    await prisma.employee.update({
      where: { id: params.id },
      data: { isActive: false },
    })

    await logAuditEvent({
      action: 'employee_delete',
      organizationId: employee.organizationId,
      targetType: 'Employee',
      targetId: employee.id,
      details: JSON.stringify({ employeeName: employee.name }),
    }, req)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
