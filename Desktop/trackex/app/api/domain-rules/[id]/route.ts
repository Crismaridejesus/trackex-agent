import { logAuditEvent } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { updateDomainRuleSchema } from "@/lib/validations/domain-rule";
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context
    const { id } = await params

    const rule = await prisma.domainRule.findUnique({
      where: { id },
    })

    if (!rule) {
      return NextResponse.json(
        { error: "Domain rule not found" },
        { status: 404 }
      )
    }

    // Check organization ownership
    if (!canAccessRule(rule, organizationId, isSuperAdmin)) {
      return NextResponse.json(
        { error: "Domain rule not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ rule })
  } catch (error) {
    console.error("Failed to fetch domain rule:", error)
    return NextResponse.json(
      { error: "Failed to fetch domain rule" },
      { status: 500 }
    )
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context
    const { id } = await params

    const body = await req.json()
    const validatedData = updateDomainRuleSchema.parse(body)

    const existing = await prisma.domainRule.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Domain rule not found" },
        { status: 404 }
      )
    }

    // Check organization ownership for modification
    if (!canModifyRule(existing, organizationId, isSuperAdmin)) {
      return NextResponse.json(
        { error: "You do not have permission to modify this rule" },
        { status: 403 }
      )
    }

    // If domain or matcherType is changing, check for conflicts within same org
    if (validatedData.domain || validatedData.matcherType) {
      const newDomain = validatedData.domain || existing.domain
      const newMatcherType = validatedData.matcherType || existing.matcherType

      const conflict = await prisma.domainRule.findFirst({
        where: {
          domain: newDomain,
          matcherType: newMatcherType,
          organizationId: existing.organizationId,
          NOT: { id },
        },
      })

      if (conflict) {
        return NextResponse.json(
          { error: "A rule with this domain and matcher type already exists" },
          { status: 400 }
        )
      }
    }

    const rule = await prisma.domainRule.update({
      where: { id },
      data: validatedData,
    })

    await logAuditEvent(
      {
        action: "domain_rule_update",
        organizationId: existing.organizationId,
        targetType: "DomainRule",
        targetId: rule.id,
        details: {
          changes: validatedData,
        },
      },
      req
    )

    return NextResponse.json({ rule })
  } catch (error) {
    console.error("Failed to update domain rule:", error)
    return NextResponse.json(
      { error: "Failed to update domain rule" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context
    const { id } = await params

    const existing = await prisma.domainRule.findUnique({
      where: { id },
    })

    if (!existing) {
      return NextResponse.json(
        { error: "Domain rule not found" },
        { status: 404 }
      )
    }

    // Check organization ownership for modification
    if (!canModifyRule(existing, organizationId, isSuperAdmin)) {
      return NextResponse.json(
        { error: "You do not have permission to delete this rule" },
        { status: 403 }
      )
    }

    await prisma.domainRule.delete({
      where: { id },
    })

    await logAuditEvent(
      {
        action: "domain_rule_delete",
        organizationId: existing.organizationId,
        targetType: "DomainRule",
        targetId: id,
        details: {
          domain: existing.domain,
          category: existing.category,
        },
      },
      req
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to delete domain rule:", error)
    return NextResponse.json(
      { error: "Failed to delete domain rule" },
      { status: 500 }
    )
  }
}
