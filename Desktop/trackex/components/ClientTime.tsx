'use client'

import { useEffect, useState } from 'react'
import { fmtTime } from '@/lib/time'
import { useTimezone } from '@/hooks/use-timezone'

interface ClientTimeProps {
  /** Initial date to display - should match server-side rendered value */
  date?: Date
  /** Timezone for display - if not provided, uses user's preferred timezone */
  timeZone?: string
  /** Whether to use 12-hour format */
  hour12?: boolean
  /** Whether to update in real-time */
  live?: boolean
  /** Update interval in milliseconds (default: 1000) */
  interval?: number
}

/**
 * Client-side time component that prevents hydration mismatches
 * Shows placeholder during SSR, then real time after hydration
 */
export function ClientTime({
  date,
  timeZone,
  hour12 = false,
  live = false,
  interval = 1000,
}: Readonly<ClientTimeProps>) {
  const [currentTime, setCurrentTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  const { timezone: userTimezone, mounted: timezoneMounted } = useTimezone()

  useEffect(() => {
    setMounted(true)
    setCurrentTime(live ? new Date() : (date || new Date()))
  }, [date, live, mounted])

  useEffect(() => {
    if (!mounted || !live) return

    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, interval)

    return () => clearInterval(timer)
  }, [live, interval, mounted])

  // Show placeholder during SSR to prevent hydration mismatch
  if (!mounted || !timezoneMounted || !currentTime) {
    return (
      <span suppressHydrationWarning className="tabular-nums">
        --:--:--
      </span>
    )
  }

  // Use provided timezone or fall back to user's preferred timezone
  const displayTimezone = timeZone || userTimezone

  return (
    <span suppressHydrationWarning className="tabular-nums">
      {fmtTime(currentTime, displayTimezone, hour12)}
    </span>
  )
}
