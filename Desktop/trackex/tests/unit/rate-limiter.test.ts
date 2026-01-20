/**
 * Unit Tests for Rate Limiter Service
 *
 * Tests the rate limiting, circuit breaker, and request deduplication functionality.
 * These are critical for protecting the API from abuse and overload.
 */

import {
  CircuitBreaker,
  getRateLimitService,
  RateLimiter,
  RateLimitService,
  RequestDeduplicator,
  resetRateLimitService,
} from "@/lib/services/rate-limiter.service"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================================
// RateLimiter Tests
// ============================================================================

describe("RateLimiter", () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter({
      maxRequests: 10,
      windowMs: 60000, // 1 minute
    })
  })

  it("should allow requests within limit", () => {
    for (let i = 0; i < 10; i++) {
      const result = limiter.check("user-1")
      expect(result.success).toBe(true)
    }
  })

  it("should block requests exceeding limit", () => {
    // Use up the limit
    for (let i = 0; i < 10; i++) {
      limiter.check("user-1")
    }

    // 11th request should be blocked
    const result = limiter.check("user-1")
    expect(result.success).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("should track different users separately", () => {
    // Use up limit for user-1
    for (let i = 0; i < 10; i++) {
      limiter.check("user-1")
    }

    // user-2 should still be allowed
    const result = limiter.check("user-2")
    expect(result.success).toBe(true)
    expect(result.remaining).toBe(9)
  })

  it("should return correct remaining count", () => {
    let result = limiter.check("user-1")
    expect(result.remaining).toBe(9)

    result = limiter.check("user-1")
    expect(result.remaining).toBe(8)

    result = limiter.check("user-1")
    expect(result.remaining).toBe(7)
  })

  it("should include limit in result", () => {
    const result = limiter.check("user-1")
    expect(result.limit).toBe(10)
  })

  it("should include reset time in result", () => {
    const before = Date.now()
    const result = limiter.check("user-1")
    const after = Date.now()

    expect(result.reset).toBeGreaterThanOrEqual(before + 60000)
    expect(result.reset).toBeLessThanOrEqual(after + 60000)
  })

  it("should reset rate limit for a key", () => {
    // Use up some requests
    for (let i = 0; i < 5; i++) {
      limiter.check("user-1")
    }

    // Reset
    limiter.reset("user-1")

    // Should be back to full allowance
    const result = limiter.check("user-1")
    expect(result.remaining).toBe(9)
  })

  it("should track usage correctly", () => {
    for (let i = 0; i < 5; i++) {
      limiter.check("user-1")
    }

    expect(limiter.getUsage("user-1")).toBe(5)
    expect(limiter.getUsage("user-2")).toBe(0)
  })

  it("should track size correctly", () => {
    limiter.check("user-1")
    limiter.check("user-2")
    limiter.check("user-3")

    expect(limiter.getSize()).toBe(3)
  })

  describe("sliding window behavior", () => {
    it("should use sliding window for rate limiting", () => {
      vi.useFakeTimers()

      // Make 5 requests at time 0
      for (let i = 0; i < 5; i++) {
        limiter.check("user-1")
      }

      // Advance time by 30 seconds (halfway through window)
      vi.advanceTimersByTime(30000)

      // Make 5 more requests - should still be within limit
      for (let i = 0; i < 5; i++) {
        const result = limiter.check("user-1")
        expect(result.success).toBe(true)
      }

      // Now at limit
      const blocked = limiter.check("user-1")
      expect(blocked.success).toBe(false)

      // Advance another 30 seconds - original requests should slide out
      vi.advanceTimersByTime(30000)

      // Should allow more requests now
      const allowed = limiter.check("user-1")
      expect(allowed.success).toBe(true)

      vi.useRealTimers()
    })
  })
})

// ============================================================================
// CircuitBreaker Tests
// ============================================================================

describe("CircuitBreaker", () => {
  let breaker: CircuitBreaker

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      timeout: 1000, // 1 second
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should start in CLOSED state", () => {
    expect(breaker.getState()).toBe("CLOSED")
  })

  it("should allow requests when CLOSED", async () => {
    const result = await breaker.execute(() => Promise.resolve("success"))
    expect(result).toBe("success")
    expect(breaker.getState()).toBe("CLOSED")
  })

  it("should open after reaching failure threshold", async () => {
    // Cause 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe("OPEN")
  })

  it("should reject requests when OPEN", async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    // Should reject immediately
    await expect(
      breaker.execute(() => Promise.resolve("success"))
    ).rejects.toThrow("Circuit breaker is OPEN")
  })

  it("should transition to HALF_OPEN after timeout", async () => {
    vi.useFakeTimers()

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe("OPEN")

    // Advance past timeout
    vi.advanceTimersByTime(1500)

    // Next request should be allowed (HALF_OPEN)
    const result = await breaker.execute(() => Promise.resolve("success"))
    expect(result).toBe("success")
    expect(breaker.getState()).toBe("HALF_OPEN")
  })

  it("should close after success threshold in HALF_OPEN", async () => {
    vi.useFakeTimers()

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    // Advance past timeout to HALF_OPEN
    vi.advanceTimersByTime(1500)

    // Succeed twice (successThreshold = 2)
    await breaker.execute(() => Promise.resolve("success"))
    expect(breaker.getState()).toBe("HALF_OPEN")

    await breaker.execute(() => Promise.resolve("success"))
    expect(breaker.getState()).toBe("CLOSED")
  })

  it("should re-open on failure in HALF_OPEN", async () => {
    vi.useFakeTimers()

    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    // Advance past timeout
    vi.advanceTimersByTime(1500)

    // Fail in HALF_OPEN
    try {
      await breaker.execute(() => Promise.reject(new Error("fail again")))
    } catch {
      // Expected
    }

    // Should be back to OPEN
    expect(breaker.getState()).toBe("OPEN")
  })

  it("should reset failure count on success", async () => {
    // Cause 2 failures (one short of threshold)
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    // Succeed
    await breaker.execute(() => Promise.resolve("success"))

    // Another 2 failures shouldn't open (reset by success)
    for (let i = 0; i < 2; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe("CLOSED")
  })

  it("should allow manual reset", async () => {
    // Open the circuit
    for (let i = 0; i < 3; i++) {
      try {
        await breaker.execute(() => Promise.reject(new Error("fail")))
      } catch {
        // Expected
      }
    }

    expect(breaker.getState()).toBe("OPEN")

    breaker.reset()

    expect(breaker.getState()).toBe("CLOSED")
  })
})

// ============================================================================
// RequestDeduplicator Tests
// ============================================================================

describe("RequestDeduplicator", () => {
  let deduplicator: RequestDeduplicator<string>

  beforeEach(() => {
    deduplicator = new RequestDeduplicator<string>(100) // 100ms TTL
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should execute function on first request", async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return Promise.resolve("result")
    }

    const result = await deduplicator.execute("key-1", fn)

    expect(result).toBe("result")
    expect(callCount).toBe(1)
  })

  it("should return same promise for concurrent requests", async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return new Promise<string>((resolve) => {
        setTimeout(() => resolve("result"), 50)
      })
    }

    // Start 3 concurrent requests
    const promises = [
      deduplicator.execute("key-1", fn),
      deduplicator.execute("key-1", fn),
      deduplicator.execute("key-1", fn),
    ]

    const results = await Promise.all(promises)

    // All should get the same result
    expect(results).toEqual(["result", "result", "result"])
    // But function should only be called once
    expect(callCount).toBe(1)
  })

  it("should execute separately for different keys", async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      return Promise.resolve("result")
    }

    await Promise.all([
      deduplicator.execute("key-1", fn),
      deduplicator.execute("key-2", fn),
      deduplicator.execute("key-3", fn),
    ])

    expect(callCount).toBe(3)
  })

  it("should remove from cache after TTL", async () => {
    vi.useFakeTimers()

    let callCount = 0
    const fn = () => {
      callCount++
      return Promise.resolve("result")
    }

    await deduplicator.execute("key-1", fn)
    expect(callCount).toBe(1)

    // Advance past TTL
    vi.advanceTimersByTime(150)

    // Execute should run the function again
    await deduplicator.execute("key-1", fn)
    expect(callCount).toBe(2)
  })

  it("should remove from cache immediately on error", async () => {
    let callCount = 0
    const fn = () => {
      callCount++
      if (callCount === 1) {
        return Promise.reject(new Error("first call fails"))
      }
      return Promise.resolve("success")
    }

    // First call fails
    await expect(deduplicator.execute("key-1", fn)).rejects.toThrow()
    expect(callCount).toBe(1)

    // Second call should try again immediately (not cached)
    const result = await deduplicator.execute("key-1", fn)
    expect(result).toBe("success")
    expect(callCount).toBe(2)
  })

  it("should track in-flight status", async () => {
    const fn = () =>
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("result"), 50)
      })

    const promise = deduplicator.execute("key-1", fn)

    expect(deduplicator.isInFlight("key-1")).toBe(true)
    expect(deduplicator.isInFlight("key-2")).toBe(false)

    await promise

    // Still in flight during TTL period
    expect(deduplicator.isInFlight("key-1")).toBe(true)
  })

  it("should track size correctly", async () => {
    const fn = () =>
      new Promise<string>((resolve) => {
        setTimeout(() => resolve("result"), 50)
      })

    const p1 = deduplicator.execute("key-1", fn)
    const p2 = deduplicator.execute("key-2", fn)

    expect(deduplicator.getSize()).toBe(2)

    await Promise.all([p1, p2])
  })

  it("should clear all in-flight requests", async () => {
    const fn = () => Promise.resolve("result")

    await deduplicator.execute("key-1", fn)
    await deduplicator.execute("key-2", fn)

    expect(deduplicator.getSize()).toBe(2)

    deduplicator.clear()

    expect(deduplicator.getSize()).toBe(0)
  })
})

// ============================================================================
// RateLimitService Tests
// ============================================================================

describe("RateLimitService", () => {
  let service: RateLimitService

  beforeEach(() => {
    resetRateLimitService()
    service = getRateLimitService()
  })

  it("should check per-user rate limit", () => {
    const result = service.checkUserLimit("user-1")

    expect(result.success).toBe(true)
    expect(result.limit).toBe(120) // Default: 120 req/min
    expect(result.remaining).toBe(119)
  })

  it("should check global rate limit", () => {
    const result = service.checkGlobalLimit()

    expect(result.success).toBe(true)
    expect(result.limit).toBe(1000) // Default: 1000 req/min global
  })

  it("should get circuit state", () => {
    expect(service.getCircuitState()).toBe("CLOSED")
  })

  it("should reset circuit", () => {
    // Note: Can't easily test opening the circuit without failures
    service.resetCircuit()
    expect(service.getCircuitState()).toBe("CLOSED")
  })

  it("should provide stats", () => {
    const stats = service.getStats()

    expect(stats).toHaveProperty("perUserLimiterSize")
    expect(stats).toHaveProperty("globalLimiterSize")
    expect(stats).toHaveProperty("circuitState")
    expect(stats).toHaveProperty("inFlightRequests")
  })

  describe("executeWithProtection", () => {
    it("should execute function successfully", async () => {
      const result = await service.executeWithProtection(
        "user-1",
        "request-1",
        () => Promise.resolve("data")
      )

      expect(result.success).toBe(true)
      expect(result.data).toBe("data")
      expect(result.rateLimit.success).toBe(true)
    })

    it("should return rate limit info on success", async () => {
      const result = await service.executeWithProtection(
        "user-1",
        "request-1",
        () => Promise.resolve("data")
      )

      expect(result.rateLimit.limit).toBe(120)
      expect(result.rateLimit.remaining).toBeGreaterThanOrEqual(0)
    })

    it("should handle function errors", async () => {
      const result = await service.executeWithProtection(
        "user-1",
        "request-1",
        () => Promise.reject(new Error("Something went wrong"))
      )

      expect(result.success).toBe(false)
      expect(result.error).toBe("Something went wrong")
    })

    it("should deduplicate concurrent requests", async () => {
      let callCount = 0
      const fn = () => {
        callCount++
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve("result"), 50)
        })
      }

      // Make concurrent requests with same key
      const promises = [
        service.executeWithProtection("user-1", "same-key", fn),
        service.executeWithProtection("user-1", "same-key", fn),
        service.executeWithProtection("user-1", "same-key", fn),
      ]

      const results = await Promise.all(promises)

      // All succeed with same data
      expect(results.every((r) => r.success && r.data === "result")).toBe(true)
      // But function only called once
      expect(callCount).toBe(1)
    })
  })

  it("should be a singleton", () => {
    const service1 = getRateLimitService()
    const service2 = getRateLimitService()

    expect(service1).toBe(service2)
  })

  it("should allow resetting singleton", () => {
    const service1 = getRateLimitService()
    resetRateLimitService()
    const service2 = getRateLimitService()

    expect(service1).not.toBe(service2)
  })
})

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Rate Limiter Integration", () => {
  beforeEach(() => {
    resetRateLimitService()
  })

  it("should protect against rapid requests from single user", async () => {
    const limiter = new RateLimiter({
      maxRequests: 5,
      windowMs: 1000,
    })

    // Rapid fire 10 requests
    const results = []
    for (let i = 0; i < 10; i++) {
      results.push(limiter.check("aggressive-user"))
    }

    // First 5 succeed, rest fail
    expect(results.filter((r) => r.success).length).toBe(5)
    expect(results.filter((r) => !r.success).length).toBe(5)
  })

  it("should handle circuit breaker recovery", async () => {
    vi.useFakeTimers()

    const breaker = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 1,
      timeout: 500,
    })

    let shouldFail = true
    const fn = () => {
      if (shouldFail) {
        return Promise.reject(new Error("service unavailable"))
      }
      return Promise.resolve("ok")
    }

    // Cause failures to open circuit
    try {
      await breaker.execute(fn)
    } catch {
      /* expected */
    }
    try {
      await breaker.execute(fn)
    } catch {
      /* expected */
    }

    expect(breaker.getState()).toBe("OPEN")

    // Fix the underlying issue
    shouldFail = false

    // Wait for timeout
    vi.advanceTimersByTime(600)

    // Should recover
    const result = await breaker.execute(fn)
    expect(result).toBe("ok")
    expect(breaker.getState()).toBe("CLOSED")

    vi.useRealTimers()
  })
})
