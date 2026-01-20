/**
 * Time Tracking Service Layer
 *
 * This service provides a high-level API for calculating time statistics
 * from app usage data. It wraps the pure utility functions and adds
 * database access capabilities.
 *
 * Following SOLID principles:
 * - Single Responsibility: Coordinates time calculations with data access
 * - Dependency Inversion: Depends on abstractions (Prisma types), not concrete implementations
 * - Interface Segregation: Provides focused methods for specific use cases
 *
 * Usage:
 * ```typescript
 * const service = new TimeTrackingService(prisma)
 * const stats = await service.calculateSessionStatistics(sessionId)
 * ```
 */

import { PrismaClient } from '@prisma/client'
import {
  calculateTimeStatistics,
  calculateIdleTime,
  calculateActiveTime,
  calculateCategoryTime,
  validateTimeStatistics,
  calculateProductivityScore,
  formatDuration,
} from '@/lib/utils/time-calculations'
import {
  TimeStatistics,
  DurationCalculationOptions,
  TimeValidationResult,
  SessionValidationResult,
  AppUsageEntry,
  TIME_TRACKING_CONSTANTS,
} from '@/lib/types/time-tracking.types'

/**
 * Service for calculating time statistics from app usage data
 */
export class TimeTrackingService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Calculate complete time statistics for a work session
   *
   * @param sessionId - Work session ID
   * @param options - Calculation options
   * @returns Time statistics including validation
   *
   * @example
   * const stats = await service.calculateSessionStatistics('session-123')
   * console.log(stats.totalWork)      // 28800 (8 hours)
   * console.log(stats.activeTime)     // 25200 (7 hours)
   * console.log(stats.idleTime)       // 3600 (1 hour)
   * console.log(stats.productiveTime) // 18000 (5 hours)
   */
  async calculateSessionStatistics(
    sessionId: string,
    options: DurationCalculationOptions = {}
  ): Promise<TimeStatistics & { validation: TimeValidationResult }> {
    const appUsageEntries = await this.getSessionAppUsage(sessionId)
    
    // Debug logging to trace time calculation issues
    console.log(`[TimeTracking] Session ${sessionId}: Found ${appUsageEntries.length} app usage entries`)
    if (appUsageEntries.length > 0) {
      const entriesWithDuration = appUsageEntries.filter(e => e.duration > 0).length
      const entriesWithEndTime = appUsageEntries.filter(e => e.endTime !== null).length
      const idleEntries = appUsageEntries.filter(e => e.isIdle === true).length
      const activeEntries = appUsageEntries.filter(e => e.isIdle === false).length
      console.log(`[TimeTracking] Session ${sessionId}: ${entriesWithDuration} with duration>0, ${entriesWithEndTime} with endTime, ${idleEntries} idle, ${activeEntries} active`)
    }
    
    const stats = calculateTimeStatistics(appUsageEntries, options)
    const validation = validateTimeStatistics(stats)
    
    console.log(`[TimeTracking] Session ${sessionId}: Calculated stats - totalWork=${stats.totalWork}s, activeTime=${stats.activeTime}s, idleTime=${stats.idleTime}s`)
    if (!validation.valid) {
      console.warn(`[TimeTracking] Session ${sessionId}: Validation errors:`, validation.errors)
    }

    return {
      ...stats,
      validation,
    }
  }

  /**
   * Calculate time statistics for a specific employee and date range
   *
   * @param employeeId - Employee ID
   * @param startDate - Start of date range
   * @param endDate - End of date range
   * @param options - Calculation options
   * @returns Time statistics with validation
   */
  async calculateEmployeeStatistics(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    options: DurationCalculationOptions = {}
  ): Promise<TimeStatistics & { validation: TimeValidationResult }> {
    const appUsageEntries = await this.getEmployeeAppUsage(employeeId, startDate, endDate)
    const stats = calculateTimeStatistics(appUsageEntries, options)
    const validation = validateTimeStatistics(stats)

    return {
      ...stats,
      validation,
    }
  }

  /**
   * Calculate idle time for a work session
   * Uses raw durations only, never adds the idle threshold
   *
   * @param sessionId - Work session ID
   * @param options - Calculation options
   * @returns Idle time in seconds
   */
  async calculateSessionIdleTime(
    sessionId: string,
    options: DurationCalculationOptions = {}
  ): Promise<number> {
    const appUsageEntries = await this.getSessionAppUsage(sessionId)
    return calculateIdleTime(appUsageEntries, options)
  }

  /**
   * Calculate active time for a work session
   *
   * @param sessionId - Work session ID
   * @param options - Calculation options
   * @returns Active time in seconds
   */
  async calculateSessionActiveTime(
    sessionId: string,
    options: DurationCalculationOptions = {}
  ): Promise<number> {
    const appUsageEntries = await this.getSessionAppUsage(sessionId)
    return calculateActiveTime(appUsageEntries, options)
  }

  /**
   * Calculate productive time for a work session
   *
   * @param sessionId - Work session ID
   * @param options - Calculation options
   * @returns Productive time in seconds
   */
  async calculateSessionProductiveTime(
    sessionId: string,
    options: DurationCalculationOptions = {}
  ): Promise<number> {
    const appUsageEntries = await this.getSessionAppUsage(sessionId)
    return calculateCategoryTime(appUsageEntries, 'PRODUCTIVE', options)
  }

  /**
   * Calculate productivity score for a work session
   *
   * @param sessionId - Work session ID
   * @param options - Calculation options
   * @returns Productivity score (0-100)
   */
  async calculateSessionProductivityScore(
    sessionId: string,
    options: DurationCalculationOptions = {}
  ): Promise<number> {
    const appUsageEntries = await this.getSessionAppUsage(sessionId)
    const activeTime = calculateActiveTime(appUsageEntries, options)
    const productiveTime = calculateCategoryTime(appUsageEntries, 'PRODUCTIVE', options)

    return calculateProductivityScore(productiveTime, activeTime)
  }

  /**
   * Validate stored session statistics against calculated values
   * This helps identify data inconsistencies
   *
   * @param sessionId - Work session ID
   * @returns Validation result with discrepancies
   *
   * @example
   * const validation = await service.validateStoredSessionData('session-123')
   * if (!validation.valid) {
   *   console.error('Discrepancies found:', validation.discrepancies)
   * }
   */
  async validateStoredSessionData(sessionId: string): Promise<SessionValidationResult> {
    // Get stored values from work session
    const session = await this.prisma.workSession.findUnique({
      where: { id: sessionId },
      select: {
        totalWork: true,
        activeTime: true,
        idleTime: true,
      },
    })

    if (!session) {
      return {
        valid: false,
        discrepancies: ['Session not found'],
        storedData: { totalWork: 0, activeTime: 0, idleTime: 0 },
        calculatedData: { totalWork: 0, activeTime: 0, idleTime: 0 },
      }
    }

    // Calculate actual values from app usage
    const appUsageEntries = await this.getSessionAppUsage(sessionId)
    const calculatedActiveTime = calculateActiveTime(appUsageEntries)
    const calculatedIdleTime = calculateIdleTime(appUsageEntries)
    const calculatedTotalWork = calculatedActiveTime + calculatedIdleTime

    const storedData = {
      totalWork: session.totalWork ?? 0,
      activeTime: session.activeTime ?? 0,
      idleTime: session.idleTime ?? 0,
    }

    const calculatedData = {
      totalWork: calculatedTotalWork,
      activeTime: calculatedActiveTime,
      idleTime: calculatedIdleTime,
    }

    // Compare with tolerance
    const tolerance = TIME_TRACKING_CONSTANTS.VALIDATION_TOLERANCE
    const discrepancies: string[] = []

    const totalWorkDiff = Math.abs(storedData.totalWork - calculatedData.totalWork)
    if (totalWorkDiff > tolerance) {
      discrepancies.push(
        `Total Work: stored ${storedData.totalWork}s vs calculated ${calculatedData.totalWork}s (diff: ${totalWorkDiff}s)`
      )
    }

    const activeTimeDiff = Math.abs(storedData.activeTime - calculatedData.activeTime)
    if (activeTimeDiff > tolerance) {
      discrepancies.push(
        `Active Time: stored ${storedData.activeTime}s vs calculated ${calculatedData.activeTime}s (diff: ${activeTimeDiff}s)`
      )
    }

    const idleTimeDiff = Math.abs(storedData.idleTime - calculatedData.idleTime)
    if (idleTimeDiff > tolerance) {
      discrepancies.push(
        `Idle Time: stored ${storedData.idleTime}s vs calculated ${calculatedData.idleTime}s (diff: ${idleTimeDiff}s)`
      )
    }

    return {
      valid: discrepancies.length === 0,
      discrepancies,
      storedData,
      calculatedData,
    }
  }

  /**
   * Get formatted summary of session statistics
   *
   * @param sessionId - Work session ID
   * @returns Formatted statistics summary
   *
   * @example
   * const summary = await service.getSessionSummary('session-123')
   * // Returns:
   * // {
   * //   totalWork: "8h 0m",
   * //   activeTime: "7h 0m",
   * //   idleTime: "1h 0m",
   * //   productiveTime: "5h 0m",
   * //   productivityScore: 71,
   * //   isValid: true
   * // }
   */
  async getSessionSummary(sessionId: string): Promise<{
    totalWork: string
    activeTime: string
    idleTime: string
    productiveTime: string
    neutralTime: string
    unproductiveTime: string
    productivityScore: number
    isValid: boolean
    errors: string[]
  }> {
    const stats = await this.calculateSessionStatistics(sessionId)
    const productivityScore = calculateProductivityScore(stats.productiveTime, stats.activeTime)

    return {
      totalWork: formatDuration(stats.totalWork),
      activeTime: formatDuration(stats.activeTime),
      idleTime: formatDuration(stats.idleTime),
      productiveTime: formatDuration(stats.productiveTime),
      neutralTime: formatDuration(stats.neutralTime),
      unproductiveTime: formatDuration(stats.unproductiveTime),
      productivityScore: Math.round(productivityScore),
      isValid: stats.validation.valid,
      errors: stats.validation.errors,
    }
  }

  /**
   * Private helper: Get app usage entries for a work session
   */
  private async getSessionAppUsage(sessionId: string): Promise<AppUsageEntry[]> {
    // First get the session to know the time range and employee
    const session = await this.prisma.workSession.findUnique({
      where: { id: sessionId },
      select: {
        employeeId: true,
        deviceId: true,
        clockIn: true,
        clockOut: true,
      },
    })

    if (!session) {
      return []
    }

    // Get app usage entries within the session time range
    const appUsage = await this.prisma.appUsage.findMany({
      where: {
        employeeId: session.employeeId,
        deviceId: session.deviceId,
        startTime: {
          gte: session.clockIn,
          ...(session.clockOut && { lte: session.clockOut }),
        },
      },
      select: {
        isIdle: true,
        category: true,
        duration: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
    })

    return appUsage
  }

  /**
   * Private helper: Get app usage entries for an employee in a date range
   *
   * IMPORTANT: This filters app usage by work session boundaries to ensure
   * productive time never exceeds active time. Only app usage entries that
   * fall within actual work sessions (clockIn to clockOut) are included.
   */
  private async getEmployeeAppUsage(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AppUsageEntry[]> {
    // First get all work sessions in the date range
    const sessions = await this.prisma.workSession.findMany({
      where: {
        employeeId,
        clockIn: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        clockIn: true,
        clockOut: true,
      },
      orderBy: { clockIn: 'asc' },
    })

    // If no sessions, return empty array
    if (sessions.length === 0) {
      return []
    }

    // Build OR conditions to get app usage only within session boundaries
    const sessionConditions = sessions.map(session => ({
      AND: [
        { startTime: { gte: session.clockIn } },
        session.clockOut
          ? { startTime: { lte: session.clockOut } }
          : {}, // For active sessions without clockOut, include all entries after clockIn
      ],
    }))

    const appUsage = await this.prisma.appUsage.findMany({
      where: {
        employeeId,
        OR: sessionConditions,
      },
      select: {
        isIdle: true,
        category: true,
        duration: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'asc' },
    })

    return appUsage
  }

  /**
   * Get idle time threshold configuration
   * This is for reference only - the threshold is NEVER added to calculations
   */
  getIdleThreshold(): number {
    return TIME_TRACKING_CONSTANTS.DEFAULT_IDLE_THRESHOLD
  }
}

/**
 * Factory function to create TimeTrackingService instance
 * This promotes dependency injection and testability
 *
 * @param prisma - Prisma client instance
 * @returns TimeTrackingService instance
 *
 * @example
 * import { createTimeTrackingService } from '@/lib/services/time-tracking.service'
 * import prisma from '@/lib/prisma'
 *
 * const service = createTimeTrackingService(prisma)
 * const stats = await service.calculateSessionStatistics(sessionId)
 */
export function createTimeTrackingService(prisma: PrismaClient): TimeTrackingService {
  return new TimeTrackingService(prisma)
}
