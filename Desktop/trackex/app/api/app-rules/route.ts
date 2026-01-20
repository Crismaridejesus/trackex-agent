import { logAuditEvent } from '@/lib/audit/logger';
import { prisma } from '@/lib/db';
import { requireTenantContext } from '@/lib/tenant-context';
import { createAppRuleSchema } from '@/lib/validations/app-rule';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    // Fetch org-specific rules + global rules (isGlobal = true)
    // Super admins can see all rules, so we skip scoping by organization for them
    const rules = await prisma.appRule.findMany({
      where: isSuperAdmin
        ? {}
        : {
            OR: [
              { organizationId }, // Org-specific rules
              { isGlobal: true }, // Global rules visible to all
            ],
          },
      orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
    })

    return NextResponse.json({ rules })
  } catch (error) {
    console.error("Failed to fetch app rules:", error)
    return NextResponse.json(
      { error: "Failed to fetch app rules" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    const body = await req.json()
    const validatedData = createAppRuleSchema.parse(body)

    // Only super admin can create global rules
    const isGlobal = isSuperAdmin && body.isGlobal === true

    const rule = await prisma.appRule.create({
      data: {
        ...validatedData,
        organizationId,
        isGlobal,
      },
    })

    await logAuditEvent(
      {
        action: "app_rule_create",
        organizationId,
        targetType: "AppRule",
        targetId: rule.id,
        details: {
          matcherType: rule.matcherType,
          value: rule.value,
          category: rule.category,
        },
      },
      req
    )

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error("Failed to create app rule:", error)
    return NextResponse.json(
      { error: "Failed to create app rule" },
      { status: 500 }
    )
  }
}
