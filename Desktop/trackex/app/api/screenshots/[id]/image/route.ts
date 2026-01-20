import { NextRequest, NextResponse } from 'next/server'
import { requireOwner } from '@/lib/auth/rbac'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const screenshot = await prisma.screenshot.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!screenshot) {
      return NextResponse.json(
        { error: 'Screenshot not found' },
        { status: 404 }
      )
    }

    // First try to get the image data from the completed job
    const job = await prisma.job.findFirst({
      where: {
        employeeId: screenshot.employeeId,
        deviceId: screenshot.deviceId,
        type: 'screenshot',
        status: 'completed',
        completedAt: {
          gte: new Date(screenshot.takenAt.getTime() - 60000), // Within 1 minute of screenshot
          lte: new Date(screenshot.takenAt.getTime() + 60000),
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    })

    if (job?.result) {
      try {
        const result = JSON.parse(job.result)
        const screenshotData = result.screenshot_data

        if (screenshotData) {
          // If it's base64 data, extract the actual image data
          let imageData = screenshotData
          let contentType = 'image/png'

          if (screenshotData.startsWith('data:')) {
            // Extract content type and data from data URL
            const matches = screenshotData.match(/^data:([^;]+);base64,(.+)$/)
            if (matches) {
              contentType = matches[1]
              imageData = matches[2]
            }
          }

          // Convert base64 to buffer
          const buffer = Buffer.from(imageData, 'base64')

          return new NextResponse(buffer, {
            headers: {
              'Content-Type': contentType,
              'Content-Length': buffer.length.toString(),
              'Cache-Control': 'private, max-age=3600',
            },
          })
        }
      } catch (e) {
        console.error('Failed to parse job result for screenshot:', e)
      }
    }

    // If no image data found, return a placeholder or 404
    return NextResponse.json(
      { error: 'Screenshot image not available' },
      { status: 404 }
    )
  } catch (error) {
    console.error('Failed to fetch screenshot image:', error)
    return NextResponse.json(
      { error: 'Failed to fetch screenshot image' },
      { status: 500 }
    )
  }
}

