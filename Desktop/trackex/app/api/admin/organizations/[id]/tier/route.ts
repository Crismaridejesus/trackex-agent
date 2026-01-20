import { logAuditEvent } from "@/lib/audit/logger"
import { requireSuperAdmin } from "@/lib/auth/rbac"
import { BillingCycle, PRICING, PricingTier } from "@/lib/constants"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/organizations/[id]/tier
 *
 * Super Admin only: Get organization's subscription tier details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireSuperAdmin()

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: params.id },
      include: {
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

    if (!subscription) {
      return NextResponse.json({
        hasTier: false,
        organization: await prisma.organization.findUnique({
          where: { id: params.id },
          select: {
            id: true,
            name: true,
            isBetaTester: true,
            bypassPayment: true,
          },
        }),
        availableTiers: Object.keys(PRICING.tiers),
      })
    }

    return NextResponse.json({
      hasTier: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        billingCycle: subscription.billingCycle,
        status: subscription.status,
        quantity: subscription.quantity,
        pricePerLicense: subscription.pricePerLicense,
        discountPercent: subscription.discountPercent,
        dataRetentionDays: subscription.dataRetentionDays,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
      organization: subscription.organization,
      availableTiers: Object.keys(PRICING.tiers),
      tierConfig: PRICING.tiers[subscription.tier as PricingTier],
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to get organization tier:", error)
    return NextResponse.json(
      { error: "Failed to get organization tier" },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/organizations/[id]/tier
 *
 * Super Admin only: Override organization's subscription tier
 * This is a manual override - useful for enterprise deals, custom pricing, etc.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireSuperAdmin()

    const body = await req.json()
    const {
      tier,
      billingCycle,
      dataRetentionDays,
      discountPercent,
      pricePerLicense,
      notes,
    } = body

    // Validate tier if provided
    if (tier && !PRICING.tiers[tier as PricingTier]) {
      return NextResponse.json(
        {
          error: `Invalid tier. Must be one of: ${Object.keys(PRICING.tiers).join(", ")}`,
        },
        { status: 400 }
      )
    }

    // Validate billing cycle if provided
    if (billingCycle && !PRICING.billingCycles[billingCycle as BillingCycle]) {
      return NextResponse.json(
        {
          error: `Invalid billing cycle. Must be one of: ${Object.keys(PRICING.billingCycles).join(", ")}`,
        },
        { status: 400 }
      )
    }

    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: params.id },
    })

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "Organization has no subscription. Create one first or use payment bypass.",
        },
        { status: 404 }
      )
    }

    // Build update data
    const updateData: any = {}
    const changes: string[] = []

    if (tier && tier !== subscription.tier) {
      updateData.tier = tier
      changes.push(`tier: ${subscription.tier} → ${tier}`)

      // Update data retention based on new tier
      const tierConfig = PRICING.tiers[tier as PricingTier]
      if (!dataRetentionDays) {
        updateData.dataRetentionDays = tierConfig.dataRetentionDays
        changes.push(
          `dataRetentionDays: ${subscription.dataRetentionDays} → ${tierConfig.dataRetentionDays}`
        )
      }
    }

    if (billingCycle && billingCycle !== subscription.billingCycle) {
      updateData.billingCycle = billingCycle
      changes.push(
        `billingCycle: ${subscription.billingCycle} → ${billingCycle}`
      )
    }

    if (
      typeof dataRetentionDays === "number" &&
      dataRetentionDays !== subscription.dataRetentionDays
    ) {
      updateData.dataRetentionDays = dataRetentionDays
      changes.push(
        `dataRetentionDays: ${subscription.dataRetentionDays} → ${dataRetentionDays}`
      )
    }

    if (
      typeof discountPercent === "number" &&
      discountPercent !== subscription.discountPercent
    ) {
      updateData.discountPercent = discountPercent
      changes.push(
        `discountPercent: ${subscription.discountPercent} → ${discountPercent}`
      )
    }

    if (
      typeof pricePerLicense === "number" &&
      pricePerLicense !== subscription.pricePerLicense
    ) {
      updateData.pricePerLicense = pricePerLicense
      changes.push(
        `pricePerLicense: ${subscription.pricePerLicense} → ${pricePerLicense}`
      )
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No changes to apply" })
    }

    const updatedSubscription = await prisma.subscription.update({
      where: { organizationId: params.id },
      data: updateData,
      include: {
        organization: {
          select: { name: true },
        },
      },
    })

    // Audit log
    await logAuditEvent(
      {
        action: "subscription_tier_override" as any,
        organizationId: params.id,
        targetType: "Subscription",
        targetId: subscription.id,
        details: JSON.stringify({
          organizationId: params.id,
          organizationName: updatedSubscription.organization.name,
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
      message: `Updated subscription: ${changes.join(", ")}`,
      subscription: updatedSubscription,
    })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to update organization tier:", error)
    return NextResponse.json(
      { error: "Failed to update organization tier" },
      { status: 500 }
    )
  }
}
