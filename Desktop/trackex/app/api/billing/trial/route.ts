/**
 * Trial Management API
 *
 * GET - Get trial status for the organization
 * POST - Start a free trial
 */

import { TRIAL } from "@/lib/constants"
import { requireTenantContext } from "@/lib/tenant-context"
import {
  canUseProduct,
  createTrialLicenses,
  getEffectiveTier,
  getTrialStatus,
  startTrial,
} from "@/lib/trial"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const trialStatus = await getTrialStatus(organizationId)
    const productAccess = await canUseProduct(organizationId)
    const effectiveTier = await getEffectiveTier(organizationId)

    return NextResponse.json({
      trial: {
        ...trialStatus,
        config: {
          durationDays: TRIAL.durationDays,
          features: TRIAL.features,
          maxEmployees: TRIAL.maxEmployees,
        },
      },
      productAccess: {
        canUse: productAccess.canUse,
        reason: productAccess.reason,
      },
      effectiveTier: {
        tier: effectiveTier.tier,
        source: effectiveTier.source,
      },
    })
  } catch (error) {
    console.error("Error fetching trial status:", error)
    return NextResponse.json(
      { error: "Failed to fetch trial status" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Parse request body for optional employee selection
    let selectedEmployeeId: string | undefined
    try {
      const body = await request.json()
      selectedEmployeeId = body.employeeId
    } catch {
      // No body or invalid JSON is fine - will use default behavior
    }

    // Start the trial
    const result = await startTrial(organizationId)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Create trial license for selected employee (or first available - Starter tier = 1 seat only)
    const licensesCreated = await createTrialLicenses(
      organizationId,
      selectedEmployeeId
    )

    return NextResponse.json({
      success: true,
      trialEndsAt: result.trialEndsAt,
      licensesCreated,
      tier: TRIAL.defaultTier,
      message: `Your ${TRIAL.durationDays}-day free Starter tier license has been activated! ${licensesCreated} employee license activated.`,
    })
  } catch (error) {
    console.error("Error starting trial:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to start trial",
      },
      { status: 500 }
    )
  }
}
