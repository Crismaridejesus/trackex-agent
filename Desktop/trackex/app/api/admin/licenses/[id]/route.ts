import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { broadcastLicenseUpdate } from "@/lib/license-stream"
import { validateEmployeeLicense } from "@/lib/licensing"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * PATCH /api/admin/licenses/[id]
 *
 * Super Admin only: Update license details (tier, add-ons, notes)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { tier, includesAutoScreenshots, notes } = body

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

    // Update license
    const license = await prisma.license.update({
      where: { id: params.id },
      data: {
        ...(tier && { tier }),
        ...(typeof includesAutoScreenshots === "boolean" && {
          includesAutoScreenshots,
        }),
        ...(notes && { notes }),
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "license_update" as any,
        organizationId: existingLicense.organizationId,
        targetType: "License",
        targetId: license.id,
        details: JSON.stringify({
          employeeId: existingLicense.employeeId,
          changes: body,
          updatedBy: session.user.id,
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
      message: licenseStatus.message,
      expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
    })

    return NextResponse.json({ success: true, license })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.error("Error updating license:", error)
    return NextResponse.json(
      { error: "Failed to update license" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/licenses/[id]
 *
 * Super Admin only: Deactivate a license (soft delete)
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { notes, hardDelete = false } = body

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

    let license

    // Hard delete only for PENDING licenses that were never activated
    if (hardDelete && existingLicense.status === "PENDING" && !existingLicense.activatedAt) {
      await prisma.license.delete({
        where: { id: params.id },
      })

      await logAuditEvent(
        {
          action: "license_delete" as any,
          organizationId: existingLicense.organizationId,
          targetType: "License",
          targetId: params.id,
          details: JSON.stringify({
            employeeId: existingLicense.employeeId,
            employeeName: existingLicense.employee.name,
            deletedBy: session.user.id,
            reason: "Hard delete of pending license",
          }),
        },
        req
      )

      return NextResponse.json({ 
        success: true, 
        message: "License permanently deleted",
        hardDeleted: true 
      })
    }

    // Soft delete (deactivate) for all other cases
    license = await prisma.license.update({
      where: { id: params.id },
      data: {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        notes: notes || `Deactivated by Super Admin`,
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "license_deactivate" as any,
        organizationId: existingLicense.organizationId,
        targetType: "License",
        targetId: license.id,
        details: JSON.stringify({
          employeeId: existingLicense.employeeId,
          employeeName: existingLicense.employee.name,
          deactivatedBy: session.user.id,
          deactivatedByEmail: session.user.email,
        }),
      },
      req
    )

    // Broadcast license revocation to connected agents
    broadcastLicenseUpdate(existingLicense.employeeId, {
      type: "license_revoked",
      timestamp: new Date().toISOString(),
      employeeId: existingLicense.employeeId,
      valid: false,
      status: "INACTIVE",
      message: "Your license has been deactivated by an administrator",
      expiresAt: null,
    })

    return NextResponse.json({ 
      success: true, 
      message: "License deactivated successfully",
      license 
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.error("Error deactivating license:", error)
    return NextResponse.json(
      { error: "Failed to deactivate license" },
      { status: 500 }
    )
  }
}
