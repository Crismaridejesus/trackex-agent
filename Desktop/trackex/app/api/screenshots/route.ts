import { logAuditEvent } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { checkEmployeeLicenseStatus } from "@/lib/licensing";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

// ---- Helper: build job response with org check ----
async function handleJobRequest(jobId: string, organizationId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: {
      employee: {
        select: { id: true, name: true, email: true, organizationId: true },
      },
      device: { select: { id: true, deviceName: true, platform: true } },
    },
  })

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  // Verify employee belongs to the organization
  if (job.employee.organizationId !== organizationId) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 })
  }

  if (job.type !== "screenshot") {
    return NextResponse.json(
      { error: "Job is not a screenshot job" },
      { status: 400 }
    )
  }

  const response: Record<string, unknown> = {
    jobId: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    employee: {
      id: job.employee.id,
      name: job.employee.name,
      email: job.employee.email,
    },
    device: job.device,
  }

  if (job.status === "completed" && job.result) {
    try {
      const result = JSON.parse(job.result)

      // Extract Cloudinary data (required)
      response.cloudinaryUrl = result.cloudinaryUrl
      response.cloudinaryPublicId = result.cloudinaryPublicId
      response.width = result.width
      response.height = result.height
      response.format = result.format
      response.bytes = result.bytes
      response.timestamp = result.timestamp
    } catch (e) {
      console.error("Failed to parse job result:", e)
    }
  }

  return NextResponse.json(response)
}

// ---- Helper: build screenshot filters with org scope ----
function buildScreenshotFilters(
  params: URLSearchParams,
  organizationId: string
) {
  const employeeId = params.get("employeeId")
  const deviceId = params.get("deviceId")
  const startDate = params.get("startDate")
  const endDate = params.get("endDate")

  return {
    ...(employeeId && { employeeId }),
    ...(deviceId && { deviceId }),
    ...(startDate &&
      endDate && {
        takenAt: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      }),
    employee: {
      isActive: true,
      organizationId, // Scope to organization
    },
  }
}

// ---- Helper: handle screenshot listing ----
async function handleScreenshotListing(
  params: URLSearchParams,
  organizationId: string
) {
  const filters = buildScreenshotFilters(params, organizationId)
  const limit = parseInt(params.get("limit") || "50")
  const offset = parseInt(params.get("offset") || "0")

  const [screenshots, total] = await Promise.all([
    prisma.screenshot.findMany({
      where: filters,
      include: {
        employee: { select: { id: true, name: true, email: true } },
        device: { select: { id: true, deviceName: true, platform: true } },
      },
      orderBy: { takenAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.screenshot.count({ where: filters }),
  ])

  return NextResponse.json({
    screenshots,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  })
}

// ---- Main handler ----
export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get("jobId")

    if (jobId) {
      return await handleJobRequest(jobId, organizationId)
    }

    return await handleScreenshotListing(searchParams, organizationId)
  } catch (error) {
    console.error("Failed to fetch screenshots:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenshots" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    const body = await req.json()
    const { employeeId, deviceId } = body

    // Check license tier - manual screenshots require TEAM tier
    const { hasLicense, licenseTier } = await checkEmployeeLicenseStatus(employeeId)
    
    // Reject if STARTER/FREE tier (only TEAM tier can request manual screenshots)
    if (!hasLicense || licenseTier === "STARTER") {
      return NextResponse.json(
        {
          error: "Manual screenshots require Team plan. Upgrade to access this feature.",
          requiresUpgrade: true,
          currentTier: licenseTier || "FREE",
        },
        { status: 403 }
      )
    }

    let device

    if (deviceId) {
      // Use specific device if provided - verify org ownership
      device = await prisma.device.findUnique({
        where: { id: deviceId },
        include: {
          employee: true,
        },
      })
      // Verify employee belongs to organization
      if (device && device.employee.organizationId !== organizationId) {
        device = null
      }
    } else if (employeeId) {
      // Find the most recently active device for the employee within org
      device = await prisma.device.findFirst({
        where: {
          employeeId: employeeId,
          isActive: true,
          employee: {
            organizationId, // Scope to organization
          },
        },
        include: {
          employee: true,
        },
        orderBy: {
          lastSeen: "desc",
        },
      })
    }

    if (!device || !device.employee.isActive) {
      return NextResponse.json(
        { error: "No active device found for employee" },
        { status: 400 }
      )
    }

    // Create a screenshot job for the desktop agent
    const job = await prisma.job.create({
      data: {
        employeeId: device.employeeId,
        deviceId: device.id,
        type: "screenshot",
        status: "pending",
        data: JSON.stringify({
          requestedBy: "dashboard",
          timestamp: new Date().toISOString(),
        }),
      },
    })

    await logAuditEvent(
      {
        action: "screenshot_request",
        organizationId: device.employee.organizationId,
        targetType: "Employee",
        targetId: employeeId,
        details: JSON.stringify({
          employeeName: device.employee.name,
          deviceName: device.deviceName,
          jobId: job.id,
        }),
      },
      req
    )

    return NextResponse.json({
      success: true,
      message: "Screenshot request queued",
      jobId: job.id,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to request screenshot:", error)
    return NextResponse.json(
      {
        error: "Failed to request screenshot",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
