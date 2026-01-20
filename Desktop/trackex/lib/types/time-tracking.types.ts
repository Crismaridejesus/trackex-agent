/**
 * Time Tracking Type Definitions
 *
 * These types ensure consistency across all time-related calculations in the system.
 * Following SOLID principles, these types serve as clear contracts for time tracking logic.
 */

/**
 * Raw app usage data from database
 * Represents a single period of application usage
 */
export interface AppUsageData {
  id: string
  employeeId: string
  deviceId: string
  appName: string
  appId: string | null
  windowTitle: string | null
  category: string
  startTime: Date
  endTime: Date | null
  duration: number  // Raw duration in seconds (actual time spent)
  isIdle: boolean
  createdAt: Date
}

/**
 * Configuration for idle time calculations
 * The threshold is used for DETECTION, not for adding to durations
 */
export interface IdleTimeConfig {
  threshold: number  // Detection threshold in seconds (default: 120)
}

/**
 * Calculated time statistics
 * All values in seconds
 */
export interface TimeStatistics {
  totalWork: number        // Total session time in seconds (activeTime + idleTime)
  activeTime: number       // Non-idle time in seconds
  idleTime: number         // Idle time in seconds (raw duration sum, NO threshold added)
  productiveTime: number   // Time spent on PRODUCTIVE category apps
  neutralTime: number      // Time spent on NEUTRAL category apps
  unproductiveTime: number // Time spent on UNPRODUCTIVE category apps
}

/**
 * Options for duration calculation
 * Allows flexible handling of open entries and custom timestamps
 */
export interface DurationCalculationOptions {
  currentTime?: Date           // For calculating duration of open entries (endTime = null)
  includeOpenEntries?: boolean // Whether to include entries with null endTime
}

/**
 * Validation result for time statistics
 * Used to ensure data integrity and catch calculation errors
 */
export interface TimeValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Session validation result
 * Compares stored values against calculated values
 */
export interface SessionValidationResult {
  valid: boolean
  discrepancies: string[]
  storedData: {
    totalWork: number
    activeTime: number
    idleTime: number
  }
  calculatedData: {
    totalWork: number
    activeTime: number
    idleTime: number
  }
}

/**
 * App usage entry for calculations
 * Minimal interface containing only fields needed for time calculations
 */
export type AppUsageEntry = Pick<
  AppUsageData,
  'isIdle' | 'category' | 'duration' | 'startTime' | 'endTime'
>

/**
 * App category types
 * Used for productivity calculations
 */
export type AppCategory = 'PRODUCTIVE' | 'NEUTRAL' | 'UNPRODUCTIVE'

/**
 * Constants for time tracking
 */
export const TIME_TRACKING_CONSTANTS = {
  DEFAULT_IDLE_THRESHOLD: 120, // 2 minutes in seconds
  VALIDATION_TOLERANCE: 5,     // Allow 5 seconds tolerance for rounding errors
  MAX_SESSION_DURATION: 86400, // 24 hours in seconds
} as const
