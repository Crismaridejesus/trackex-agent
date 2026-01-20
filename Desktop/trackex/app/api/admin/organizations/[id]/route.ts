import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/organizations/[id]
 *
 * Super Admin only: Get organization details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        subscription: true,
        _count: {
          select: {
            employees: { where: { isActive: true } },
            licenses: { where: { status: "ACTIVE" } },
            users: true,
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

    return NextResponse.json({ organization })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to get organization:", error)
    return NextResponse.json(
      { error: "Failed to get organization" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/organizations/[id]
 *
 * Super Admin only: Update organization settings including beta/bypass flags
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const { isBetaTester, bypassPayment, name, isActive } = body

    // Get current organization state for audit
    const currentOrg = await prisma.organization.findUnique({
      where: { id: params.id },
    })

    if (!currentOrg) {
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
      isBetaTester !== currentOrg.isBetaTester
    ) {
      updateData.isBetaTester = isBetaTester
      changes.push(`isBetaTester: ${currentOrg.isBetaTester} → ${isBetaTester}`)
    }

    if (
      typeof bypassPayment === "boolean" &&
      bypassPayment !== currentOrg.bypassPayment
    ) {
      updateData.bypassPayment = bypassPayment
      changes.push(
        `bypassPayment: ${currentOrg.bypassPayment} → ${bypassPayment}`
      )
    }

    if (name && name !== currentOrg.name) {
      updateData.name = name
      changes.push(`name: ${currentOrg.name} → ${name}`)
    }

    if (typeof isActive === "boolean" && isActive !== currentOrg.isActive) {
      updateData.isActive = isActive
      changes.push(`isActive: ${currentOrg.isActive} → ${isActive}`)
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No changes provided" },
        { status: 400 }
      )
    }

    // Update organization
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: updateData,
      include: {
        subscription: true,
        _count: {
          select: {
            employees: { where: { isActive: true } },
            licenses: { where: { status: "ACTIVE" } },
          },
        },
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "organization_update" as any,
        organizationId: organization.id,
        targetType: "Organization",
        targetId: organization.id,
        details: JSON.stringify({
          organizationName: organization.name,
          changes,
          updatedBy: session.user.id,
          updatedByEmail: session.user.email,
        }),
      },
      req
    )

    return NextResponse.json({
      success: true,
      organization,
      changes,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to update organization:", error)
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    )
  }
}
