/**
 * Date utilities for query key normalization and caching
 */

/**
 * Normalize a Date to ISO 8601 datetime string at start of day (00:00:00.000Z)
 * 
 * This ensures that navigating back to a page within the same day
 * will hit the cache instead of creating a new query key.
 * The format is compatible with Zod's datetime() validation.
 * 
 * @param date - The date to normalize
 * @param endOfDay - If true, normalizes to end of day (23:59:59.999Z)
 * @returns ISO 8601 datetime string (e.g., "2026-01-04T00:00:00.000Z")
 */
export function normalizeToDateString(date: Date, endOfDay: boolean = false): string {
  const dateOnly = date.toISOString().split('T')[0]
  if (endOfDay) {
    return `${dateOnly}T23:59:59.999Z`
  }
  return `${dateOnly}T00:00:00.000Z`
}

/**
 * Get the default date range for analytics queries
 * Returns normalized ISO datetime strings for the last 7 days
 * 
 * @returns Object with startDate and endDate as ISO datetime strings
 */
export function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 7)
  
  return {
    startDate: normalizeToDateString(start),
    endDate: normalizeToDateString(end, true),
  }
}

