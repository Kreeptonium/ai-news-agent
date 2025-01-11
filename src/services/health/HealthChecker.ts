import { MonitoringService } from '../../monitoring/MonitoringService';
import { LoggingService } from '../../monitoring/LoggingService';
import { TaskQueue } from '../queue/TaskQueue';
import { TwitterService } from '../../twitter/TwitterService';
import { RateLimiter } from '../rate-limiter/RateLimiter';
import { QueueStorage } from '../storage/QueueStorage';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  components: Record<string, ComponentHealth>;
  timestamp: Date;
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  lastCheck: Date;
  details?: Record<string, any>;
}

interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  uptime: number;
}

export class HealthChecker {
  private lastCheck: HealthStatus | null = null;
  private readonly CHECK_INTERVAL = 60000; // 1 minute
  private isChecking: boolean = false;

  constructor(
    private taskQueue: TaskQueue,
    private twitterService: TwitterService,
    private rateLimiter: RateLimiter,
    private queueStorage: QueueStorage,
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {
    this.startHealthChecks();
  }

  private startHealthChecks(): void {
    setInterval(async () => {
      if (!this.isChecking) {
        this.isChecking = true;
        try {
          await this.checkHealth();
        } finally {
          this.isChecking = false;
        }
      }
    }, this.CHECK_INTERVAL);
  }

  async checkHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    const status: HealthStatus = {
      status: 'healthy',
      components: {},
      timestamp: new Date()
    };

    try {
      // Check Queue Health
      status.components.queue = await this.checkQueueHealth();

      // Check Twitter Service
      status.components.twitter = await this.checkTwitterHealth();

      // Check Storage
      status.components.storage = await this.checkStorageHealth();

      // Check System Resources
      status.components.system = await this.checkSystemHealth();

      // Check Rate Limiter
      status.components.rateLimiter = this.checkRateLimiterHealth();

      // Determine overall status
      status.status = this.determineOverallStatus(status.components);

      // Record metrics
      this.monitor.recordMetric('health_check_duration', Date.now() - startTime);
      this.monitor.recordMetric('health_status', 
        status.status === 'healthy' ? 1 : status.status === 'degraded' ? 0.5 : 0
      );

      this.lastCheck = status;
      return status;

    } catch (error) {
      this.logger.error('HealthChecker', 'Health check failed', error as Error);
      status.status = 'unhealthy';
      status.components.system = {
        status: 'unhealthy',
        message: 'Health check failed',
        lastCheck: new Date(),
        details: { error: error.message }
      };
      return status;
    }
  }

  private async checkQueueHealth(): Promise<ComponentHealth> {
    const queueStats = this.taskQueue.getQueueStats();
    const health: ComponentHealth = {
      status: 'healthy',
      lastCheck: new Date(),
      details: queueStats
    };

    // Check queue size
    if (queueStats.queueSize > 1000) {
      health.status = 'degraded';
      health.message = 'Queue size is large';
    }

    // Check failed tasks
    if (queueStats.statusCounts?.failed > 50) {
      health.status = 'unhealthy';
      health.message = 'High number of failed tasks';
    }

    return health;
  }

  private async checkTwitterHealth(): Promise<ComponentHealth> {
    try {
      const isReady = await this.twitterService.checkHealth();
      return {
        status: isReady ? 'healthy' : 'unhealthy',
        message: isReady ? undefined : 'Twitter service not ready',
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Twitter health check failed',
        lastCheck: new Date(),
        details: { error: error.message }
      };
    }
  }

  private async checkStorageHealth(): Promise<ComponentHealth> {
    try {
      // Try to write and read a test value
      await this.queueStorage.saveQueue([]);
      await this.queueStorage.loadQueue();

      return {
        status: 'healthy',
        lastCheck: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Storage health check failed',
        lastCheck: new Date(),
        details: { error: error.message }
      };
    }
  }

  private async checkSystemHealth(): Promise<ComponentHealth> {
    const metrics = await this.getSystemMetrics();
    const health: ComponentHealth = {
      status: 'healthy',
      lastCheck: new Date(),
      details: metrics
    };

    if (metrics.memory.percentage > 90) {
      health.status = 'degraded';
      health.message = 'High memory usage';
    }

    if (metrics.cpu.usage > 80) {
      health.status = 'degraded';
      health.message = 'High CPU usage';
    }

    return health;
  }

  private checkRateLimiterHealth(): ComponentHealth {
    const health: ComponentHealth = {
      status: 'healthy',
      lastCheck: new Date(),
      details: {}
    };

    // Check Twitter rate limits
    const twitterRemaining = this.rateLimiter.getRemainingRequests('twitter_post');
    if (twitterRemaining < 10) {
      health.status = 'degraded';
      health.message = 'Low Twitter rate limit remaining';
      health.details = { twitterRemaining };
    }

    return health;
  }

  private determineOverallStatus(
    components: Record<string, ComponentHealth>
  ): 'healthy' | 'degraded' | 'unhealthy' {
    let hasUnhealthy = false;
    let hasDegraded = false;

    for (const component of Object.values(components)) {
      if (component.status === 'unhealthy') hasUnhealthy = true;
      if (component.status === 'degraded') hasDegraded = true;
    }

    if (hasUnhealthy) return 'unhealthy';
    if (hasDegraded) return 'degraded';
    return 'healthy';
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();

    return {
      memory: {
        used: memory.heapUsed,
        total: memory.heapTotal,
        percentage: (memory.heapUsed / memory.heapTotal) * 100
      },
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000
      },
      uptime: process.uptime()
    };
  }

  getLastCheck(): HealthStatus | null {
    return this.lastCheck;
  }

  getHealthSummary(): Record<string, any> {
    if (!this.lastCheck) return { status: 'unknown' };

    return {
      status: this.lastCheck.status,
      lastCheck: this.lastCheck.timestamp,
      components: Object.entries(this.lastCheck.components).reduce(
        (acc, [name, health]) => ({
          ...acc,
          [name]: {
            status: health.status,
            message: health.message
          }
        }), {}
      )
    };
  }
}