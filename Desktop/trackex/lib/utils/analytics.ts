/* eslint-disable @typescript-eslint/no-explicit-any */
import { prisma } from "@/lib/db";
import { classifyWithSource } from "./categories";
import {
  calculateActiveTime,
  calculateEntryDuration,
  calculateIdleTime,
  calculateProductivityScore,
} from "./time-calculations";

export type AppCategory = "PRODUCTIVE" | "NEUTRAL" | "UNPRODUCTIVE"

export interface AnalyticsFilters {
  startDate: Date
  endDate: Date
  teamIds?: string[]
  employeeIds?: string[]
  organizationId: string // Required for org-scoped queries
}

export interface DailyAnalytics {
  date: string
  totalWork: number
  activeTime: number
  idleTime: number
  productiveTime: number
  neutralTime: number
  unproductiveTime: number
  employeeCount: number
}

export interface AppUsage {
  appName: string
  category: AppCategory
  activeTime: number
  sessionCount: number
  percentage: number
}

export interface DomainUsage {
  domain: string
  category: AppCategory
  activeTime: number
  sessionCount: number
  percentage: number
  overrodeAppRule: boolean // Indicates if domain rule changed the classification
}

/* --------------------------  Helper Functions  -------------------------- */

async function getActiveEmployees(
  teamIds?: string[],
  employeeIds?: string[],
  organizationId?: string
) {
  return prisma.employee.findMany({
    where: {
      isActive: true,
      ...(organizationId && { organizationId }), // Scope to organization
      ...(teamIds?.length && { teamId: { in: teamIds } }),
      ...(employeeIds?.length && { id: { in: employeeIds } }),
    },
  })
}

async function getSessions(
  employeeIds: string[],
  startDate: Date,
  endDate: Date
) {
  return prisma.workSession.findMany({
    where: {
      employeeId: { in: employeeIds },
      clockIn: { gte: startDate, lte: endDate },
    },
    include: { employee: true },
  })
}

async function getAppUsages(
  employeeIds: string[],
  startDate: Date,
  endDate: Date
) {
  return prisma.appUsage.findMany({
    where: {
      employeeId: { in: employeeIds },
      startTime: { gte: startDate, lte: endDate },
    },
    include: { employee: true },
  })
}

function initializeDaily(date: string): DailyAnalytics {
  return {
    date,
    totalWork: 0,
    activeTime: 0,
    idleTime: 0,
    productiveTime: 0,
    neutralTime: 0,
    unproductiveTime: 0,
    employeeCount: 0,
  }
}

function calculateWorkSessions(
  sessions: any[],
  appUsageData: any[],
  dailyMap: Map<string, DailyAnalytics>
) {
  const now = new Date()
  const employeeSet = new Set<string>()
  const calculationOptions = { currentTime: now, includeOpenEntries: true }

  for (const session of sessions) {
    const date = session.clockIn.toISOString().split("T")[0]
    employeeSet.add(session.employeeId)

    const daily = dailyMap.get(date) ?? initializeDaily(date)

    // Get app usage data for this session
    const sessionAppUsages = appUsageData.filter(
      (usage) =>
        usage.employeeId === session.employeeId &&
        usage.startTime >= session.clockIn &&
        (!session.clockOut || usage.startTime <= session.clockOut)
    )

    // Calculate active and idle time using centralized functions
    // These functions use RAW durations only, NEVER adding the idle threshold
    const calculatedActiveTime = calculateActiveTime(
      sessionAppUsages,
      calculationOptions
    )
    const calculatedIdleTime = calculateIdleTime(
      sessionAppUsages,
      calculationOptions
    )

    // Calculate total work time as sum of active and idle time
    const calculatedTotalWork = calculatedActiveTime + calculatedIdleTime

    daily.totalWork += calculatedTotalWork
    daily.activeTime += calculatedActiveTime
    daily.idleTime += calculatedIdleTime

    dailyMap.set(date, daily)
  }

  return employeeSet
}

function categorizeAndAggregateAppUsage(
  appUsageData: any[],
  sessions: any[],
  appRules: any[],
  domainRules: any[],
  dailyMap: Map<string, DailyAnalytics>
) {
  const appUsageMap = new Map<
    string,
    { time: number; idleTime: number; category: AppCategory; sessions: number }
  >()
  const domainUsageMap = new Map<
    string,
    {
      time: number
      category: AppCategory
      sessions: number
      overrodeAppRule: boolean
    }
  >()
  const employeeSet = new Set<string>()
  const now = new Date()
  const calculationOptions = { currentTime: now, includeOpenEntries: true }

  // Create a map of sessions by employee for fast lookup
  const sessionsByEmployee = new Map<string, any[]>()
  for (const session of sessions) {
    if (!sessionsByEmployee.has(session.employeeId)) {
      sessionsByEmployee.set(session.employeeId, [])
    }
    sessionsByEmployee.get(session.employeeId)!.push(session)
  }

  for (const usage of appUsageData) {
    // FILTER BY SESSION BOUNDARIES: Only process app usage within work sessions
    const employeeSessions = sessionsByEmployee.get(usage.employeeId) || []
    const isWithinSession = employeeSessions.some(
      (session) =>
        usage.startTime >= session.clockIn &&
        (!session.clockOut || usage.startTime <= session.clockOut)
    )

    // Skip app usage entries that are not within any work session
    if (!isWithinSession) {
      continue
    }

    const date = usage.startTime.toISOString().split("T")[0]
    employeeSet.add(usage.employeeId)

    // Use the new classification function that checks domain rules first
    const classification = classifyWithSource(
      { name: usage.appName, process: usage.appId, domain: usage.domain },
      appRules,
      domainRules
    )
    const category = classification.category

    const daily = dailyMap.get(date) ?? initializeDaily(date)
    const key = `${usage.appName}-${category}`
    const appData = appUsageMap.get(key) ?? {
      time: 0,
      idleTime: 0,
      category,
      sessions: 0,
    }

    // Calculate duration using centralized function
    const duration = calculateEntryDuration(usage, calculationOptions)

    // Only use app usage for productivity categorization, not for time calculations
    if (usage.isIdle === false) {
      appData.time += duration
      appData.sessions += 1

      // Track domain usage separately (if domain exists)
      if (usage.domain) {
        const domainKey = usage.domain.toLowerCase()
        const domainData = domainUsageMap.get(domainKey) ?? {
          time: 0,
          category,
          sessions: 0,
          overrodeAppRule: classification.source === "domain_rule",
        }
        domainData.time += duration
        domainData.sessions += 1
        domainData.category = category
        domainUsageMap.set(domainKey, domainData)
      }

      // Only add to productivity categories, don't override active time
      switch (category) {
        case "PRODUCTIVE":
          daily.productiveTime += duration
          break
        case "NEUTRAL":
          daily.neutralTime += duration
          break
        case "UNPRODUCTIVE":
          daily.unproductiveTime += duration
          break
      }
    } else {
      appData.idleTime += duration
    }

    appUsageMap.set(key, appData)
    dailyMap.set(date, daily)
  }

  return { appUsageMap, domainUsageMap, employeeSet }
}

function computeEmployeeCounts(
  sessions: any[],
  appUsageData: any[],
  dailyMap: Map<string, DailyAnalytics>
) {
  const dailyEmployeeCounts = new Map<string, Set<string>>()

  for (const item of [...sessions, ...appUsageData]) {
    const date = (item.clockIn ?? item.startTime).toISOString().split("T")[0]
    if (!dailyEmployeeCounts.has(date)) dailyEmployeeCounts.set(date, new Set())
    dailyEmployeeCounts.get(date)!.add(item.employeeId)
  }

  for (const [date, daily] of dailyMap) {
    daily.employeeCount = dailyEmployeeCounts.get(date)?.size || 0
  }
}

function computeTotals(dailyAnalytics: DailyAnalytics[]) {
  const totals = dailyAnalytics.reduce(
    (acc, d) => ({
      totalWork: acc.totalWork + d.totalWork,
      activeTime: acc.activeTime + d.activeTime,
      idleTime: acc.idleTime + d.idleTime,
      productiveTime: acc.productiveTime + d.productiveTime,
      neutralTime: acc.neutralTime + d.neutralTime,
      unproductiveTime: acc.unproductiveTime + d.unproductiveTime,
    }),
    {
      totalWork: 0,
      activeTime: 0,
      idleTime: 0,
      productiveTime: 0,
      neutralTime: 0,
      unproductiveTime: 0,
    }
  )

  // VALIDATION: Ensure time statistics are consistent
  const categoryTotal =
    totals.productiveTime + totals.neutralTime + totals.unproductiveTime

  // Warn if category totals don't match active time (allow 1 second tolerance for rounding)
  if (Math.abs(categoryTotal - totals.activeTime) > 1) {
    console.warn(
      `⚠️ Time statistics mismatch: ` +
        `productiveTime (${totals.productiveTime}s) + ` +
        `neutralTime (${totals.neutralTime}s) + ` +
        `unproductiveTime (${totals.unproductiveTime}s) = ` +
        `${categoryTotal}s does not equal activeTime (${totals.activeTime}s)`
    )
  }

  // Clamp productive time to never exceed active time
  if (totals.productiveTime > totals.activeTime) {
    console.warn(
      `⚠️ Clamping productiveTime from ${totals.productiveTime}s to ${totals.activeTime}s`
    )
    totals.productiveTime = totals.activeTime
  }

  return totals
}

function getTopApps(appUsageMap: Map<string, any>): AppUsage[] {
  // Calculate total active time (excluding idle time)
  const totalActiveTime =
    Array.from(appUsageMap.values()).reduce((sum, a) => sum + a.time, 0) || 1

  return Array.from(appUsageMap.entries())
    .map(([key, data]) => ({
      appName: key.substring(0, key.lastIndexOf("-")),
      category: data.category,
      activeTime: data.time,
      sessionCount: data.sessions,
      percentage: (data.time / totalActiveTime) * 100, // Based on active time only
    }))
    .filter((a) => a.activeTime > 0)
    .sort((a, b) => b.activeTime - a.activeTime)
    .slice(0, 10)
}

function getTopDomains(domainUsageMap: Map<string, any>): DomainUsage[] {
  // Calculate total domain time
  const totalDomainTime =
    Array.from(domainUsageMap.values()).reduce((sum, d) => sum + d.time, 0) || 1

  return Array.from(domainUsageMap.entries())
    .map(([domain, data]) => ({
      domain,
      category: data.category as AppCategory,
      activeTime: data.time,
      sessionCount: data.sessions,
      percentage: (data.time / totalDomainTime) * 100,
      overrodeAppRule: data.overrodeAppRule,
    }))
    .filter((d) => d.activeTime > 0)
    .sort((a, b) => b.activeTime - a.activeTime)
    .slice(0, 10)
}

/* --------------------------  Main Function  -------------------------- */

export async function getHomeAnalytics(filters: AnalyticsFilters) {
  const { startDate, endDate, teamIds, employeeIds, organizationId } = filters

  // Fetch both app rules and domain rules (org-specific + global)
  const [appRules, domainRules, employees] = await Promise.all([
    prisma.appRule.findMany({
      where: {
        isActive: true,
        ...(organizationId
          ? {
              OR: [{ organizationId }, { isGlobal: true }],
            }
          : {}),
      },
      orderBy: { priority: "asc" },
    }),
    prisma.domainRule.findMany({
      where: {
        isActive: true,
        ...(organizationId
          ? {
              OR: [{ organizationId }, { isGlobal: true }],
            }
          : {}),
      },
      orderBy: { priority: "asc" },
    }),
    getActiveEmployees(teamIds, employeeIds, organizationId),
  ])

  if (employees.length === 0) {
    return {
      totals: {
        totalWork: 0,
        activeTime: 0,
        idleTime: 0,
        productiveTime: 0,
        neutralTime: 0,
        unproductiveTime: 0,
        avgPerEmployee: 0,
        productivityScore: 0,
      },
      dailyAnalytics: [],
      topApps: [],
      topDomains: [],
      employeeCount: 0,
    }
  }

  const employeeIdsFiltered = employees.map((e) => e.id)
  const [sessions, appUsageData] = await Promise.all([
    getSessions(employeeIdsFiltered, startDate, endDate),
    getAppUsages(employeeIdsFiltered, startDate, endDate),
  ])

  const dailyMap = new Map<string, DailyAnalytics>()
  const employeeSet = calculateWorkSessions(sessions, appUsageData, dailyMap)
  const {
    appUsageMap,
    domainUsageMap,
    employeeSet: appEmployeeSet,
  } = categorizeAndAggregateAppUsage(
    appUsageData,
    sessions,
    appRules,
    domainRules,
    dailyMap
  )
  const combinedEmployeeSet = new Set([...employeeSet, ...appEmployeeSet])

  computeEmployeeCounts(sessions, appUsageData, dailyMap)

  const dailyAnalytics = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  )
  const totals = computeTotals(dailyAnalytics)
  const topApps = getTopApps(appUsageMap)
  const topDomains = getTopDomains(domainUsageMap)
  const productivityScore = calculateProductivityScore(
    totals.productiveTime,
    totals.activeTime
  )

  return {
    totals: {
      ...totals,
      avgPerEmployee: combinedEmployeeSet.size
        ? totals.totalWork / combinedEmployeeSet.size
        : 0,
      productivityScore, // Add productivity score to totals
    },
    dailyAnalytics,
    topApps,
    topDomains,
    employeeCount: combinedEmployeeSet.size,
  }
}

export async function getEmployeeAnalytics(
  employeeId: string,
  filters: Omit<AnalyticsFilters, "employeeIds">
) {
  return getHomeAnalytics({
    ...filters,
    employeeIds: [employeeId],
  })
}
