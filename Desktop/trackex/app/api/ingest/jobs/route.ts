import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireDeviceAuth } from '@/lib/auth/device'
import { validateAgentVersion } from '@/lib/version-validator'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    // CRITICAL: Validate version FIRST before ANY database operations
    const versionError = validateAgentVersion(req);
    if (versionError) return versionError;

    const { device } = await requireDeviceAuth(req)

    // Get pending jobs for this device
    const jobs = await prisma.job.findMany({
      where: {
        deviceId: device.id,
        status: 'pending',
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 10, // Limit to 10 jobs at a time
    })

    // Mark jobs as 'in_progress' so they don't get picked up again
    if (jobs.length > 0) {
      await prisma.job.updateMany({
        where: {
          id: {
            in: jobs.map(job => job.id),
          },
        },
        data: {
          status: 'in_progress',
          startedAt: new Date(),
        },
      })
    }

    return NextResponse.json({ 
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        data: job.data ? JSON.parse(job.data) : null,
        createdAt: job.createdAt,
      })),
    })
  } catch (error) {
    console.error('Jobs polling error:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const { device } = await requireDeviceAuth(req)

    const body = await req.json()
    const { jobId, status, result } = body

    // Update job status
    await prisma.job.update({
      where: { 
        id: jobId,
        deviceId: device.id, // Ensure job belongs to this device
      },
      data: {
        status,
        completedAt: status === 'completed' ? new Date() : undefined,
        result: result ? JSON.stringify(result) : undefined,
      },
    })

    return NextResponse.json({ 
      success: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Job update error:', error)
    
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    )
  }
}