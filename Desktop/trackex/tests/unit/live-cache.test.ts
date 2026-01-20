/**
 * Unit Tests for Live Cache Service
 *
 * Tests the multi-tier caching strategy for Live View data.
 */

import {
  LiveCacheService,
  createLiveCacheService,
  getLiveCacheService,
  resetLiveCacheService,
} from "@/lib/services/live-cache.service"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// ============================================================================
// LiveCacheService Tests
// ============================================================================

describe("LiveCacheService", () => {
  let cache: LiveCacheService

  beforeEach(() => {
    vi.useFakeTimers()
    cache = new LiveCacheService({
      l1TtlMs: 3000,
      l2TtlMs: 5000,
      maxL1Size: 100,
      redis: null, // Test without Redis
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("L1 (in-memory) cache", () => {
    it("should cache and retrieve values", async () => {
      await cache.set("key-1", { data: "test" })

      const result = await cache.get("key-1")

      expect(result).toEqual({ data: "test" })
    })

    it("should return null for missing keys", async () => {
      const result = await cache.get("nonexistent")

      expect(result).toBeNull()
    })

    it("should expire values after TTL", async () => {
      await cache.set("key-1", { data: "test" })

      // Advance time past TTL
      vi.advanceTimersByTime(4000)

      const result = await cache.get("key-1")

      expect(result).toBeNull()
    })

    it("should not expire values before TTL", async () => {
      await cache.set("key-1", { data: "test" })

      // Advance time, but not past TTL
      vi.advanceTimersByTime(2000)

      const result = await cache.get("key-1")

      expect(result).toEqual({ data: "test" })
    })

    it("should evict oldest entry when cache is full", async () => {
      // Create cache with max size of 3
      cache = new LiveCacheService({
        l1TtlMs: 10000,
        maxL1Size: 3,
        redis: null,
      })

      await cache.set("key-1", "value-1")
      await cache.set("key-2", "value-2")
      await cache.set("key-3", "value-3")

      expect(cache.getL1Size()).toBe(3)

      // Add 4th item, should evict oldest (key-1)
      await cache.set("key-4", "value-4")

      expect(cache.getL1Size()).toBe(3)
      expect(await cache.get("key-1")).toBeNull()
      expect(await cache.get("key-4")).toBe("value-4")
    })
  })

  describe("invalidate", () => {
    it("should remove specific key from cache", async () => {
      await cache.set("key-1", "value-1")
      await cache.set("key-2", "value-2")

      await cache.invalidate("key-1")

      expect(await cache.get("key-1")).toBeNull()
      expect(await cache.get("key-2")).toBe("value-2")
    })
  })

  describe("invalidatePattern", () => {
    it("should remove keys matching pattern", async () => {
      await cache.set("live:employees", "data-1")
      await cache.set("live:sessions", "data-2")
      await cache.set("other:key", "data-3")

      await cache.invalidatePattern("live:*")

      expect(await cache.get("live:employees")).toBeNull()
      expect(await cache.get("live:sessions")).toBeNull()
      expect(await cache.get("other:key")).toBe("data-3")
    })
  })

  describe("clear", () => {
    it("should clear all cached values", async () => {
      await cache.set("key-1", "value-1")
      await cache.set("key-2", "value-2")
      await cache.set("key-3", "value-3")

      await cache.clear()

      expect(cache.getL1Size()).toBe(0)
    })
  })

  describe("statistics", () => {
    it("should track L1 hits", async () => {
      await cache.set("key-1", "value-1")

      await cache.get("key-1")
      await cache.get("key-1")
      await cache.get("key-1")

      const stats = cache.getStats()

      expect(stats.l1Hits).toBe(3)
    })

    it("should track cache misses", async () => {
      await cache.get("nonexistent-1")
      await cache.get("nonexistent-2")

      const stats = cache.getStats()

      expect(stats.misses).toBe(2)
    })

    it("should track sets", async () => {
      await cache.set("key-1", "value-1")
      await cache.set("key-2", "value-2")

      const stats = cache.getStats()

      expect(stats.sets).toBe(2)
    })

    it("should calculate hit rate correctly", async () => {
      await cache.set("key-1", "value-1")

      // 2 hits
      await cache.get("key-1")
      await cache.get("key-1")

      // 2 misses
      await cache.get("nonexistent")
      await cache.get("nonexistent")

      const hitRate = cache.getHitRate()

      expect(hitRate).toBe(0.5) // 2 / 4
    })

    it("should return 0 hit rate when no requests", () => {
      expect(cache.getHitRate()).toBe(0)
    })

    it("should reset statistics", async () => {
      await cache.set("key-1", "value-1")
      await cache.get("key-1")
      await cache.get("nonexistent")

      cache.resetStats()

      const stats = cache.getStats()

      expect(stats.l1Hits).toBe(0)
      expect(stats.l2Hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.sets).toBe(0)
      expect(stats.errors).toBe(0)
    })
  })

  describe("cleanupL1", () => {
    it("should remove expired entries", async () => {
      await cache.set("key-1", "value-1")
      await cache.set("key-2", "value-2")

      // Advance past TTL
      vi.advanceTimersByTime(4000)

      cache.cleanupL1()

      expect(cache.getL1Size()).toBe(0)
    })

    it("should keep non-expired entries", async () => {
      await cache.set("key-1", "value-1")

      // Advance, but not past TTL
      vi.advanceTimersByTime(1000)

      await cache.set("key-2", "value-2")

      // Advance more - key-1 expires, key-2 should still be valid
      vi.advanceTimersByTime(2500)

      cache.cleanupL1()

      expect(await cache.get("key-1")).toBeNull()
      expect(await cache.get("key-2")).toBe("value-2")
    })
  })

  describe("getL1Size", () => {
    it("should return correct size", async () => {
      expect(cache.getL1Size()).toBe(0)

      await cache.set("key-1", "value-1")
      expect(cache.getL1Size()).toBe(1)

      await cache.set("key-2", "value-2")
      expect(cache.getL1Size()).toBe(2)

      await cache.invalidate("key-1")
      expect(cache.getL1Size()).toBe(1)
    })
  })
})

// ============================================================================
// Factory Functions Tests
// ============================================================================

describe("createLiveCacheService", () => {
  it("should create a new instance", () => {
    const cache1 = createLiveCacheService()
    const cache2 = createLiveCacheService()

    expect(cache1).not.toBe(cache2)
  })
})

describe("getLiveCacheService (singleton)", () => {
  beforeEach(() => {
    resetLiveCacheService()
  })

  it("should return the same instance", () => {
    const cache1 = getLiveCacheService()
    const cache2 = getLiveCacheService()

    expect(cache1).toBe(cache2)
  })

  it("should create new instance after reset", () => {
    const cache1 = getLiveCacheService()

    resetLiveCacheService()

    const cache2 = getLiveCacheService()

    expect(cache1).not.toBe(cache2)
  })
})

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
  let cache: LiveCacheService

  beforeEach(() => {
    cache = new LiveCacheService({
      l1TtlMs: 3000,
      redis: null,
    })
  })

  it("should handle null values", async () => {
    await cache.set("key-1", null)

    const result = await cache.get("key-1")

    expect(result).toBeNull()
  })

  it("should handle undefined values", async () => {
    await cache.set("key-1", undefined)

    // undefined is stored, so get returns it (not a miss)
    const result = await cache.get("key-1")

    expect(result).toBeUndefined()
  })

  it("should handle complex objects", async () => {
    const complexData = {
      employees: [
        { id: "1", name: "John", status: "online" },
        { id: "2", name: "Jane", status: "offline" },
      ],
      metadata: {
        timestamp: new Date().toISOString(),
        count: 2,
      },
    }

    await cache.set("complex", complexData)

    const result = await cache.get("complex")

    expect(result).toEqual(complexData)
  })

  it("should handle empty string keys", async () => {
    await cache.set("", "empty-key-value")

    const result = await cache.get("")

    expect(result).toBe("empty-key-value")
  })

  it("should handle special characters in keys", async () => {
    const key = "live:employees?filter=active&sort=name"

    await cache.set(key, "data")

    const result = await cache.get(key)

    expect(result).toBe("data")
  })

  it("should handle overwriting existing keys", async () => {
    await cache.set("key-1", "value-1")
    await cache.set("key-1", "value-2")

    const result = await cache.get("key-1")

    expect(result).toBe("value-2")
  })
})
