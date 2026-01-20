import { logAuditEvent } from "@/lib/audit/logger";
import { requireOwner } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { exportEmployeeSessions } from "@/lib/utils/csv-export";
import { exportFiltersSchema } from "@/lib/validations/analytics";
import { format, subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner()

    // Verify employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
    })

    if (!employee?.isActive) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)

    const filters = exportFiltersSchema.parse({
      startDate:
        searchParams.get("startDate") || subDays(new Date(), 7).toISOString(),
      endDate: searchParams.get("endDate") || new Date().toISOString(),
      teamIds: searchParams.get("teamIds")?.split(",").filter(Boolean),
      employeeIds: [params.id],
      format: searchParams.get("format") || "csv",
    })

    const csv = await exportEmployeeSessions(params.id, {
      startDate: new Date(filters.startDate),
      endDate: new Date(filters.endDate),
      teamIds: filters.teamIds,
      organizationId: employee.organizationId,
    })

    await logAuditEvent(
      {
        action: "export_employee_sessions",
        organizationId: employee.organizationId,
        targetType: "Employee",
        targetId: params.id,
        details: {
          employeeName: employee.name,
          startDate: filters.startDate,
          endDate: filters.endDate,
          format: filters.format,
        },
      },
      req
    )

    const filename = `${employee.name.replace(/\s+/g, "-").toLowerCase()}-sessions-${format(new Date(), "yyyy-MM-dd")}.csv`

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error("Failed to export employee sessions:", error)
    return NextResponse.json(
      { error: "Failed to export employee sessions" },
      { status: 500 }
    )
  }
}
