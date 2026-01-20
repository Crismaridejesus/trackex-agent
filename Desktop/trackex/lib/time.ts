/**
 * Unified time formatting utilities to prevent hydration mismatches
 */

/**
 * Format time consistently across server and client
 * Uses 24-hour format to avoid AM/PM locale issues
 * Defaults to user's browser timezone
 */
export const fmtTime = (
  date: Date,
  timeZone?: string,
  hour12: boolean = false
): string => {
  // Use provided timezone or fall back to browser timezone
  const targetTimeZone = timeZone || (typeof window !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC')
    
  return new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
    timeZone: targetTimeZone,
  }).format(date)
}

/**
 * Format date consistently across server and client
 * Defaults to user's browser timezone
 */
export const fmtDate = (
  date: Date,
  timeZone?: string
): string => {
  // Use provided timezone or fall back to browser timezone
  const targetTimeZone = timeZone || (typeof window !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC')
    
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: targetTimeZone,
  }).format(date)
}

/**
 * Format relative time (for displays like "5 minutes ago")
 */
export const fmtRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
}

/**
 * Format date and time together in user's timezone
 */
export const fmtDateTime = (
  date: Date,
  timeZone?: string,
  hour12: boolean = false
): string => {
  const targetTimeZone = timeZone || (typeof window !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC')
    
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
    timeZone: targetTimeZone,
  }).format(date)
}

/**
 * Format time with timezone abbreviation
 */
export const fmtTimeWithTimezone = (
  date: Date,
  timeZone?: string,
  hour12: boolean = false
): string => {
  const targetTimeZone = timeZone || (typeof window !== 'undefined' 
    ? Intl.DateTimeFormat().resolvedOptions().timeZone 
    : 'UTC')
    
  const timeStr = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12,
    timeZone: targetTimeZone,
  }).format(date)
  
  const timezoneStr = new Intl.DateTimeFormat('en-US', {
    timeZoneName: 'short',
    timeZone: targetTimeZone,
  }).formatToParts(date).find(part => part.type === 'timeZoneName')?.value || ''
  
  return `${timeStr} ${timezoneStr}`.trim()
}
