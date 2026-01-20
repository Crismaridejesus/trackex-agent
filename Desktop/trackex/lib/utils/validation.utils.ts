/**
 * Validation Utilities
 *
 * Provides validation functions to ensure data integrity across time tracking.
 * These utilities help identify inconsistencies and data quality issues.
 *
 * Following SOLID principles:
 * - Single Responsibility: Each function validates one specific thing
 * - Pure functions: No side effects, testable
 */

import { PrismaClient } from '@prisma/client'
import { validateTimeStatistics } from './time-calculations'
import { createTimeTrackingService } from '@/lib/services/time-tracking.service'
import {
  TimeValidationResult,
  SessionValidationResult,
  TIME_TRACKING_CONSTANTS,
} from '@/lib/types/time-tracking.types'

/**
 * Validate a single work session
 * Compares stored values against calculated values from app usage
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Validation result with discrepancies
 *
 * @example
 * const result = await validateWorkSession('session-123', prisma)
 * if (!result.valid) {
 *   console.error('Session has discrepancies:', result.discrepancies)
 * }
 */
export async function validateWorkSession(
  sessionId: string,
  prisma: PrismaClient
): Promise<SessionValidationResult> {
  const timeTrackingService = createTimeTrackingService(prisma)
  return timeTrackingService.validateStoredSessionData(sessionId)
}

/**
 * Validate all work sessions for an employee
 * Identifies sessions with data inconsistencies
 *
 * @param employeeId - Employee ID
 * @param prisma - Prisma client instance
 * @returns Array of invalid sessions with their discrepancies
 *
 * @example
 * const invalidSessions = await validateEmployeeSessions('emp-123', prisma)
 * console.log(`Found ${invalidSessions.length} sessions with issues`)
 */
export async function validateEmployeeSessions(
  employeeId: string,
  prisma: PrismaClient
): Promise<Array<{ sessionId: string; validation: SessionValidationResult }>> {
  const sessions = await prisma.workSession.findMany({
    where: { employeeId },
    select: { id: true },
  })

  const timeTrackingService = createTimeTrackingService(prisma)
  const validations = await Promise.all(
    sessions.map(async (session) => ({
      sessionId: session.id,
      validation: await timeTrackingService.validateStoredSessionData(session.id),
    }))
  )

  // Return only invalid sessions
  return validations.filter((v) => !v.validation.valid)
}

/**
 * Validate all work sessions in a date range
 * Useful for bulk validation and data quality checks
 *
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param prisma - Prisma client instance
 * @returns Array of invalid sessions with their discrepancies
 *
 * @example
 * const invalidSessions = await validateSessionsByDateRange(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31'),
 *   prisma
 * )
 */
export async function validateSessionsByDateRange(
  startDate: Date,
  endDate: Date,
  prisma: PrismaClient
): Promise<Array<{ sessionId: string; employeeId: string; validation: SessionValidationResult }>> {
  const sessions = await prisma.workSession.findMany({
    where: {
      clockIn: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: { id: true, employeeId: true },
  })

  const timeTrackingService = createTimeTrackingService(prisma)
  const validations = await Promise.all(
    sessions.map(async (session) => ({
      sessionId: session.id,
      employeeId: session.employeeId,
      validation: await timeTrackingService.validateStoredSessionData(session.id),
    }))
  )

  // Return only invalid sessions
  return validations.filter((v) => !v.validation.valid)
}

/**
 * Check if a session has negative time values
 * Negative values indicate data corruption or calculation errors
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Object with validation result and negative fields
 *
 * @example
 * const result = await checkNegativeTimeValues('session-123', prisma)
 * if (!result.valid) {
 *   console.error('Negative values found:', result.negativeFields)
 * }
 */
export async function checkNegativeTimeValues(
  sessionId: string,
  prisma: PrismaClient
): Promise<{ valid: boolean; negativeFields: string[] }> {
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    select: {
      totalWork: true,
      activeTime: true,
      idleTime: true,
    },
  })

  if (!session) {
    return { valid: false, negativeFields: ['session not found'] }
  }

  const negativeFields: string[] = []

  if ((session.totalWork ?? 0) < 0) negativeFields.push('totalWork')
  if ((session.activeTime ?? 0) < 0) negativeFields.push('activeTime')
  if ((session.idleTime ?? 0) < 0) negativeFields.push('idleTime')

  return {
    valid: negativeFields.length === 0,
    negativeFields,
  }
}

/**
 * Check if a session exceeds maximum allowed duration
 * Sessions longer than 24 hours may indicate data issues
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Object with validation result and actual duration
 *
 * @example
 * const result = await checkMaxSessionDuration('session-123', prisma)
 * if (!result.valid) {
 *   console.warn(`Session exceeds 24 hours: ${result.duration}s`)
 * }
 */
export async function checkMaxSessionDuration(
  sessionId: string,
  prisma: PrismaClient
): Promise<{ valid: boolean; duration: number }> {
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    select: { totalWork: true },
  })

  if (!session) {
    return { valid: false, duration: 0 }
  }

  const maxDuration = TIME_TRACKING_CONSTANTS.MAX_SESSION_DURATION
  const totalWork = session.totalWork ?? 0

  return {
    valid: totalWork <= maxDuration,
    duration: totalWork,
  }
}

/**
 * Validate app usage entries for a session
 * Checks for overlapping entries, gaps, and other issues
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Validation result with specific issues found
 *
 * @example
 * const result = await validateAppUsageEntries('session-123', prisma)
 * if (!result.valid) {
 *   console.error('App usage issues:', result.issues)
 * }
 */
export async function validateAppUsageEntries(
  sessionId: string,
  prisma: PrismaClient
): Promise<{ valid: boolean; issues: string[] }> {
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    select: { employeeId: true, deviceId: true, clockIn: true, clockOut: true },
  })

  if (!session) {
    return { valid: false, issues: ['Session not found'] }
  }

  const appUsage = await prisma.appUsage.findMany({
    where: {
      employeeId: session.employeeId,
      deviceId: session.deviceId,
      startTime: {
        gte: session.clockIn,
        ...(session.clockOut && { lte: session.clockOut }),
      },
    },
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      duration: true,
      isIdle: true,
      category: true,
    },
  })

  const issues: string[] = []

  // Check for entries with null endTime (open entries)
  const openEntries = appUsage.filter((usage) => usage.endTime === null)
  if (openEntries.length > 0 && session.clockOut !== null) {
    issues.push(`Found ${openEntries.length} open entries in closed session`)
  }

  // Check for entries with zero or negative duration
  const invalidDurations = appUsage.filter((usage) => usage.duration <= 0 && usage.endTime !== null)
  if (invalidDurations.length > 0) {
    issues.push(`Found ${invalidDurations.length} entries with zero or negative duration`)
  }

  // Check for overlapping entries
  for (let i = 0; i < appUsage.length - 1; i++) {
    const current = appUsage[i]
    const next = appUsage[i + 1]

    if (current.endTime && next.startTime && current.endTime > next.startTime) {
      issues.push(`Overlapping entries: ${current.id} and ${next.id}`)
    }
  }

  // Check for entries without category (for non-idle entries)
  const missingCategory = appUsage.filter(
    (usage) => !usage.isIdle && (!usage.category || usage.category === '')
  )
  if (missingCategory.length > 0) {
    issues.push(`Found ${missingCategory.length} active entries without category`)
  }

  return {
    valid: issues.length === 0,
    issues,
  }
}

/**
 * Generate a comprehensive validation report for a session
 * Runs all validation checks and returns a complete report
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Comprehensive validation report
 *
 * @example
 * const report = await generateSessionValidationReport('session-123', prisma)
 * console.log('Session validation report:', report)
 */
export async function generateSessionValidationReport(
  sessionId: string,
  prisma: PrismaClient
): Promise<{
  sessionId: string
  overall: boolean
  checks: {
    storedVsCalculated: SessionValidationResult
    negativeValues: { valid: boolean; negativeFields: string[] }
    maxDuration: { valid: boolean; duration: number }
    appUsageEntries: { valid: boolean; issues: string[] }
  }
}> {
  const [storedVsCalculated, negativeValues, maxDuration, appUsageEntries] = await Promise.all([
    validateWorkSession(sessionId, prisma),
    checkNegativeTimeValues(sessionId, prisma),
    checkMaxSessionDuration(sessionId, prisma),
    validateAppUsageEntries(sessionId, prisma),
  ])

  const overall =
    storedVsCalculated.valid &&
    negativeValues.valid &&
    maxDuration.valid &&
    appUsageEntries.valid

  return {
    sessionId,
    overall,
    checks: {
      storedVsCalculated,
      negativeValues,
      maxDuration,
      appUsageEntries,
    },
  }
}

/**
 * Detect time gaps in a work session
 * Identifies periods where no app usage was tracked
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Time gap analysis
 *
 * @example
 * const gaps = await detectSessionTimeGaps('session-123', prisma)
 * console.log(`Found ${gaps.gapCount} gaps totaling ${gaps.totalGapTime}s`)
 */
export async function detectSessionTimeGaps(
  sessionId: string,
  prisma: PrismaClient
): Promise<{
  hasGaps: boolean
  gapCount: number
  totalGapTime: number
  largestGap: number
  gaps: Array<{ start: Date; end: Date; duration: number }>
}> {
  const session = await prisma.workSession.findUnique({
    where: { id: sessionId },
    select: { employeeId: true, deviceId: true, clockIn: true, clockOut: true },
  })

  if (!session || !session.clockOut) {
    return {
      hasGaps: false,
      gapCount: 0,
      totalGapTime: 0,
      largestGap: 0,
      gaps: [],
    }
  }

  const appUsage = await prisma.appUsage.findMany({
    where: {
      employeeId: session.employeeId,
      deviceId: session.deviceId,
      startTime: {
        gte: session.clockIn,
        lte: session.clockOut,
      },
    },
    orderBy: { startTime: 'asc' },
    select: { startTime: true, endTime: true },
  })

  const gaps: Array<{ start: Date; end: Date; duration: number }> = []

  // Check for gap at the beginning
  if (appUsage.length > 0) {
    const firstEntry = appUsage[0]
    const gapStart = session.clockIn
    const gapEnd = firstEntry.startTime

    const gapMs = gapEnd.getTime() - gapStart.getTime()
    const gapSeconds = Math.floor(gapMs / 1000)

    // Only count gaps larger than 10 seconds (to ignore tiny timing discrepancies)
    if (gapSeconds > 10) {
      gaps.push({
        start: gapStart,
        end: gapEnd,
        duration: gapSeconds,
      })
    }
  }

  // Check for gaps between entries
  for (let i = 0; i < appUsage.length - 1; i++) {
    const current = appUsage[i]
    const next = appUsage[i + 1]

    if (!current.endTime) continue // Skip open entries

    const gapStart = current.endTime
    const gapEnd = next.startTime

    const gapMs = gapEnd.getTime() - gapStart.getTime()
    const gapSeconds = Math.floor(gapMs / 1000)

    // Only count gaps larger than 10 seconds
    if (gapSeconds > 10) {
      gaps.push({
        start: gapStart,
        end: gapEnd,
        duration: gapSeconds,
      })
    }
  }

  // Check for gap at the end
  if (appUsage.length > 0) {
    const lastEntry = appUsage[appUsage.length - 1]
    if (lastEntry.endTime) {
      const gapStart = lastEntry.endTime
      const gapEnd = session.clockOut

      const gapMs = gapEnd.getTime() - gapStart.getTime()
      const gapSeconds = Math.floor(gapMs / 1000)

      // Only count gaps larger than 10 seconds
      if (gapSeconds > 10) {
        gaps.push({
          start: gapStart,
          end: gapEnd,
          duration: gapSeconds,
        })
      }
    }
  }

  const totalGapTime = gaps.reduce((sum, gap) => sum + gap.duration, 0)
  const largestGap = gaps.length > 0 ? Math.max(...gaps.map((g) => g.duration)) : 0

  return {
    hasGaps: gaps.length > 0,
    gapCount: gaps.length,
    totalGapTime,
    largestGap,
    gaps,
  }
}

/**
 * Generate a comprehensive time gap report for all sessions in a date range
 *
 * @param startDate - Start of date range
 * @param endDate - End of date range
 * @param prisma - Prisma client instance
 * @returns Time gap summary
 *
 * @example
 * const report = await generateTimeGapReport(
 *   new Date('2024-01-01'),
 *   new Date('2024-01-31'),
 *   prisma
 * )
 * console.log(`${report.sessionsWithGaps} sessions have gaps`)
 */
export async function generateTimeGapReport(
  startDate: Date,
  endDate: Date,
  prisma: PrismaClient
): Promise<{
  totalSessions: number
  sessionsWithGaps: number
  totalGapTime: number
  averageGapTime: number
  largestGap: number
  topSessions: Array<{
    sessionId: string
    employeeId: string
    gapCount: number
    totalGapTime: number
  }>
}> {
  const sessions = await prisma.workSession.findMany({
    where: {
      clockIn: { gte: startDate, lte: endDate },
      clockOut: { not: null },
    },
    select: { id: true, employeeId: true },
  })

  const gapAnalyses = await Promise.all(
    sessions.map(async (session) => ({
      sessionId: session.id,
      employeeId: session.employeeId,
      gaps: await detectSessionTimeGaps(session.id, prisma),
    }))
  )

  const sessionsWithGaps = gapAnalyses.filter((a) => a.gaps.hasGaps)
  const totalGapTime = gapAnalyses.reduce((sum, a) => sum + a.gaps.totalGapTime, 0)
  const largestGap = Math.max(...gapAnalyses.map((a) => a.gaps.largestGap), 0)

  const topSessions = sessionsWithGaps
    .sort((a, b) => b.gaps.totalGapTime - a.gaps.totalGapTime)
    .slice(0, 10)
    .map((s) => ({
      sessionId: s.sessionId,
      employeeId: s.employeeId,
      gapCount: s.gaps.gapCount,
      totalGapTime: s.gaps.totalGapTime,
    }))

  return {
    totalSessions: sessions.length,
    sessionsWithGaps: sessionsWithGaps.length,
    totalGapTime,
    averageGapTime: sessionsWithGaps.length > 0 ? totalGapTime / sessionsWithGaps.length : 0,
    largestGap,
    topSessions,
  }
}

/**
 * Fix sessions with data discrepancies
 * Recalculates and updates stored values based on app usage data
 *
 * @param sessionId - Work session ID
 * @param prisma - Prisma client instance
 * @returns Result indicating if fix was successful
 *
 * @example
 * const result = await fixSessionDiscrepancies('session-123', prisma)
 * if (result.success) {
 *   console.log('Session fixed:', result.changes)
 * }
 */
export async function fixSessionDiscrepancies(
  sessionId: string,
  prisma: PrismaClient
): Promise<{
  success: boolean
  changes?: {
    before: { totalWork: number; activeTime: number; idleTime: number }
    after: { totalWork: number; activeTime: number; idleTime: number }
  }
  error?: string
}> {
  try {
    // Get current stored values
    const session = await prisma.workSession.findUnique({
      where: { id: sessionId },
      select: { totalWork: true, activeTime: true, idleTime: true, clockOut: true },
    })

    if (!session) {
      return { success: false, error: 'Session not found' }
    }

    // Calculate correct values from app usage
    const timeTrackingService = createTimeTrackingService(prisma)
    const stats = await timeTrackingService.calculateSessionStatistics(sessionId, {
      currentTime: session.clockOut || new Date(),
      includeOpenEntries: !session.clockOut,
    })

    // Update session with correct values
    await prisma.workSession.update({
      where: { id: sessionId },
      data: {
        totalWork: stats.totalWork,
        activeTime: stats.activeTime,
        idleTime: stats.idleTime,
      },
    })

    return {
      success: true,
      changes: {
        before: {
          totalWork: session.totalWork ?? 0,
          activeTime: session.activeTime ?? 0,
          idleTime: session.idleTime ?? 0,
        },
        after: {
          totalWork: stats.totalWork,
          activeTime: stats.activeTime,
          idleTime: stats.idleTime,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
