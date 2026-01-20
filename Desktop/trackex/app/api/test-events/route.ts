import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireDeviceAuth } from '@/lib/auth/device'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { device } = await requireDeviceAuth(req)

    const body = await req.json()

    // Simple event creation without complex logic
    const results = await prisma.$transaction(async (tx) => {
      const eventResults = []

      for (const event of body.events) {
        const eventRecord = await tx.event.create({
          data: {
            employeeId: device.employeeId,
            deviceId: device.id,
            type: event.type,
            timestamp: new Date(event.timestamp),
            data: event.data ? JSON.stringify(event.data) : null,
          },
        })

        // Only handle clock_in and clock_out for now
        if (event.type === 'clock_in') {
          await tx.workSession.create({
            data: {
              employeeId: device.employeeId,
              deviceId: device.id,
              clockIn: new Date(event.timestamp),
            },
          })
        } else if (event.type === 'clock_out') {
          const activeSession = await tx.workSession.findFirst({
            where: {
              employeeId: device.employeeId,
              deviceId: device.id,
              clockOut: null,
            },
            orderBy: { clockIn: 'desc' },
          })

          if (activeSession) {
            const clockOutTime = new Date(event.timestamp)
            const workTime = Math.floor((clockOutTime.getTime() - activeSession.clockIn.getTime()) / 1000)

            await tx.workSession.update({
              where: { id: activeSession.id },
              data: {
                clockOut: clockOutTime,
                totalWork: workTime,
              },
            })
          }
        }

        eventResults.push(eventRecord)
      }

      return eventResults
    })

    return NextResponse.json({ 
      success: true,
      processed: results.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Test events error:', error)
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


