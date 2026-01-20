/**
 * Integration Tests for TimeTrackingService
 *
 * Tests the time tracking service with mocked Prisma client.
 * Verifies the service correctly calculates session statistics.
 */

import {
  TimeTrackingService,
  createTimeTrackingService,
} from "@/lib/services/time-tracking.service"
import { PrismaClient } from "@prisma/client"
import { beforeEach, describe, expect, it } from "vitest"
import { prismaMock, resetPrismaMock } from "../mocks/prisma"

describe("TimeTrackingService", () => {
  let service: TimeTrackingService

  beforeEach(() => {
    resetPrismaMock()
    service = new TimeTrackingService(prismaMock as unknown as PrismaClient)
  })

  describe("calculateSessionStatistics", () => {
    it("should calculate correct statistics for a session with app usage", async () => {
      const sessionId = "session-123"
      const employeeId = "emp-456"
      const deviceId = "device-789"
      const clockIn = new Date("2024-01-15T09:00:00Z")
      const clockOut = new Date("2024-01-15T17:00:00Z")

      // Mock work session
      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId,
        deviceId,
        clockIn,
        clockOut,
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Mock app usage entries
      const appUsageEntries = [
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 3600,
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: new Date("2024-01-15T10:00:00Z"),
        },
        {
          isIdle: false,
          category: "NEUTRAL",
          duration: 1800,
          startTime: new Date("2024-01-15T10:00:00Z"),
          endTime: new Date("2024-01-15T10:30:00Z"),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 600,
          startTime: new Date("2024-01-15T10:30:00Z"),
          endTime: new Date("2024-01-15T10:40:00Z"),
        },
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 7200,
          startTime: new Date("2024-01-15T10:40:00Z"),
          endTime: new Date("2024-01-15T12:40:00Z"),
        },
      ]

      prismaMock.appUsage.findMany.mockResolvedValue(appUsageEntries as any)

      const stats = await service.calculateSessionStatistics(sessionId)

      // Active time: 3600 + 1800 + 7200 = 12600
      expect(stats.activeTime).toBe(12600)
      // Idle time: 600
      expect(stats.idleTime).toBe(600)
      // Total work: 12600 + 600 = 13200
      expect(stats.totalWork).toBe(13200)
      // Productive time: 3600 + 7200 = 10800
      expect(stats.productiveTime).toBe(10800)
      // Neutral time: 1800
      expect(stats.neutralTime).toBe(1800)
      // Validation should pass
      expect(stats.validation.valid).toBe(true)
    })

    it("should return zero statistics for session with no app usage", async () => {
      const sessionId = "session-empty"
      const clockIn = new Date("2024-01-15T09:00:00Z")

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn,
        clockOut: null,
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([])

      const stats = await service.calculateSessionStatistics(sessionId)

      expect(stats.totalWork).toBe(0)
      expect(stats.activeTime).toBe(0)
      expect(stats.idleTime).toBe(0)
      expect(stats.productiveTime).toBe(0)
      expect(stats.neutralTime).toBe(0)
      expect(stats.unproductiveTime).toBe(0)
    })

    it("should return empty statistics for non-existent session", async () => {
      prismaMock.workSession.findUnique.mockResolvedValue(null)

      const stats = await service.calculateSessionStatistics("non-existent")

      expect(stats.totalWork).toBe(0)
      expect(stats.activeTime).toBe(0)
      expect(stats.validation.valid).toBe(true)
    })

    it("should include open entries when calculating real-time stats", async () => {
      const sessionId = "session-active"
      const clockIn = new Date("2024-01-15T09:00:00Z")
      const currentTime = new Date("2024-01-15T10:00:00Z")

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn,
        clockOut: null, // Session still active
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Open entry (endTime is null)
      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 0, // Duration not yet calculated
          startTime: new Date("2024-01-15T09:00:00Z"),
          endTime: null,
        },
      ] as any)

      const stats = await service.calculateSessionStatistics(sessionId, {
        currentTime,
        includeOpenEntries: true,
      })

      // Should calculate 1 hour (3600 seconds) from open entry
      expect(stats.activeTime).toBe(3600)
      expect(stats.productiveTime).toBe(3600)
    })
  })

  describe("calculateSessionIdleTime", () => {
    it("should calculate only idle time", async () => {
      const sessionId = "session-123"

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 3600,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 600,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 300,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const idleTime = await service.calculateSessionIdleTime(sessionId)

      expect(idleTime).toBe(900) // 600 + 300
    })
  })

  describe("calculateSessionActiveTime", () => {
    it("should calculate only active time", async () => {
      const sessionId = "session-123"

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 3600,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 600,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: false,
          category: "NEUTRAL",
          duration: 1800,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const activeTime = await service.calculateSessionActiveTime(sessionId)

      expect(activeTime).toBe(5400) // 3600 + 1800
    })
  })

  describe("calculateSessionProductiveTime", () => {
    it("should calculate only productive time", async () => {
      const sessionId = "session-123"

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 3600,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: false,
          category: "NEUTRAL",
          duration: 1800,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 2400,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: false,
          category: "UNPRODUCTIVE",
          duration: 600,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const productiveTime =
        await service.calculateSessionProductiveTime(sessionId)

      expect(productiveTime).toBe(6000) // 3600 + 2400
    })
  })

  describe("calculateSessionProductivityScore", () => {
    it("should calculate productivity score correctly", async () => {
      const sessionId = "session-123"

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // 50% productive time
      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 3600,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: false,
          category: "NEUTRAL",
          duration: 3600,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const score = await service.calculateSessionProductivityScore(sessionId)

      expect(score).toBe(50)
    })

    it("should return 0 for session with no active time", async () => {
      const sessionId = "session-idle"

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T10:00:00Z"),
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // All idle time
      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 3600,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const score = await service.calculateSessionProductivityScore(sessionId)

      expect(score).toBe(0)
    })
  })

  describe("validateStoredSessionData", () => {
    it("should report no discrepancies for accurate data", async () => {
      const sessionId = "session-accurate"

      // Stored values match calculated values
      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: 7200, // 2 hours
        activeTime: 6000, // 100 min
        idleTime: 1200, // 20 min
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 6000,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 1200,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const validation = await service.validateStoredSessionData(sessionId)

      expect(validation.valid).toBe(true)
      expect(validation.discrepancies).toHaveLength(0)
    })

    it("should detect discrepancies in stored data", async () => {
      const sessionId = "session-wrong"

      // Stored values don't match calculated values
      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: 10000, // Wrong value
        activeTime: 8000, // Wrong value
        idleTime: 2000, // Wrong value
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 6000,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 1200,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const validation = await service.validateStoredSessionData(sessionId)

      expect(validation.valid).toBe(false)
      expect(validation.discrepancies.length).toBeGreaterThan(0)
      expect(validation.storedData.totalWork).toBe(10000)
      expect(validation.calculatedData.totalWork).toBe(7200)
    })

    it("should handle non-existent session", async () => {
      prismaMock.workSession.findUnique.mockResolvedValue(null)

      const validation = await service.validateStoredSessionData("non-existent")

      expect(validation.valid).toBe(false)
      expect(validation.discrepancies).toContain("Session not found")
    })
  })

  describe("getSessionSummary", () => {
    it("should return formatted summary", async () => {
      const sessionId = "session-123"

      prismaMock.workSession.findUnique.mockResolvedValue({
        id: sessionId,
        employeeId: "emp-1",
        deviceId: "device-1",
        clockIn: new Date("2024-01-15T09:00:00Z"),
        clockOut: new Date("2024-01-15T17:00:00Z"),
        totalWork: null,
        activeTime: null,
        idleTime: null,
        editReason: null,
        editedBy: null,
        editedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      prismaMock.appUsage.findMany.mockResolvedValue([
        {
          isIdle: false,
          category: "PRODUCTIVE",
          duration: 7200,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: false,
          category: "NEUTRAL",
          duration: 1800,
          startTime: new Date(),
          endTime: new Date(),
        },
        {
          isIdle: true,
          category: "NEUTRAL",
          duration: 900,
          startTime: new Date(),
          endTime: new Date(),
        },
      ] as any)

      const summary = await service.getSessionSummary(sessionId)

      expect(summary.totalWork).toBe("2h 45m")
      expect(summary.activeTime).toBe("2h 30m")
      expect(summary.idleTime).toBe("15m")
      expect(summary.productiveTime).toBe("2h 0m")
      expect(summary.neutralTime).toBe("30m")
      expect(summary.productivityScore).toBe(80) // 7200 / 9000 * 100 = 80
      expect(summary.isValid).toBe(true)
    })
  })

  describe("getIdleThreshold", () => {
    it("should return the default idle threshold", () => {
      const threshold = service.getIdleThreshold()

      expect(threshold).toBe(120) // Default 120 seconds
    })
  })
})

describe("createTimeTrackingService", () => {
  it("should create a new service instance", () => {
    const service = createTimeTrackingService(
      prismaMock as unknown as PrismaClient
    )

    expect(service).toBeInstanceOf(TimeTrackingService)
  })
})
