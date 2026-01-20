import { logAuditEvent } from "@/lib/audit/logger";
import { prisma } from "@/lib/db";
import { requireTenantContext } from "@/lib/tenant-context";
import { createDomainRuleSchema } from "@/lib/validations/domain-rule";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    // Fetch org-specific rules + global rules (isGlobal = true)
    // Super admins can see all rules, so we skip scoping by organization for them
    const rules = await prisma.domainRule.findMany({
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
    console.error("Failed to fetch domain rules:", error)
    return NextResponse.json(
      { error: "Failed to fetch domain rules" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin } = context

    const body = await req.json()
    const validatedData = createDomainRuleSchema.parse(body)

    // Only super admin can create global rules
    const isGlobal = isSuperAdmin && body.isGlobal === true
    const effectiveOrgId = organizationId

    // Check for existing rule with same domain and matcher type within same org
    const existing = await prisma.domainRule.findFirst({
      where: {
        domain: validatedData.domain,
        matcherType: validatedData.matcherType,
        organizationId: effectiveOrgId,
      },
    })

    if (existing) {
      return NextResponse.json(
        { error: "A rule with this domain and matcher type already exists" },
        { status: 400 }
      )
    }

    const rule = await prisma.domainRule.create({
      data: {
        ...validatedData,
        organizationId: effectiveOrgId,
        isGlobal,
      },
    })

    await logAuditEvent(
      {
        action: "domain_rule_create",
        organizationId: rule.organizationId,
        targetType: "DomainRule",
        targetId: rule.id,
        details: {
          domain: rule.domain,
          matcherType: rule.matcherType,
          category: rule.category,
        },
      },
      req
    )

    return NextResponse.json({ rule }, { status: 201 })
  } catch (error) {
    console.error("Failed to create domain rule:", error)
    return NextResponse.json(
      { error: "Failed to create domain rule" },
      { status: 500 }
    )
  }
}
