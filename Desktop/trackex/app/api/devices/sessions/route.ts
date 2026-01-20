import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireDeviceAuth } from '@/lib/auth/device'
import { validateAgentVersion } from '@/lib/version-validator'

export const dynamic = 'force-dynamic'

function parseDate(dateString: string | null, isEndDate = false): Date | null {
  if (!dateString) return null
  try {
    let normalized = dateString
    if (dateString.endsWith('+00:00')) {
      normalized = dateString.slice(0, -6) + 'Z'
    }

    const parsed = new Date(normalized)
    if (isNaN(parsed.getTime())) {
      throw new Error('Invalid date')
    }
    return parsed
  } catch (error) {
    console.error(`Failed to parse ${isEndDate ? 'endDate' : 'startDate'}:`, dateString, error)
    throw new Error(`Invalid ${isEndDate ? 'endDate' : 'startDate'} format`)
  }
}

function getDefaultDates(): { start: Date; end: Date } {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
  return { start, end }
}

async function fetchSessions(deviceId: string, employeeId: string, start: Date, end: Date) {
  return prisma.workSession.findMany({
    where: {
      employeeId,
      deviceId,
      clockIn: {
        gte: start,
        lte: end,
      },
    },
    orderBy: { clockIn: 'desc' },
    select: {
      id: true,
      clockIn: true,
      clockOut: true,
      totalWork: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function GET(req: NextRequest) {
  try {
    // CRITICAL: Validate version FIRST before ANY database operations
    const versionError = validateAgentVersion(req);
    if (versionError) return versionError;

    const { device } = await requireDeviceAuth(req)
    const url = new URL(req.url)

    const startDateStr = url.searchParams.get('startDate')
    const endDateStr = url.searchParams.get('endDate')

    let start: Date
    let end: Date

    try {
      start = parseDate(startDateStr) ?? getDefaultDates().start
      end = parseDate(endDateStr, true) ?? getDefaultDates().end
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 }
      )
    }

    const sessions = await fetchSessions(device.id, device.employeeId, start, end)
    return NextResponse.json({ sessions })
  } catch (error) {
    console.error('Failed to fetch device sessions:', error)

    const message = error instanceof Error ? error.message : ''
    const status = message.includes('authentication') ? 401 : 500
    const errorMsg = status === 401 ? 'Unauthorized' : 'Failed to fetch sessions'

    return NextResponse.json({ error: errorMsg }, { status })
  }
}
