import { logAuditEvent } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    const screenshot = await prisma.screenshot.findUnique({
      where: { id: params.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            organizationId: true,
          },
        },
        device: {
          select: {
            id: true,
            deviceName: true,
            platform: true,
          },
        },
      },
    })

    if (!screenshot) {
      return NextResponse.json(
        { error: "Screenshot not found" },
        { status: 404 }
      )
    }

    // Verify employee belongs to the organization
    if (screenshot.employee.organizationId !== organizationId) {
      return NextResponse.json(
        { error: "Screenshot not found" },
        { status: 404 }
      )
    }

    // Increment view count
    await prisma.screenshot.update({
      where: { id: params.id },
      data: {
        viewCount: {
          increment: 1,
        },
      },
    })

    // Log the view
    await logAuditEvent(
      {
        action: "screenshot_view",
        organizationId: screenshot.employee.organizationId,
        targetType: "Screenshot",
        targetId: screenshot.id,
        details: {
          employeeName: screenshot.employee.name,
          takenAt: screenshot.takenAt,
        },
      },
      req
    )

    // Return screenshot with Cloudinary URL (exclude organizationId from response)
    const { organizationId: _orgId, ...employeeData } = screenshot.employee
    return NextResponse.json({
      screenshot: {
        ...screenshot,
        employee: employeeData,
        // Cloudinary URL constructed from public ID
        imageUrl: screenshot.cloudinaryPublicId
          ? screenshot.cloudinaryUrl
          : null,
      },
    })
  } catch (error) {
    console.error("Failed to fetch screenshot:", error)
    return NextResponse.json(
      { error: "Failed to fetch screenshot" },
      { status: 500 }
    )
  }
}
