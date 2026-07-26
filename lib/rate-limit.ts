type RateLimitOptions = {
  interval: number // Time window in milliseconds
  uniqueTokenPerInterval: number // Max unique keys tracked before memory cleanup
}

interface RateLimitStore {
  count: number
  resetTime: number
}

export class RateLimiter {
  private tokens: Map<string, RateLimitStore>
  private interval: number
  private maxTokens: number

  constructor(options: RateLimitOptions) {
    this.tokens = new Map()
    this.interval = options.interval
    this.maxTokens = options.uniqueTokenPerInterval
  }

  /**
   * Check rate limit for a key (e.g. IP address).
   * Returns status object with success flag, remaining quota, and reset duration in seconds.
   */
  public check(limit: number, key: string): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now()
    const token = this.tokens.get(key)

    // Periodic memory cleanup when token store reaches limit
    if (this.tokens.size > this.maxTokens) {
      for (const [k, v] of this.tokens.entries()) {
        if (now > v.resetTime) {
          this.tokens.delete(k)
        }
      }
    }

    if (!token || now > token.resetTime) {
      const resetTime = now + this.interval
      this.tokens.set(key, { count: 1, resetTime })
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: Math.ceil((resetTime - now) / 1000),
      }
    }

    if (token.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: Math.ceil((token.resetTime - now) / 1000),
      }
    }

    token.count += 1
    return {
      success: true,
      limit,
      remaining: limit - token.count,
      reset: Math.ceil((token.resetTime - now) / 1000),
    }
  }
}

// Pre-configured rate limiters
// 1. Login Brute-force Limiter: 5 attempts per 15 minutes per IP
export const loginRateLimiter = new RateLimiter({
  interval: 15 * 60 * 1000,
  uniqueTokenPerInterval: 5000,
})

// 2. General API Rate Limiter: 100 requests per 1 minute per IP
export const apiRateLimiter = new RateLimiter({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 10000,
})
