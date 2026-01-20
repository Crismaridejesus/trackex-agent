import { prisma } from "@/lib/db";
import { categorizeApp } from "./categories";

export interface ExportFilters {
  startDate: Date
  endDate: Date
  teamIds?: string[]
  employeeIds?: string[]
  organizationId: string // Required for org-scoped exports
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatCSV(data: any[]): string {
  if (data.length === 0) return ""

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(",")

  const csvRows = data.map((row) =>
    headers
      .map((header) => {
        const value = row[header]
        // Escape quotes and wrap in quotes if contains comma, quote, or newline
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"') || value.includes("\n"))
        ) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ""
      })
      .join(",")
  )

  return [csvHeaders, ...csvRows].join("\n")
}

export async function exportHomeAnalytics(filters: ExportFilters) {
  const { startDate, endDate, teamIds, employeeIds, organizationId } = filters

  const employeeFilter = {
    isActive: true,
    ...(organizationId && { organizationId }), // Scope to organization
    ...(teamIds?.length && { teamId: { in: teamIds } }),
    ...(employeeIds?.length && { id: { in: employeeIds } }),
  }

  // Get work sessions
  const sessions = await prisma.workSession.findMany({
    where: {
      employee: employeeFilter,
      clockIn: {
        gte: startDate,
        lte: endDate,
      },
      clockOut: { not: null },
    },
    include: {
      employee: {
        include: {
          team: true,
        },
      },
      device: true,
    },
    orderBy: [{ employee: { name: "asc" } }, { clockIn: "desc" }],
  })

  const csvData = sessions.map((session) => ({
    "Employee Name": session.employee.name,
    "Employee Email": session.employee.email,
    Team: session.employee.team?.name || "No Team",
    Device: session.device.deviceName,
    Platform: session.device.platform,
    "Clock In": session.clockIn.toISOString(),
    "Clock Out": session.clockOut?.toISOString() || "",
    "Total Work (seconds)": session.totalWork || 0,
    "Active Time (seconds)": session.activeTime || 0,
    "Idle Time (seconds)": session.idleTime || 0,
    "Edit Reason": session.editReason || "",
    "Edited By": session.editedBy || "",
    "Edited At": session.editedAt?.toISOString() || "",
  }))

  return formatCSV(csvData)
}

export async function exportEmployeeSessions(
  employeeId: string,
  filters: Omit<ExportFilters, "employeeIds">
) {
  return exportHomeAnalytics({
    ...filters,
    employeeIds: [employeeId],
  })
}

export async function exportAppUsage(filters: ExportFilters) {
  const { startDate, endDate, teamIds, employeeIds, organizationId } = filters

  const employeeFilter = {
    isActive: true,
    ...(organizationId && { organizationId }), // Scope to organization
    ...(teamIds?.length && { teamId: { in: teamIds } }),
    ...(employeeIds?.length && { id: { in: employeeIds } }),
  }

  // Get app rules for categorization (org-specific + global)
  const appRules = await prisma.appRule.findMany({
    where: {
      isActive: true,
      ...(organizationId
        ? {
            OR: [{ organizationId }, { isGlobal: true }],
          }
        : {}),
    },
    orderBy: { priority: "asc" },
  })

  // Get app focus events
  const appEvents = await prisma.event.findMany({
    where: {
      employee: employeeFilter,
      type: "app_focus",
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      employee: {
        include: {
          team: true,
        },
      },
      device: true,
    },
    orderBy: [{ employee: { name: "asc" } }, { timestamp: "desc" }],
  })

  const csvData = appEvents
    .filter((event) => event.data && typeof event.data === "object")
    .map((event) => {
      const appData = event.data as {
        name?: string
        windowTitle?: string
        domain?: string
      }
      if (!appData.name) return null

      const category = categorizeApp(
        {
          name: appData.name,
          windowTitle: appData.windowTitle,
          domain: appData.domain,
        },
        appRules
      )

      return {
        "Employee Name": event.employee.name,
        "Employee Email": event.employee.email,
        Team: event.employee.team?.name || "No Team",
        Device: event.device.deviceName,
        Platform: event.device.platform,
        Timestamp: event.timestamp.toISOString(),
        "App Name": appData.name,
        "Window Title": appData.windowTitle || "",
        Domain: appData.domain || "",
        Category: category,
      }
    })
    .filter(Boolean)

  return formatCSV(csvData)
}
