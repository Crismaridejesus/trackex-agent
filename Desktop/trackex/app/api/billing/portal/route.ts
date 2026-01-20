import { requireOwner } from "@/lib/auth/rbac";
import { createBillingPortalSession } from "@/lib/stripe";
import { requireTenantContext } from "@/lib/tenant-context";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

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

    // Get return URL
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    const returnUrl = `${origin}/app/billing`

    const session = await createBillingPortalSession(organizationId, returnUrl)

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error("Failed to create billing portal session:", error)
    return NextResponse.json(
      { error: "Failed to create billing portal session" },
      { status: 500 }
    )
  }
}
