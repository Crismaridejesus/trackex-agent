import { prisma } from "@/lib/db"
import { verifyDeviceToken } from "@/lib/utils/device-tokens"
import { isToday, isYesterday, subDays } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    // Get authorization header
    const authHeader = req.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "No authorization token provided" },
        { status: 401 }
      )
    }

    const deviceToken = authHeader.replace("Bearer ", "")

    // Find all active device tokens and verify the provided token
    const deviceTokenRecords = await prisma.deviceToken.findMany({
      where: {
        isActive: true,
      },
      include: {
        device: {
          include: {
            employee: true,
          },
        },
      },
    })

    // Find the matching token by verifying against hashes
    let deviceTokenRecord = null
    for (const record of deviceTokenRecords) {
      if (await verifyDeviceToken(deviceToken, record.tokenHash)) {
        deviceTokenRecord = record
        break
      }
    }

    if (!deviceTokenRecord?.device?.employee) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      )
    }

    const employeeId = deviceTokenRecord.device.employee.id

    // Get recent sessions (last 7 days, max 10 sessions)
    const sessions = await prisma.workSession.findMany({
      where: {
        employeeId: employeeId,
        clockIn: {
          gte: subDays(new Date(), 7), // Last 7 days
        },
      },
      include: {
        device: true,
      },
      orderBy: { clockIn: "desc" },
      take: 10, // Limit to 10 most recent sessions
    })

    // Format sessions for desktop app
    const formattedSessions = sessions.map((session) => {
      const startDate = session.clockIn
      const endDate = session.clockOut
      const duration = endDate
        ? Math.floor((endDate.getTime() - startDate.getTime()) / 1000)
        : Math.floor((new Date().getTime() - startDate.getTime()) / 1000)

      // Format date
      let dateString
      if (isToday(startDate)) {
        dateString = "Today"
      } else if (isYesterday(startDate)) {
        dateString = "Yesterday"
      } else {
        dateString = startDate.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        })
      }

      return {
        id: session.id,
        started_at: session.clockIn.toISOString(),
        ended_at: session.clockOut?.toISOString() || null,
        duration: duration,
        date: dateString,
      }
    })

    return NextResponse.json({ sessions: formattedSessions })
  } catch (error) {
    console.error("Failed to fetch recent sessions:", error)
    return NextResponse.json(
      { error: "Failed to fetch recent sessions" },
      { status: 500 }
    )
  }
}
