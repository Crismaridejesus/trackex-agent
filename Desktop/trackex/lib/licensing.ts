/**
 * License Validation Module
 *
 * Provides helpers for checking employee license status.
 * Used by the desktop agent authentication flow.
 */

import { prisma } from "@/lib/db";

export type LicenseStatus = "ACTIVE" | "INACTIVE" | "EXPIRED" | "PENDING"
export type LicenseSource =
  | "STRIPE"
  | "MANUAL"
  | "BETA_BYPASS"
  | "PENDING"
  | "TRIAL"


export interface LicenseValidation {
  valid: boolean
  status: LicenseStatus | null
  source: LicenseSource | null
  message: string
  expiresAt?: Date | null
  bypassReason?: string
  tier?: string | null
}

/**
 * Check if an employee has a valid license to use the desktop agent
 */
export async function validateEmployeeLicense(
  employeeId: string
): Promise<LicenseValidation> {
  // Get employee with license and organization
  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    include: {
      license: true,
      organization: {
        include: {
          subscription: true,
        },
      },
    },
  })

  if (!employee) {
    return {
      valid: false,
      status: null,
      source: null,
      message: "Employee not found",
    }
  }

  if (!employee.isActive) {
    return {
      valid: false,
      status: null,
      source: null,
      message: "Employee account is inactive",
    }
  }

  const organization = employee.organization

  if (!organization) {
    return {
      valid: false,
      status: null,
      source: null,
      message: "Organization not found",
    }
  }

  // Check 1: Beta tester bypass
  if (organization.isBetaTester) {
    return {
      valid: true,
      status: "ACTIVE",
      source: "BETA_BYPASS",
      message: "Beta tester organization - license requirements bypassed",
      bypassReason: "BETA_TESTER",
      tier: "TEAM",
    }
  }

  // Check 2: Super Admin bypass
  if (organization.bypassPayment) {
    return {
      valid: true,
      status: "ACTIVE",
      source: "MANUAL",
      message: "Payment bypass enabled - license requirements bypassed",
      bypassReason: "PAYMENT_BYPASS",
      tier: "TEAM",
    }
  }

  // Check 3: License exists and is active
  const license = employee.license

  if (license) {
    if (license.status === "ACTIVE") {
      // Check expiration if set
      if (license.expiresAt && new Date(license.expiresAt) < new Date()) {
        return {
          valid: false,
          status: "EXPIRED",
          source: license.source as LicenseSource,
          message: "License has expired",
          expiresAt: license.expiresAt,
        }
      }

      return {
        valid: true,
        status: "ACTIVE",
        source: license.source as LicenseSource,
        message: "Active license",
        expiresAt: license.expiresAt,
        tier: license.tier || organization.subscription?.tier || "STARTER",
      }
    }

    if (license.status === "PENDING") {
      return {
        valid: false,
        status: "PENDING",
        source: license.source as LicenseSource,
        message:
          "License is pending activation. Please contact your administrator.",
      }
    }

    if (license.status === "INACTIVE") {
      return {
        valid: false,
        status: "INACTIVE",
        source: license.source as LicenseSource,
        message:
          "License has been deactivated. Please contact your administrator.",
      }
    }

    if (license.status === "EXPIRED") {
      return {
        valid: false,
        status: "EXPIRED",
        source: license.source as LicenseSource,
        message: "License has expired. Please contact your administrator.",
        expiresAt: license.expiresAt,
      }
    }
  }

  // No valid license found
  return {
    valid: false,
    status: (license?.status as LicenseStatus) || null,
    source: (license?.source as LicenseSource) || null,
    message:
      "No valid license. Your organization needs to purchase a license for your account.",
  }
}

/**
 * Get license status for display in the desktop agent
 */
export async function getLicenseStatus(employeeId: string): Promise<{
  valid: boolean
  status: string
  expiresAt: string | null
  message: string
  tier: string | null
}> {
  const validation = await validateEmployeeLicense(employeeId)

  return {
    valid: validation.valid,
    status: validation.status || "NONE",
    expiresAt: validation.expiresAt?.toISOString() || null,
    message: validation.message,
    tier: validation.tier || null,
  }
}

/**
 * Check if organization has reached its license limit
 */
export async function hasReachedLicenseLimit(organizationId: string): Promise<{
  atLimit: boolean
  used: number
  available: number
  message: string
}> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  })

  if (!organization) {
    return {
      atLimit: true,
      used: 0,
      available: 0,
      message: "Organization not found",
    }
  }

  // Beta testers and bypass orgs have unlimited licenses
  if (organization.isBetaTester || organization.bypassPayment) {
    return {
      atLimit: false,
      used: 0,
      available: Infinity,
      message: "Unlimited licenses (bypass enabled)",
    }
  }

  const activeLicenses = await prisma.license.count({
    where: {
      organizationId,
      status: "ACTIVE",
    },
  })

  // Calculate total available licenses
  const subscriptionLicenses = organization.subscription?.quantity || 0

  const totalAvailable = subscriptionLicenses

  return {
    atLimit: activeLicenses >= totalAvailable,
    used: activeLicenses,
    available: totalAvailable,
    message:
      activeLicenses >= totalAvailable
        ? "License limit reached. Please purchase more licenses."
        : `${totalAvailable - activeLicenses} licenses available`,
  }
}

/**
 * Get detailed seat availability for license activation
 * Used by the employee license management API
 */
export interface SeatAvailability {
  hasAvailableSeats: boolean
  hasPaymentBypass: boolean
  bypassReason: "BETA_TESTER" | "PAYMENT_BYPASS" | null

  // Seat counts
  subscriptionSeats: number
  subscriptionSeatsUsed: number
  subscriptionSeatsRemaining: number

  freeQuota: number
  freeQuotaUsed: number
  freeQuotaRemaining: number

  totalSeats: number
  totalUsed: number
  totalRemaining: number

  // Recommended action
  recommendedSource: LicenseSource | null
  requiresPayment: boolean
  message: string
}

export async function getSeatAvailability(
  organizationId: string
): Promise<SeatAvailability> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  })

  if (!organization) {
    return {
      hasAvailableSeats: false,
      hasPaymentBypass: false,
      bypassReason: null,
      subscriptionSeats: 0,
      subscriptionSeatsUsed: 0,
      subscriptionSeatsRemaining: 0,
      freeQuota: 0,
      freeQuotaUsed: 0,
      freeQuotaRemaining: 0,
      totalSeats: 0,
      totalUsed: 0,
      totalRemaining: 0,
      recommendedSource: null,
      requiresPayment: true,
      message: "Organization not found",
    }
  }

  // Check for payment bypass
  if (organization.isBetaTester) {
    return {
      hasAvailableSeats: true,
      hasPaymentBypass: true,
      bypassReason: "BETA_TESTER",
      subscriptionSeats: 0,
      subscriptionSeatsUsed: 0,
      subscriptionSeatsRemaining: 0,
      freeQuota: 0,
      freeQuotaUsed: 0,
      freeQuotaRemaining: 0,
      totalSeats: Infinity,
      totalUsed: 0,
      totalRemaining: Infinity,
      recommendedSource: "BETA_BYPASS",
      requiresPayment: false,
      message: "Beta tester - unlimited licenses",
    }
  }

  if (organization.bypassPayment) {
    return {
      hasAvailableSeats: true,
      hasPaymentBypass: true,
      bypassReason: "PAYMENT_BYPASS",
      subscriptionSeats: 0,
      subscriptionSeatsUsed: 0,
      subscriptionSeatsRemaining: 0,
      freeQuota: 0,
      freeQuotaUsed: 0,
      freeQuotaRemaining: 0,
      totalSeats: Infinity,
      totalUsed: 0,
      totalRemaining: Infinity,
      recommendedSource: "MANUAL",
      requiresPayment: false,
      message: "Payment bypass enabled - unlimited licenses",
    }
  }

  // Count active licenses by source (STRIPE + MANUAL use subscription seats)
  const [stripeUsed, manualUsed] = await Promise.all([
    prisma.license.count({
      where: {
        organizationId,
        source: "STRIPE",
        status: "ACTIVE",
      },
    }),
    prisma.license.count({
      where: {
        organizationId,
        source: "MANUAL",
        status: "ACTIVE",
      },
    }),
  ])

  const subscriptionSeats = organization.subscription?.quantity || 0

  // Subscription seats used by STRIPE + MANUAL sources
  const subscriptionSeatsUsed = stripeUsed + manualUsed
  const subscriptionSeatsRemaining = Math.max(
    0,
    subscriptionSeats - subscriptionSeatsUsed
  )

  const totalSeats = subscriptionSeats
  const totalUsed = subscriptionSeatsUsed
  const totalRemaining = subscriptionSeatsRemaining

  // Determine recommended source and if payment is needed
  let recommendedSource: LicenseSource | null = null
  let requiresPayment = false
  let message = ""

  if (subscriptionSeatsRemaining > 0) {
    recommendedSource = "STRIPE"
    message = `${subscriptionSeatsRemaining} subscription seat(s) available`
  } else {
    requiresPayment = true
    message = "No available seats. Purchase additional licenses to activate."
  }

  return {
    hasAvailableSeats: totalRemaining > 0,
    hasPaymentBypass: false,
    bypassReason: null,
    subscriptionSeats,
    subscriptionSeatsUsed,
    subscriptionSeatsRemaining,
    freeQuota: 0,
    freeQuotaUsed: 0,
    freeQuotaRemaining: 0,
    totalSeats,
    totalUsed,
    totalRemaining,
    recommendedSource,
    requiresPayment,
    message,
  }
}
/**
 * Check if an employee has an active license
 * Returns a boolean and expiration date for convenience
 */
export async function checkEmployeeLicenseStatus(employeeId: string): Promise<{
  hasLicense: boolean
  licenseExpirationDate: Date | null
  licenseSource: LicenseSource | null
  licenseTier: string | null
}> {
  const license = await prisma.license.findUnique({
    where: { employeeId },
    select: {
      status: true,
      source: true,
      expiresAt: true,
      organization: {
        select: {
          subscription: {
            select: { tier: true },
          },
        },
      },
    },
  })

  if (!license) {
    return {
      hasLicense: false,
      licenseExpirationDate: null,
      licenseSource: null,
      licenseTier: null,
    }
  }

  const isActive = license.status === "ACTIVE"
  const isExpired = license.expiresAt
    ? new Date(license.expiresAt) < new Date()
    : false

  // Determine tier based on license source
  let licenseTier: string | null = null
  if (license.source === "TRIAL") {
    licenseTier = "STARTER" // Trial is always Starter tier
  } else if (license.source === "STRIPE") {
    licenseTier = license.organization?.subscription?.tier || "TEAM"
  } else if (license.source === "BETA_BYPASS" || license.source === "MANUAL") {
    licenseTier = "TEAM" // Full access for beta/manual
  }

  return {
    hasLicense: isActive && !isExpired,
    licenseExpirationDate: license.expiresAt,
    licenseSource: license.source as LicenseSource,
    licenseTier,
  }
}

/**
 * Get license info for multiple employees in one query
 * Optimized for listing employees with license status
 */
export async function getEmployeeLicenseInfo(employeeIds: string[]): Promise<
  Map<
    string,
    {
      hasLicense: boolean
      licenseExpirationDate: Date | null
      licenseSource: LicenseSource | null
      licenseStatus: LicenseStatus | null
    }
  >
> {
  const licenses = await prisma.license.findMany({
    where: {
      employeeId: { in: employeeIds },
    },
    select: {
      employeeId: true,
      status: true,
      source: true,
      expiresAt: true,
    },
  })

  const result = new Map<
    string,
    {
      hasLicense: boolean
      licenseExpirationDate: Date | null
      licenseSource: LicenseSource | null
      licenseStatus: LicenseStatus | null
    }
  >()

  // Initialize all employees with no license
  for (const id of employeeIds) {
    result.set(id, {
      hasLicense: false,
      licenseExpirationDate: null,
      licenseSource: null,
      licenseStatus: null,
    })
  }

  // Update with actual license data
  for (const license of licenses) {
    const isActive = license.status === "ACTIVE"
    const isExpired = license.expiresAt
      ? new Date(license.expiresAt) < new Date()
      : false

    result.set(license.employeeId, {
      hasLicense: isActive && !isExpired,
      licenseExpirationDate: license.expiresAt,
      licenseSource: license.source as LicenseSource,
      licenseStatus: license.status as LicenseStatus,
    })
  }

  return result
}
