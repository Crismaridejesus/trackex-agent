import { requireOwner } from "@/lib/auth/rbac";
import { categorizeApp } from "@/lib/utils/categories";
import { testRuleSchema } from "@/lib/validations/app-rule";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function POST(req: NextRequest) {
  try {
    await requireOwner()

    const body = await req.json()
    const { rules, testCases } = testRuleSchema.parse(body)

    const results = testCases.map((testCase) => {
      const category = categorizeApp(
        {
          name: testCase.appName,
          windowTitle: testCase.windowTitle,
          domain: testCase.domain,
        },
        rules.map((rule) => ({
          ...rule,
          id: "test",
          isActive: true,
          isGlobal: false,
          organizationId: "test-org",
          createdAt: new Date(),
          updatedAt: new Date(),
        }))
      )

      // Find which rule matched
      const matchingRule = rules.find((rule) => {
        const mockAppRule = {
          ...rule,
          id: "test",
          isActive: true,
          isGlobal: false,
          organizationId: "test-org",
          createdAt: new Date(),
          updatedAt: new Date(),
        }
        return (
          categorizeApp(
            {
              name: testCase.appName,
              windowTitle: testCase.windowTitle,
              domain: testCase.domain,
            },
            [mockAppRule]
          ) === rule.category
        )
      })

      return {
        testCase,
        category,
        matchingRule: matchingRule || null,
      }
    })

    return NextResponse.json({ results })
  } catch (error) {
    console.error("Failed to test app rules:", error)
    return NextResponse.json(
      { error: "Failed to test app rules" },
      { status: 500 }
    )
  }
}
