/**
 * Unit Tests for Time Calculation Utilities
 *
 * Tests the core time tracking calculation functions used throughout the app.
 * These are pure functions with no database dependencies.
 */

import {
  calculateActiveTime,
  calculateCategoryTime,
  calculateEntryDuration,
  calculateIdleTime,
  calculateProductivityScore,
  calculateTimeStatistics,
  formatDuration,
  validateTimeStatistics,
} from "@/lib/utils/time-calculations"
import { describe, expect, it } from "vitest"
import {
  createMockActiveEntry,
  createMockAppUsageEntry,
  createMockIdleEntry,
  createMockWorkDay,
} from "../mocks/fixtures"

// ============================================================================
// calculateEntryDuration Tests
// ============================================================================

describe("calculateEntryDuration", () => {
  it("should return stored duration for completed entries", () => {
    const entry = createMockAppUsageEntry({
      duration: 300,
      startTime: new Date("2024-01-15T09:00:00Z"),
      endTime: new Date("2024-01-15T09:05:00Z"),
    })

    const result = calculateEntryDuration(entry)
    expect(result).toBe(300)
  })

  it("should calculate duration from timestamps when stored duration is 0", () => {
    const entry = createMockAppUsageEntry({
      duration: 0,
      startTime: new Date("2024-01-15T09:00:00Z"),
      endTime: new Date("2024-01-15T09:05:00Z"),
    })

    const result = calculateEntryDuration(entry)
    expect(result).toBe(300) // 5 minutes in seconds
  })

  it("should calculate real-time duration for open entries", () => {
    const startTime = new Date("2024-01-15T09:00:00Z")
    const currentTime = new Date("2024-01-15T09:10:00Z")

    const entry = createMockAppUsageEntry({
      duration: 0,
      startTime,
      endTime: null,
    })

    const result = calculateEntryDuration(entry, { currentTime })
    expect(result).toBe(600) // 10 minutes in seconds
  })

  it("should return 0 for open entries when includeOpenEntries is false", () => {
    const entry = createMockAppUsageEntry({
      duration: 0,
      startTime: new Date("2024-01-15T09:00:00Z"),
      endTime: null,
    })

    const result = calculateEntryDuration(entry, { includeOpenEntries: false })
    expect(result).toBe(0)
  })

  it("should never return negative duration", () => {
    const entry = createMockAppUsageEntry({
      duration: 0,
      startTime: new Date("2024-01-15T09:10:00Z"),
      endTime: null,
    })

    // Current time before start time (edge case)
    const result = calculateEntryDuration(entry, {
      currentTime: new Date("2024-01-15T09:00:00Z"),
    })
    expect(result).toBe(0)
  })
})

// ============================================================================
// calculateIdleTime Tests
// ============================================================================

describe("calculateIdleTime", () => {
  it("should sum up all idle entry durations", () => {
    const entries = [
      createMockIdleEntry({ duration: 300 }),
      createMockIdleEntry({ duration: 600 }),
      createMockActiveEntry({ duration: 1800 }), // Should be excluded
    ]

    const result = calculateIdleTime(entries)
    expect(result).toBe(900) // 300 + 600
  })

  it("should return 0 when there are no idle entries", () => {
    const entries = [
      createMockActiveEntry({ duration: 1800 }),
      createMockActiveEntry({ duration: 1200 }),
    ]

    const result = calculateIdleTime(entries)
    expect(result).toBe(0)
  })

  it("should handle empty array", () => {
    const result = calculateIdleTime([])
    expect(result).toBe(0)
  })

  it("should use raw durations only, never add idle threshold", () => {
    // This tests the critical requirement: idle threshold is for detection only
    const entries = [
      createMockIdleEntry({ duration: 300 }),
      createMockIdleEntry({ duration: 120 }),
    ]

    const result = calculateIdleTime(entries)
    // Result should be exactly 420, not 420 + (2 * 120) = 660
    expect(result).toBe(420)
  })
})

// ============================================================================
// calculateActiveTime Tests
// ============================================================================

describe("calculateActiveTime", () => {
  it("should sum up all non-idle entry durations", () => {
    const entries = [
      createMockActiveEntry({ duration: 1800 }),
      createMockActiveEntry({ duration: 1200 }),
      createMockIdleEntry({ duration: 600 }), // Should be excluded
    ]

    const result = calculateActiveTime(entries)
    expect(result).toBe(3000) // 1800 + 1200
  })

  it("should return 0 when there are no active entries", () => {
    const entries = [
      createMockIdleEntry({ duration: 300 }),
      createMockIdleEntry({ duration: 600 }),
    ]

    const result = calculateActiveTime(entries)
    expect(result).toBe(0)
  })

  it("should handle empty array", () => {
    const result = calculateActiveTime([])
    expect(result).toBe(0)
  })

  it("should correctly filter by isIdle === false", () => {
    const entries = [
      {
        isIdle: false,
        duration: 100,
        startTime: new Date(),
        endTime: new Date(),
      },
      {
        isIdle: true,
        duration: 200,
        startTime: new Date(),
        endTime: new Date(),
      },
      {
        isIdle: false,
        duration: 300,
        startTime: new Date(),
        endTime: new Date(),
      },
    ]

    const result = calculateActiveTime(entries)
    expect(result).toBe(400) // 100 + 300
  })
})

// ============================================================================
// calculateCategoryTime Tests
// ============================================================================

describe("calculateCategoryTime", () => {
  it("should sum time for PRODUCTIVE category", () => {
    const entries = [
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 3600 }),
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 1800 }),
      createMockActiveEntry({ category: "NEUTRAL", duration: 900 }),
      createMockActiveEntry({ category: "UNPRODUCTIVE", duration: 300 }),
    ]

    const result = calculateCategoryTime(entries, "PRODUCTIVE")
    expect(result).toBe(5400) // 3600 + 1800
  })

  it("should sum time for NEUTRAL category", () => {
    const entries = [
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 3600 }),
      createMockActiveEntry({ category: "NEUTRAL", duration: 900 }),
      createMockActiveEntry({ category: "NEUTRAL", duration: 600 }),
    ]

    const result = calculateCategoryTime(entries, "NEUTRAL")
    expect(result).toBe(1500) // 900 + 600
  })

  it("should sum time for UNPRODUCTIVE category", () => {
    const entries = [
      createMockActiveEntry({ category: "UNPRODUCTIVE", duration: 300 }),
      createMockActiveEntry({ category: "UNPRODUCTIVE", duration: 450 }),
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 3600 }),
    ]

    const result = calculateCategoryTime(entries, "UNPRODUCTIVE")
    expect(result).toBe(750) // 300 + 450
  })

  it("should exclude idle entries from category calculations", () => {
    const entries = [
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 1800 }),
      createMockIdleEntry({ category: "PRODUCTIVE", duration: 600 }), // Idle, should be excluded
    ]

    const result = calculateCategoryTime(entries, "PRODUCTIVE")
    expect(result).toBe(1800)
  })

  it("should return 0 for non-existent category", () => {
    const entries = [
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 1800 }),
    ]

    const result = calculateCategoryTime(entries, "NONEXISTENT")
    expect(result).toBe(0)
  })
})

// ============================================================================
// calculateTimeStatistics Tests
// ============================================================================

describe("calculateTimeStatistics", () => {
  it("should calculate all statistics correctly", () => {
    const entries = [
      createMockActiveEntry({ category: "PRODUCTIVE", duration: 3600 }),
      createMockActiveEntry({ category: "NEUTRAL", duration: 1800 }),
      createMockActiveEntry({ category: "UNPRODUCTIVE", duration: 600 }),
      createMockIdleEntry({ duration: 900 }),
    ]

    const stats = calculateTimeStatistics(entries)

    expect(stats.activeTime).toBe(6000) // 3600 + 1800 + 600
    expect(stats.idleTime).toBe(900)
    expect(stats.totalWork).toBe(6900) // 6000 + 900
    expect(stats.productiveTime).toBe(3600)
    expect(stats.neutralTime).toBe(1800)
    expect(stats.unproductiveTime).toBe(600)
  })

  it("should handle empty entries array", () => {
    const stats = calculateTimeStatistics([])

    expect(stats.totalWork).toBe(0)
    expect(stats.activeTime).toBe(0)
    expect(stats.idleTime).toBe(0)
    expect(stats.productiveTime).toBe(0)
    expect(stats.neutralTime).toBe(0)
    expect(stats.unproductiveTime).toBe(0)
  })

  it("should handle a realistic work day", () => {
    const entries = createMockWorkDay()
    const stats = calculateTimeStatistics(entries)

    // Verify totalWork = activeTime + idleTime
    expect(stats.totalWork).toBe(stats.activeTime + stats.idleTime)

    // Verify category times sum to activeTime
    const categorySum =
      stats.productiveTime + stats.neutralTime + stats.unproductiveTime
    expect(categorySum).toBe(stats.activeTime)
  })

  it("should handle open entries with currentTime option", () => {
    const startTime = new Date("2024-01-15T09:00:00Z")
    const currentTime = new Date("2024-01-15T09:30:00Z")

    const entries = [
      createMockActiveEntry({
        category: "PRODUCTIVE",
        duration: 0,
        startTime,
        endTime: null,
      }),
    ]

    const stats = calculateTimeStatistics(entries, { currentTime })

    expect(stats.activeTime).toBe(1800) // 30 minutes
    expect(stats.productiveTime).toBe(1800)
  })
})

// ============================================================================
// validateTimeStatistics Tests
// ============================================================================

describe("validateTimeStatistics", () => {
  it("should validate consistent statistics", () => {
    const stats = {
      totalWork: 6900,
      activeTime: 6000,
      idleTime: 900,
      productiveTime: 3600,
      neutralTime: 1800,
      unproductiveTime: 600,
    }

    const validation = validateTimeStatistics(stats)

    expect(validation.valid).toBe(true)
    expect(validation.errors).toHaveLength(0)
  })

  it("should detect totalWork mismatch", () => {
    const stats = {
      totalWork: 8000, // Should be 6900
      activeTime: 6000,
      idleTime: 900,
      productiveTime: 3600,
      neutralTime: 1800,
      unproductiveTime: 600,
    }

    const validation = validateTimeStatistics(stats)

    expect(validation.valid).toBe(false)
    expect(validation.errors.length).toBeGreaterThan(0)
    expect(validation.errors[0]).toContain("Total Work")
  })

  it("should detect category time mismatch", () => {
    const stats = {
      totalWork: 6900,
      activeTime: 6000,
      idleTime: 900,
      productiveTime: 5000, // Should sum to 6000
      neutralTime: 1800,
      unproductiveTime: 600,
    }

    const validation = validateTimeStatistics(stats)

    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.includes("Active Time"))).toBe(true)
  })

  it("should detect negative values", () => {
    const stats = {
      totalWork: 6900,
      activeTime: 6000,
      idleTime: -100, // Negative
      productiveTime: 3600,
      neutralTime: 1800,
      unproductiveTime: 600,
    }

    const validation = validateTimeStatistics(stats)

    expect(validation.valid).toBe(false)
    expect(validation.errors.some((e) => e.includes("negative"))).toBe(true)
  })

  it("should allow small tolerance for rounding errors", () => {
    const stats = {
      totalWork: 6901, // Off by 1 second (within tolerance)
      activeTime: 6000,
      idleTime: 900,
      productiveTime: 3600,
      neutralTime: 1800,
      unproductiveTime: 600,
    }

    const validation = validateTimeStatistics(stats)

    // Should still be valid due to tolerance
    expect(validation.valid).toBe(true)
  })
})

// ============================================================================
// formatDuration Tests
// ============================================================================

describe("formatDuration", () => {
  it("should format seconds under 60 as seconds", () => {
    expect(formatDuration(45)).toBe("45s")
    expect(formatDuration(0)).toBe("0s")
    expect(formatDuration(59)).toBe("59s")
  })

  it("should format minutes correctly", () => {
    expect(formatDuration(60)).toBe("1m")
    expect(formatDuration(300)).toBe("5m")
    expect(formatDuration(3540)).toBe("59m")
  })

  it("should format hours and minutes", () => {
    expect(formatDuration(3600)).toBe("1h 0m")
    expect(formatDuration(5400)).toBe("1h 30m")
    expect(formatDuration(9000)).toBe("2h 30m")
    expect(formatDuration(28800)).toBe("8h 0m")
  })

  it("should handle large values", () => {
    expect(formatDuration(86400)).toBe("24h 0m") // 24 hours
    expect(formatDuration(90061)).toBe("25h 1m")
  })

  it("should floor fractional seconds", () => {
    expect(formatDuration(45.7)).toBe("45s")
    expect(formatDuration(3605.9)).toBe("1h 0m")
  })
})

// ============================================================================
// calculateProductivityScore Tests
// ============================================================================

describe("calculateProductivityScore", () => {
  it("should calculate percentage correctly", () => {
    expect(calculateProductivityScore(3600, 7200)).toBe(50)
    expect(calculateProductivityScore(7200, 7200)).toBe(100)
    expect(calculateProductivityScore(1800, 7200)).toBe(25)
  })

  it("should return 0 when activeTime is 0", () => {
    expect(calculateProductivityScore(0, 0)).toBe(0)
    expect(calculateProductivityScore(100, 0)).toBe(0)
  })

  it("should clamp to 0-100 range", () => {
    // Edge case: productive time somehow exceeds active time
    expect(calculateProductivityScore(8000, 7200)).toBe(100)
    expect(calculateProductivityScore(-100, 7200)).toBe(0)
  })

  it("should return 0 for no productive time", () => {
    expect(calculateProductivityScore(0, 7200)).toBe(0)
  })

  it("should handle real-world scenarios", () => {
    // 5 hours productive out of 7 hours active
    const score = calculateProductivityScore(18000, 25200)
    expect(score).toBeCloseTo(71.43, 1)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Time Calculation Integration", () => {
  it("should produce consistent results for a full work day", () => {
    const entries = createMockWorkDay()
    const stats = calculateTimeStatistics(entries)
    const validation = validateTimeStatistics(stats)

    // Statistics should be internally consistent
    expect(validation.valid).toBe(true)

    // Calculate productivity score from stats
    const score = calculateProductivityScore(
      stats.productiveTime,
      stats.activeTime
    )
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThanOrEqual(100)
  })

  it("should handle mixed entry types correctly", () => {
    const baseTime = new Date("2024-01-15T09:00:00Z")

    const entries = [
      // Active productive work
      createMockActiveEntry({
        category: "PRODUCTIVE",
        duration: 3600,
        startTime: baseTime,
      }),
      // Brief idle period
      createMockIdleEntry({
        duration: 300,
        startTime: new Date(baseTime.getTime() + 3600000),
      }),
      // Neutral browsing
      createMockActiveEntry({
        category: "NEUTRAL",
        duration: 1800,
        startTime: new Date(baseTime.getTime() + 3900000),
      }),
      // Unproductive break
      createMockActiveEntry({
        category: "UNPRODUCTIVE",
        duration: 600,
        startTime: new Date(baseTime.getTime() + 5700000),
      }),
    ]

    const stats = calculateTimeStatistics(entries)

    expect(stats.activeTime).toBe(6000) // 3600 + 1800 + 600
    expect(stats.idleTime).toBe(300)
    expect(stats.totalWork).toBe(6300)
    expect(stats.productiveTime).toBe(3600)
    expect(stats.neutralTime).toBe(1800)
    expect(stats.unproductiveTime).toBe(600)

    const validation = validateTimeStatistics(stats)
    expect(validation.valid).toBe(true)
  })
})
