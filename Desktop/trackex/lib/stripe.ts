/**
 * Stripe Payment Integration Module
 *
 * Provides helpers for Stripe subscription management with per-seat billing.
 *
 * Pricing Model:
 * - Base: $5/seat/month (1 seat free)
 * - Auto-Screenshots Add-on: +$1.50/seat/month
 */

import { prisma } from "@/lib/db";
import { broadcastLicenseUpdate } from "@/lib/license-stream";
import { validateEmployeeLicense } from "@/lib/licensing";
import Stripe from "stripe";

// Initialize Stripe with API key
const stripeSecretKey = process.env.STRIPE_SECRET_KEY
if (!stripeSecretKey) {
  console.warn(
    "STRIPE_SECRET_KEY is not set. Stripe functionality will be disabled."
  )
}

export const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null

// Price IDs from environment
export const STRIPE_SEAT_PRICE_ID = process.env.STRIPE_SEAT_PRICE_ID || ""
export const STRIPE_AUTO_SCREENSHOTS_PRICE_ID =
  process.env.STRIPE_AUTO_SCREENSHOTS_PRICE_ID || ""

// Grace period in days before licenses are deactivated after payment failure
export const PAYMENT_GRACE_PERIOD_DAYS = 7

// ================================
// CUSTOMER MANAGEMENT
// ================================

/**
 * Create a Stripe customer for an organization
 */
export async function createStripeCustomer(
  organizationId: string
): Promise<Stripe.Customer> {
  if (!stripe) throw new Error("Stripe is not configured")

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!organization) {
    throw new Error("Organization not found")
  }

  if (organization.stripeCustomerId) {
    // Customer already exists, retrieve it
    return getStripeCustomer(organization.stripeCustomerId)
  }

  const customer = await stripe.customers.create({
    email: organization.billingEmail || organization.email,
    name: organization.name,
    metadata: {
      organizationId: organization.id,
      organizationSlug: organization.slug,
    },
  })

  // Save Stripe customer ID to organization
  await prisma.organization.update({
    where: { id: organizationId },
    data: { stripeCustomerId: customer.id },
  })

  return customer
}

/**
 * Get a Stripe customer by ID
 */
export async function getStripeCustomer(
  customerId: string
): Promise<Stripe.Customer> {
  if (!stripe) throw new Error("Stripe is not configured")

  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    throw new Error("Customer has been deleted")
  }
  return customer as Stripe.Customer
}

/**
 * Get or create Stripe customer for an organization
 */
export async function getOrCreateStripeCustomer(
  organizationId: string
): Promise<Stripe.Customer> {
  if (!stripe) throw new Error("Stripe is not configured")

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!organization) {
    throw new Error("Organization not found")
  }

  if (organization.stripeCustomerId) {
    try {
      return await getStripeCustomer(organization.stripeCustomerId)
    } catch (error) {
      // Customer may have been deleted, create a new one
      console.warn("Stripe customer not found, creating new one")
    }
  }

  return createStripeCustomer(organizationId)
}

// ================================
// SUBSCRIPTION MANAGEMENT
// ================================

export interface CheckoutOptions {
  quantity: number
  autoScreenshotsQuantity?: number // Number of seats with auto-screenshots add-on
  successUrl: string
  cancelUrl: string
  pendingSeats?: string // Format: "empId1:1,empId2:0" where 1=hasAutoScreenshots
  // Legacy support
  includeAutoScreenshots?: boolean
  pendingEmployeeIds?: string
}

/**
 * Create a checkout session for new subscription
 *
 * Pricing: $5/seat/month + optional $1.50/seat/month for auto-screenshots
 */
export async function createCheckoutSession(
  organizationId: string,
  options: CheckoutOptions
): Promise<Stripe.Checkout.Session> {
  if (!stripe) throw new Error("Stripe is not configured")

  const {
    quantity,
    autoScreenshotsQuantity = 0,
    successUrl,
    cancelUrl,
    pendingSeats,
    // Legacy support
    includeAutoScreenshots = false,
    pendingEmployeeIds,
  } = options

  // Calculate effective auto-screenshots quantity
  const effectiveAutoScreenshots =
    autoScreenshotsQuantity > 0
      ? autoScreenshotsQuantity
      : includeAutoScreenshots
        ? quantity
        : 0

  if (!STRIPE_SEAT_PRICE_ID) {
    throw new Error("STRIPE_SEAT_PRICE_ID is not configured")
  }

  const customer = await getOrCreateStripeCustomer(organizationId)

  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: STRIPE_SEAT_PRICE_ID,
      quantity: quantity,
    },
  ]

  // Add auto-screenshots if any seats have it
  if (effectiveAutoScreenshots > 0 && STRIPE_AUTO_SCREENSHOTS_PRICE_ID) {
    lineItems.push({
      price: STRIPE_AUTO_SCREENSHOTS_PRICE_ID,
      quantity: effectiveAutoScreenshots,
    })
  }

  // Build metadata with pending seat info for license assignment
  const subscriptionMetadata: Record<string, string> = {
    organizationId,
    hasAutoScreenshots: effectiveAutoScreenshots > 0 ? "true" : "false",
    autoScreenshotsQuantity: effectiveAutoScreenshots.toString(),
  }

  // Store pending seats in metadata (format: empId:hasAutoScreenshots,...)
  // Prefer new pendingSeats format, fall back to legacy pendingEmployeeIds
  const seatsData = pendingSeats || pendingEmployeeIds || ""
  if (seatsData) {
    if (seatsData.length <= 500) {
      subscriptionMetadata.pendingSeats = seatsData
    } else {
      // Store in chunks if too long - keep first 20 entries
      const entries = seatsData.split(",")
      subscriptionMetadata.pendingSeats = entries.slice(0, 20).join(",")
      subscriptionMetadata.pendingSeatCount = entries.length.toString()
    }
  }

  const session = await stripe.checkout.sessions.create({
    customer: customer.id,
    mode: "subscription",
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: subscriptionMetadata,
    },
    metadata: {
      organizationId,
      pendingSeats: seatsData?.slice(0, 500) || "",
    },
  })

  return session
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(
  organizationId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  if (!stripe) throw new Error("Stripe is not configured")

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  if (!organization?.stripeCustomerId) {
    throw new Error("Organization has no Stripe customer")
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: organization.stripeCustomerId,
    return_url: returnUrl,
  })

  return session
}

/**
 * Update subscription quantity (add/remove seats)
 */
export async function updateSubscriptionQuantity(
  organizationId: string,
  newQuantity: number
): Promise<Stripe.Subscription | null> {
  if (!stripe) throw new Error("Stripe is not configured")

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    return null
  }

  // Get the Stripe subscription to find item IDs
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  )

  // Update quantity for all items (seats and add-ons)
  const updates = stripeSubscription.items.data.map((item) => ({
    id: item.id,
    quantity: newQuantity,
  }))

  const updatedSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      items: updates,
      proration_behavior: "create_prorations",
    }
  )

  // Update local subscription record
  await prisma.subscription.update({
    where: { organizationId },
    data: { quantity: newQuantity },
  })

  return updatedSubscription
}

/**
 * Cancel a subscription at period end
 */
export async function cancelSubscription(
  organizationId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) throw new Error("Stripe is not configured")

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    return null
  }

  const canceledSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: true }
  )

  // Update local subscription record
  await prisma.subscription.update({
    where: { organizationId },
    data: {
      cancelAtPeriodEnd: true,
      canceledAt: new Date(),
    },
  })

  return canceledSubscription
}

/**
 * Reactivate a canceled subscription (if still within current period)
 */
export async function reactivateSubscription(
  organizationId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) throw new Error("Stripe is not configured")

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    return null
  }

  const reactivatedSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    { cancel_at_period_end: false }
  )

  // Update local subscription record
  await prisma.subscription.update({
    where: { organizationId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  })

  return reactivatedSubscription
}

// ================================
// ADD-ON MANAGEMENT (Auto-Screenshots)
// ================================

/**
 * Add auto-screenshots to an existing subscription
 */
export async function addAutoScreenshots(
  organizationId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) throw new Error("Stripe is not configured")

  if (!STRIPE_AUTO_SCREENSHOTS_PRICE_ID) {
    throw new Error("STRIPE_AUTO_SCREENSHOTS_PRICE_ID is not configured")
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  if (!subscription) {
    throw new Error("Organization has no subscription")
  }

  // Add the auto-screenshots item to the subscription
  const updatedSubscription = await stripe.subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      items: [
        {
          price: STRIPE_AUTO_SCREENSHOTS_PRICE_ID,
          quantity: subscription.quantity,
        },
      ],
      proration_behavior: "create_prorations",
    }
  )

  // Create/update local add-on record
  const addOn = await prisma.addOn.upsert({
    where: { code: "AUTO_SCREENSHOTS" },
    update: {},
    create: {
      code: "AUTO_SCREENSHOTS",
      name: "Auto Screenshots",
      description: "Automatic screenshots every 30 minutes",
      monthlyPriceCents: 150, // $1.50
      pricingType: "PER_LICENSE",
      stripePriceId: STRIPE_AUTO_SCREENSHOTS_PRICE_ID,
    },
  })

  // Find the new subscription item ID
  const autoScreenshotsItem = updatedSubscription.items.data.find(
    (item) => item.price.id === STRIPE_AUTO_SCREENSHOTS_PRICE_ID
  )

  await prisma.subscriptionAddOn.create({
    data: {
      subscriptionId: subscription.id,
      addOnId: addOn.id,
      quantity: subscription.quantity,
      stripeSubscriptionItemId: autoScreenshotsItem?.id,
      enabledAt: new Date(),
    },
  })

  return updatedSubscription
}

/**
 * Remove auto-screenshots from an existing subscription
 */
export async function removeAutoScreenshots(
  organizationId: string
): Promise<Stripe.Subscription | null> {
  if (!stripe) throw new Error("Stripe is not configured")

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      addOns: {
        include: { addOn: true },
      },
    },
  })

  if (!subscription) {
    throw new Error("Organization has no subscription")
  }

  // Find the auto-screenshots add-on
  const autoScreenshotsAddOn = subscription.addOns.find(
    (a) => a.addOn.code === "AUTO_SCREENSHOTS"
  )

  if (!autoScreenshotsAddOn) {
    throw new Error("Auto-screenshots is not enabled on this subscription")
  }

  // Get the Stripe subscription to find the item
  const stripeSubscription = await stripe.subscriptions.retrieve(
    subscription.stripeSubscriptionId
  )

  const itemToRemove = stripeSubscription.items.data.find(
    (item) => item.price.id === STRIPE_AUTO_SCREENSHOTS_PRICE_ID
  )

  if (itemToRemove) {
    await stripe.subscriptionItems.del(itemToRemove.id, {
      proration_behavior: "create_prorations",
    })
  }

  // Remove local add-on record
  await prisma.subscriptionAddOn.delete({
    where: { id: autoScreenshotsAddOn.id },
  })

  return stripeSubscription
}

/**
 * Check if auto-screenshots is enabled for a subscription
 */
export async function hasAutoScreenshots(
  organizationId: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      addOns: {
        include: { addOn: true },
      },
    },
  })

  if (!subscription) return false

  return subscription.addOns.some(
    (a) => a.addOn.code === "AUTO_SCREENSHOTS" && a.status === "ACTIVE"
  )
}

// ================================
// WEBHOOK HANDLERS
// ================================

/**
 * Handle subscription created/updated
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    console.error("Subscription has no organizationId in metadata")
    return
  }

  // Get main subscription item (seat pricing)
  const seatItem = subscription.items.data.find(
    (item) => item.price.id === STRIPE_SEAT_PRICE_ID
  )

  const quantity = seatItem?.quantity || 0
  const priceAmount = seatItem?.price.unit_amount || 0

  // Check if auto-screenshots is included
  const hasAutoScreenshotsItem = subscription.items.data.some(
    (item) => item.price.id === STRIPE_AUTO_SCREENSHOTS_PRICE_ID
  )

  // Upsert the subscription
  const dbSubscription = await prisma.subscription.upsert({
    where: { organizationId },
    update: {
      stripeSubscriptionId: subscription.id,
      stripePriceId: seatItem?.price.id || null,
      tier: "TEAM",
      billingCycle: "MONTHLY",
      status: subscription.status,
      currentPeriodStart: new Date(
        (subscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      canceledAt: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000)
        : null,
      trialStart: subscription.trial_start
        ? new Date(subscription.trial_start * 1000)
        : null,
      trialEnd: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      quantity,
      pricePerLicense: priceAmount,
      dataRetentionDays: 90,
    },
    create: {
      organizationId,
      stripeSubscriptionId: subscription.id,
      stripePriceId: seatItem?.price.id || null,
      tier: "TEAM",
      billingCycle: "MONTHLY",
      status: subscription.status,
      currentPeriodStart: new Date(
        (subscription as any).current_period_start * 1000
      ),
      currentPeriodEnd: new Date(
        (subscription as any).current_period_end * 1000
      ),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      quantity,
      pricePerLicense: priceAmount,
      dataRetentionDays: 90,
      gracePeriodDays: PAYMENT_GRACE_PERIOD_DAYS,
    },
  })

  // Handle auto-screenshots add-on
  if (hasAutoScreenshotsItem) {
    const addOn = await prisma.addOn.upsert({
      where: { code: "AUTO_SCREENSHOTS" },
      update: {},
      create: {
        code: "AUTO_SCREENSHOTS",
        name: "Auto Screenshots",
        description: "Automatic screenshots every 30 minutes",
        monthlyPriceCents: 150,
        pricingType: "PER_LICENSE",
        stripePriceId: STRIPE_AUTO_SCREENSHOTS_PRICE_ID,
      },
    })

    const autoScreenshotsItem = subscription.items.data.find(
      (item) => item.price.id === STRIPE_AUTO_SCREENSHOTS_PRICE_ID
    )

    await prisma.subscriptionAddOn.upsert({
      where: {
        subscriptionId_addOnId: {
          subscriptionId: dbSubscription.id,
          addOnId: addOn.id,
        },
      },
      update: {
        quantity: autoScreenshotsItem?.quantity || quantity,
        stripeSubscriptionItemId: autoScreenshotsItem?.id,
      },
      create: {
        subscriptionId: dbSubscription.id,
        addOnId: addOn.id,
        quantity: autoScreenshotsItem?.quantity || quantity,
        stripeSubscriptionItemId: autoScreenshotsItem?.id,
        enabledAt: new Date(),
      },
    })
  }

  // If subscription is active, activate licenses
  if (subscription.status === "active") {
    // Parse pending seats from metadata - new format: "empId:hasAutoScreenshots,..."
    // Also supports legacy format: "empId1,empId2,..."
    const pendingSeats =
      subscription.metadata?.pendingSeats ||
      subscription.metadata?.pendingEmployeeIds ||
      ""

    let seatAssignments: {
      employeeId: string
      includesAutoScreenshots: boolean
    }[] = []

    if (pendingSeats) {
      const entries = pendingSeats.split(",").filter((e) => e.trim())
      seatAssignments = entries.map((entry) => {
        if (entry.includes(":")) {
          // New format: empId:1 or empId:0
          const [empId, hasAddon] = entry.split(":")
          return {
            employeeId: empId,
            includesAutoScreenshots: hasAddon === "1",
          }
        } else {
          // Legacy format: just empId - check if subscription has auto-screenshots
          const hasAutoScreenshots =
            subscription.metadata?.hasAutoScreenshots === "true"
          return {
            employeeId: entry,
            includesAutoScreenshots: hasAutoScreenshots,
          }
        }
      })
    }

    // Pass subscription data for license expiration and Stripe linking
    await activateOrganizationLicenses(
      organizationId,
      quantity,
      seatAssignments,
      {
        currentPeriodEnd: new Date(
          (subscription as any).current_period_end * 1000
        ),
        stripeSubscriptionItemId: seatItem?.id || "",
      }
    )

    // Mark trial as converted if applicable
    try {
      const { convertTrial } = await import("@/lib/trial")
      await convertTrial(organizationId)
    } catch (e) {
      // Trial may not exist, that's okay
    }
  }
}

/**
 * Handle subscription canceled
 */
export async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription
) {
  const organizationId = subscription.metadata?.organizationId

  if (!organizationId) {
    console.error("Subscription has no organizationId in metadata")
    return
  }

  await prisma.subscription.update({
    where: { organizationId },
    data: {
      status: "canceled",
      canceledAt: new Date(),
    },
  })

  // Deactivate all STRIPE-sourced licenses for this organization
  await deactivateOrganizationLicenses(organizationId)
}

/**
 * Handle payment failure
 */
export async function handlePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null
  if (!subscriptionId) return

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
  })

  if (!subscription) return

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "past_due" },
  })

  // Note: We don't immediately deactivate licenses - there's a grace period
  // A separate cron job should handle deactivation after grace period
}

/**
 * Handle successful payment
 */
export async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const subscriptionId = (invoice as any).subscription as string | null
  if (!subscriptionId) return

  const subscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscriptionId },
    include: { organization: true },
  })

  if (!subscription) return

  // Reactivate licenses if they were in past_due state
  if (subscription.status === "past_due") {
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: "active" },
    })

    // Fetch Stripe subscription to get item ID
    if (stripe) {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      )
      const seatItem = stripeSubscription.items.data.find(
        (item) => item.price.id === STRIPE_SEAT_PRICE_ID
      )

      await activateOrganizationLicenses(
        subscription.organizationId,
        subscription.quantity,
        [],
        {
          currentPeriodEnd: subscription.currentPeriodEnd,
          stripeSubscriptionItemId: seatItem?.id || "",
        }
      )
    } else {
      await activateOrganizationLicenses(
        subscription.organizationId,
        subscription.quantity
      )
    }
  }
}

// ================================
// LICENSE MANAGEMENT
// ================================

/**
 * Activate licenses for an organization (up to the subscription quantity)
 * Also upgrades TRIAL licenses to STRIPE source
 *
 * @param organizationId - The organization to activate licenses for
 * @param quantity - The number of seats purchased
 * @param seatAssignments - Array of employee IDs with per-employee add-on settings
 * @param subscriptionData - Optional subscription metadata (expiration, Stripe item ID)
 */
async function activateOrganizationLicenses(
  organizationId: string,
  quantity: number,
  seatAssignments:
    | { employeeId: string; includesAutoScreenshots: boolean }[]
    | string[] = [],
  subscriptionData?: {
    currentPeriodEnd: Date
    stripeSubscriptionItemId: string
  }
) {
  // Normalize seat assignments to new format (support legacy string[] format)
  const normalizedAssignments = seatAssignments.map((seat) => {
    if (typeof seat === "string") {
      return { employeeId: seat, includesAutoScreenshots: false }
    }
    return seat
  })

  const specificEmployeeIds = normalizedAssignments.map((s) => s.employeeId)

  // Create a map for quick lookup of add-on settings
  const addOnMap = new Map(
    normalizedAssignments.map((s) => [s.employeeId, s.includesAutoScreenshots])
  )

  // First, upgrade existing TRIAL licenses to STRIPE
  // This handles the upgrade path from trial to paid
  const trialAndFreeLicenses = await prisma.license.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      source: { in: ["TRIAL"] },
    },
    take: quantity,
  })

  for (const license of trialAndFreeLicenses) {
    const hasAutoScreenshots = addOnMap.get(license.employeeId) || false
    await prisma.license.update({
      where: { id: license.id },
      data: {
        source: "STRIPE",
        tier: "TEAM",
        includesAutoScreenshots: hasAutoScreenshots,
        expiresAt: subscriptionData?.currentPeriodEnd || null,
        stripeSubscriptionItemId:
          subscriptionData?.stripeSubscriptionItemId || null,
        notes: `Upgraded from ${license.source} to STRIPE subscription`,
      },
    })
  }

  // Count how many we already upgraded
  const alreadyUpgraded = trialAndFreeLicenses.length
  let remainingSlots = quantity - alreadyUpgraded

  // If specific employee IDs were provided, prioritize creating/activating licenses for them
  if (specificEmployeeIds.length > 0 && remainingSlots > 0) {
    // Get employees who need licenses
    const employeesNeedingLicenses = await prisma.employee.findMany({
      where: {
        id: { in: specificEmployeeIds },
        organizationId,
        isActive: true,
      },
      include: {
        license: true,
      },
    })

    for (const employee of employeesNeedingLicenses) {
      if (remainingSlots <= 0) break

      if (employee.license) {
        // Employee has a license, update it to STRIPE/ACTIVE if not already
        const hasAutoScreenshots = addOnMap.get(employee.id) || false
        if (
          employee.license.status !== "ACTIVE" ||
          employee.license.source !== "STRIPE"
        ) {
          await prisma.license.update({
            where: { id: employee.license.id },
            data: {
              status: "ACTIVE",
              source: "STRIPE",
              tier: "TEAM",
              includesAutoScreenshots: hasAutoScreenshots,
              activatedAt: new Date(),
              deactivatedAt: null,
              expiresAt: subscriptionData?.currentPeriodEnd || null,
              stripeSubscriptionItemId:
                subscriptionData?.stripeSubscriptionItemId || null,
              notes: "License activated via subscription purchase",
            },
          })
          remainingSlots--
        } else {
          // Already active STRIPE license - just update add-on status and expiration
          await prisma.license.update({
            where: { id: employee.license.id },
            data: {
              includesAutoScreenshots: hasAutoScreenshots,
              expiresAt: subscriptionData?.currentPeriodEnd || null,
              notes: "License renewed/updated via subscription purchase",
            },
          })
        }
      } else {
        // Employee doesn't have a license, create one
        const hasAutoScreenshots = addOnMap.get(employee.id) || false
        await prisma.license.create({
          data: {
            organizationId,
            employeeId: employee.id,
            status: "ACTIVE",
            source: "STRIPE",
            tier: "TEAM",
            includesAutoScreenshots: hasAutoScreenshots,
            activatedAt: new Date(),
            expiresAt: subscriptionData?.currentPeriodEnd || null,
            stripeSubscriptionItemId:
              subscriptionData?.stripeSubscriptionItemId || null,
            notes: "License created via subscription purchase",
          },
        })
        remainingSlots--
      }
    }
  }

  // Fill any remaining slots with pending/inactive licenses (fallback behavior)
  if (remainingSlots > 0) {
    const pendingLicenses = await prisma.license.findMany({
      where: {
        organizationId,
        status: { in: ["PENDING", "INACTIVE", "EXPIRED"] },
        source: { notIn: ["TRIAL"] }, // Don't re-select already upgraded
        // Exclude employees we already processed
        ...(specificEmployeeIds.length > 0
          ? { employeeId: { notIn: specificEmployeeIds } }
          : {}),
      },
      orderBy: { createdAt: "asc" },
      take: remainingSlots,
    })

    // Activate licenses up to the quantity
    for (const license of pendingLicenses) {
      await prisma.license.update({
        where: { id: license.id },
        data: {
          status: "ACTIVE",
          source: "STRIPE",
          tier: "TEAM",
          activatedAt: new Date(),
          deactivatedAt: null,
          expiresAt: subscriptionData?.currentPeriodEnd || null,
          stripeSubscriptionItemId:
            subscriptionData?.stripeSubscriptionItemId || null,
        },
      })
    }
  }

  // Get current count of active licenses
  const activeCount = await prisma.license.count({
    where: { organizationId, status: "ACTIVE" },
  })

  // If we have more active licenses than subscription quantity, deactivate excess
  if (activeCount > quantity) {
    const excessLicenses = await prisma.license.findMany({
      where: { organizationId, status: "ACTIVE" },
      orderBy: { activatedAt: "desc" },
      take: activeCount - quantity,
    })

    for (const license of excessLicenses) {
      await prisma.license.update({
        where: { id: license.id },
        data: {
          status: "INACTIVE",
          deactivatedAt: new Date(),
        },
      })

      // Broadcast license deactivation
      if (license.employeeId) {
        broadcastLicenseUpdate(license.employeeId, {
          type: "license_revoked",
          timestamp: new Date().toISOString(),
          employeeId: license.employeeId,
          valid: false,
          status: "INACTIVE",
          message: "License deactivated due to subscription change",
        })
      }
    }
  }

  // Broadcast updates for all employees with active licenses
  const activeLicenses = await prisma.license.findMany({
    where: { organizationId, status: "ACTIVE" },
    select: { employeeId: true },
  })

  for (const license of activeLicenses) {
    const licenseStatus = await validateEmployeeLicense(license.employeeId)
    broadcastLicenseUpdate(license.employeeId, {
      type: "license_updated",
      timestamp: new Date().toISOString(),
      employeeId: license.employeeId,
      valid: licenseStatus.valid,
      status: licenseStatus.status ?? undefined,
      message: licenseStatus.message,
      expiresAt: licenseStatus.expiresAt?.toISOString() ?? null,
    })
  }
}

/**
 * Deactivate all STRIPE licenses for an organization
 */
async function deactivateOrganizationLicenses(organizationId: string) {
  // Get licenses before deactivation to broadcast updates
  const licenses = await prisma.license.findMany({
    where: {
      organizationId,
      status: "ACTIVE",
      source: "STRIPE", // Only deactivate STRIPE licenses, not manual/beta
    },
    select: { id: true, employeeId: true, source: true },
  })

  await prisma.license.updateMany({
    where: {
      organizationId,
      status: "ACTIVE",
      source: "STRIPE", // Only deactivate STRIPE licenses, not manual/beta
    },
    data: {
      status: "EXPIRED",
      deactivatedAt: new Date(),
    },
  })

  // Broadcast license expiration to connected agents
  for (const license of licenses) {
    broadcastLicenseUpdate(license.employeeId, {
      type: "license_expired",
      timestamp: new Date().toISOString(),
      employeeId: license.employeeId,
      valid: false,
      status: "EXPIRED",
      message: "License expired due to subscription cancellation",
    })
  }
}

// ================================
// UTILITY FUNCTIONS
// ================================

/**
 * Get subscription status for an organization
 */
export async function getSubscriptionStatus(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
    include: {
      organization: {
        select: {
          isBetaTester: true,
          bypassPayment: true,
        },
      },
      addOns: {
        include: { addOn: true },
      },
    },
  })

  const activeLicenseCount = await prisma.license.count({
    where: { organizationId, status: "ACTIVE" },
  })

  const totalEmployeeCount = await prisma.employee.count({
    where: { organizationId, isActive: true },
  })

  return {
    hasSubscription: !!subscription,
    subscription,
    activeLicenseCount,
    totalEmployeeCount,
    isBetaTester: subscription?.organization.isBetaTester || false,
    bypassPayment: subscription?.organization.bypassPayment || false,
    hasAutoScreenshots:
      subscription?.addOns.some((a) => a.addOn.code === "AUTO_SCREENSHOTS") ||
      false,
  }
}

/**
 * Check if an organization has valid payment status
 */
export async function hasValidPaymentStatus(
  organizationId: string
): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: { subscription: true },
  })

  if (!org) return false

  // Beta testers and bypass payment orgs always have valid status
  if (org.isBetaTester || org.bypassPayment) {
    return true
  }

  // Check subscription status
  if (org.subscription) {
    return ["active", "trialing"].includes(org.subscription.status)
  }

  // Check if within free trial limit (1 free seat)
  const activeLicenseCount = await prisma.license.count({
    where: { organizationId, status: "ACTIVE", source: "TRIAL" },
  })

  return activeLicenseCount > 0 && activeLicenseCount <= 1
}

/**
 * Verify Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  if (!stripe) throw new Error("Stripe is not configured")

  return stripe.webhooks.constructEvent(payload, signature, secret)
}

/**
 * Get available seats info for an organization
 */
export async function getSeatsInfo(organizationId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  })

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  })

  const usedSeats = await prisma.license.count({
    where: {
      organizationId,
      status: "ACTIVE",
    },
  })

  const totalSeats = subscription?.quantity || 1
  const availableSeats = Math.max(0, totalSeats - usedSeats)

  return {
    totalSeats,
    usedSeats,
    availableSeats,
    pricePerSeat: 500, // $5.00 in cents
    autoScreenshotsPrice: 150, // $1.50 in cents
  }
}
