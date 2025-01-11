import { MonitoringService } from '../../monitoring/MonitoringService';

interface RateLimitRule {
  interval: number;  // Time window in milliseconds
  maxRequests: number;
  smoothing?: boolean;  // Enable token bucket algorithm
}

interface RateLimit {
  remaining: number;
  resetTime: number;
  tokens?: number;  // For token bucket algorithm
  lastRefill?: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimit> = new Map();
  private rules: Map<string, RateLimitRule> = new Map();
  private monitor: MonitoringService;

  constructor(monitor: MonitoringService) {
    this.monitor = monitor;
    this.setupDefaultRules();
  }

  private setupDefaultRules() {
    // Twitter API limits
    this.addRule('twitter_post', {
      interval: 15 * 60 * 1000,  // 15 minutes
      maxRequests: 300,
      smoothing: true
    });

    // Scraping limits
    this.addRule('scraping', {
      interval: 60 * 1000,  // 1 minute
      maxRequests: 30,
      smoothing: true
    });

    // Content processing limits
    this.addRule('processing', {
      interval: 60 * 1000,  // 1 minute
      maxRequests: 50
    });
  }

  addRule(key: string, rule: RateLimitRule) {
    this.rules.set(key, rule);
    this.resetLimit(key);
  }

  async checkLimit(key: string): Promise<boolean> {
    const rule = this.rules.get(key);
    if (!rule) {
      throw new Error(`No rate limit rule found for key: ${key}`);
    }

    let limit = this.limits.get(key);
    if (!limit) {
      limit = this.resetLimit(key);
    }

    // Use token bucket if smoothing is enabled
    if (rule.smoothing) {
      return this.checkTokenBucket(key, rule, limit);
    }

    // Standard rate limiting
    const now = Date.now();
    if (now >= limit.resetTime) {
      limit = this.resetLimit(key);
    }

    if (limit.remaining <= 0) {
      this.monitor.recordMetric('rate_limit_hit', 1, { key });
      return false;
    }

    limit.remaining--;
    this.limits.set(key, limit);
    return true;
  }

  private checkTokenBucket(
    key: string,
    rule: RateLimitRule,
    limit: RateLimit
  ): boolean {
    const now = Date.now();
    
    // Calculate token refill
    const timePassed = now - (limit.lastRefill || now);
    const refillRate = rule.maxRequests / rule.interval;
    const tokensToAdd = timePassed * refillRate;
    
    limit.tokens = Math.min(
      rule.maxRequests,
      (limit.tokens || 0) + tokensToAdd
    );
    limit.lastRefill = now;

    if (limit.tokens < 1) {
      this.monitor.recordMetric('rate_limit_hit', 1, { key });
      return false;
    }

    limit.tokens--;
    this.limits.set(key, limit);
    return true;
  }

  private resetLimit(key: string): RateLimit {
    const rule = this.rules.get(key)!;
    const limit: RateLimit = {
      remaining: rule.maxRequests,
      resetTime: Date.now() + rule.interval,
      tokens: rule.smoothing ? rule.maxRequests : undefined,
      lastRefill: rule.smoothing ? Date.now() : undefined
    };
    this.limits.set(key, limit);
    return limit;
  }

  async waitForAvailability(key: string, timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await this.checkLimit(key)) {
        return true;
      }
      
      // Calculate wait time based on reset time
      const limit = this.limits.get(key);
      const waitTime = Math.min(
        1000,  // Max wait of 1 second
        limit ? limit.resetTime - Date.now() : 1000
      );
      
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    return false;
  }

  getRemainingRequests(key: string): number {
    const limit = this.limits.get(key);
    return limit ? limit.remaining : 0;
  }

  getResetTime(key: string): number {
    const limit = this.limits.get(key);
    return limit ? limit.resetTime : 0;
  }

  clearLimits() {
    this.limits.clear();
  }
}