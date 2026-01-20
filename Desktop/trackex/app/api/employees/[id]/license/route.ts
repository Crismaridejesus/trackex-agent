import { logAuditEvent } from "@/lib/audit/logger";
import { requireOwner } from "@/lib/auth/rbac";
import { FREE_LICENSE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { broadcastLicenseUpdate } from "@/lib/license-stream";
import { LicenseSource, getSeatAvailability, validateEmployeeLicense } from "@/lib/licensing";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

/**
 * GET /api/employees/[id]/license
 *
 * Get license status for a specific employee, including seat availability
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        license: true,
        organization: {
          select: {
            id: true,
            name: true,
            isBetaTester: true,
            bypassPayment: true,
          },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    if (!employee.organization) {
      return NextResponse.json(
        { error: "Employee has no organization" },
        { status: 400 }
      )
    }

    const hasPaymentBypass =
      employee.organization.isBetaTester || employee.organization.bypassPayment

    // Get seat availability for activation decisions
    const seatAvailability = await getSeatAvailability(employee.organization.id)

    return NextResponse.json({
      license: employee.license,
      organization: {
        isBetaTester: employee.organization.isBetaTester,
        bypassPayment: employee.organization.bypassPayment,
      },
      effectiveStatus: {
        hasLicense: !!employee.license && employee.license.status === "ACTIVE",
        hasPaymentBypass,
        canUseAgent:
          hasPaymentBypass ||
          (!!employee.license && employee.license.status === "ACTIVE"),
      },
      seatAvailability,
    })
  } catch (error) {
    console.error("Failed to get employee license:", error)
    return NextResponse.json(
      { error: "Failed to get employee license" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/employees/[id]/license
 *
 * Activate or update license for a specific employee
 *
 * Flow:
 * 1. Check if employee already has active license (skip seat check)
 * 2. If activating, check seat availability:
 *    - Beta/bypass orgs: always allowed
 *    - Subscription seats remaining: use STRIPE source
 *    - No seats: return 402 Payment Required with redirect info
 * 3. Create/update license with appropriate source
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const body = await req.json()
    const {
      status = "ACTIVE",
      source: requestedSource,
      expiresAt,
      notes,
      forceActivation = false, // Allow bypass for SUPER_ADMIN if needed
    } = body

    const validStatuses = ["ACTIVE", "INACTIVE", "PENDING"]
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        {
          error: `Invalid status. Must be one of: ${validStatuses.join(", ")}`,
        },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        license: true,
        organization: {
          select: { id: true, name: true },
        },
      },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    if (!employee.organizationId) {
      return NextResponse.json(
        { error: "Employee has no organization" },
        { status: 400 }
      )
    }

    // If just updating status to INACTIVE or PENDING, no seat check needed
    if (status !== "ACTIVE") {
      const license = await prisma.license.upsert({
        where: { employeeId: params.id },
        update: {
          status,
          deactivatedAt: new Date(),
          notes: notes || `License ${status.toLowerCase()} by manager`,
        },
        create: {
          organizationId: employee.organizationId,
          employeeId: params.id,
          status,
          source: requestedSource || "PENDING",
          notes: notes || `License created as ${status.toLowerCase()}`,
        },
      })

      await logAuditEvent(
        {
          action: "license_update" as any,
          organizationId: employee.organizationId,
          targetType: "License",
          targetId: license.id,
          details: JSON.stringify({
            employeeId: params.id,
            employeeName: employee.name,
            status,
          }),
        },
        req
      )

      return NextResponse.json({
        success: true,
        license,
      })
    }

    // For ACTIVE status, check seat availability
    const seatAvailability = await getSeatAvailability(employee.organizationId)

    // Check if already has active license (reactivation doesn't consume new seat)
    const isReactivation = employee.license?.status === "ACTIVE"

    if (
      !isReactivation &&
      !seatAvailability.hasAvailableSeats &&
      !forceActivation
    ) {
      return NextResponse.json(
        {
          error: "No available license seats",
          code: "SEATS_EXHAUSTED",
          message: seatAvailability.message,
          requiresPayment: true,
          seatAvailability,
          redirectTo: "/app/billing",
        },
        { status: 402 }
      ) // 402 Payment Required
    }

    // Determine the source based on availability (unless explicitly requested)
    let source: LicenseSource = requestedSource as LicenseSource

    if (!requestedSource) {
      if (seatAvailability.hasPaymentBypass) {
        source =
          seatAvailability.bypassReason === "BETA_TESTER"
            ? "BETA_BYPASS"
            : "MANUAL"
      } else if (seatAvailability.recommendedSource) {
        source = seatAvailability.recommendedSource
      } else {
        source = "MANUAL"
      }
    }

    // Validate the source is allowed
    const validSources: LicenseSource[] = [
      "STRIPE",
      "MANUAL",
      "BETA_BYPASS",
      "TRIAL",
    ]
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: `Invalid source. Must be one of: ${validSources.join(", ")}` },
        { status: 400 }
      )
    }

    // Calculate expiration based on license source
    let licenseExpiresAt = expiresAt ? new Date(expiresAt) : null

    // Create/update the license
    const license = await prisma.license.upsert({
      where: { employeeId: params.id },
      update: {
        status: "ACTIVE",
        source,
        tier: source === "TRIAL" ? "STARTER" : "TEAM",
        activatedAt: new Date(),
        deactivatedAt: null,
        expiresAt: licenseExpiresAt,
        notes: notes || `License activated by manager (source: ${source})`,
      },
      create: {
        organizationId: employee.organizationId,
        employeeId: params.id,
        status: "ACTIVE",
        source,
        tier: source === "TRIAL" ? "STARTER" : "TEAM",
        activatedAt: new Date(),
        expiresAt: licenseExpiresAt,
        notes: notes || `License created by manager (source: ${source})`,
      },
    })

    await logAuditEvent(
      {
        action: "license_update" as any,
        organizationId: employee.organizationId,
        targetType: "License",
        targetId: license.id,
        details: JSON.stringify({
          employeeId: params.id,
          employeeName: employee.name,
          status: "ACTIVE",
          source,
          expiresAt: licenseExpiresAt,
          seatAvailability: {
            totalRemaining: seatAvailability.totalRemaining,
            subscriptionSeatsRemaining:
              seatAvailability.subscriptionSeatsRemaining,
          },
        }),
      },
      req
    )

    // Broadcast license update to connected agents
    const licenseStatus = await validateEmployeeLicense(params.id)
    broadcastLicenseUpdate(params.id, {
      type: "license_updated",
      timestamp: new Date().toISOString(),
      employeeId: params.id,
      valid: licenseStatus.valid,
      status: licenseStatus.status ?? undefined,
      message: licenseStatus.message,
      expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
    })

    return NextResponse.json({
      success: true,
      license,
      source,
      seatAvailability: {
        totalRemaining:
          seatAvailability.totalRemaining - (isReactivation ? 0 : 1),
        message: `License activated using ${source}`,
      },
    })
  } catch (error) {
    console.error("Failed to update employee license:", error)
    return NextResponse.json(
      { error: "Failed to update employee license" },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/employees/[id]/license
 *
 * Deactivate license for a specific employee
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    const body = await req.json().catch(() => ({}))
    const { notes } = body

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: { license: true },
    })

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    if (!employee.license) {
      return NextResponse.json(
        { error: "Employee has no license to deactivate" },
        { status: 404 }
      )
    }

    const license = await prisma.license.update({
      where: { employeeId: params.id },
      data: {
        status: "INACTIVE",
        deactivatedAt: new Date(),
        notes: notes || `License deactivated by manager`,
      },
    })

    await logAuditEvent(
      {
        action: "license_deactivate" as any,
        organizationId: employee.organizationId,
        targetType: "License",
        targetId: license.id,
        details: JSON.stringify({
          employeeId: params.id,
          employeeName: employee.name,
        }),
      },
      req
    )

    // Broadcast license revocation to connected agents
    broadcastLicenseUpdate(params.id, {
      type: "license_revoked",
      timestamp: new Date().toISOString(),
      employeeId: params.id,
      valid: false,
      status: "INACTIVE",
      message: "License has been deactivated",
    })

    return NextResponse.json({
      success: true,
      license,
    })
  } catch (error) {
    console.error("Failed to deactivate employee license:", error)
    return NextResponse.json(
      { error: "Failed to deactivate employee license" },
      { status: 500 }
    )
  }
}
