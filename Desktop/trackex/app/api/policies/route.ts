import { logAuditEvent } from "@/lib/audit/logger";
import { requireManager } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { createPolicySchema } from "@/lib/validations/policy";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
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

    const policies = await prisma.policy.findMany({
      where: { organizationId: effectiveOrgId },
      include: {
        _count: {
          select: {
            employees: { where: { isActive: true } },
            teamsDefault: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json({ policies })
  } catch (error) {
    console.error("Failed to fetch policies:", error)
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require at least manager role
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
    const validatedData = createPolicySchema.parse(body)

    // Check if policy name already exists in this organization
    const existingPolicy = await prisma.policy.findFirst({
      where: {
        organizationId: effectiveOrgId,
        name: validatedData.name,
      },
    })

    if (existingPolicy) {
      return NextResponse.json(
        { error: "Policy name already exists in this organization" },
        { status: 400 }
      )
    }

    // If setting this policy as default, unset any other default policies in this org first
    if (validatedData.isDefault === true) {
      await prisma.policy.updateMany({
        where: { organizationId: effectiveOrgId, isDefault: true },
        data: { isDefault: false },
      })
    }

    const data = {
      ...validatedData,
      organizationId: effectiveOrgId,
      workHours: validatedData.workHours
        ? JSON.stringify(validatedData.workHours)
        : null,
    }

    const policy = await prisma.policy.create({
      data,
      include: {
        _count: {
          select: {
            employees: { where: { isActive: true } },
            teamsDefault: true,
          },
        },
      },
    })

    await logAuditEvent(
      {
        action: "policy_create",
        organizationId,
        targetType: "Policy",
        targetId: policy.id,
        details: { policyName: policy.name, organizationId },
      },
      req
    )

    return NextResponse.json({ policy }, { status: 201 })
  } catch (error) {
    console.error("Failed to create policy:", error)
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    )
  }
}
