import { requireTenantContext } from "@/lib/tenant-context"
import { getHomeAnalytics } from "@/lib/utils/analytics"
import { analyticsFiltersSchema } from "@/lib/validations/analytics"
import { subDays } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    const { searchParams } = new URL(req.url)

    const defaultStartDate = subDays(new Date(), 7)
    const defaultEndDate = new Date()

    const filters = analyticsFiltersSchema.parse({
      startDate:
        searchParams.get("startDate") || defaultStartDate.toISOString(),
      endDate: searchParams.get("endDate") || defaultEndDate.toISOString(),
      teamIds: searchParams.get("teamIds")?.split(",").filter(Boolean),
      employeeIds: searchParams.get("employeeIds")?.split(",").filter(Boolean),
    })

    const analytics = await getHomeAnalytics({
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      teamIds: filters.teamIds,
      employeeIds: filters.employeeIds,
      organizationId, // Pass organization scope
    })

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("Failed to fetch home analytics:", error)

    // Return more specific error messages
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(
      { error: "Failed to fetch home analytics" },
      { status: 500 }
    )
  }
}
