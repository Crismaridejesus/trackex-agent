import { NextRequest, NextResponse } from "next/server"
import { requireDeviceAuth } from "@/lib/auth/device"
import { prisma } from "@/lib/db"
import { validateAgentVersion } from "@/lib/version-validator"
import { z } from "zod"

export const dynamic = "force-dynamic"

const screenshotSchema = z.object({
  cloudinaryPublicId: z.string().min(1),
  cloudinaryUrl: z.string().url(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  format: z.string().min(1),
  bytes: z.number().int().positive(),
  isAuto: z.boolean().default(false),
  takenAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: "Invalid takenAt timestamp",
  }),
})

/**
 * POST /api/agent/screenshots
 * 
 * Records a screenshot that has been uploaded to Cloudinary.
 * Called by the desktop agent after successful Cloudinary upload.
 */
export async function POST(req: NextRequest) {
  try {
    // Validate version first
    const versionError = validateAgentVersion(req)
    if (versionError) return versionError

    // Authenticate device
    const { device } = await requireDeviceAuth(req)

    // Parse and validate request body
    const body = await req.json()
    const data = screenshotSchema.parse(body)

    // Create screenshot record
    const screenshot = await prisma.screenshot.create({
      data: {
        employeeId: device.employeeId,
        deviceId: device.id,
        cloudinaryPublicId: data.cloudinaryPublicId,
        cloudinaryUrl: data.cloudinaryUrl,
        width: data.width,
        height: data.height,
        format: data.format,
        bytes: data.bytes,
        isAuto: data.isAuto,
        takenAt: new Date(data.takenAt),
      },
    })

    console.log(
      `Screenshot recorded: ${screenshot.id} (${data.width}x${data.height}, ${data.bytes} bytes, auto=${data.isAuto})`
    )

    return NextResponse.json({
      id: screenshot.id,
      message: "Screenshot recorded successfully",
    })
  } catch (error) {
    console.error("Failed to record screenshot:", error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: "Invalid request data", 
          details: error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
        },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to record screenshot" },
      { status: 500 }
    )
  }
}

/**
 * GET /api/agent/screenshots
 * 
 * Get recent screenshots for the authenticated device's employee.
 */
export async function GET(req: NextRequest) {
  try {
    // Validate version first
    const versionError = validateAgentVersion(req)
    if (versionError) return versionError

    // Authenticate device
    const { device } = await requireDeviceAuth(req)

    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get("limit") || "10")
    const offset = parseInt(searchParams.get("offset") || "0")

    const screenshots = await prisma.screenshot.findMany({
      where: {
        employeeId: device.employeeId,
        deviceId: device.id,
      },
      select: {
        id: true,
        cloudinaryUrl: true,
        width: true,
        height: true,
        format: true,
        bytes: true,
        isAuto: true,
        takenAt: true,
      },
      orderBy: { takenAt: "desc" },
      take: Math.min(limit, 50),
      skip: offset,
    })

    return NextResponse.json({ screenshots })
  } catch (error) {
    console.error("Failed to fetch screenshots:", error)

    if (error instanceof Error && error.message.includes("token")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: "Failed to fetch screenshots" },
      { status: 500 }
    )
  }
}
