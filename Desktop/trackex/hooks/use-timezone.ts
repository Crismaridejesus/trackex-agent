"use client"

import { useState, useEffect } from "react"

/**
 * Hook for managing user timezone preferences
 * Automatically detects browser timezone and allows user override
 */
export function useTimezone() {
  const [timezone, setTimezone] = useState<string>("UTC")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Get browser's timezone
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

    // Check if user has a stored timezone preference
    const storedTimezone = localStorage.getItem("trackex-timezone")

    // Use stored preference or fall back to browser timezone
    setTimezone(storedTimezone || browserTimezone)
  }, [])

  const updateTimezone = (newTimezone: string) => {
    setTimezone(newTimezone)
    localStorage.setItem("trackex-timezone", newTimezone)
  }

  const resetToBrowserTimezone = () => {
    const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    setTimezone(browserTimezone)
    localStorage.removeItem("trackex-timezone")
  }

  return {
    timezone,
    updateTimezone,
    resetToBrowserTimezone,
    mounted,
    isBrowserTimezone:
      timezone === Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

/**
 * Get list of common timezones for user selection
 */
export function getCommonTimezones() {
  return [
    { value: "UTC", label: "UTC (Coordinated Universal Time)" },
    { value: "America/New_York", label: "Eastern Time (ET)" },
    { value: "America/Chicago", label: "Central Time (CT)" },
    { value: "America/Denver", label: "Mountain Time (MT)" },
    { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
    { value: "Europe/London", label: "London (GMT/BST)" },
    { value: "Europe/Paris", label: "Paris (CET/CEST)" },
    { value: "Europe/Berlin", label: "Berlin (CET/CEST)" },
    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
    { value: "Asia/Shanghai", label: "Shanghai (CST)" },
    { value: "Asia/Kolkata", label: "Mumbai (IST)" },
    { value: "Australia/Sydney", label: "Sydney (AEST/AEDT)" },
  ]
}

/**
 * Get all available timezones (for advanced users)
 */
export function getAllTimezones() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supportedValuesOf = (Intl as any).supportedValuesOf
  if (typeof supportedValuesOf !== "function") {
    throw new Error(
      "Intl.supportedValuesOf is not supported in this environment."
    )
  }

  return supportedValuesOf("timeZone").map((tz: string) => ({
    value: tz,
    label: tz.replace(/_/g, " "),
  }))
}
