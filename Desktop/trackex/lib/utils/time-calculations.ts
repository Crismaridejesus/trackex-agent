/**
 * Time Calculation Utilities
 *
 * Pure functions for calculating time statistics.
 * Following SOLID principles:
 * - Single Responsibility: Each function has one clear purpose
 * - Open/Closed: Extensible through options parameter
 * - No side effects: Pure functions for testability
 *
 * IMPORTANT: These functions use RAW durations from the database.
 * The idle threshold (120 seconds) is NEVER added to idle time calculations.
 * The threshold is only for detection, not aggregation.
 */

import {
  AppUsageEntry,
  DurationCalculationOptions,
  TimeStatistics,
  TimeValidationResult,
  TIME_TRACKING_CONSTANTS,
} from '@/lib/types/time-tracking.types'

/**
 * Calculate the actual duration of an app usage entry
 * Handles both completed entries (with endTime) and open entries (endTime = null)
 *
 * @param entry - App usage entry with duration, startTime, and endTime
 * @param options - Calculation options
 * @returns Duration in seconds
 *
 * @example
 * // Completed entry - uses stored duration
 * const duration = calculateEntryDuration({
 *   duration: 300,
 *   startTime: new Date('2024-01-01T10:00:00Z'),
 *   endTime: new Date('2024-01-01T10:05:00Z')
 * })
 * // Returns: 300
 *
 * @example
 * // Open entry - calculates real-time duration
 * const duration = calculateEntryDuration({
 *   duration: 0,
 *   startTime: new Date('2024-01-01T10:00:00Z'),
 *   endTime: null
 * }, { currentTime: new Date('2024-01-01T10:05:00Z') })
 * // Returns: 300
 */
export function calculateEntryDuration(
  entry: Pick<AppUsageEntry, 'duration' | 'startTime' | 'endTime'>,
  options: DurationCalculationOptions = {}
): number {
  const { currentTime = new Date(), includeOpenEntries = true } = options

  // If entry has endTime, prefer calculating from timestamps if duration is 0
  // This handles edge cases where endTime was set but duration wasn't properly calculated
  if (entry.endTime !== null) {
    if (entry.duration > 0) {
      return entry.duration
    }
    // Fallback: calculate duration from timestamps if stored duration is 0
    if (entry.startTime && entry.endTime) {
      const calculatedDuration = Math.floor(
        (entry.endTime.getTime() - entry.startTime.getTime()) / 1000
      )
      if (calculatedDuration > 0) {
        console.log(`[TimeCalc] Entry has duration=0 but valid timestamps, calculated: ${calculatedDuration}s`)
        return calculatedDuration
      }
    }
    return entry.duration
  }

  // If entry is open and we should include it, calculate real-time duration
  if (includeOpenEntries && entry.startTime) {
    const durationMs = currentTime.getTime() - entry.startTime.getTime()
    return Math.max(0, Math.floor(durationMs / 1000))
  }

  // Otherwise return stored duration (which may be 0 for open entries)
  return entry.duration
}

/**
 * Calculate idle time from app usage entries
 * Uses ONLY the raw durations, NEVER adds the idle threshold
 *
 * The idle threshold (120 seconds) is for DETECTION delay, not for aggregation.
 * Example: If database has idle entry with duration 300s, idle time is 300s, NOT 420s.
 *
 * @param entries - App usage entries
 * @param options - Calculation options
 * @returns Total idle time in seconds
 *
 * @example
 * const entries = [
 *   { isIdle: true, duration: 300, startTime: date1, endTime: date2 },
 *   { isIdle: false, duration: 600, startTime: date3, endTime: date4 },
 *   { isIdle: true, duration: 120, startTime: date5, endTime: date6 }
 * ]
 * const idleTime = calculateIdleTime(entries)
 * // Returns: 420 (300 + 120), NOT 660 (300 + 120 + 120 + 120)
 */
export function calculateIdleTime(
  entries: Array<Pick<AppUsageEntry, 'isIdle' | 'duration' | 'startTime' | 'endTime'>>,
  options: DurationCalculationOptions = {}
): number {
  return entries
    .filter((entry) => entry.isIdle === true)
    .reduce((total, entry) => {
      const duration = calculateEntryDuration(entry, options)
      return total + duration
    }, 0)
}

/**
 * Calculate active time from app usage entries
 * Active time = sum of all non-idle entry durations
 *
 * @param entries - App usage entries
 * @param options - Calculation options
 * @returns Total active time in seconds
 *
 * @example
 * const entries = [
 *   { isIdle: false, duration: 300, startTime: date1, endTime: date2 },
 *   { isIdle: true, duration: 600, startTime: date3, endTime: date4 },
 *   { isIdle: false, duration: 120, startTime: date5, endTime: date6 }
 * ]
 * const activeTime = calculateActiveTime(entries)
 * // Returns: 420 (300 + 120)
 */
export function calculateActiveTime(
  entries: Array<Pick<AppUsageEntry, 'isIdle' | 'duration' | 'startTime' | 'endTime'>>,
  options: DurationCalculationOptions = {}
): number {
  return entries
    .filter((entry) => entry.isIdle === false)
    .reduce((total, entry) => {
      const duration = calculateEntryDuration(entry, options)
      return total + duration
    }, 0)
}

/**
 * Calculate time by category (PRODUCTIVE, NEUTRAL, or UNPRODUCTIVE)
 * Only counts non-idle entries
 *
 * @param entries - App usage entries
 * @param category - Category to filter by
 * @param options - Calculation options
 * @returns Total time for category in seconds
 *
 * @example
 * const productiveTime = calculateCategoryTime(entries, 'PRODUCTIVE')
 * const neutralTime = calculateCategoryTime(entries, 'NEUTRAL')
 * const unproductiveTime = calculateCategoryTime(entries, 'UNPRODUCTIVE')
 */
export function calculateCategoryTime(
  entries: Array<Pick<AppUsageEntry, 'isIdle' | 'category' | 'duration' | 'startTime' | 'endTime'>>,
  category: string,
  options: DurationCalculationOptions = {}
): number {
  return entries
    .filter((entry) => entry.isIdle === false && entry.category === category)
    .reduce((total, entry) => {
      const duration = calculateEntryDuration(entry, options)
      return total + duration
    }, 0)
}

/**
 * Calculate comprehensive time statistics from app usage entries
 * This is a convenience function that calculates all time metrics at once
 *
 * @param entries - App usage entries
 * @param options - Calculation options
 * @returns Complete time statistics
 *
 * @example
 * const stats = calculateTimeStatistics(appUsageEntries)
 * console.log(stats.totalWork)      // activeTime + idleTime
 * console.log(stats.activeTime)     // sum of non-idle durations
 * console.log(stats.idleTime)       // sum of idle durations (NO threshold added)
 * console.log(stats.productiveTime) // sum of PRODUCTIVE category durations
 */
export function calculateTimeStatistics(
  entries: Array<Pick<AppUsageEntry, 'isIdle' | 'category' | 'duration' | 'startTime' | 'endTime'>>,
  options: DurationCalculationOptions = {}
): TimeStatistics {
  const activeTime = calculateActiveTime(entries, options)
  const idleTime = calculateIdleTime(entries, options)
  const productiveTime = calculateCategoryTime(entries, 'PRODUCTIVE', options)
  const neutralTime = calculateCategoryTime(entries, 'NEUTRAL', options)
  const unproductiveTime = calculateCategoryTime(entries, 'UNPRODUCTIVE', options)

  return {
    totalWork: activeTime + idleTime,
    activeTime,
    idleTime,
    productiveTime,
    neutralTime,
    unproductiveTime,
  }
}

/**
 * Validate time statistics to ensure consistency
 * Checks that:
 * 1. Total Work = Active + Idle
 * 2. Active Time = Productive + Neutral + Unproductive
 *
 * @param stats - Time statistics to validate
 * @returns Validation result with any errors
 *
 * @example
 * const stats = calculateTimeStatistics(entries)
 * const validation = validateTimeStatistics(stats)
 * if (!validation.valid) {
 *   console.error('Time calculation errors:', validation.errors)
 * }
 */
export function validateTimeStatistics(stats: {
  totalWork: number
  activeTime: number
  idleTime: number
  productiveTime: number
  neutralTime: number
  unproductiveTime: number
}): TimeValidationResult {
  const errors: string[] = []
  const tolerance = TIME_TRACKING_CONSTANTS.VALIDATION_TOLERANCE

  // Check: Total Work = Active + Idle (allow tolerance for rounding)
  const calculatedTotal = stats.activeTime + stats.idleTime
  const totalDiff = Math.abs(stats.totalWork - calculatedTotal)

  if (totalDiff > tolerance) {
    errors.push(
      `Total Work (${stats.totalWork}s) does not equal Active (${stats.activeTime}s) + Idle (${stats.idleTime}s) = ${calculatedTotal}s (difference: ${totalDiff}s)`
    )
  }

  // Check: Active Time = Productive + Neutral + Unproductive (allow tolerance)
  const calculatedActive = stats.productiveTime + stats.neutralTime + stats.unproductiveTime
  const activeDiff = Math.abs(stats.activeTime - calculatedActive)

  if (activeDiff > tolerance) {
    errors.push(
      `Active Time (${stats.activeTime}s) does not equal Productive (${stats.productiveTime}s) + Neutral (${stats.neutralTime}s) + Unproductive (${stats.unproductiveTime}s) = ${calculatedActive}s (difference: ${activeDiff}s)`
    )
  }

  // Check: No negative values
  const values = Object.entries(stats)
  for (const [key, value] of values) {
    if (value < 0) {
      errors.push(`${key} has negative value: ${value}s`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Format seconds into human-readable string
 * Helper function for display purposes
 *
 * @param seconds - Total seconds
 * @returns Formatted string (e.g., "2h 30m")
 *
 * @example
 * formatDuration(9000) // Returns: "2h 30m"
 * formatDuration(300)  // Returns: "5m"
 * formatDuration(45)   // Returns: "45s"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.floor(seconds)}s`
  }

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  return `${minutes}m`
}

/**
 * Calculate productivity score
 * Score = (productiveTime / activeTime) * 100
 * Clamped to 0-100 range
 *
 * @param productiveTime - Time spent on productive apps (seconds)
 * @param activeTime - Total active time (seconds)
 * @returns Productivity score (0-100)
 *
 * @example
 * calculateProductivityScore(3600, 7200) // Returns: 50
 * calculateProductivityScore(7200, 7200) // Returns: 100
 * calculateProductivityScore(0, 7200)    // Returns: 0
 */
export function calculateProductivityScore(productiveTime: number, activeTime: number): number {
  if (activeTime === 0) {
    return 0
  }

  const score = (productiveTime / activeTime) * 100
  return Math.max(0, Math.min(100, score))
}
