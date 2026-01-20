/**
 * Prisma Client Mock
 *
 * Provides a mocked PrismaClient for testing services
 * that depend on database access without hitting a real database.
 *
 * Usage:
 * ```typescript
 * import { prismaMock, resetPrismaMock } from '@/tests/mocks/prisma'
 *
 * beforeEach(() => {
 *   resetPrismaMock()
 * })
 *
 * test('example', async () => {
 *   prismaMock.employee.findMany.mockResolvedValue([...])
 * })
 * ```
 */

import { vi } from "vitest"

/**
 * Create a deep mock of PrismaClient using Vitest's mock functions
 */
function createMockPrismaClient(): any {
  const mockPrisma: any = {}

  // List of Prisma models
  const models = [
    "user",
    "account",
    "session",
    "verificationToken",
    "employee",
    "team",
    "policy",
    "appRule",
    "domainRule",
    "device",
    "deviceToken",
    "workSession",
    "event",
    "screenshot",
    "job",
    "auditLog",
    "appUsage",
  ]

  // Common Prisma operations
  const operations = [
    "findUnique",
    "findFirst",
    "findMany",
    "create",
    "createMany",
    "update",
    "updateMany",
    "upsert",
    "delete",
    "deleteMany",
    "count",
    "aggregate",
    "groupBy",
  ]

  // Create mock functions for each model and operation
  models.forEach((model) => {
    mockPrisma[model] = {}
    operations.forEach((operation) => {
      mockPrisma[model][operation] = vi.fn()
    })
  })

  // Add $transaction support
  mockPrisma.$transaction = vi.fn((callback: any) => {
    if (typeof callback === "function") {
      return callback(mockPrisma)
    }
    return Promise.resolve(callback)
  })

  // Add $connect and $disconnect
  mockPrisma.$connect = vi.fn().mockResolvedValue(undefined)
  mockPrisma.$disconnect = vi.fn().mockResolvedValue(undefined)

  return mockPrisma
}

// Create the singleton mock instance
export const prismaMock = createMockPrismaClient()

// Type for the mocked client
export type MockPrismaClient = typeof prismaMock

/**
 * Reset all mock implementations and call history
 * Call this in beforeEach() to ensure test isolation
 */
export function resetPrismaMock(): void {
  vi.clearAllMocks()
}

/**
 * Create a fresh Prisma mock instance
 * Useful when you need multiple isolated mocks
 */
export function createPrismaMock(): MockPrismaClient {
  return createMockPrismaClient()
}
