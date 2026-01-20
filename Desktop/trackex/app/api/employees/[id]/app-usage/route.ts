import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requireOwner } from '@/lib/auth/rbac'
import { calculateEntryDuration, calculateIdleTime, calculateActiveTime } from '@/lib/utils/time-calculations'
import { classifyWithSource, AppInfo } from '@/lib/utils/categories'
import { DomainRule } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireOwner();

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const deviceId = searchParams.get('deviceId')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    // Get app usage data for the employee, but only within work session periods
    const appUsage = await prisma.appUsage.findMany({
      where: {
        employeeId: params.id,
        ...(deviceId && { deviceId }),
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        // Filter to only include app usage that falls within work sessions
        OR: [
          {
            startTime: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        ]
      },
      include: {
        device: {
          select: {
            id: true,
            deviceName: true,
            platform: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    })

    // Filter app usage to only include data within work session periods
    const filteredAppUsage = []
    for (const usage of appUsage) {
      // Check if this app usage falls within any work session
      const sessionOverlap = await prisma.workSession.findFirst({
        where: {
          employeeId: params.id,
          clockIn: {
            lte: usage.startTime,
          },
          OR: [
            {
              clockOut: {
                gte: usage.startTime,
              }
            },
            {
              clockOut: null // Active session
            }
          ]
        }
      })

      if (sessionOverlap) {
        filteredAppUsage.push(usage)
      }
    }

    // Fetch app rules and domain rules for re-classification
    const [appRules, domainRules] = await Promise.all([
      prisma.appRule.findMany({ where: { isActive: true } }),
      prisma.domainRule.findMany({ where: { isActive: true } })
    ])

    // Calculate statistics using centralized utilities
    // Total Work = activeTime + idleTime (sum of tracked time)
    const now = new Date()
    const calculationOptions = { currentTime: now, includeOpenEntries: true }

    const activeDuration = calculateActiveTime(filteredAppUsage, calculationOptions)
    const idleDuration = calculateIdleTime(filteredAppUsage, calculationOptions)
    const totalDuration = activeDuration + idleDuration

    // Browser detection for splitting by category
    const BROWSER_NAMES = ['chrome', 'firefox', 'safari', 'brave', 'edge', 'opera', 'arc', 'vivaldi']
    const isBrowserApp = (appName: string, domain?: string | null): boolean => {
      if (domain) return true // Any app with a domain is treated as browser-like
      const lowerName = appName.toLowerCase()
      return BROWSER_NAMES.some(browser => lowerName.includes(browser))
    }

    // Group by app name for summary
    /**
     * Represents the summary of an application's usage metrics.
     * Includes time tracking across different productivity categories.
     */
    interface AppSummaryItem {
      appName: string
      appId: string | null
      category: string
      totalDuration: number
      activeDuration: number
      idleDuration: number
      sessions: number
      /**
       * For browser entries split by category, lists the domains that contributed.
       * e.g., ["youtube.com", "netflix.com"] for Chrome/UNPRODUCTIVE
       */
      domains?: string[]
      /**
       * Whether this entry is a browser (split by category based on domains visited).
       */
      isBrowser?: boolean
      /**
       * Breakdown of active time spent in each category.
       * Used to determine the primary category for the app.
       */
      categoryBreakdown: {
        PRODUCTIVE: number
        NEUTRAL: number
        UNPRODUCTIVE: number
      }
    }

    /**
     * Internal structure to accumulate app usage data before determining primary category.
     */
    interface AppAccumulator extends Omit<AppSummaryItem, 'category' | 'domains'> {
      category?: string
      domainsSet?: Set<string>
    }

    /**
     * Valid productivity categories for app usage.
     */
    type ProductivityCategory = 'PRODUCTIVE' | 'NEUTRAL' | 'UNPRODUCTIVE'

    /**
     * Determines the primary category for an app based on active time spent in each category.
     *
     * Algorithm:
     * 1. Only considers active (non-idle) time for category determination
     * 2. Returns the category with the most active time
     * 3. In case of ties, uses priority order: PRODUCTIVE > NEUTRAL > UNPRODUCTIVE
     * 4. If no active time exists, defaults to NEUTRAL
     *
     * @param categoryBreakdown - Time spent in each category (in seconds)
     * @returns The primary productivity category
     */
    const determinePrimaryCategory = (
      categoryBreakdown: AppSummaryItem['categoryBreakdown']
    ): ProductivityCategory => {
      const { PRODUCTIVE, NEUTRAL, UNPRODUCTIVE } = categoryBreakdown

      // If no active time in any category, default to NEUTRAL
      if (PRODUCTIVE === 0 && NEUTRAL === 0 && UNPRODUCTIVE === 0) {
        return 'NEUTRAL'
      }

      // Determine category with maximum time
      // In case of ties, priority order: PRODUCTIVE > NEUTRAL > UNPRODUCTIVE
      if (PRODUCTIVE >= NEUTRAL && PRODUCTIVE >= UNPRODUCTIVE) {
        return 'PRODUCTIVE'
      } else if (UNPRODUCTIVE > NEUTRAL) {
        return 'UNPRODUCTIVE'
      } else {
        return 'NEUTRAL'
      }
    }

    /**
     * Groups app usage entries by app name (or app+category for browsers) and calculates metrics.
     *
     * Features:
     * - For browsers: splits by category based on domains visited (e.g., Chrome/PRODUCTIVE, Chrome/UNPRODUCTIVE)
     * - For non-browsers: aggregates all usage entries regardless of category
     * - Tracks domains that contributed to each browser category entry
     * - Maintains separate counts for active, idle, and total duration
     *
     * Edge cases handled:
     * - Apps with only idle time (no category changes)
     * - Browsers with mixed domains/categories (separate entries per category)
     * - Apps with no active time (defaults to NEUTRAL)
     */
    const appSummary = filteredAppUsage.reduce((acc, usage) => {
      // Re-classify using domain rules at query time for ALL entries
      const appInfo: AppInfo = {
        name: usage.appName,
        process: usage.appId || undefined,
        domain: usage.domain || undefined
      }
      const classification = classifyWithSource(appInfo, appRules, domainRules as DomainRule[])
      const category = classification.category as ProductivityCategory
      
      // For browsers, group by appName + category; for others, just appName
      const isBrowser = isBrowserApp(usage.appName, usage.domain)
      const key = isBrowser ? `${usage.appName}|||${category}` : usage.appName

      // Initialize accumulator for new app/category combo
      if (!acc[key]) {
        acc[key] = {
          appName: usage.appName,
          appId: usage.appId,
          totalDuration: 0,
          activeDuration: 0,
          idleDuration: 0,
          sessions: 0,
          isBrowser,
          domainsSet: isBrowser ? new Set<string>() : undefined,
          categoryBreakdown: {
            PRODUCTIVE: 0,
            NEUTRAL: 0,
            UNPRODUCTIVE: 0,
          },
        }
      }

      // Calculate duration using centralized function
      const duration = calculateEntryDuration(usage, calculationOptions)

      // Update total metrics
      acc[key].totalDuration += duration
      acc[key].sessions += 1

      // Track domain for browser entries
      if (isBrowser && usage.domain && acc[key].domainsSet) {
        acc[key].domainsSet.add(usage.domain.toLowerCase())
      }

      // Categorize time as idle or active
      if (usage.isIdle) {
        acc[key].idleDuration += duration
      } else {
        acc[key].activeDuration += duration
        
        // Track active time by category
        if (category in acc[key].categoryBreakdown) {
          acc[key].categoryBreakdown[category] += duration
        } else {
          acc[key].categoryBreakdown.NEUTRAL += duration
        }
      }

      return acc
    }, {} as Record<string, AppAccumulator>)

    /**
     * Convert accumulated data to final summary format.
     * For browsers: category is already determined by the grouping key.
     * For non-browsers: category is determined by primary active time.
     * Sorts apps by total duration (most used first).
     */
    const appSummaryArray = Object.entries(appSummary)
      .map(([key, app]: [string, AppAccumulator]): AppSummaryItem => {
        // For browser entries, extract category from key (appName|||CATEGORY)
        const isBrowserEntry = key.includes('|||')
        const categoryFromKey = isBrowserEntry ? key.split('|||')[1] as ProductivityCategory : null
        
        return {
          appName: app.appName,
          appId: app.appId,
          totalDuration: app.totalDuration,
          activeDuration: app.activeDuration,
          idleDuration: app.idleDuration,
          sessions: app.sessions,
          categoryBreakdown: app.categoryBreakdown,
          // For browsers, use the category from key; for others, determine from breakdown
          category: categoryFromKey || determinePrimaryCategory(app.categoryBreakdown),
          // Include domains for browser entries (convert Set to sorted array)
          ...(app.isBrowser && app.domainsSet && {
            domains: Array.from(app.domainsSet).sort(),
            isBrowser: true,
          }),
        }
      })
      .sort((a, b) => b.totalDuration - a.totalDuration)

    return NextResponse.json({
      appUsage: filteredAppUsage,
      statistics: {
        totalDuration,
        activeDuration,
        idleDuration,
        totalSessions: filteredAppUsage.length,
      },
      appSummary: appSummaryArray,
    })
  } catch (error) {
    console.error('Failed to fetch app usage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch app usage' },
      { status: 500 }
    )
  }
}