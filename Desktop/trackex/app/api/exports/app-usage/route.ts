import { logAuditEvent } from "@/lib/audit/logger"
import { requireTenantContext } from "@/lib/tenant-context"
import { exportAppUsage } from "@/lib/utils/csv-export"
import { exportFiltersSchema } from "@/lib/validations/analytics"
import { format, subDays } from "date-fns"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const context = await requireTenantContext()
    const { organizationId } = context

    const { searchParams } = new URL(req.url)

    const filters = exportFiltersSchema.parse({
      startDate:
        searchParams.get("startDate") || subDays(new Date(), 7).toISOString(),
      endDate: searchParams.get("endDate") || new Date().toISOString(),
      teamIds: searchParams.get("teamIds")?.split(",").filter(Boolean),
      employeeIds: searchParams.get("employeeIds")?.split(",").filter(Boolean),
      format: searchParams.get("format") || "csv",
    })

    const csv = await exportAppUsage({
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      teamIds: filters.teamIds,
      employeeIds: filters.employeeIds,
      organizationId, // Pass organization scope
    })

    await logAuditEvent(
      {
        action: "export_app_usage",
        organizationId,
        details: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          teamIds: filters.teamIds,
          employeeIds: filters.employeeIds,
          format: filters.format,
        },
      },
      req
    )

    const filename = `app-usage-${format(new Date(), "yyyy-MM-dd")}.csv`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Failed to export app usage:", error)
    return NextResponse.json(
      { error: "Failed to export app usage" },
      { status: 500 }
    )
  }
}
