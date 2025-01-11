import { MonitoringService } from '../../monitoring/MonitoringService';
import { LoggingService } from '../../monitoring/LoggingService';

export enum TaskPriority {
  LOW = 0,
  MEDIUM = 1,
  HIGH = 2,
  CRITICAL = 3
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

export interface Task<T = any> {
  id: string;
  type: string;
  data: T;
  priority: TaskPriority;
  status: TaskStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  scheduledFor?: Date;
  error?: Error;
  retryDelay?: number;
}

interface QueueOptions {
  maxSize?: number;
  maxRetries?: number;
  defaultPriority?: TaskPriority;
  retryDelay?: number;
}

export class TaskQueue {
  private queue: Task[] = [];
  private processing: Map<string, Task> = new Map();
  private monitor: MonitoringService;
  private logger: LoggingService;
  private options: Required<QueueOptions>;

  constructor(
    monitor: MonitoringService,
    logger: LoggingService,
    options: QueueOptions = {}
  ) {
    this.monitor = monitor;
    this.logger = logger;
    this.options = {
      maxSize: 1000,
      maxRetries: 3,
      defaultPriority: TaskPriority.MEDIUM,
      retryDelay: 5000,
      ...options
    };
  }

  async addTask<T>(
    type: string,
    data: T,
    options: Partial<Pick<Task, 'priority' | 'maxAttempts' | 'scheduledFor'>> = {}
  ): Promise<string> {
    // Check queue size
    if (this.queue.length >= this.options.maxSize) {
      throw new Error('Queue is full');
    }

    const task: Task<T> = {
      id: this.generateTaskId(),
      type,
      data,
      priority: options.priority ?? this.options.defaultPriority,
      status: TaskStatus.PENDING,
      attempts: 0,
      maxAttempts: options.maxAttempts ?? this.options.maxRetries,
      createdAt: new Date(),
      updatedAt: new Date(),
      scheduledFor: options.scheduledFor
    };

    this.queue.push(task);
    this.sortQueue();

    this.monitor.recordMetric('queue_task_added', 1, { type });
    this.logger.info('TaskQueue', 'Task added to queue', { taskId: task.id, type });

    return task.id;
  }

  async getNextTask(): Promise<Task | null> {
    const now = new Date();
    const nextTask = this.queue.find(task => 
      task.status === TaskStatus.PENDING &&
      (!task.scheduledFor || task.scheduledFor <= now)
    );

    if (!nextTask) return null;

    nextTask.status = TaskStatus.PROCESSING;
    nextTask.updatedAt = new Date();
    this.processing.set(nextTask.id, nextTask);
    this.queue = this.queue.filter(task => task.id !== nextTask.id);

    this.monitor.recordMetric('queue_task_processing', 1, { type: nextTask.type });
    return nextTask;
  }

  async completeTask(taskId: string): Promise<void> {
    const task = this.processing.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in processing`);
    }

    task.status = TaskStatus.COMPLETED;
    task.updatedAt = new Date();
    this.processing.delete(taskId);

    this.monitor.recordMetric('queue_task_completed', 1, { type: task.type });
    this.logger.info('TaskQueue', 'Task completed', { taskId });
  }

  async failTask(taskId: string, error: Error): Promise<void> {
    const task = this.processing.get(taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in processing`);
    }

    task.attempts++;
    task.error = error;

    if (task.attempts >= task.maxAttempts) {
      task.status = TaskStatus.FAILED;
      this.processing.delete(taskId);
      this.monitor.recordMetric('queue_task_failed', 1, { type: task.type });
      this.logger.error('TaskQueue', 'Task failed permanently', error, { taskId });
    } else {
      task.status = TaskStatus.RETRYING;
      task.scheduledFor = new Date(Date.now() + (task.retryDelay ?? this.options.retryDelay));
      this.queue.push(task);
      this.processing.delete(taskId);
      this.sortQueue();
      this.monitor.recordMetric('queue_task_retry', 1, { type: task.type });
      this.logger.warn('TaskQueue', 'Task scheduled for retry', { taskId, attempt: task.attempts });
    }
  }

  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // Sort by priority first
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      // Then by scheduled time
      if (a.scheduledFor && b.scheduledFor) {
        return a.scheduledFor.getTime() - b.scheduledFor.getTime();
      }
      // Then by creation time
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  }

  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getQueueStats(): Record<string, any> {
    const statusCounts = this.queue.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      queueSize: this.queue.length,
      processingSize: this.processing.size,
      statusCounts,
      oldestTask: this.queue[0]?.createdAt,
      highPriorityTasks: this.queue.filter(t => t.priority >= TaskPriority.HIGH).length
    };
  }

  clearQueue(): void {
    this.queue = [];
    this.processing.clear();
  }
}