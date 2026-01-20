import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/admin/organizations/[id]/beta
 *
 * Super Admin only: Toggle beta tester status for an organization.
 * When enabled, all employees in the organization can use the agent without payment.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { enabled = true, bypassPayment = true } = body

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: params.id },
      data: {
        isBetaTester: enabled,
        bypassPayment: bypassPayment,
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "license_beta_bypass" as any,
        organizationId: organization.id,
        targetType: "Organization",
        targetId: organization.id,
        details: JSON.stringify({
          organizationName: organization.name,
          previousState: {
            isBetaTester: organization.isBetaTester,
            bypassPayment: organization.bypassPayment,
          },
          newState: {
            isBetaTester: enabled,
            bypassPayment,
          },
          updatedBy: session.user.id,
          updatedByEmail: session.user.email,
        }),
      },
      req
    )

    return NextResponse.json({
      success: true,
      organization: {
        id: updated.id,
        name: updated.name,
        isBetaTester: updated.isBetaTester,
        bypassPayment: updated.bypassPayment,
      },
      message: enabled
        ? "Beta tester mode enabled. All employees can now use the agent without payment."
        : "Beta tester mode disabled. Employees will need valid licenses.",
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to toggle beta status:", error)
    return NextResponse.json(
      { error: "Failed to toggle beta status" },
      { status: 500 }
    )
  }
}
