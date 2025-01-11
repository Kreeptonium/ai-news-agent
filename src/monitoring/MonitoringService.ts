interface MetricData {
  value: number;
  timestamp: number;
  tags: Record<string, string>;
}

interface ErrorData {
  message: string;
  stack?: string;
  module: string;
  timestamp: number;
  context?: Record<string, any>;
}

export class MonitoringService {
  private metrics: Map<string, MetricData[]> = new Map();
  private errors: ErrorData[] = [];
  private readonly maxMetricHistory = 1000;
  private readonly maxErrorHistory = 100;

  // Record a metric with its value and optional tags
  recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metricData: MetricData = {
      value,
      timestamp: Date.now(),
      tags
    };

    const metrics = this.metrics.get(name)!;
    metrics.push(metricData);

    // Maintain history limit
    if (metrics.length > this.maxMetricHistory) {
      metrics.splice(0, metrics.length - this.maxMetricHistory);
    }
  }

  // Record an error with context
  recordError(error: Error, module: string, context: Record<string, any> = {}) {
    const errorData: ErrorData = {
      message: error.message,
      stack: error.stack,
      module,
      timestamp: Date.now(),
      context
    };

    this.errors.push(errorData);

    // Maintain history limit
    if (this.errors.length > this.maxErrorHistory) {
      this.errors.splice(0, this.errors.length - this.maxErrorHistory);
    }

    // Log error for immediate visibility
    console.error(`[${module}] Error:`, error.message, context);
  }

  // Get metrics for a specific time range
  getMetrics(name: string, timeRange: { start: number; end: number }) {
    const metrics = this.metrics.get(name) || [];
    return metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  // Get recent errors
  getRecentErrors(count: number = 10) {
    return this.errors.slice(-count);
  }

  // Calculate statistics for a metric
  getMetricStats(name: string, timeRange: { start: number; end: number }) {
    const metrics = this.getMetrics(name, timeRange);
    
    if (metrics.length === 0) {
      return null;
    }

    const values = metrics.map(m => m.value);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      count: metrics.length
    };
  }

  // Get health status
  getHealthStatus(): Record<string, any> {
    const now = Date.now();
    const lastHour = now - 3600000;

    return {
      errorCount: this.errors.filter(e => e.timestamp > lastHour).length,
      metrics: Object.fromEntries(
        Array.from(this.metrics.entries()).map(([name, data]) => [
          name,
          this.getMetricStats(name, { start: lastHour, end: now })
        ])
      ),
      lastError: this.errors[this.errors.length - 1]
    };
  }

  // Clear old data
  cleanup() {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    this.metrics.forEach((data, name) => {
      this.metrics.set(
        name,
        data.filter(m => m.timestamp > cutoff)
      );
    });

    this.errors = this.errors.filter(e => e.timestamp > cutoff);
  }
}