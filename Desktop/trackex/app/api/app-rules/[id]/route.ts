import { logAuditEvent } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { updateAppRuleSchema } from "@/lib/validations/app-rule";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

// Helper to check if user can access this rule
function canAccessRule(
  rule: { organizationId: string; isGlobal: boolean },
  organizationId: string,
  isSuperAdmin: boolean
): boolean {
  // Super admin can access any rule
  if (isSuperAdmin) return true
  // User can access their org's rules or global rules
  return rule.organizationId === organizationId || rule.isGlobal
}

// Helper to check if user can modify this rule
function canModifyRule(
  rule: { organizationId: string; isGlobal: boolean },
  organizationId: string,
  isSuperAdmin: boolean
): boolean {
  // Only super admin can modify global rules
  if (rule.isGlobal) return isSuperAdmin
  // User can modify their org's rules
  return rule.organizationId === organizationId
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    const rule = await prisma.appRule.findUnique({
      where: { id: params.id },
    })

    if (!rule) {
      return NextResponse.json({ error: "App rule not found" }, { status: 404 })
    }

    // Check organization ownership
    if (!canAccessRule(rule, organizationId, isSuperAdmin)) {
      return NextResponse.json({ error: "App rule not found" }, { status: 404 })
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error("Failed to fetch app rule:", error)
    return NextResponse.json(
      { error: "Failed to fetch app rule" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    const body = await req.json()
    const validatedData = updateAppRuleSchema.parse(body)

    const existingRule = await prisma.appRule.findUnique({
      where: { id: params.id },
    })

    if (!existingRule) {
      return NextResponse.json({ error: "App rule not found" }, { status: 404 })
    }

    // Check organization ownership for modification
    if (!canModifyRule(existingRule, organizationId, isSuperAdmin)) {
      return NextResponse.json(
        { error: "You do not have permission to modify this rule" },
        { status: 403 }
      )
    }

    const rule = await prisma.appRule.update({
      where: { id: params.id },
      data: validatedData,
    })

    await logAuditEvent(
      {
        action: "app_rule_update",
        organizationId: rule.organizationId,
        targetType: "AppRule",
        targetId: rule.id,
        details: {
          matcherType: rule.matcherType,
          value: rule.value,
          category: rule.category,
          changes: validatedData,
        },
      },
      req
    )

    return NextResponse.json({ rule })
  } catch (error) {
    console.error("Failed to update app rule:", error)
    return NextResponse.json(
      { error: "Failed to update app rule" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    const rule = await prisma.appRule.findUnique({
      where: { id: params.id },
    })

    if (!rule) {
      return NextResponse.json({ error: "App rule not found" }, { status: 404 })
    }

    // Check organization ownership for modification
    if (!canModifyRule(rule, organizationId, isSuperAdmin)) {
      return NextResponse.json(
        { error: "You do not have permission to delete this rule" },
        { status: 403 }
      )
    }

    await prisma.appRule.delete({
      where: { id: params.id },
    })

    await logAuditEvent(
      {
        action: "app_rule_delete",
        organizationId: rule.organizationId,
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete app rule:", error)
    return NextResponse.json(
      { error: "Failed to delete app rule" },
      { status: 500 }
    )
  }
}
