/**
 * Unit Tests for Analytics Validation Schemas
 *
 * Tests the Zod validation schemas for analytics-related operations.
 */

import { analyticsFiltersSchema } from "@/lib/validations/analytics"
import { describe, expect, it } from "vitest"

// ============================================================================
// analyticsFiltersSchema Tests
// ============================================================================

describe("analyticsFiltersSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid date range", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.startDate).toBe("2024-01-01T00:00:00.000Z")
        expect(result.data.endDate).toBe("2024-01-31T23:59:59.999Z")
      }
    })

    it("should accept date range with team filters", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        teamIds: ["team-1", "team-2"],
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.teamIds).toEqual(["team-1", "team-2"])
      }
    })

    it("should accept date range with employee filters", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        employeeIds: ["emp-1", "emp-2", "emp-3"],
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.employeeIds).toEqual(["emp-1", "emp-2", "emp-3"])
      }
    })

    it("should accept all filters combined", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        teamIds: ["team-1"],
        employeeIds: ["emp-1", "emp-2"],
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept empty arrays for team and employee filters", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        teamIds: [],
        employeeIds: [],
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept ISO date strings", () => {
      const input = {
        startDate: new Date("2024-01-01").toISOString(),
        endDate: new Date("2024-01-31").toISOString(),
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("should reject missing startDate", () => {
      const input = {
        endDate: "2024-01-31T23:59:59.999Z",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject missing endDate", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject invalid date format", () => {
      const input = {
        startDate: "not-a-date",
        endDate: "2024-01-31",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject non-array teamIds", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        teamIds: "team-1",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject non-string values in teamIds array", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        teamIds: [123, 456],
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject non-array employeeIds", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        employeeIds: "emp-1",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(false)
    })
  })

  describe("date format validation", () => {
    const validDates = [
      "2024-01-15T09:00:00.000Z",
      "2024-12-31T23:59:59.999Z",
      "2024-01-01T00:00:00Z",
      "2024-06-15T12:30:00.123Z",
    ]

    validDates.forEach((date) => {
      it(`should accept valid ISO date: ${date}`, () => {
        const input = {
          startDate: date,
          endDate: date,
        }
        const result = analyticsFiltersSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })
  })

  describe("edge cases", () => {
    it("should accept same start and end date (single day)", () => {
      const input = {
        startDate: "2024-01-15T00:00:00.000Z",
        endDate: "2024-01-15T23:59:59.999Z",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept large date range", () => {
      const input = {
        startDate: "2020-01-01T00:00:00.000Z",
        endDate: "2024-12-31T23:59:59.999Z",
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should handle undefined optional fields", () => {
      const input = {
        startDate: "2024-01-01T00:00:00.000Z",
        endDate: "2024-01-31T23:59:59.999Z",
        teamIds: undefined,
        employeeIds: undefined,
      }

      const result = analyticsFiltersSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })
})
