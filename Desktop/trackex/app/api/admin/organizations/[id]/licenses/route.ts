import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { LicenseSource } from "@/lib/licensing"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/organizations/[id]/licenses
 *
 * Super Admin only: Get all licenses for an organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const licenses = await prisma.license.findMany({
      where: { organizationId: params.id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    const summary = {
      total: licenses.length,
      active: licenses.filter((l) => l.status === "ACTIVE").length,
      inactive: licenses.filter((l) => l.status === "INACTIVE").length,
      expired: licenses.filter((l) => l.status === "EXPIRED").length,
      pending: licenses.filter((l) => l.status === "PENDING").length,
      bySource: {
        STRIPE: licenses.filter((l) => l.source === "STRIPE").length,
        MANUAL: licenses.filter((l) => l.source === "MANUAL").length,
        BETA_BYPASS: licenses.filter((l) => l.source === "BETA_BYPASS").length,
        TRIAL: licenses.filter((l) => l.source === "TRIAL").length,
        PENDING: licenses.filter((l) => l.source === "PENDING").length,
      },
    }

    return NextResponse.json({ licenses, summary })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to get organization licenses:", error)
    return NextResponse.json(
      { error: "Failed to get organization licenses" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/organizations/[id]/licenses
 *
 * Super Admin only: Bulk activate licenses for organization employees
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const {
      employeeIds, // Array of employee IDs or 'all'
      source = "MANUAL" as LicenseSource,
      expiresAt,
      notes,
    } = body

    // Validate source
    const validSources: LicenseSource[] = [
      "MANUAL",
      "BETA_BYPASS",
      "STRIPE",
    ]
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      )
    }

    // Get employees to activate
    let employees
    if (employeeIds === "all") {
      employees = await prisma.employee.findMany({
        where: {
          organizationId: params.id,
          isActive: true,
        },
        select: { id: true, name: true, email: true },
      })
    } else if (Array.isArray(employeeIds) && employeeIds.length > 0) {
      employees = await prisma.employee.findMany({
        where: {
          id: { in: employeeIds },
          organizationId: params.id,
        },
        select: { id: true, name: true, email: true },
      })
    } else {
      return NextResponse.json(
        { error: 'employeeIds must be "all" or an array of employee IDs' },
        { status: 400 }
      )
    }

    if (employees.length === 0) {
      return NextResponse.json(
        { error: "No employees found to activate" },
        { status: 404 }
      )
    }

    const activated = []
    const failed = []

    for (const employee of employees) {
      try {
        const license = await prisma.license.upsert({
          where: { employeeId: employee.id },
          update: {
            status: "ACTIVE",
            source,
            activatedAt: new Date(),
            deactivatedAt: null,
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            notes: notes || `Bulk activated by Super Admin`,
          },
          create: {
            organizationId: params.id,
            employeeId: employee.id,
            status: "ACTIVE",
            source,
            activatedAt: new Date(),
            expiresAt: expiresAt ? new Date(expiresAt) : null,
            notes: notes || `Bulk activated by Super Admin`,
          },
        })

        activated.push({
          employeeId: employee.id,
          employeeName: employee.name,
          licenseId: license.id,
        })
      } catch (error) {
        console.error(`Failed to activate license for ${employee.id}:`, error)
        failed.push({ employeeId: employee.id, reason: "Database error" })
      }
    }

    // Audit log
    await logAuditEvent(
      {
        action: "license_bulk_activate" as any,
        organizationId: params.id,
        targetType: "Organization",
        targetId: params.id,
        details: JSON.stringify({
          activatedCount: activated.length,
          failedCount: failed.length,
          source,
          expiresAt,
          notes,
          activatedBy: session.user.id,
          activatedByEmail: session.user.email,
        }),
      },
      req
    )

    return NextResponse.json({
      success: true,
      activated,
      failed,
      summary: {
        total: employees.length,
        activatedCount: activated.length,
        failedCount: failed.length,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to bulk activate licenses:", error)
    return NextResponse.json(
      { error: "Failed to bulk activate licenses" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/organizations/[id]/licenses
 *
 * Super Admin only: Bulk deactivate licenses for organization employees
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const {
      employeeIds, // Array of employee IDs or 'all'
      notes,
    } = body

    // Get licenses to deactivate
    let whereClause: any = { organizationId: params.id, status: "ACTIVE" }
    if (employeeIds !== "all" && Array.isArray(employeeIds)) {
      whereClause.employeeId = { in: employeeIds }
    }

    const result = await prisma.license.updateMany({
      where: whereClause,
      data: {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        notes: notes || `Bulk deactivated by Super Admin`,
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "license_bulk_deactivate" as any,
        organizationId: params.id,
        targetType: "Organization",
        targetId: params.id,
        details: JSON.stringify({
          deactivatedCount: result.count,
          employeeIds: employeeIds === "all" ? "all" : employeeIds,
          notes,
          deactivatedBy: session.user.id,
          deactivatedByEmail: session.user.email,
        }),
      },
      req
    )

    return NextResponse.json({
      success: true,
      deactivatedCount: result.count,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to bulk deactivate licenses:", error)
    return NextResponse.json(
      { error: "Failed to bulk deactivate licenses" },
      { status: 500 }
    )
  }
}
