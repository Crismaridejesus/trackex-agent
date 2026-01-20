/**
 * Trial Management Module
 *
 * Handles 7-day free trial functionality for organizations.
 * Trial gives access to all features in the TIME_TRACKING tier.
 */

import { PRICING, TRIAL } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { broadcastLicenseUpdate } from "@/lib/license-stream"
import { validateEmployeeLicense } from "@/lib/licensing"
import { addDays, differenceInDays } from "date-fns"

export interface TrialStatus {
  isActive: boolean
  isExpired: boolean
  hasNeverStarted: boolean
  startedAt: Date | null
  endsAt: Date | null
  daysRemaining: number
  hasConverted: boolean
  convertedAt: Date | null
}

/**
 * Get the current trial status for an organization
 */
export async function getTrialStatus(
  organizationId: string
): Promise<TrialStatus> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      trialStartedAt: true,
      trialEndsAt: true,
      trialConvertedAt: true,
      subscription: {
        select: { id: true, status: true },
      },
    },
  })

  if (!organization) {
    return {
      isActive: false,
      isExpired: false,
      hasNeverStarted: true,
      startedAt: null,
      endsAt: null,
      daysRemaining: 0,
      hasConverted: false,
      convertedAt: null,
    }
  }

  const { trialStartedAt, trialEndsAt, trialConvertedAt, subscription } =
    organization
  const now = new Date()

  // Never started trial
  if (!trialStartedAt || !trialEndsAt) {
    return {
      isActive: false,
      isExpired: false,
      hasNeverStarted: true,
      startedAt: null,
      endsAt: null,
      daysRemaining: TRIAL.durationDays,
      hasConverted: false,
      convertedAt: null,
    }
  }

  // Has converted to paid subscription
  if (trialConvertedAt || (subscription && subscription.status === "active")) {
    return {
      isActive: false,
      isExpired: false,
      hasNeverStarted: false,
      startedAt: trialStartedAt,
      endsAt: trialEndsAt,
      daysRemaining: 0,
      hasConverted: true,
      convertedAt: trialConvertedAt,
    }
  }

  // Calculate days remaining
  const daysRemaining = Math.max(
    0,
    Math.ceil(differenceInDays(trialEndsAt, now))
  )

  // Check if expired
  const isExpired = now > trialEndsAt
  const isActive = !isExpired && daysRemaining > 0

  return {
    isActive,
    isExpired,
    hasNeverStarted: false,
    startedAt: trialStartedAt,
    endsAt: trialEndsAt,
    daysRemaining,
    hasConverted: false,
    convertedAt: null,
  }
}

/**
 * Start a trial for an organization
 */
export async function startTrial(
  organizationId: string
): Promise<{ success: boolean; trialEndsAt: Date | null; error?: string }> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      trialStartedAt: true,
      trialConvertedAt: true,
      subscription: { select: { id: true } },
    },
  })

  if (!organization) {
    return {
      success: false,
      trialEndsAt: null,
      error: "Organization not found",
    }
  }

  // Already started trial
  if (organization.trialStartedAt) {
    return {
      success: false,
      trialEndsAt: null,
      error: "Trial has already been started",
    }
  }

  // Already converted
  if (organization.trialConvertedAt) {
    return {
      success: false,
      trialEndsAt: null,
      error: "Organization has already converted from trial",
    }
  }

  const now = new Date()
  const trialEndsAt = addDays(now, TRIAL.durationDays)

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      trialStartedAt: now,
      trialEndsAt: trialEndsAt,
    },
  })

  return { success: true, trialEndsAt }
}

/**
 * Mark trial as converted (called when subscription is created)
 */
export async function convertTrial(organizationId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      trialConvertedAt: new Date(),
    },
  })
}

/**
 * Check if organization can use the product (trial active or has subscription)
 */
export async function canUseProduct(organizationId: string): Promise<{
  canUse: boolean
  reason: "TRIAL" | "SUBSCRIPTION" | "BETA" | "BYPASS" | "EXPIRED" | "NO_ACCESS"
  trialStatus?: TrialStatus
}> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      isBetaTester: true,
      bypassPayment: true,
      trialStartedAt: true,
      trialEndsAt: true,
      trialConvertedAt: true,
      subscription: {
        select: { id: true, status: true },
      },
    },
  })

  if (!organization) {
    return { canUse: false, reason: "NO_ACCESS" }
  }

  // Beta tester bypass
  if (organization.isBetaTester) {
    return { canUse: true, reason: "BETA" }
  }

  // Payment bypass
  if (organization.bypassPayment) {
    return { canUse: true, reason: "BYPASS" }
  }

  // Active subscription
  if (
    organization.subscription &&
    organization.subscription.status === "active"
  ) {
    return { canUse: true, reason: "SUBSCRIPTION" }
  }

  // Check trial status
  const trialStatus = await getTrialStatus(organizationId)

  if (trialStatus.isActive) {
    return { canUse: true, reason: "TRIAL", trialStatus }
  }

  if (trialStatus.isExpired) {
    return { canUse: false, reason: "EXPIRED", trialStatus }
  }

  // No trial started, no subscription
  return { canUse: false, reason: "NO_ACCESS", trialStatus }
}

/**
 * Get effective tier for an organization
 * During trial, they get TIME_TRACKING tier features
 */
export async function getEffectiveTier(organizationId: string): Promise<{
  tier: keyof typeof PRICING.tiers
  source: "TRIAL" | "SUBSCRIPTION" | "DEFAULT"
}> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      subscription: {
        select: { tier: true, status: true },
      },
    },
  })

  if (!organization) {
    return { tier: "PRODUCTIVITY", source: "DEFAULT" }
  }

  // Active subscription tier
  if (
    organization.subscription &&
    organization.subscription.status === "active"
  ) {
    const tier = organization.subscription.tier as keyof typeof PRICING.tiers
    return { tier, source: "SUBSCRIPTION" }
  }

  // Check trial
  const trialStatus = await getTrialStatus(organizationId)
  if (trialStatus.isActive) {
    return { tier: TRIAL.defaultTier, source: "TRIAL" }
  }

  // Default (expired trial or no access)
  return { tier: "PRODUCTIVITY", source: "DEFAULT" }
}

/**
 * Create trial license for ONE employee in an organization (Starter tier limit)
 * Called when trial starts - only assigns 1 seat as per Starter tier
 */
export async function createTrialLicenses(
  organizationId: string,
  selectedEmployeeId?: string
): Promise<number> {
  const trialEndsAt = addDays(new Date(), TRIAL.durationDays)

  // If a specific employee is selected, use that one
  if (selectedEmployeeId) {
    const employee = await prisma.employee.findFirst({
      where: {
        id: selectedEmployeeId,
        organizationId,
        isActive: true,
        license: null,
      },
      select: { id: true },
    })

    if (!employee) {
      return 0
    }

    await prisma.license.create({
      data: {
        organizationId,
        employeeId: employee.id,
        status: "ACTIVE",
        source: "TRIAL",
        activatedAt: new Date(),
        expiresAt: trialEndsAt,
        notes: `Starter tier free license (${TRIAL.durationDays}-day duration)`,
      },
    })

    // Broadcast license update to connected agents
    const licenseStatus = await validateEmployeeLicense(employee.id)
    broadcastLicenseUpdate(employee.id, {
      type: "license_updated",
      timestamp: new Date().toISOString(),
      employeeId: employee.id,
      valid: licenseStatus.valid,
      status: licenseStatus.status ?? undefined,
      message: licenseStatus.message,
      expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
    })

    return 1
  }

  // Otherwise, find the first active employee without a license (limit to 1 for Starter tier)
  const employee = await prisma.employee.findFirst({
    where: {
      organizationId,
      isActive: true,
      license: null,
    },
    select: { id: true },
    orderBy: { createdAt: "asc" }, // Oldest employee first
  })

  if (!employee) {
    return 0
  }

  await prisma.license.create({
    data: {
      organizationId,
      employeeId: employee.id,
      status: "ACTIVE",
      source: "TRIAL",
      tier: "STARTER",
      activatedAt: new Date(),
      expiresAt: trialEndsAt,
      notes: `Starter tier free license (${TRIAL.durationDays}-day duration)`,
    },
  })

  // Broadcast license update to connected agents
  const licenseStatus = await validateEmployeeLicense(employee.id)
  broadcastLicenseUpdate(employee.id, {
    type: "license_updated",
    timestamp: new Date().toISOString(),
    employeeId: employee.id,
    valid: licenseStatus.valid,
    status: licenseStatus.status ?? undefined,
    message: licenseStatus.message,
    expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
  })

  return 1
}

/**
 * Expire trial licenses when trial ends
 * Should be called by a cron job or webhook
 */
export async function expireTrialLicenses(
  organizationId: string
): Promise<number> {
  const result = await prisma.license.updateMany({
    where: {
      organizationId,
      source: "TRIAL",
      status: "ACTIVE",
    },
    data: {
      status: "EXPIRED",
      deactivatedAt: new Date(),
      notes: "Trial period ended",
    },
  })

  return result.count
}
