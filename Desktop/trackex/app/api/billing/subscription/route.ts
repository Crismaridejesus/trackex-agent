import { requireOwner } from "@/lib/auth/rbac"
import { getSubscriptionStatus } from "@/lib/stripe"
import { requireTenantContext } from "@/lib/tenant-context"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

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

    const status = await getSubscriptionStatus(organizationId)

    return NextResponse.json(status)
  } catch (error) {
    console.error("Failed to get subscription status:", error)
    return NextResponse.json(
      { error: "Failed to get subscription status" },
      { status: 500 }
    )
  }
}
