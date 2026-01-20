import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { broadcastLicenseUpdate } from "@/lib/license-stream"
import { validateEmployeeLicense } from "@/lib/licensing"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/admin/licenses/[id]/addons
 *
 * Super Admin only: Update license add-ons (e.g., remove auto-screenshots)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { includesAutoScreenshots, notes } = body

    if (typeof includesAutoScreenshots !== "boolean") {
      return NextResponse.json(
        { error: "includesAutoScreenshots must be a boolean" },
        { status: 400 }
      )
    }

    // Get existing license
    const existingLicense = await prisma.license.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!existingLicense) {
      return NextResponse.json(
        { error: "License not found" },
        { status: 404 }
      )
    }

    // Update license add-ons
    const license = await prisma.license.update({
      where: { id: params.id },
      data: {
        includesAutoScreenshots,
        notes: notes || `Auto-screenshots ${includesAutoScreenshots ? "added" : "removed"} by Super Admin`,
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "license_addon_update" as any,
        organizationId: existingLicense.organizationId,
        targetType: "License",
        targetId: license.id,
        details: JSON.stringify({
          employeeId: existingLicense.employeeId,
          employeeName: existingLicense.employee.name,
          includesAutoScreenshots,
          updatedBy: session.user.id,
          updatedByEmail: session.user.email,
        }),
      },
      req
    )

    // Broadcast license update to connected agents
    const licenseStatus = await validateEmployeeLicense(
      existingLicense.employeeId
    )
    broadcastLicenseUpdate(existingLicense.employeeId, {
      type: "license_updated",
      timestamp: new Date().toISOString(),
      employeeId: existingLicense.employeeId,
      valid: licenseStatus.valid,
      status: licenseStatus.status ?? undefined,
      message: `License add-ons updated`,
      expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
    })

    return NextResponse.json({ 
      success: true, 
      message: `Auto-screenshots ${includesAutoScreenshots ? "added" : "removed"} successfully`,
      license 
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.error("Error updating license add-ons:", error)
    return NextResponse.json(
      { error: "Failed to update license add-ons" },
      { status: 500 }
    )
  }
}
