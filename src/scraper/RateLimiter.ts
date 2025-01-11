export class RateLimiter {
  private lastRequestTime: Map<string, number> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private intervalResets: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    // Clean up interval resets when the process exits
    process.on('exit', () => {
      this.intervalResets.forEach(interval => clearInterval(interval));
    });
  }

  async checkLimit(source: string, requestsPerMinute: number, pauseBetweenRequests: number): Promise<void> {
    // Initialize counters if they don't exist
    if (!this.requestCounts.has(source)) {
      this.requestCounts.set(source, 0);
      this.setupIntervalReset(source);
    }

    const currentCount = this.requestCounts.get(source) || 0;
    const lastRequest = this.lastRequestTime.get(source) || 0;
    const now = Date.now();

    // Check if we've exceeded the rate limit
    if (currentCount >= requestsPerMinute) {
      const waitTime = 60000 - (now - lastRequest);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      // Reset counter after waiting
      this.requestCounts.set(source, 0);
    }

    // Check if we need to pause between requests
    const timeSinceLastRequest = now - lastRequest;
    if (timeSinceLastRequest < pauseBetweenRequests) {
      await new Promise(resolve => 
        setTimeout(resolve, pauseBetweenRequests - timeSinceLastRequest)
      );
    }

    // Update tracking
    this.lastRequestTime.set(source, Date.now());
    this.requestCounts.set(source, (this.requestCounts.get(source) || 0) + 1);
  }

  private setupIntervalReset(source: string): void {
    // Reset the counter every minute
    const interval = setInterval(() => {
      this.requestCounts.set(source, 0);
    }, 60000);

    this.intervalResets.set(source, interval);
  }

  cleanup(): void {
    this.intervalResets.forEach(interval => clearInterval(interval));
    this.intervalResets.clear();
    this.requestCounts.clear();
    this.lastRequestTime.clear();
  }
}