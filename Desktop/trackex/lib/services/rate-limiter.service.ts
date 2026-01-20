/**
 * Rate Limiter Service
 *
 * Implements rate limiting for API endpoints with multiple strategies:
 * - Sliding window rate limiting (per user)
 * - Global rate limiting (entire application)
 * - Circuit breaker pattern (fail fast on errors)
 * - Request deduplication (coalesce concurrent requests)
 *
 * Use Cases:
 * - Prevent abuse (intentional or accidental)
 * - Protect database from overload
 * - Handle error scenarios gracefully
 *
 * CLUSTER MODE NOTE:
 * This service uses in-memory state, which means rate limits are per-process
 * in cluster mode. With 4 PM2 instances, the effective rate limit is 4x.
 * 
 * For strict cross-process rate limiting, consider:
 * 1. Using Redis for shared counters (e.g., rate-limiter-flexible package)
 * 2. The current approach still provides protection - just per-instance
 * 3. The cache layer (live-cache.service.ts) already uses Redis for sharing
 *
 * Current behavior in cluster mode:
 * - Per-user limit: 120 req/min * N instances = 480 req/min with 4 instances
 * - Global limit: 1000 req/min * N instances = 4000 req/min with 4 instances
 * - Circuit breaker: Per-instance (may behave differently per instance)
 * - Request deduplication: Per-instance (concurrent requests may hit different instances)
 */

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  maxRequests: number; // Maximum requests allowed
  windowMs: number; // Time window in milliseconds
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  success: boolean; // Whether request is allowed
  limit: number; // Total limit
  remaining: number; // Remaining requests
  reset: number; // Unix timestamp when limit resets
}

/**
 * Circuit breaker state
 */
type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number; // Number of failures before opening circuit
  successThreshold: number; // Number of successes to close circuit
  timeout: number; // Time in ms before attempting to close circuit
}

/**
 * In-Memory Rate Limiter
 *
 * Uses sliding window algorithm with automatic cleanup
 */
export class RateLimiter {
  private requests: Map<string, number[]>; // key -> array of timestamps
  private readonly config: RateLimitConfig;
  private lastCleanup: number;
  private readonly cleanupInterval = 60000; // Cleanup every 60 seconds

  constructor(config: RateLimitConfig) {
    this.requests = new Map();
    this.config = config;
    this.lastCleanup = Date.now();
  }

  /**
   * Check if request is allowed under rate limit
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Get existing requests for this key
    let timestamps = this.requests.get(key) || [];

    // Remove requests outside the current window (sliding window)
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Update the map with cleaned timestamps
    this.requests.set(key, timestamps);

    // Probabilistic cleanup (1% chance per request)
    if (Math.random() < 0.01) {
      this.cleanup();
    }

    // Check if limit exceeded
    const requestCount = timestamps.length;
    const allowed = requestCount < this.config.maxRequests;

    if (allowed) {
      // Add current request timestamp
      timestamps.push(now);
      this.requests.set(key, timestamps);
    }

    return {
      success: allowed,
      limit: this.config.maxRequests,
      remaining: Math.max(0, this.config.maxRequests - requestCount - (allowed ? 1 : 0)),
      reset: now + this.config.windowMs,
    };
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Get current usage for a key
   */
  getUsage(key: string): number {
    const now = Date.now();
    const windowStart = now - this.config.windowMs;
    const timestamps = this.requests.get(key) || [];
    return timestamps.filter((ts) => ts > windowStart).length;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();

    // Only cleanup if enough time has passed
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }

    const windowStart = now - this.config.windowMs;

    for (const [key, timestamps] of this.requests.entries()) {
      const validTimestamps = timestamps.filter((ts) => ts > windowStart);

      if (validTimestamps.length === 0) {
        this.requests.delete(key);
      } else if (validTimestamps.length < timestamps.length) {
        this.requests.set(key, validTimestamps);
      }
    }

    this.lastCleanup = now;
  }

  /**
   * Get total number of tracked keys
   */
  getSize(): number {
    return this.requests.size;
  }
}

/**
 * Circuit Breaker
 *
 * Prevents cascading failures by failing fast when error rate is high
 */
export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === "OPEN") {
      const now = Date.now();

      // Check if timeout has passed
      if (now - this.lastFailureTime > this.config.timeout) {
        // Try to close circuit (HALF_OPEN state)
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.failureCount = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;

      if (this.successCount >= this.config.successThreshold) {
        // Close circuit after enough successes
        this.state = "CLOSED";
        this.successCount = 0;
      }
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      // Open circuit after too many failures
      this.state = "OPEN";
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Request Deduplicator
 *
 * Coalesces concurrent requests for the same resource
 * Returns the same promise to all concurrent callers
 */
export class RequestDeduplicator<T = any> {
  private inFlightRequests: Map<string, Promise<T>>;
  private readonly ttl: number; // Time to live for completed requests

  constructor(ttl: number = 1000) {
    this.inFlightRequests = new Map();
    this.ttl = ttl;
  }

  /**
   * Execute function with deduplication
   *
   * If the same key is called concurrently, only one execution happens
   * and all callers receive the same result
   */
  async execute(key: string, fn: () => Promise<T>): Promise<T> {
    // Check if request is already in flight
    const existing = this.inFlightRequests.get(key);
    if (existing) {
      return existing;
    }

    // Start new request
    const promise = fn()
      .then((result) => {
        // Keep result cached for TTL duration
        setTimeout(() => {
          this.inFlightRequests.delete(key);
        }, this.ttl);
        return result;
      })
      .catch((error) => {
        // Remove from cache immediately on error
        this.inFlightRequests.delete(key);
        throw error;
      });

    this.inFlightRequests.set(key, promise);
    return promise;
  }

  /**
   * Check if request is in flight
   */
  isInFlight(key: string): boolean {
    return this.inFlightRequests.has(key);
  }

  /**
   * Clear all in-flight requests
   */
  clear(): void {
    this.inFlightRequests.clear();
  }

  /**
   * Get number of in-flight requests
   */
  getSize(): number {
    return this.inFlightRequests.size;
  }
}

/**
 * Combined Rate Limit Service
 *
 * Provides rate limiting, circuit breaking, and request deduplication
 */
export class RateLimitService {
  private readonly perUserLimiter: RateLimiter;
  private readonly globalLimiter: RateLimiter;
  private readonly circuitBreaker: CircuitBreaker;
  private readonly deduplicator: RequestDeduplicator;

  constructor() {
    // Per-user rate limit: 120 requests/minute (2 req/sec sustained)
    this.perUserLimiter = new RateLimiter({
      maxRequests: 120,
      windowMs: 60000, // 1 minute
    });

    // Global rate limit: 1000 requests/minute (entire application)
    this.globalLimiter = new RateLimiter({
      maxRequests: 1000,
      windowMs: 60000, // 1 minute
    });

    // Circuit breaker: Open after 5 failures, close after 3 successes
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      successThreshold: 3,
      timeout: 30000, // 30 seconds
    });

    // Request deduplicator: Cache results for 500ms
    this.deduplicator = new RequestDeduplicator(500);
  }

  /**
   * Check rate limits for a user
   */
  checkUserLimit(userId: string): RateLimitResult {
    return this.perUserLimiter.check(`user:${userId}`);
  }

  /**
   * Check global rate limit
   */
  checkGlobalLimit(): RateLimitResult {
    return this.globalLimiter.check("global");
  }

  /**
   * Execute function with all protections (rate limit + circuit breaker + deduplication)
   */
  async executeWithProtection<T>(
    userId: string,
    key: string,
    fn: () => Promise<T>
  ): Promise<{ success: boolean; data?: T; error?: string; rateLimit: RateLimitResult }> {
    // Check per-user rate limit
    const userLimit = this.checkUserLimit(userId);
    if (!userLimit.success) {
      return {
        success: false,
        error: "Rate limit exceeded",
        rateLimit: userLimit,
      };
    }

    // Check global rate limit
    const globalLimit = this.checkGlobalLimit();
    if (!globalLimit.success) {
      return {
        success: false,
        error: "Global rate limit exceeded",
        rateLimit: userLimit,
      };
    }

    // Execute with circuit breaker and deduplication
    try {
      const data = await this.circuitBreaker.execute(async () => {
        return await this.deduplicator.execute(key, fn);
      });

      return {
        success: true,
        data,
        rateLimit: userLimit,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        rateLimit: userLimit,
      };
    }
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker
   */
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      perUserLimiterSize: this.perUserLimiter.getSize(),
      globalLimiterSize: this.globalLimiter.getSize(),
      circuitState: this.circuitBreaker.getState(),
      inFlightRequests: this.deduplicator.getSize(),
    };
  }
}

/**
 * Singleton instance for application-wide use
 */
let singletonInstance: RateLimitService | null = null;

/**
 * Get or create the singleton RateLimitService instance
 */
export function getRateLimitService(): RateLimitService {
  if (!singletonInstance) {
    singletonInstance = new RateLimitService();
  }
  return singletonInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetRateLimitService(): void {
  singletonInstance = null;
}
