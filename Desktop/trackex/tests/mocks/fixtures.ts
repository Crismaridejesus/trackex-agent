/**
 * Test Data Fixtures
 *
 * Factory functions for creating mock data objects used in tests.
 * These functions provide sensible defaults that can be overridden.
 */

import { AppCategory } from "@/lib/utils/categories"

// ============================================================================
// App Usage Entry Fixtures
// ============================================================================

export interface MockAppUsageEntry {
  isIdle: boolean
  category: string
  duration: number
  startTime: Date
  endTime: Date | null
}

export function createMockAppUsageEntry(
  overrides: Partial<MockAppUsageEntry> = {}
): MockAppUsageEntry {
  const startTime = overrides.startTime ?? new Date("2024-01-15T09:00:00Z")
  const duration = overrides.duration ?? 300 // 5 minutes default

  return {
    isIdle: false,
    category: "PRODUCTIVE",
    duration,
    startTime,
    endTime:
      overrides.endTime === undefined
        ? new Date(startTime.getTime() + duration * 1000)
        : overrides.endTime,
    ...overrides,
  }
}

export function createMockIdleEntry(
  overrides: Partial<MockAppUsageEntry> = {}
): MockAppUsageEntry {
  return createMockAppUsageEntry({
    isIdle: true,
    category: "NEUTRAL",
    ...overrides,
  })
}

export function createMockActiveEntry(
  overrides: Partial<MockAppUsageEntry> = {}
): MockAppUsageEntry {
  return createMockAppUsageEntry({
    isIdle: false,
    ...overrides,
  })
}

// ============================================================================
// Employee Fixtures
// ============================================================================

export interface MockEmployee {
  id: string
  name: string
  email: string
  password: string | null
  teamId: string | null
  policyId: string | null
  isActive: boolean
  autoScreenshots: boolean
  screenshotInterval: number | null
  timezone: string | null
  createdAt: Date
  updatedAt: Date
}

export function createMockEmployee(
  overrides: Partial<MockEmployee> = {}
): MockEmployee {
  const now = new Date()
  return {
    id: `emp_${Math.random().toString(36).substring(7)}`,
    name: "John Doe",
    email: "john.doe@example.com",
    password: null,
    teamId: null,
    policyId: null,
    isActive: true,
    autoScreenshots: false,
    screenshotInterval: null,
    timezone: "America/New_York",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ============================================================================
// Work Session Fixtures
// ============================================================================

export interface MockWorkSession {
  id: string
  employeeId: string
  deviceId: string
  clockIn: Date
  clockOut: Date | null
  totalWork: number | null
  activeTime: number | null
  idleTime: number | null
  editReason: string | null
  editedBy: string | null
  editedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function createMockWorkSession(
  overrides: Partial<MockWorkSession> = {}
): MockWorkSession {
  const now = new Date()
  const clockIn = overrides.clockIn ?? new Date("2024-01-15T09:00:00Z")

  return {
    id: `session_${Math.random().toString(36).substring(7)}`,
    employeeId: `emp_${Math.random().toString(36).substring(7)}`,
    deviceId: `device_${Math.random().toString(36).substring(7)}`,
    clockIn,
    clockOut: null,
    totalWork: null,
    activeTime: null,
    idleTime: null,
    editReason: null,
    editedBy: null,
    editedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ============================================================================
// App Rule Fixtures
// ============================================================================

export interface MockAppRule {
  id: string
  organizationId: string
  matcherType: "EXACT" | "GLOB" | "REGEX" | "DOMAIN"
  value: string
  category: AppCategory
  priority: number
  isActive: boolean
  isGlobal: boolean
  createdAt: Date
  updatedAt: Date
}

export function createMockAppRule(
  overrides: Partial<MockAppRule> = {}
): MockAppRule {
  const now = new Date()
  return {
    id: `rule_${Math.random().toString(36).substring(7)}`,
    organizationId: "org_test",
    matcherType: "EXACT",
    value: "Visual Studio Code",
    category: "PRODUCTIVE",
    priority: 100,
    isActive: true,
    isGlobal: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ============================================================================
// Domain Rule Fixtures
// ============================================================================

export interface MockDomainRule {
  id: string
  organizationId: string
  domain: string
  matcherType: "EXACT" | "SUFFIX" | "CONTAINS"
  category: AppCategory
  description: string | null
  priority: number
  isActive: boolean
  isGlobal: boolean
  createdAt: Date
  updatedAt: Date
}

export function createMockDomainRule(
  overrides: Partial<MockDomainRule> = {}
): MockDomainRule {
  const now = new Date()
  return {
    id: `domain_rule_${Math.random().toString(36).substring(7)}`,
    organizationId: "org_test",
    domain: "github.com",
    matcherType: "SUFFIX",
    category: "PRODUCTIVE",
    description: "Code hosting platform",
    priority: 100,
    isActive: true,
    isGlobal: false,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ============================================================================
// Device Fixtures
// ============================================================================

export interface MockDevice {
  id: string
  employeeId: string
  platform: string
  deviceName: string
  version: string | null
  lastSeen: Date | null
  isActive: boolean
  currentApp: string | null
  createdAt: Date
  updatedAt: Date
}

export function createMockDevice(
  overrides: Partial<MockDevice> = {}
): MockDevice {
  const now = new Date()
  return {
    id: `device_${Math.random().toString(36).substring(7)}`,
    employeeId: `emp_${Math.random().toString(36).substring(7)}`,
    platform: "macos",
    deviceName: "MacBook Pro",
    version: "14.0",
    lastSeen: now,
    isActive: true,
    currentApp: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

// ============================================================================
// Time Statistics Fixtures
// ============================================================================

export interface MockTimeStatistics {
  totalWork: number
  activeTime: number
  idleTime: number
  productiveTime: number
  neutralTime: number
  unproductiveTime: number
}

export function createMockTimeStatistics(
  overrides: Partial<MockTimeStatistics> = {}
): MockTimeStatistics {
  return {
    totalWork: 28800, // 8 hours
    activeTime: 25200, // 7 hours
    idleTime: 3600, // 1 hour
    productiveTime: 18000, // 5 hours
    neutralTime: 5400, // 1.5 hours
    unproductiveTime: 1800, // 30 minutes
    ...overrides,
  }
}

// ============================================================================
// Batch Fixtures for Complex Tests
// ============================================================================

/**
 * Create a realistic day of app usage entries
 */
export function createMockWorkDay(
  startTime: Date = new Date("2024-01-15T09:00:00Z")
): MockAppUsageEntry[] {
  const entries: MockAppUsageEntry[] = []
  let currentTime = startTime

  // Morning: 3 hours productive work
  entries.push(
    createMockActiveEntry({
      category: "PRODUCTIVE",
      duration: 5400, // 1.5 hours
      startTime: currentTime,
    })
  )
  currentTime = new Date(currentTime.getTime() + 5400 * 1000)

  // Short break (idle)
  entries.push(
    createMockIdleEntry({
      duration: 600, // 10 minutes
      startTime: currentTime,
    })
  )
  currentTime = new Date(currentTime.getTime() + 600 * 1000)

  // More productive work
  entries.push(
    createMockActiveEntry({
      category: "PRODUCTIVE",
      duration: 5400, // 1.5 hours
      startTime: currentTime,
    })
  )
  currentTime = new Date(currentTime.getTime() + 5400 * 1000)

  // Lunch break (idle)
  entries.push(
    createMockIdleEntry({
      duration: 3600, // 1 hour
      startTime: currentTime,
    })
  )
  currentTime = new Date(currentTime.getTime() + 3600 * 1000)

  // Afternoon: mixed activities
  entries.push(
    createMockActiveEntry({
      category: "NEUTRAL",
      duration: 1800, // 30 minutes
      startTime: currentTime,
    })
  )
  currentTime = new Date(currentTime.getTime() + 1800 * 1000)

  entries.push(
    createMockActiveEntry({
      category: "PRODUCTIVE",
      duration: 7200, // 2 hours
      startTime: currentTime,
    })
  )
  currentTime = new Date(currentTime.getTime() + 7200 * 1000)

  entries.push(
    createMockActiveEntry({
      category: "UNPRODUCTIVE",
      duration: 900, // 15 minutes
      startTime: currentTime,
    })
  )

  return entries
}
