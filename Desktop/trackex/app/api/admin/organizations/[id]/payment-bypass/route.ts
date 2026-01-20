import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/organizations/[id]/payment-bypass
 *
 * Super Admin only: Get payment bypass status for an organization
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        isBetaTester: true,
        bypassPayment: true,
        _count: {
          select: {
            employees: { where: { isActive: true } },
            licenses: { where: { status: "ACTIVE" } },
          },
        },
      },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Determine effective bypass status
    const hasPaymentBypass =
      organization.isBetaTester || organization.bypassPayment

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        isBetaTester: organization.isBetaTester,
        bypassPayment: organization.bypassPayment,
      },
      status: {
        hasPaymentBypass,
        bypassReason: organization.isBetaTester
          ? "BETA_TESTER"
          : organization.bypassPayment
            ? "PAYMENT_BYPASS"
            : null,
        activeEmployees: organization._count.employees,
        activeLicenses: organization._count.licenses,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to get payment bypass status:", error)
    return NextResponse.json(
      { error: "Failed to get payment bypass status" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/organizations/[id]/payment-bypass
 *
 * Super Admin only: Configure payment bypass settings for an organization.
 * This allows organizations to use the agent without payment requirements.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { isBetaTester, bypassPayment, notes } = body

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    const changes: string[] = []

    if (
      typeof isBetaTester === "boolean" &&
      isBetaTester !== organization.isBetaTester
    ) {
      updateData.isBetaTester = isBetaTester
      changes.push(
        `isBetaTester: ${organization.isBetaTester} → ${isBetaTester}`
      )
    }

    if (
      typeof bypassPayment === "boolean" &&
      bypassPayment !== organization.bypassPayment
    ) {
      updateData.bypassPayment = bypassPayment
      changes.push(
        `bypassPayment: ${organization.bypassPayment} → ${bypassPayment}`
      )
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No changes to apply" })
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: params.id },
      data: updateData,
    })

    // Audit log
    await logAuditEvent(
      {
        action: "organization_payment_bypass_update" as any,
        organizationId: organization.id,
        targetType: "Organization",
        targetId: organization.id,
        details: JSON.stringify({
          organizationName: organization.name,
          changes,
          notes,
          updatedBy: session.user.id,
          updatedByEmail: session.user.email,
        }),
      },
      req
    )

    return NextResponse.json({
      success: true,
      message: `Updated payment bypass settings: ${changes.join(", ")}`,
      organization: {
        id: updated.id,
        name: updated.name,
        isBetaTester: updated.isBetaTester,
        bypassPayment: updated.bypassPayment,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to update payment bypass settings:", error)
    return NextResponse.json(
      { error: "Failed to update payment bypass settings" },
      { status: 500 }
    )
  }
}
