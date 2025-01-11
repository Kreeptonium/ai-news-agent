import { LoggingService } from '../../monitoring/LoggingService';
import { MonitoringService } from '../../monitoring/MonitoringService';

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  SCRAPING = 'scraping',
  PROCESSING = 'processing',
  TWITTER = 'twitter',
  MEMORY = 'memory',
  SYSTEM = 'system'
}

export interface ErrorContext {
  module: string;
  operation: string;
  data?: Record<string, any>;
  retry?: {
    count: number;
    maxRetries: number;
    lastAttempt: Date;
  };
}

export class ErrorHandler {
  private logger: LoggingService;
  private monitor: MonitoringService;
  private errorCounts: Map<string, number> = new Map();
  private readonly ERROR_THRESHOLD = 5; // Errors per hour
  private readonly ERROR_WINDOW = 60 * 60 * 1000; // 1 hour in ms

  constructor(logger: LoggingService, monitor: MonitoringService) {
    this.logger = logger;
    this.monitor = monitor;
  }

  async handleError(
    error: Error,
    severity: ErrorSeverity,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<boolean> {
    try {
      // Log the error
      this.logger.error(context.module, error.message, error, context);

      // Record metrics
      this.monitor.recordMetric(`error_${category.toLowerCase()}`, 1, {
        severity,
        module: context.module
      });

      // Update error counts
      this.updateErrorCount(category);

      // Check if we need to trigger alerts
      if (this.shouldTriggerAlert(category)) {
        await this.triggerAlert(severity, category, context);
      }

      // Handle based on severity
      switch (severity) {
        case ErrorSeverity.CRITICAL:
          return await this.handleCriticalError(error, category, context);
        case ErrorSeverity.HIGH:
          return await this.handleHighSeverityError(error, category, context);
        case ErrorSeverity.MEDIUM:
          return await this.handleMediumSeverityError(error, category, context);
        case ErrorSeverity.LOW:
          return await this.handleLowSeverityError(error, category, context);
        default:
          return false;
      }
    } catch (handlingError) {
      // If error handling fails, log it but don't throw
      this.logger.error(
        'ErrorHandler',
        'Failed to handle error',
        handlingError as Error,
        { originalError: error, context }
      );
      return false;
    }
  }

  private async handleCriticalError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<boolean> {
    // For critical errors, we might want to:
    // 1. Stop the affected process
    // 2. Alert immediately
    // 3. Attempt recovery if possible

    await this.triggerAlert(ErrorSeverity.CRITICAL, category, context);

    if (category === ErrorCategory.TWITTER) {
      // Special handling for Twitter errors
      return await this.handleTwitterError(error, context);
    }

    if (category === ErrorCategory.SYSTEM) {
      // System-level errors might require restart
      return await this.handleSystemError(error, context);
    }

    return false;
  }

  private async handleHighSeverityError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<boolean> {
    // For high severity errors:
    // 1. Check if retry is possible
    // 2. Alert if retry count exceeded
    if (context.retry && context.retry.count < context.retry.maxRetries) {
      const backoffTime = Math.pow(2, context.retry.count) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, backoffTime));
      return true; // Indicate retry is possible
    }

    await this.triggerAlert(ErrorSeverity.HIGH, category, context);
    return false;
  }

  private async handleMediumSeverityError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<boolean> {
    // For medium severity:
    // 1. Log and monitor
    // 2. Retry with simple backoff
    if (context.retry && context.retry.count < 3) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 second delay
      return true;
    }
    return false;
  }

  private async handleLowSeverityError(
    error: Error,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<boolean> {
    // For low severity:
    // 1. Log only
    // 2. Continue operation
    return false; // Don't retry, just continue
  }

  private async handleTwitterError(error: Error, context: ErrorContext): Promise<boolean> {
    // Special handling for Twitter errors
    // Like rate limits, auth issues, etc.
    if (error.message.includes('rate limit')) {
      await new Promise(resolve => setTimeout(resolve, 15 * 60 * 1000)); // 15 min wait
      return true;
    }
    
    if (error.message.includes('authentication')) {
      // Trigger immediate auth refresh
      return true;
    }

    return false;
  }

  private async handleSystemError(error: Error, context: ErrorContext): Promise<boolean> {
    // Handle system-level errors
    // Might need to restart services
    return false;
  }

  private updateErrorCount(category: ErrorCategory): void {
    const key = `${category}_${this.getCurrentHour()}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);
  }

  private shouldTriggerAlert(category: ErrorCategory): boolean {
    const key = `${category}_${this.getCurrentHour()}`;
    return (this.errorCounts.get(key) || 0) >= this.ERROR_THRESHOLD;
  }

  private async triggerAlert(
    severity: ErrorSeverity,
    category: ErrorCategory,
    context: ErrorContext
  ): Promise<void> {
    // Log alert
    this.logger.error('ErrorHandler', 'Alert triggered', null, {
      severity,
      category,
      context
    });

    // Record metric
    this.monitor.recordMetric('alert_triggered', 1, {
      severity,
      category
    });

    // Additional alert mechanisms could be added here
  }

  private getCurrentHour(): string {
    return new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH format
  }

  getErrorStats(): Record<string, any> {
    const stats: Record<string, number> = {};
    for (const [key, count] of this.errorCounts.entries()) {
      stats[key] = count;
    }
    return stats;
  }

  clearOldErrors(): void {
    const currentHour = this.getCurrentHour();
    for (const [key] of this.errorCounts.entries()) {
      if (!key.includes(currentHour)) {
        this.errorCounts.delete(key);
      }
    }
  }
}