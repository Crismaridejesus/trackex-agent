import { requireSuperAdmin } from "@/lib/auth/rbac"
import { prisma } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * GET /api/admin/organizations
 *
 * Super Admin only: List all organizations
 */
export async function GET(req: NextRequest) {
  try {
    await requireSuperAdmin()

    const { searchParams } = new URL(req.url)
    const includeInactive = searchParams.get("includeInactive") === "true"
    const search = searchParams.get("search")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {}

    if (!includeInactive) {
      whereClause.isActive = true
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
      ]
    }

    const organizations = await prisma.organization.findMany({
      where: whereClause,
      include: {
        subscription: {
          select: {
            status: true,
            quantity: true,
            currentPeriodEnd: true,
          },
        },
        _count: {
          select: {
            employees: { where: { isActive: true } },
            licenses: { where: { status: "ACTIVE" } },
            users: { where: { isActive: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    // Calculate summary stats
    const summary = {
      total: organizations.length,
      active: organizations.filter((o) => o.isActive).length,
      betaTesters: organizations.filter((o) => o.isBetaTester).length,
      bypassPayment: organizations.filter((o) => o.bypassPayment).length,
      withSubscription: organizations.filter(
        (o) => o.subscription?.status === "active"
      ).length,
    }

    return NextResponse.json({ organizations, summary })
  } catch (error) {
    if (error instanceof Error && error.name === "ForbiddenError") {
      return NextResponse.json(
        { error: "Super Admin access required" },
        { status: 403 }
      )
    }
    console.error("Failed to list organizations:", error)
    return NextResponse.json(
      { error: "Failed to list organizations" },
      { status: 500 }
    )
  }
}
