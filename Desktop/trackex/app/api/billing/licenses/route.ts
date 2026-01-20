import { logAuditEvent } from "@/lib/audit/logger";
import { requireOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { broadcastLicenseUpdate } from "@/lib/license-stream";
import { validateEmployeeLicense } from "@/lib/licensing";
import { updateSubscriptionQuantity } from "@/lib/stripe";
import { requireTenantContext } from "@/lib/tenant-context";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

/**
 * GET - List all licenses for the organization
 */
export async function GET(req: NextRequest) {
  try {
    await requireOwner()

    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    const licenses = await prisma.license.findMany({
      where: { organizationId },
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

    // Get counts by status
    const counts = {
      total: licenses.length,
      active: licenses.filter((l) => l.status === "ACTIVE").length,
      pending: licenses.filter((l) => l.status === "PENDING").length,
      inactive: licenses.filter((l) => l.status === "INACTIVE").length,
      expired: licenses.filter((l) => l.status === "EXPIRED").length,
    }

    return NextResponse.json({ licenses, counts })
  } catch (error) {
    console.error("Failed to get licenses:", error)
    return NextResponse.json(
      { error: "Failed to get licenses" },
      { status: 500 }
    )
  }
}

/**
 * POST - Add license(s) to subscription
 */
export async function POST(req: NextRequest) {
  try {
    await requireOwner()

    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { employeeIds, quantity } = body

    // Get organization with subscription
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    })

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      )
    }

    // If specific employees are provided, activate their licenses
    if (employeeIds && Array.isArray(employeeIds)) {
      // Check if org has bypass or is beta tester
      const canBypass = organization.isBetaTester || organization.bypassPayment

      // Count current active licenses
      const activeCount = await prisma.license.count({
        where: { organizationId, status: "ACTIVE" },
      })

      // Check subscription quantity
      const subscriptionRemaining = organization.subscription
        ? organization.subscription.quantity - activeCount
        : 0

      const availableSlots = canBypass
        ? Infinity
        : subscriptionRemaining

      if (!canBypass && employeeIds.length > availableSlots) {
        return NextResponse.json(
          {
            error: `Not enough license slots. Available: ${availableSlots}, Requested: ${employeeIds.length}. Please add more licenses to your subscription.`,
          },
          { status: 400 }
        )
      }

      // Activate licenses for specified employees
      const activatedLicenses = []
      for (const employeeId of employeeIds) {
        // Verify employee belongs to organization
        const employee = await prisma.employee.findFirst({
          where: { id: employeeId, organizationId },
        })

        if (!employee) {
          continue
        }

        // Determine license source
        let source = "STRIPE"
        if (canBypass) {
          source = organization.isBetaTester ? "BETA_BYPASS" : "MANUAL"
        }

        const license = await prisma.license.upsert({
          where: { employeeId },
          update: {
            status: "ACTIVE",
            source,
            activatedAt: new Date(),
            deactivatedAt: null,
          },
          create: {
            organizationId,
            employeeId,
            status: "ACTIVE",
            source,
            activatedAt: new Date(),
          },
        })

        activatedLicenses.push(license)

        await logAuditEvent(
          {
            action: "license_activate" as any,
            organizationId,
            targetType: "License",
            targetId: license.id,
            details: JSON.stringify({
              employeeId,
              source,
              method: "owner_activation",
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
      }

      return NextResponse.json({
        success: true,
        activated: activatedLicenses.length,
      })
    }

    // If quantity is provided, update subscription quantity
    if (quantity && organization.subscription) {
      const currentQuantity = organization.subscription.quantity
      const newQuantity = currentQuantity + quantity

      if (newQuantity < 0) {
        return NextResponse.json(
          { error: "Cannot reduce licenses below zero" },
          { status: 400 }
        )
      }

      await updateSubscriptionQuantity(organizationId, newQuantity)

      await logAuditEvent(
        {
          action: "subscription_update" as any,
          organizationId,
          targetType: "Subscription",
          targetId: organization.subscription.id,
          details: JSON.stringify({
            previousQuantity: currentQuantity,
            newQuantity,
            change: quantity,
          }),
        },
        req
      )

      return NextResponse.json({
        success: true,
        previousQuantity: currentQuantity,
        newQuantity,
      })
    }

    return NextResponse.json(
      { error: "Either employeeIds or quantity is required" },
      { status: 400 }
    )
  } catch (error) {
    console.error("Failed to add licenses:", error)
    return NextResponse.json(
      { error: "Failed to add licenses" },
      { status: 500 }
    )
  }
}

/**
 * DELETE - Remove/deactivate license(s)
 */
export async function DELETE(req: NextRequest) {
  try {
    await requireOwner()

    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const { employeeIds } = body

    if (!employeeIds || !Array.isArray(employeeIds)) {
      return NextResponse.json(
        { error: "employeeIds array is required" },
        { status: 400 }
      )
    }

    // Deactivate licenses for specified employees
    const deactivated = []
    for (const employeeId of employeeIds) {
      const license = await prisma.license.findFirst({
        where: { employeeId, organizationId },
      })

      if (!license) {
        continue
      }

      await prisma.license.update({
        where: { id: license.id },
        data: {
          status: "INACTIVE",
          deactivatedAt: new Date(),
        },
      })

      deactivated.push(employeeId)

      await logAuditEvent(
        {
          action: "license_deactivate" as any,
          organizationId,
          targetType: "License",
          targetId: license.id,
          details: JSON.stringify({
            employeeId,
            method: "owner_deactivation",
          }),
        },
        req
      )
    }

    return NextResponse.json({
      success: true,
      deactivated: deactivated.length,
    })
  } catch (error) {
    console.error("Failed to remove licenses:", error)
    return NextResponse.json(
      { error: "Failed to remove licenses" },
      { status: 500 }
    )
  }
}
