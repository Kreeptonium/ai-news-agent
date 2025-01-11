import { MonitoringService } from '../../monitoring/MonitoringService';
import { LoggingService } from '../../monitoring/LoggingService';
import { HealthChecker } from '../health/HealthChecker';
import { TaskQueue } from '../queue/TaskQueue';
import { QueueStorage } from '../storage/QueueStorage';
import { TwitterService } from '../../twitter/TwitterService';

interface RecoveryAction {
  name: string;
  condition: () => Promise<boolean>;
  action: () => Promise<void>;
  cooldown: number; // milliseconds
  lastExecuted?: number;
}

export class RecoveryManager {
  private recoveryActions: RecoveryAction[] = [];
  private isRecovering: boolean = false;
  private readonly CHECK_INTERVAL = 30000; // 30 seconds

  constructor(
    private healthChecker: HealthChecker,
    private taskQueue: TaskQueue,
    private queueStorage: QueueStorage,
    private twitterService: TwitterService,
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {
    this.initializeRecoveryActions();
    this.startRecoveryMonitor();
  }

  private initializeRecoveryActions() {
    // Queue recovery
    this.addRecoveryAction({
      name: 'queue_recovery',
      condition: async () => {
        const health = this.healthChecker.getLastCheck();
        return health?.components.queue?.status === 'unhealthy';
      },
      action: async () => {
        await this.recoverQueue();
      },
      cooldown: 5 * 60 * 1000 // 5 minutes
    });

    // Storage recovery
    this.addRecoveryAction({
      name: 'storage_recovery',
      condition: async () => {
        const health = this.healthChecker.getLastCheck();
        return health?.components.storage?.status === 'unhealthy';
      },
      action: async () => {
        await this.recoverStorage();
      },
      cooldown: 10 * 60 * 1000 // 10 minutes
    });

    // Twitter service recovery
    this.addRecoveryAction({
      name: 'twitter_recovery',
      condition: async () => {
        const health = this.healthChecker.getLastCheck();
        return health?.components.twitter?.status === 'unhealthy';
      },
      action: async () => {
        await this.recoverTwitterService();
      },
      cooldown: 15 * 60 * 1000 // 15 minutes
    });

    // Memory management
    this.addRecoveryAction({
      name: 'memory_cleanup',
      condition: async () => {
        const health = this.healthChecker.getLastCheck();
        return health?.components.system?.status === 'degraded';
      },
      action: async () => {
        await this.performMemoryCleanup();
      },
      cooldown: 5 * 60 * 1000 // 5 minutes
    });
  }

  private addRecoveryAction(action: RecoveryAction) {
    this.recoveryActions.push(action);
  }

  private startRecoveryMonitor() {
    setInterval(async () => {
      if (!this.isRecovering) {
        await this.checkAndRecover();
      }
    }, this.CHECK_INTERVAL);
  }

  private async checkAndRecover() {
    try {
      this.isRecovering = true;
      const now = Date.now();

      for (const action of this.recoveryActions) {
        // Check cooldown
        if (action.lastExecuted && 
            now - action.lastExecuted < action.cooldown) {
          continue;
        }

        // Check if recovery is needed
        if (await action.condition()) {
          this.logger.info('RecoveryManager', `Starting recovery action: ${action.name}`);
          this.monitor.recordMetric('recovery_started', 1, { action: action.name });

          try {
            await action.action();
            action.lastExecuted = now;
            this.monitor.recordMetric('recovery_success', 1, { action: action.name });
          } catch (error) {
            this.logger.error('RecoveryManager', `Recovery action failed: ${action.name}`, error as Error);
            this.monitor.recordMetric('recovery_failed', 1, { action: action.name });
          }
        }
      }
    } finally {
      this.isRecovering = false;
    }
  }

  private async recoverQueue() {
    // Step 1: Save current state
    await this.queueStorage.createBackup();

    // Step 2: Load from storage
    const { queue, processing } = await this.queueStorage.loadQueue();

    // Step 3: Reset queue state
    await this.taskQueue.reset();

    // Step 4: Requeue tasks
    for (const task of [...queue, ...processing.values()]) {
      if (task.status !== 'completed' && task.status !== 'failed') {
        await this.taskQueue.addTask(task.type, task.data, {
          priority: task.priority,
          maxAttempts: task.maxAttempts
        });
      }
    }

    this.logger.info('RecoveryManager', 'Queue recovered', {
      tasksRequeued: queue.length + processing.size
    });
  }

  private async recoverStorage() {
    try {
      // Step 1: Try to recover from backup
      const recovery = await this.queueStorage.recoverFromBackup();
      
      // Step 2: Validate recovered data
      if (this.validateRecoveredData(recovery)) {
        await this.queueStorage.saveQueue(recovery.queue);
        this.logger.info('RecoveryManager', 'Storage recovered from backup');
      } else {
        // Step 3: If validation fails, initialize fresh storage
        await this.queueStorage.clean();
        this.logger.warn('RecoveryManager', 'Initialized fresh storage');
      }
    } catch (error) {
      this.logger.error('RecoveryManager', 'Storage recovery failed', error as Error);
      throw error;
    }
  }

  private async recoverTwitterService() {
    try {
      // Step 1: Reset Twitter service
      await this.twitterService.cleanup();
      
      // Step 2: Reinitialize
      await this.twitterService.initialize();
      
      // Step 3: Verify health
      const isHealthy = await this.twitterService.checkHealth();
      
      if (!isHealthy) {
        throw new Error('Twitter service still unhealthy after recovery');
      }

      this.logger.info('RecoveryManager', 'Twitter service recovered');
    } catch (error) {
      this.logger.error('RecoveryManager', 'Twitter service recovery failed', error as Error);
      throw error;
    }
  }

  private async performMemoryCleanup() {
    // Step 1: Clear any internal caches
    this.taskQueue.clearInternalCaches();
    
    // Step 2: Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Step 3: Clear old monitoring data
    this.monitor.clearOldData();

    this.logger.info('RecoveryManager', 'Memory cleanup performed');
  }

  private validateRecoveredData(recovery: any): boolean {
    // Implement validation logic
    return true; // Placeholder
  }

  getRecoveryStats(): Record<string, any> {
    return this.recoveryActions.reduce((stats, action) => ({
      ...stats,
      [action.name]: {
        lastExecuted: action.lastExecuted,
        cooldownRemaining: action.lastExecuted ?
          Math.max(0, action.cooldown - (Date.now() - action.lastExecuted)) : 0
      }
    }), {});
  }
}