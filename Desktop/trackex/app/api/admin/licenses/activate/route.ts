import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { broadcastLicenseUpdate } from "@/lib/license-stream"
import { validateEmployeeLicense } from "@/lib/licensing"
import { addMonths } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/licenses/activate
 *
 * Super Admin only: Manually activate licenses for employees.
 * Bypasses payment requirements entirely.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const {
      employeeIds,
      source = "MANUAL",
      tier = "TEAM",
      includesAutoScreenshots = false,
      notes,
    } = body

    if (
      !employeeIds ||
      !Array.isArray(employeeIds) ||
      employeeIds.length === 0
    ) {
      return NextResponse.json(
        { error: "employeeIds array is required" },
        { status: 400 }
      )
    }

    const validSources = ["MANUAL", "BETA_BYPASS"]
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      )
    }

    const validTiers = ["STARTER", "TEAM"]
    if (!validTiers.includes(tier)) {
      return NextResponse.json(
        { error: `Invalid tier. Must be one of: ${validTiers.join(", ")}` },
        { status: 400 }
      )
    }

    const activated = []
    const failed = []

    // Calculate expiry date: 1 month from now for MANUAL and BETA_BYPASS
    const oneMonthFromNow = addMonths(new Date(), 1)

    for (const employeeId of employeeIds) {
      try {
        // Get employee to verify it exists and get org ID
        const employee = await prisma.employee.findUnique({
          where: { id: employeeId },
          select: { id: true, name: true, email: true, organizationId: true },
        })

        if (!employee) {
          failed.push({ employeeId, reason: "Employee not found" })
          continue
        }

        if (!employee.organizationId) {
          failed.push({ employeeId, reason: "Employee has no organization" })
          continue
        }

        // Upsert license
        const license = await prisma.license.upsert({
          where: { employeeId },
          update: {
            status: "ACTIVE",
            source,
            tier,
            includesAutoScreenshots,
            activatedAt: new Date(),
            expiresAt: oneMonthFromNow,
            deactivatedAt: null,
            notes: notes || `Manually activated by Super Admin`,
          },
          create: {
            organizationId: employee.organizationId,
            employeeId,
            status: "ACTIVE",
            source,
            tier,
            includesAutoScreenshots,
            activatedAt: new Date(),
            expiresAt: oneMonthFromNow,
            notes: notes || `Manually activated by Super Admin`,
          },
        })

        activated.push({
          employeeId,
          employeeName: employee.name,
          employeeEmail: employee.email,
          licenseId: license.id,
        })

        // Audit log
        await logAuditEvent(
          {
            action: "license_manual_activate" as any,
            organizationId: employee.organizationId,
            targetType: "License",
            targetId: license.id,
            details: JSON.stringify({
              employeeId,
              employeeName: employee.name,
              source,
              activatedBy: session.user.id,
              activatedByEmail: session.user.email,
            }),
          },
          req
        )

        // Broadcast license update to connected agents
        const licenseStatus = await validateEmployeeLicense(employeeId)
        broadcastLicenseUpdate(employeeId, {
          type: "license_updated",
          timestamp: new Date().toISOString(),
          employeeId,
          valid: licenseStatus.valid,
          status: licenseStatus.status ?? undefined,
          message: licenseStatus.message,
          expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
        })
      } catch (error) {
        console.error(`Failed to activate license for ${employeeId}:`, error)
        failed.push({ employeeId, reason: "Database error" })
      }
    }

    return NextResponse.json({
      success: true,
      activated: activated.length,
      failed: failed.length,
      details: { activated, failed },
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to activate licenses:", error)
    return NextResponse.json(
      { error: "Failed to activate licenses" },
      { status: 500 }
    )
  }
}
