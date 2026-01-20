import { prisma } from "@/lib/db"
import { requireTenantContext } from "@/lib/tenant-context"
import { getEmployeeAnalytics } from "@/lib/utils/analytics"
import { analyticsFiltersSchema } from "@/lib/validations/analytics"
import { subDays } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    // Verify employee belongs to organization
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      select: { organizationId: true },
    })

    if (!employee || employee.organizationId !== organizationId) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)

    const filters = analyticsFiltersSchema.parse({
      startDate:
        searchParams.get("startDate") || subDays(new Date(), 7).toISOString(),
      endDate: searchParams.get("endDate") || new Date().toISOString(),
      teamIds: searchParams.get("teamIds")?.split(",").filter(Boolean),
      employeeIds: [params.id], // Override with specific employee
    })

    const analytics = await getEmployeeAnalytics(params.id, {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      teamIds: filters.teamIds,
      organizationId, // Pass organization scope
    })

    return NextResponse.json({ analytics })
  } catch (error) {
    console.error("Failed to fetch employee analytics:", error)
    return NextResponse.json(
      { error: "Failed to fetch employee analytics" },
      { status: 500 }
    )
  }
}
