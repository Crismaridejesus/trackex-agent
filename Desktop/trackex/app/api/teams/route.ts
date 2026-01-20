import { logAuditEvent } from "@/lib/audit/logger";
import { requireManager } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { createTeamSchema } from "@/lib/validations/team";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    // Get tenant context
    const context = await requireTenantContext()
    const { organizationId, user, isSuperAdmin } = context
    // Allow Super Admin to override via ?orgId= when no org in session
    let effectiveOrgId = organizationId
    const overrideOrgId = req.nextUrl.searchParams.get("orgId")
    if (!effectiveOrgId && isSuperAdmin && overrideOrgId) {
      // Verify org exists
      const org = await prisma.organization.findUnique({
        where: { id: overrideOrgId },
      })
      if (org) {
        effectiveOrgId = org.id
      }
    }

    if (!effectiveOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    // Build where clause based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = { organizationId: effectiveOrgId }

    // Team Lead can only see their assigned teams
    if (user.organizationRole === "TEAM_LEAD" && user.teamIds?.length) {
      whereClause.id = { in: user.teamIds }
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        defaultPolicy: true,
        _count: {
          select: {
            employees: { where: { isActive: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ teams })
  } catch (error) {
    console.error("Failed to fetch teams:", error)
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require at least manager role to create teams
    await requireManager()

    // Get tenant context
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context
    let effectiveOrgId = organizationId
    const overrideOrgId = req.nextUrl.searchParams.get("orgId")
    if (!effectiveOrgId && isSuperAdmin && overrideOrgId) {
      const org = await prisma.organization.findUnique({
        where: { id: overrideOrgId },
      })
      if (org) effectiveOrgId = org.id
    }

    if (!effectiveOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validatedData = createTeamSchema.parse(body)

    // Check if team name already exists in this organization
    const existingTeam = await prisma.team.findFirst({
      where: {
        organizationId: effectiveOrgId,
        name: validatedData.name,
      },
    })

    if (existingTeam) {
      return NextResponse.json(
        { error: "Team name already exists in this organization" },
        { status: 400 }
      )
    }

    // If no policy is specified, try to find and assign the default policy for this org
    let defaultPolicyId = validatedData.defaultPolicyId
    if (!defaultPolicyId) {
      const defaultPolicy = await prisma.policy.findFirst({
        where: {
          organizationId: effectiveOrgId,
          isDefault: true,
        },
        select: { id: true },
      })
      if (defaultPolicy) {
        defaultPolicyId = defaultPolicy.id
      }
    }

    // Validate that policy belongs to organization if provided
    if (defaultPolicyId) {
      const policy = await prisma.policy.findFirst({
        where: { id: defaultPolicyId, organizationId: effectiveOrgId },
      })
      if (!policy) {
        return NextResponse.json(
          { error: "Policy not found in this organization" },
          { status: 400 }
        )
      }
    }

    const team = await prisma.team.create({
      data: {
        organizationId: effectiveOrgId,
        name: validatedData.name,
        defaultPolicyId,
      },
      include: {
        defaultPolicy: true,
        _count: {
          select: {
            employees: { where: { isActive: true } },
          },
        },
      },
    })

    await logAuditEvent(
      {
        action: "team_create",
        organizationId: effectiveOrgId,
        targetType: "Team",
        targetId: team.id,
        details: JSON.stringify({
          teamName: team.name,
          organizationId: effectiveOrgId,
        }),
      },
      req
    )

    return NextResponse.json({ team }, { status: 201 })
  } catch (error) {
    console.error("Failed to create team:", error)
    return NextResponse.json(
      { error: "Failed to create team" },
      { status: 500 }
    )
  }
}
