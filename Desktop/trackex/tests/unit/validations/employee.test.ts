/**
 * Unit Tests for Employee Validation Schemas
 *
 * Tests the Zod validation schemas for employee-related operations.
 */

import {
  createEmployeeSchema,
  editSessionSchema,
  updateEmployeeSchema,
} from "@/lib/validations/employee"
import { describe, expect, it } from "vitest"

// ============================================================================
// createEmployeeSchema Tests
// ============================================================================

describe("createEmployeeSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid employee data with required fields only", () => {
      const input = {
        name: "John Doe",
        email: "john.doe@example.com",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe("John Doe")
        expect(result.data.email).toBe("john.doe@example.com")
      }
    })

    it("should accept valid employee data with all fields", () => {
      const input = {
        name: "John Doe",
        email: "john.doe@example.com",
        password: "securePassword123",
        teamId: "team-123",
        policyId: "policy-456",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.password).toBe("securePassword123")
        expect(result.data.teamId).toBe("team-123")
        expect(result.data.policyId).toBe("policy-456")
      }
    })

    it("should accept employee with minimum length name", () => {
      const input = {
        name: "J",
        email: "j@example.com",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("should reject empty name", () => {
      const input = {
        name: "",
        email: "john@example.com",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name is required")
      }
    })

    it("should reject missing name", () => {
      const input = {
        email: "john@example.com",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject invalid email", () => {
      const input = {
        name: "John Doe",
        email: "not-an-email",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid email address")
      }
    })

    it("should reject missing email", () => {
      const input = {
        name: "John Doe",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject password shorter than 6 characters", () => {
      const input = {
        name: "John Doe",
        email: "john@example.com",
        password: "12345",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe(
          "Password must be at least 6 characters"
        )
      }
    })

    it("should accept password with exactly 6 characters", () => {
      const input = {
        name: "John Doe",
        email: "john@example.com",
        password: "123456",
      }

      const result = createEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe("email format validation", () => {
    const validEmails = [
      "test@example.com",
      "user.name@example.com",
      "user+tag@example.org",
      "user@subdomain.example.com",
    ]

    validEmails.forEach((email) => {
      it(`should accept valid email: ${email}`, () => {
        const input = { name: "Test", email }
        const result = createEmployeeSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })

    const invalidEmails = [
      "notanemail",
      "@example.com",
      "user@",
      "user@.com",
      "",
    ]

    invalidEmails.forEach((email) => {
      it(`should reject invalid email: "${email}"`, () => {
        const input = { name: "Test", email }
        const result = createEmployeeSchema.safeParse(input)
        expect(result.success).toBe(false)
      })
    })
  })
})

// ============================================================================
// updateEmployeeSchema Tests
// ============================================================================

describe("updateEmployeeSchema", () => {
  describe("valid inputs", () => {
    it("should accept partial updates", () => {
      const input = {
        name: "New Name",
      }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept empty object (no changes)", () => {
      const input = {}

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept all valid fields", () => {
      const input = {
        name: "New Name",
        email: "newemail@example.com",
        teamId: "team-123",
        policyId: "policy-456",
        isActive: true,
        autoScreenshots: true,
        screenshotInterval: 5,
      }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept null for nullable fields", () => {
      const input = {
        teamId: null,
        policyId: null,
        screenshotInterval: null,
      }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept screenshot interval within valid range", () => {
      const input = { screenshotInterval: 30 }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("should reject empty name", () => {
      const input = { name: "" }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject invalid email", () => {
      const input = { email: "invalid-email" }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject screenshot interval below minimum", () => {
      const input = { screenshotInterval: 1 }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Minimum interval is 2 minutes"
        )
      }
    })

    it("should reject screenshot interval above maximum", () => {
      const input = { screenshotInterval: 61 }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "Maximum interval is 60 minutes"
        )
      }
    })

    it("should reject non-integer screenshot interval", () => {
      const input = { screenshotInterval: 5.5 }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject non-boolean isActive", () => {
      const input = { isActive: "true" }

      const result = updateEmployeeSchema.safeParse(input)

      expect(result.success).toBe(false)
    })
  })

  describe("screenshot interval boundaries", () => {
    it("should accept minimum interval (2)", () => {
      const input = { screenshotInterval: 2 }
      const result = updateEmployeeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it("should accept maximum interval (60)", () => {
      const input = { screenshotInterval: 60 }
      const result = updateEmployeeSchema.safeParse(input)
      expect(result.success).toBe(true)
    })
  })
})

// ============================================================================
// editSessionSchema Tests
// ============================================================================

describe("editSessionSchema", () => {
  describe("valid inputs", () => {
    it("should accept valid clockIn and editReason", () => {
      const input = {
        clockIn: "2024-01-15T09:00:00.000Z",
        editReason: "Correcting clock-in time",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept valid clockOut and editReason", () => {
      const input = {
        clockOut: "2024-01-15T17:00:00.000Z",
        editReason: "Correcting clock-out time",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept null clockOut", () => {
      const input = {
        clockOut: null,
        editReason: "Removing clock-out to reopen session",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(true)
    })

    it("should accept both clockIn and clockOut", () => {
      const input = {
        clockIn: "2024-01-15T09:00:00.000Z",
        clockOut: "2024-01-15T17:00:00.000Z",
        editReason: "Adjusting entire session",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(true)
    })
  })

  describe("invalid inputs", () => {
    it("should reject missing editReason", () => {
      const input = {
        clockIn: "2024-01-15T09:00:00.000Z",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject empty editReason", () => {
      const input = {
        clockIn: "2024-01-15T09:00:00.000Z",
        editReason: "",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Edit reason is required")
      }
    })

    it("should reject invalid clockIn format", () => {
      const input = {
        clockIn: "not-a-datetime",
        editReason: "Test",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(false)
    })

    it("should reject invalid clockOut format", () => {
      const input = {
        clockOut: "2024-01-15",
        editReason: "Test",
      }

      const result = editSessionSchema.safeParse(input)

      expect(result.success).toBe(false)
    })
  })

  describe("datetime validation", () => {
    const validDatetimes = [
      "2024-01-15T09:00:00.000Z",
      "2024-12-31T23:59:59.999Z",
      "2024-01-01T00:00:00.000Z",
    ]

    validDatetimes.forEach((datetime) => {
      it(`should accept valid datetime: ${datetime}`, () => {
        const input = { clockIn: datetime, editReason: "Test" }
        const result = editSessionSchema.safeParse(input)
        expect(result.success).toBe(true)
      })
    })
  })
})
