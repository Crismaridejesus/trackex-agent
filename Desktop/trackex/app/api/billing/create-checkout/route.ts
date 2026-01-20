import { requireOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { createCheckoutSession } from "@/lib/stripe";
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

    const body = await req.json()
    const {
      seats = [], // New format: { employeeId, includeAutoScreenshots }[]
      employeeIds = [], // Legacy support
      quantity,
      includeAutoScreenshots = false, // Legacy support
    } = body

    // Support both new seats array and legacy employeeIds format
    let seatSelections: {
      employeeId: string
      includeAutoScreenshots: boolean
    }[] = []

    if (seats.length > 0) {
      // New format with per-employee add-on tracking
      seatSelections = seats
    } else if (employeeIds.length > 0) {
      // Legacy format - apply same add-on to all
      seatSelections = employeeIds.map((id: string) => ({
        employeeId: id,
        includeAutoScreenshots,
      }))
    }

    const seatQuantity =
      seatSelections.length > 0 ? seatSelections.length : quantity || 1
    const seatsWithAutoScreenshots = seatSelections.filter(
      (s) => s.includeAutoScreenshots
    ).length
    const hasAnyAutoScreenshots = seatsWithAutoScreenshots > 0

    // Validate quantity range
    if (seatQuantity < 1 || seatQuantity > 10000) {
      return NextResponse.json(
        { error: "Invalid quantity. Must be between 1 and 10000." },
        { status: 400 }
      )
    }

    // Validate employee IDs if provided
    if (seatSelections.length > 0) {
      const employeeIdsToValidate = seatSelections.map((s) => s.employeeId)
      const employees = await prisma.employee.findMany({
        where: {
          id: { in: employeeIdsToValidate },
          organizationId,
          isActive: true,
        },
        select: { id: true },
      })

      if (employees.length !== employeeIdsToValidate.length) {
        return NextResponse.json(
          {
            error:
              "One or more employee IDs are invalid or do not belong to your organization.",
          },
          { status: 400 }
        )
      }
    }

    // Store pending license assignments in metadata for webhook processing
    // Format: employeeId:hasAutoScreenshots pairs, comma-separated
    const pendingSeats =
      seatSelections.length > 0
        ? seatSelections
            .map(
              (s) => `${s.employeeId}:${s.includeAutoScreenshots ? "1" : "0"}`
            )
            .join(",")
        : ""

    // Get base URL for redirects
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000"
    const successUrl = `${origin}/app/billing?checkout=success`
    const cancelUrl = `${origin}/app/billing?checkout=canceled`

    const session = await createCheckoutSession(organizationId, {
      quantity: seatQuantity,
      autoScreenshotsQuantity: seatsWithAutoScreenshots,
      successUrl,
      cancelUrl,
      pendingSeats, // New format: "empId1:1,empId2:0" where 1=hasAutoScreenshots
    })

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    })
  } catch (error) {
    console.error("Failed to create checkout session:", error)
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    )
  }
}
