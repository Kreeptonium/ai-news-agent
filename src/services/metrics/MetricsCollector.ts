import { LoggingService } from '../../monitoring/LoggingService';
import { MonitoringService } from '../../monitoring/MonitoringService';

interface MetricValue {
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

interface MetricDefinition {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  labels?: string[];
}

export class MetricsCollector {
  private metrics: Map<string, MetricValue[]> = new Map();
  private definitions: Map<string, MetricDefinition> = new Map();
  private readonly MAX_HISTORY = 1000;

  constructor(
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {
    this.initializeDefaultMetrics();
  }

  private initializeDefaultMetrics() {
    // System metrics
    this.registerMetric({
      name: 'system_memory_usage',
      help: 'Current memory usage in bytes',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'system_cpu_usage',
      help: 'Current CPU usage percentage',
      type: 'gauge'
    });

    // Article metrics
    this.registerMetric({
      name: 'articles_processed_total',
      help: 'Total number of articles processed',
      type: 'counter',
      labels: ['source', 'status']
    });

    this.registerMetric({
      name: 'article_processing_duration_seconds',
      help: 'Time taken to process articles',
      type: 'histogram'
    });

    // Twitter metrics
    this.registerMetric({
      name: 'tweets_posted_total',
      help: 'Total number of tweets posted',
      type: 'counter',
      labels: ['type', 'status']
    });

    this.registerMetric({
      name: 'tweet_posting_duration_seconds',
      help: 'Time taken to post tweets',
      type: 'histogram'
    });

    // Error metrics
    this.registerMetric({
      name: 'errors_total',
      help: 'Total number of errors',
      type: 'counter',
      labels: ['type', 'severity']
    });

    // Queue metrics
    this.registerMetric({
      name: 'queue_size',
      help: 'Current size of the task queue',
      type: 'gauge'
    });

    this.registerMetric({
      name: 'queue_processing_time',
      help: 'Time taken to process queue items',
      type: 'histogram'
    });

    // API metrics
    this.registerMetric({
      name: 'api_requests_total',
      help: 'Total API requests',
      type: 'counter',
      labels: ['endpoint', 'method', 'status']
    });

    this.registerMetric({
      name: 'api_response_time_seconds',
      help: 'API response time in seconds',
      type: 'histogram',
      labels: ['endpoint']
    });
  }

  registerMetric(definition: MetricDefinition): void {
    this.definitions.set(definition.name, definition);
    this.metrics.set(definition.name, []);
  }

  record(name: string, value: number, labels: Record<string, string> = {}): void {
    const definition = this.definitions.get(name);
    if (!definition) {
      this.logger.error('MetricsCollector', `Unknown metric: ${name}`);
      return;
    }

    // Validate labels
    if (definition.labels) {
      const missingLabels = definition.labels.filter(label => !(label in labels));
      if (missingLabels.length > 0) {
        this.logger.error('MetricsCollector', `Missing labels for ${name}: ${missingLabels.join(', ')}`);
        return;
      }
    }

    const metricValues = this.metrics.get(name) || [];
    metricValues.push({
      value,
      timestamp: new Date(),
      labels
    });

    // Maintain history limit
    if (metricValues.length > this.MAX_HISTORY) {
      metricValues.shift();
    }

    this.metrics.set(name, metricValues);
  }

  getMetric(name: string, timeRange?: { start: Date; end: Date }): MetricValue[] {
    const values = this.metrics.get(name) || [];
    if (!timeRange) return values;

    return values.filter(v => 
      v.timestamp >= timeRange.start && v.timestamp <= timeRange.end
    );
  }

  getSummary(name: string, timeRange?: { start: Date; end: Date }): {
    count: number;
    sum: number;
    avg: number;
    min: number;
    max: number;
  } {
    const values = this.getMetric(name, timeRange);
    if (values.length === 0) {
      return { count: 0, sum: 0, avg: 0, min: 0, max: 0 };
    }

    const numbers = values.map(v => v.value);
    return {
      count: values.length,
      sum: numbers.reduce((a, b) => a + b, 0),
      avg: numbers.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...numbers),
      max: Math.max(...numbers)
    };
  }

  getPrometheusMetrics(): string {
    let output = '';

    for (const [name, definition] of this.definitions.entries()) {
      // Add metric help
      output += `# HELP ${name} ${definition.help}\n`;
      // Add metric type
      output += `# TYPE ${name} ${definition.type}\n`;

      const values = this.metrics.get(name) || [];
      for (const value of values) {
        const labels = Object.entries(value.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');

        output += `${name}${labels ? `{${labels}}` : ''} ${value.value} ${value.timestamp.getTime()}\n`;
      }

      output += '\n';
    }

    return output;
  }

  cleanup(retentionPeriod: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - retentionPeriod);
    
    for (const [name, values] of this.metrics.entries()) {
      this.metrics.set(
        name,
        values.filter(v => v.timestamp > cutoff)
      );
    }
  }

  getMetricNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  getDefinition(name: string): MetricDefinition | undefined {
    return this.definitions.get(name);
  }
}