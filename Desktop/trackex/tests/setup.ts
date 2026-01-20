/**
 * Global Test Setup
 *
 * This file is run before each test file.
 * Configure global test utilities, mocks, and test environment settings.
 */

import * as matchers from "@testing-library/jest-dom/matchers"
import { afterEach, beforeEach, expect, vi } from "vitest"
import { QueryClient } from "@tanstack/react-query"

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers)

// Cleanup after each test case (for React component tests)
// Only import cleanup if we're testing React components
afterEach(() => {
  // Reset all mocks after each test
  vi.restoreAllMocks()
})

// Mock console methods to reduce noise in tests (optional)
// Uncomment if you want to suppress console output during tests
// vi.spyOn(console, 'log').mockImplementation(() => {})
// vi.spyOn(console, 'warn').mockImplementation(() => {})

// ============================================
// REACT QUERY TEST UTILITIES
// ============================================

/**
 * Create a fresh QueryClient for each test
 * Configured with settings optimized for testing
 */
export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests for faster feedback
        retry: false,
        // Disable stale time to ensure fresh data in tests
        staleTime: 0,
        // Disable garbage collection in tests
        gcTime: Infinity,
        // Disable refetching in tests
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

/**
 * Helper to wait for React Query to settle
 * Useful when testing async query behavior
 */
export async function waitForQueryToSettle(queryClient: QueryClient): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0))
  await queryClient.isFetching() === 0
}

// ============================================
// COMMON MOCKS
// ============================================

// Mock fetch globally
global.fetch = vi.fn()

// Mock EventSource for SSE tests
class MockEventSource {
  url: string
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: ((error: Event) => void) | null = null
  onopen: (() => void) | null = null
  readyState = 0

  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2

  constructor(url: string) {
    this.url = url
    // Simulate connection in next tick
    setTimeout(() => {
      this.readyState = MockEventSource.OPEN
      this.onopen?.()
    }, 0)
  }

  close() {
    this.readyState = MockEventSource.CLOSED
  }

  // Test helpers
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }

  simulateError(error: Event) {
    this.onerror?.(error)
  }
}

// @ts-expect-error - Mock EventSource for tests
global.EventSource = MockEventSource

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
})

export {}
