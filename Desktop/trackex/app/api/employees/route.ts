import { logAuditEvent } from "@/lib/audit/logger";
import { requireManager } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { createTimeTrackingService } from "@/lib/services/time-tracking.service";
import { requireTenantContext } from "@/lib/tenant-context";
import { classifyWithSource } from "@/lib/utils/categories";
import { calculateProductivityScore } from "@/lib/utils/time-calculations";
import { createEmployeeSchema } from "@/lib/validations/employee";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic"

// Helper to add computed license fields to employee
function enrichEmployeeWithLicenseInfo(employee: {
  license: {
    id: string
    status: string
    expiresAt: Date | null
    activatedAt: Date | null
    source: string
    tier?: string | null
    includesAutoScreenshots?: boolean
  } | null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}) {
  const license = employee.license
  const now = new Date()

  // Compute hasLicense
  const isActive = license?.status === "ACTIVE"
  const isExpired = license?.expiresAt
    ? new Date(license.expiresAt) < now
    : false
  const hasLicense = isActive && !isExpired

  // Use stored tier from license, fallback to computing from source for legacy
  let licenseTier: string | null = null
  if (license) {
    if (license.tier) {
      licenseTier = license.tier
    } else if (license.source === "TRIAL") {
      licenseTier = "STARTER"
    } else if (license.source === "STRIPE") {
      licenseTier = "TEAM"
    } else if (
      license.source === "BETA_BYPASS" ||
      license.source === "MANUAL"
    ) {
      licenseTier = "TEAM"
    }
  }

  return {
    ...employee,
    hasLicense,
    licenseExpirationDate: license?.expiresAt || null,
    licenseTier,
    includesAutoScreenshots: license?.includesAutoScreenshots || false,
    license: license
      ? {
          id: license.id,
          status: license.status,
          source: license.source,
          tier: license.tier,
          activatedAt: license.activatedAt,
          expiresAt: license.expiresAt,
          includesAutoScreenshots: license.includesAutoScreenshots || false,
        }
      : null,
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get tenant context (handles auth and org scoping)
    const context = await requireTenantContext()
    const { organizationId, isSuperAdmin, user } = context

    const { searchParams } = new URL(req.url)
    const teamId = searchParams.get("teamId")
    const excludeTeam = searchParams.get("excludeTeam")
    const includeInactive = searchParams.get("includeInactive") === "true"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    // For super admin without org context, require orgId param
    let effectiveOrgId = organizationId
    if (isSuperAdmin && searchParams.get("orgId")) {
      effectiveOrgId = searchParams.get("orgId")!
    }

    if (!effectiveOrgId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    // Build where clause with organization scope
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const whereClause: any = {
      organizationId: effectiveOrgId,
      ...(includeInactive ? {} : { isActive: true }),
    }

    // Team Lead can only see their team members
    if (user.organizationRole === "TEAM_LEAD" && user.teamIds?.length) {
      whereClause.teamId = { in: user.teamIds }
    } else if (teamId) {
      whereClause.teamId = teamId
    } else if (excludeTeam) {
      whereClause.OR = [{ teamId: null }, { teamId: { not: excludeTeam } }]
    }

    const employees = await prisma.employee.findMany({
      where: whereClause,
      include: {
        team: true,
        policy: true,
        license: true,
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            devices: { where: { isActive: true } },
            sessions: true,
          },
        },
      },
      orderBy: { name: "asc" },
    })

    // If date range is provided, fetch analytics for all employees in batch
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      const now = new Date()
      const employeeIds = employees.map((e) => e.id)

      // OPTIMIZATION: Batch fetch all work sessions at once instead of per-employee
      const allSessions = await prisma.workSession.findMany({
        where: {
          employeeId: { in: employeeIds },
          clockIn: { gte: start, lte: end },
        },
        select: {
          id: true,
          employeeId: true,
          clockIn: true,
          clockOut: true,
        },
      })

      // Build session conditions for batch app usage query
      // Include BOTH completed sessions AND active sessions (clockOut is null)
      const sessionConditions = allSessions.map((session) => ({
        AND: [
          { employeeId: session.employeeId },
          { startTime: { gte: session.clockIn } },
          // For active sessions, use current time as end boundary
          { startTime: { lte: session.clockOut || now } },
        ],
      }))

      // OPTIMIZATION: Batch fetch all app usage at once
      const allAppUsage =
        sessionConditions.length > 0
          ? await prisma.appUsage.findMany({
              where: { OR: sessionConditions },
              select: {
                employeeId: true,
                isIdle: true,
                category: true,
                duration: true,
                startTime: true,
                endTime: true,
                appName: true,
                appId: true,
                domain: true,
              },
              orderBy: { startTime: "asc" },
            })
          : []

      // Fetch app rules and domain rules for re-classification (org-scoped + global)
      const [appRules, domainRules] = await Promise.all([
        prisma.appRule.findMany({
          where: {
            isActive: true,
            OR: [{ organizationId: effectiveOrgId }, { isGlobal: true }],
          },
        }),
        prisma.domainRule.findMany({
          where: {
            isActive: true,
            OR: [{ organizationId: effectiveOrgId }, { isGlobal: true }],
          },
        }),
      ])

      // Group sessions and app usage by employee
      const sessionsByEmployee = new Map<string, typeof allSessions>()
      const appUsageByEmployee = new Map<string, typeof allAppUsage>()

      allSessions.forEach((session) => {
        if (!sessionsByEmployee.has(session.employeeId)) {
          sessionsByEmployee.set(session.employeeId, [])
        }
        sessionsByEmployee.get(session.employeeId)!.push(session)
      })

      allAppUsage.forEach((usage) => {
        if (!appUsageByEmployee.has(usage.employeeId)) {
          appUsageByEmployee.set(usage.employeeId, [])
        }
        appUsageByEmployee.get(usage.employeeId)!.push(usage)
      })

      // OPTIMIZATION: Batch fetch latest work sessions for all employees at once
      const latestSessions = await prisma.workSession.findMany({
        where: {
          employeeId: { in: employeeIds },
        },
        orderBy: { clockIn: "desc" },
        select: {
          employeeId: true,
          clockIn: true,
          clockOut: true,
        },
        distinct: ["employeeId"],
      })

      // Map latest sessions by employee
      const latestSessionByEmployee = new Map<
        string,
        { clockIn: Date; clockOut: Date | null }
      >()
      latestSessions.forEach((session) => {
        latestSessionByEmployee.set(session.employeeId, {
          clockIn: session.clockIn,
          clockOut: session.clockOut,
        })
      })

      // Calculate stats for each employee using pre-fetched data
      const employeesWithAnalytics = employees.map((employee) => {
        const employeeAppUsage = appUsageByEmployee.get(employee.id) || []

        // Calculate statistics from pre-fetched data (no additional queries)
        const timeTrackingService = createTimeTrackingService(prisma)
        const idleTime = employeeAppUsage
          .filter((u) => u.isIdle)
          .reduce((sum, u) => sum + u.duration, 0)

        const activeTime = employeeAppUsage
          .filter((u) => !u.isIdle)
          .reduce((sum, u) => sum + u.duration, 0)

        const productiveTime = employeeAppUsage
          .filter((u) => {
            if (u.isIdle) return false
            // Re-classify using domain rules at query time
            const classification = classifyWithSource(
              {
                name: u.appName,
                process: u.appId || undefined,
                domain: u.domain || undefined,
              },
              appRules,
              domainRules
            )
            return classification.category === "PRODUCTIVE"
          })
          .reduce((sum, u) => sum + u.duration, 0)

        const neutralTime = employeeAppUsage
          .filter((u) => {
            if (u.isIdle) return false
            const classification = classifyWithSource(
              {
                name: u.appName,
                process: u.appId || undefined,
                domain: u.domain || undefined,
              },
              appRules,
              domainRules
            )
            return classification.category === "NEUTRAL"
          })
          .reduce((sum, u) => sum + u.duration, 0)

        const unproductiveTime = employeeAppUsage
          .filter((u) => {
            if (u.isIdle) return false
            const classification = classifyWithSource(
              {
                name: u.appName,
                process: u.appId || undefined,
                domain: u.domain || undefined,
              },
              appRules,
              domainRules
            )
            return classification.category === "UNPRODUCTIVE"
          })
          .reduce((sum, u) => sum + u.duration, 0)

        const totalWork = activeTime + idleTime
        const productivityScore = calculateProductivityScore(
          productiveTime,
          activeTime
        )

        // Get latest clock-in/clock-out for this employee
        const latestSession = latestSessionByEmployee.get(employee.id)

        return {
          ...employee,
          latestClockIn: latestSession?.clockIn || null,
          latestClockOut: latestSession?.clockOut || null,
          analytics: {
            totalWork,
            activeTime,
            idleTime,
            productiveTime,
            neutralTime,
            unproductiveTime,
            productivityScore,
          },
        }
      })

      return NextResponse.json({
        employees: employeesWithAnalytics.map(enrichEmployeeWithLicenseInfo),
      })
    }

    return NextResponse.json({
      employees: employees.map(enrichEmployeeWithLicenseInfo),
    })
  } catch (error) {
    console.error("Failed to fetch employees:", error)
    return NextResponse.json(
      { error: "Failed to fetch employees" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    // Require at least manager role
    await requireManager()

    // Get tenant context
    const context = await requireTenantContext()
    const { organizationId } = context

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization context required" },
        { status: 400 }
      )
    }

    const body = await req.json()
    const validatedData = createEmployeeSchema.parse(body)

    // Check if an active employee with this email already exists in this organization
    const existingEmployee = await prisma.employee.findFirst({
      where: {
        organizationId,
        email: validatedData.email,
        isActive: true,
      },
    })

    if (existingEmployee) {
      return NextResponse.json(
        { error: "Email already exists in this organization" },
        { status: 400 }
      )
    }

    // Validate team belongs to organization if provided
    if (validatedData.teamId) {
      const team = await prisma.team.findFirst({
        where: { id: validatedData.teamId, organizationId },
      })
      if (!team) {
        return NextResponse.json(
          { error: "Team not found in this organization" },
          { status: 400 }
        )
      }
    }

    // Validate policy belongs to organization if provided
    if (validatedData.policyId) {
      const policy = await prisma.policy.findFirst({
        where: { id: validatedData.policyId, organizationId },
      })
      if (!policy) {
        return NextResponse.json(
          { error: "Policy not found in this organization" },
          { status: 400 }
        )
      }
    }

    // Hash password if provided
    let hashedPassword = null
    if (validatedData.password) {
      hashedPassword = await bcrypt.hash(validatedData.password, 10)
    }

    const employeeData = {
      ...validatedData,
      organizationId,
      password: hashedPassword,
    }

    const employee = await prisma.employee.create({
      data: employeeData,
      include: {
        team: true,
        policy: true,
      },
    })

    // Create a pending license for the new employee
    await prisma.license.create({
      data: {
        organizationId,
        employeeId: employee.id,
        status: "PENDING",
        source: "PENDING",
        notes: "License pending activation",
      },
    })

    await logAuditEvent(
      {
        action: "employee_create",
        organizationId,
        targetType: "Employee",
        targetId: employee.id,
        details: JSON.stringify({
          employeeName: employee.name,
          employeeEmail: employee.email,
          organizationId,
        }),
      },
      req
    )

    revalidatePath("/app/employees")
    return NextResponse.json({ ok: true, employee }, { status: 201 })
  } catch (error) {
    console.error("Failed to create employee:", error)
    return NextResponse.json(
      { error: "Failed to create employee" },
      { status: 500 }
    )
  }
}
