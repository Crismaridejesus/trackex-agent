/**
 * Add-on Management API (Auto-Screenshots)
 *
 * GET - Check if auto-screenshots is enabled
 * POST - Enable auto-screenshots for the subscription
 * DELETE - Disable auto-screenshots from the subscription
 */

import { requireOwner } from "@/lib/auth/rbac";
import { PRICING } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  addAutoScreenshots,
  hasAutoScreenshots,
  removeAutoScreenshots,
} from "@/lib/stripe";
import { requireTenantContext } from "@/lib/tenant-context";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if auto-screenshots is enabled
    const isEnabled = await hasAutoScreenshots(organizationId)

    // Get subscription for quantity info
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    })

    const addOnConfig = PRICING.autoScreenshots

    return NextResponse.json({
      addOns: [
        {
          code: "AUTO_SCREENSHOTS",
          name: addOnConfig.name,
          description: addOnConfig.description,
          monthlyPrice: addOnConfig.monthlyPrice,
          pricingType: addOnConfig.pricingType,
          isActive: isEnabled,
          quantity: subscription?.quantity || 0,
        },
      ],
      activeCount: isEnabled ? 1 : 0,
    })
  } catch (error) {
    console.error("Error fetching add-ons:", error)
    return NextResponse.json(
      { error: "Failed to fetch add-ons" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner()
    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId },
    })

    if (!subscription) {
      return NextResponse.json(
        {
          error:
            "No active subscription. Subscribe first before adding auto-screenshots.",
        },
        { status: 402 }
      )
    }

    // Check if already enabled
    const isEnabled = await hasAutoScreenshots(organizationId)
    if (isEnabled) {
      return NextResponse.json(
        { error: "Auto-screenshots is already enabled." },
        { status: 400 }
      )
    }

    // Add auto-screenshots
    await addAutoScreenshots(organizationId)

    return NextResponse.json({
      success: true,
      message: "Auto-screenshots has been added to your subscription",
    })
  } catch (error) {
    console.error("Error adding auto-screenshots:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to add auto-screenshots",
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireOwner()
    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Remove auto-screenshots
    await removeAutoScreenshots(organizationId)

    return NextResponse.json({
      success: true,
      message: "Auto-screenshots has been removed from your subscription",
    })
  } catch (error) {
    console.error("Error removing auto-screenshots:", error)
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to remove auto-screenshots",
      },
      { status: 500 }
    )
  }
}
