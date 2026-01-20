'use client'

import { usePathname } from 'next/navigation'
import { AppTopbar } from '@/components/app/app-topbar'

export function ConditionalTopbar() {
  const pathname = usePathname()
  
  // Pages that should show full topbar with team filter
  const showFullTopbar = [
    '/app',
    '/app/live',
    '/app/employees'
  ].includes(pathname)
  
  // Pages that should show only timeframe picker (no team filter)
  const showTimeframeOnly = pathname.startsWith('/app/employees/') && pathname !== '/app/employees'
  
  // Don't show topbar on certain pages
  if (!showFullTopbar && !showTimeframeOnly) {
    return null
  }
  
  return (
    <AppTopbar/>
  )
}
