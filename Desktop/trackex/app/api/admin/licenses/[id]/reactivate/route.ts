import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { broadcastLicenseUpdate } from "@/lib/license-stream"
import { validateEmployeeLicense } from "@/lib/licensing"
import { addMonths } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/licenses/[id]/reactivate
 *
 * Super Admin only: Reactivate a previously deactivated license
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { notes, extendExpiry = true } = body

    // Get existing license
    const existingLicense = await prisma.license.findUnique({
      where: { id: params.id },
      include: { employee: true },
    })

    if (!existingLicense) {
      return NextResponse.json({ error: "License not found" }, { status: 404 })
    }

    if (existingLicense.status === "ACTIVE") {
      return NextResponse.json(
        { error: "License is already active" },
        { status: 400 }
      )
    }

    // Calculate new expiry for MANUAL/BETA_BYPASS licenses
    let newExpiresAt = existingLicense.expiresAt
    if (
      extendExpiry &&
      (existingLicense.source === "MANUAL" ||
        existingLicense.source === "BETA_BYPASS")
    ) {
      // Give a fresh 1-month expiry from now
      newExpiresAt = addMonths(new Date(), 1)
    }

    // Reactivate license
    const license = await prisma.license.update({
      where: { id: params.id },
      data: {
        status: "ACTIVE",
        deactivatedAt: null,
        expiresAt: newExpiresAt,
        notes: notes || `Reactivated by Super Admin`,
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "license_reactivate" as any,
        organizationId: existingLicense.organizationId,
        targetType: "License",
        targetId: license.id,
        details: JSON.stringify({
          employeeId: existingLicense.employeeId,
          employeeName: existingLicense.employee.name,
          reactivatedBy: session.user.id,
          reactivatedByEmail: session.user.email,
          newExpiresAt: newExpiresAt?.toISOString(),
        }),
      },
      req
    )

    // Broadcast license reactivation to connected agents
    const licenseStatus = await validateEmployeeLicense(
      existingLicense.employeeId
    )
    broadcastLicenseUpdate(existingLicense.employeeId, {
      type: "license_renewed",
      timestamp: new Date().toISOString(),
      employeeId: existingLicense.employeeId,
      valid: licenseStatus.valid,
      status: licenseStatus.status ?? undefined,
      message: "Your license has been reactivated",
      expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
    })

    return NextResponse.json({
      success: true,
      message: "License reactivated successfully",
      license,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    console.error("Error reactivating license:", error)
    return NextResponse.json(
      { error: "Failed to reactivate license" },
      { status: 500 }
    )
  }
}
