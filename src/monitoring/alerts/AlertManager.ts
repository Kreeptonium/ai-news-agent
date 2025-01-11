import { LoggingService } from '../LoggingService';
import { MonitoringService } from '../MonitoringService';

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum AlertType {
  ERROR_RATE = 'error_rate',
  SCRAPING_FAILURE = 'scraping_failure',
  POST_FAILURE = 'post_failure',
  MEMORY_USAGE = 'memory_usage',
  API_HEALTH = 'api_health',
  RATE_LIMIT = 'rate_limit',
  SYSTEM_HEALTH = 'system_health'
}

interface AlertRule {
  type: AlertType;
  severity: AlertSeverity;
  threshold: number;
  timeWindow: number; // in milliseconds
  cooldown: number;   // in milliseconds
}

interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: Date;
  data?: any;
  resolved?: boolean;
  resolvedAt?: Date;
}

export class AlertManager {
  private rules: AlertRule[] = [];
  private activeAlerts: Map<string, Alert> = new Map();
  private lastAlertTime: Map<AlertType, number> = new Map();
  private logger: LoggingService;
  private monitor: MonitoringService;

  constructor(logger: LoggingService, monitor: MonitoringService) {
    this.logger = logger;
    this.monitor = monitor;
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    this.addRule({
      type: AlertType.ERROR_RATE,
      severity: AlertSeverity.ERROR,
      threshold: 5,         // 5 errors
      timeWindow: 300000,   // 5 minutes
      cooldown: 900000      // 15 minutes
    });

    this.addRule({
      type: AlertType.SCRAPING_FAILURE,
      severity: AlertSeverity.WARNING,
      threshold: 3,         // 3 failures
      timeWindow: 600000,   // 10 minutes
      cooldown: 1800000     // 30 minutes
    });

    this.addRule({
      type: AlertType.POST_FAILURE,
      severity: AlertSeverity.ERROR,
      threshold: 3,         // 3 failures
      timeWindow: 600000,   // 10 minutes
      cooldown: 1800000     // 30 minutes
    });

    this.addRule({
      type: AlertType.MEMORY_USAGE,
      severity: AlertSeverity.WARNING,
      threshold: 85,        // 85% usage
      timeWindow: 300000,   // 5 minutes
      cooldown: 3600000     // 1 hour
    });

    this.addRule({
      type: AlertType.RATE_LIMIT,
      severity: AlertSeverity.WARNING,
      threshold: 1,         // 1 occurrence
      timeWindow: 60000,    // 1 minute
      cooldown: 300000      // 5 minutes
    });
  }

  addRule(rule: AlertRule) {
    this.rules.push(rule);
  }

  async checkCondition(
    type: AlertType, 
    value: number, 
    metadata?: Record<string, any>
  ): Promise<void> {
    const rule = this.rules.find(r => r.type === type);
    if (!rule) return;

    const now = Date.now();
    const lastAlert = this.lastAlertTime.get(type) || 0;

    // Check cooldown period
    if (now - lastAlert < rule.cooldown) return;

    if (value >= rule.threshold) {
      await this.createAlert(rule, value, metadata);
    }
  }

  private async createAlert(
    rule: AlertRule, 
    value: number, 
    metadata?: Record<string, any>
  ): Promise<void> {
    const alertId = `${rule.type}_${Date.now()}`;
    const alert: Alert = {
      id: alertId,
      type: rule.type,
      severity: rule.severity,
      message: this.generateAlertMessage(rule, value),
      timestamp: new Date(),
      data: { value, ...metadata }
    };

    this.activeAlerts.set(alertId, alert);
    this.lastAlertTime.set(rule.type, Date.now());

    await this.notifyAlert(alert);
  }

  private generateAlertMessage(rule: AlertRule, value: number): string {
    switch (rule.type) {
      case AlertType.ERROR_RATE:
        return `High error rate detected: ${value} errors in ${rule.timeWindow / 60000} minutes`;
      case AlertType.SCRAPING_FAILURE:
        return `Multiple scraping failures: ${value} in ${rule.timeWindow / 60000} minutes`;
      case AlertType.POST_FAILURE:
        return `Multiple posting failures: ${value} in ${rule.timeWindow / 60000} minutes`;
      case AlertType.MEMORY_USAGE:
        return `High memory usage: ${value}%`;
      case AlertType.RATE_LIMIT:
        return `Rate limit reached for Twitter API`;
      default:
        return `Alert: ${rule.type} threshold (${rule.threshold}) exceeded with value ${value}`;
    }
  }

  private async notifyAlert(alert: Alert): Promise<void> {
    // Log the alert
    this.logger.info('AlertManager', 'Alert triggered', alert);

    // Record metric
    this.monitor.recordMetric('alert_triggered', 1, {
      type: alert.type,
      severity: alert.severity
    });

    // Handle based on severity
    switch (alert.severity) {
      case AlertSeverity.CRITICAL:
        await this.handleCriticalAlert(alert);
        break;
      case AlertSeverity.ERROR:
        await this.handleErrorAlert(alert);
        break;
      case AlertSeverity.WARNING:
        await this.handleWarningAlert(alert);
        break;
      default:
        this.handleInfoAlert(alert);
    }
  }

  private async handleCriticalAlert(alert: Alert): Promise<void> {
    // Implement critical alert handling
    // Could include: SMS, phone calls, etc.
    console.error('CRITICAL ALERT:', alert);
  }

  private async handleErrorAlert(alert: Alert): Promise<void> {
    // Implement error alert handling
    // Could include: Email notifications
    console.error('ERROR ALERT:', alert);
  }

  private async handleWarningAlert(alert: Alert): Promise<void> {
    // Implement warning alert handling
    // Could include: Dashboard notifications
    console.warn('WARNING ALERT:', alert);
  }

  private handleInfoAlert(alert: Alert): void {
    // Implement info alert handling
    console.info('INFO ALERT:', alert);
  }

  async resolveAlert(alertId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = new Date();
      this.logger.info('AlertManager', 'Alert resolved', alert);
    }
  }

  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.resolved);
  }

  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.timestamp > cutoff);
  }
}