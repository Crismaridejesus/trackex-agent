import { prisma } from "@/lib/db";
import {
  handlePaymentFailed,
  handlePaymentSucceeded,
  handleSubscriptionCanceled,
  handleSubscriptionUpdated,
  verifyWebhookSignature,
} from "@/lib/stripe";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const dynamic = "force-dynamic"

// Disable body parsing, we need the raw body for signature verification
export const runtime = "nodejs"

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ""

export async function POST(req: NextRequest) {
  try {
    const body = await req.text()
    const signature = headers().get("stripe-signature") || ""

    if (!webhookSecret) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured")
      return NextResponse.json(
        { error: "Webhook not configured" },
        { status: 500 }
      )
    }

    let event: Stripe.Event

    try {
      event = verifyWebhookSignature(body, signature, webhookSecret)
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }

    console.log(`Received Stripe webhook: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        )
        await logStripeEvent(event)
        break

      case "customer.subscription.deleted":
        await handleSubscriptionCanceled(
          event.data.object as Stripe.Subscription
        )
        await logStripeEvent(event)
        break

      case "invoice.paid":
        await handlePaymentSucceeded(event.data.object as Stripe.Invoice)
        await logStripeEvent(event)
        break

      case "invoice.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.Invoice)
        await logStripeEvent(event)
        break

      case "checkout.session.completed":
        // Checkout completed - subscription will be created via subscription.created event
        const session = event.data.object as Stripe.Checkout.Session
        console.log(`Checkout completed for customer: ${session.customer}`)
        await logStripeEvent(event)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    )
  }
}

/**
 * Log Stripe events to audit log
 */
async function logStripeEvent(event: Stripe.Event) {
  try {
    let organizationId: string | null = null
    let details: Record<string, any> = {
      stripeEventId: event.id,
      eventType: event.type,
    }

    // Extract organization ID from metadata
    const object = event.data.object as any
    organizationId = object?.metadata?.organizationId || null

    if (object) {
      details.objectId = object.id
      details.status = object.status
    }

    // Map event type to audit action
    let action = "stripe_webhook"
    if (event.type.includes("subscription")) {
      if (event.type.includes("created")) action = "subscription_create"
      else if (event.type.includes("updated")) action = "subscription_update"
      else if (event.type.includes("deleted")) action = "subscription_cancel"
    } else if (event.type.includes("invoice")) {
      if (event.type.includes("paid")) action = "payment_success"
      else if (event.type.includes("failed")) action = "payment_failed"
    } else if (event.type.includes("checkout")) {
      action = "checkout_complete"
    }

    // Only create audit log if we have an organizationId (required by schema)
    if (organizationId) {
      await prisma.auditLog.create({
        data: {
          organizationId,
          action,
          actorType: "system",
          targetType: "Subscription",
          details: JSON.stringify(details),
        },
      })
    } else {
      console.warn(`Skipping audit log for ${action} - no organizationId in event metadata`)
    }
  } catch (error) {
    console.error("Failed to log Stripe event:", error)
  }
}
