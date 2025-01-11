import { Task, TaskStatus } from '../queue/TaskQueue';
import { LoggingService } from '../../monitoring/LoggingService';
import { MonitoringService } from '../../monitoring/MonitoringService';
import * as fs from 'fs/promises';
import * as path from 'path';

export class QueueStorage {
  private storageDir: string;
  private queueFile: string;
  private processingFile: string;
  private readonly BACKUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private logger: LoggingService,
    private monitor: MonitoringService,
    storageDir: string = 'storage/queue'
  ) {
    this.storageDir = storageDir;
    this.queueFile = path.join(storageDir, 'queue.json');
    this.processingFile = path.join(storageDir, 'processing.json');
    this.initializeStorage();
    this.startBackupInterval();
  }

  private async initializeStorage(): Promise<void> {
    try {
      await fs.mkdir(this.storageDir, { recursive: true });
      
      // Initialize files if they don't exist
      for (const file of [this.queueFile, this.processingFile]) {
        try {
          await fs.access(file);
        } catch {
          await fs.writeFile(file, JSON.stringify([]));
        }
      }
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to initialize storage', error as Error);
      throw error;
    }
  }

  async saveQueue(queue: Task[]): Promise<void> {
    try {
      const serializedQueue = JSON.stringify(queue, null, 2);
      await fs.writeFile(this.queueFile, serializedQueue);
      
      this.monitor.recordMetric('queue_saved', queue.length);
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to save queue', error as Error);
      throw error;
    }
  }

  async loadQueue(): Promise<Task[]> {
    try {
      const data = await fs.readFile(this.queueFile, 'utf-8');
      const queue = JSON.parse(data);
      
      // Restore dates
      queue.forEach(this.restoreDates);
      
      this.monitor.recordMetric('queue_loaded', queue.length);
      return queue;
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to load queue', error as Error);
      return [];
    }
  }

  async saveProcessing(processing: Map<string, Task>): Promise<void> {
    try {
      const processingArray = Array.from(processing.values());
      const serialized = JSON.stringify(processingArray, null, 2);
      await fs.writeFile(this.processingFile, serialized);
      
      this.monitor.recordMetric('processing_saved', processingArray.length);
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to save processing tasks', error as Error);
      throw error;
    }
  }

  async loadProcessing(): Promise<Map<string, Task>> {
    try {
      const data = await fs.readFile(this.processingFile, 'utf-8');
      const processingArray = JSON.parse(data);
      
      // Restore dates and create map
      const processingMap = new Map();
      processingArray.forEach((task: Task) => {
        this.restoreDates(task);
        processingMap.set(task.id, task);
      });
      
      this.monitor.recordMetric('processing_loaded', processingArray.length);
      return processingMap;
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to load processing tasks', error as Error);
      return new Map();
    }
  }

  private restoreDates(task: Task): void {
    task.createdAt = new Date(task.createdAt);
    task.updatedAt = new Date(task.updatedAt);
    if (task.scheduledFor) {
      task.scheduledFor = new Date(task.scheduledFor);
    }
  }

  async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(this.storageDir, 'backups');
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
      
      // Backup queue
      const queueBackup = path.join(backupDir, `queue_${timestamp}.json`);
      await fs.copyFile(this.queueFile, queueBackup);
      
      // Backup processing
      const processingBackup = path.join(backupDir, `processing_${timestamp}.json`);
      await fs.copyFile(this.processingFile, processingBackup);
      
      // Clean old backups
      await this.cleanOldBackups(backupDir);
      
      this.monitor.recordMetric('backup_created', 1);
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to create backup', error as Error);
    }
  }

  private async cleanOldBackups(backupDir: string): Promise<void> {
    try {
      const files = await fs.readdir(backupDir);
      const maxBackups = 10; // Keep last 10 backups
      
      if (files.length > maxBackups) {
        const sortedFiles = files.sort();
        const filesToDelete = sortedFiles.slice(0, files.length - maxBackups);
        
        for (const file of filesToDelete) {
          await fs.unlink(path.join(backupDir, file));
        }
      }
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to clean old backups', error as Error);
    }
  }

  private startBackupInterval(): void {
    setInterval(() => {
      this.createBackup().catch(error => {
        this.logger.error('QueueStorage', 'Backup interval failed', error as Error);
      });
    }, this.BACKUP_INTERVAL);
  }

  async recoverFromBackup(): Promise<{
    queue: Task[],
    processing: Map<string, Task>
  }> {
    const backupDir = path.join(this.storageDir, 'backups');
    try {
      const files = await fs.readdir(backupDir);
      if (files.length === 0) return { queue: [], processing: new Map() };

      // Get latest backups
      const latestQueue = files
        .filter(f => f.startsWith('queue_'))
        .sort()
        .pop();
      const latestProcessing = files
        .filter(f => f.startsWith('processing_'))
        .sort()
        .pop();

      // Restore from backups
      const queue = latestQueue ?
        JSON.parse(await fs.readFile(path.join(backupDir, latestQueue), 'utf-8')) :
        [];
      const processingArray = latestProcessing ?
        JSON.parse(await fs.readFile(path.join(backupDir, latestProcessing), 'utf-8')) :
        [];

      // Restore dates and create processing map
      queue.forEach(this.restoreDates);
      const processing = new Map();
      processingArray.forEach((task: Task) => {
        this.restoreDates(task);
        processing.set(task.id, task);
      });

      this.monitor.recordMetric('backup_recovered', 1);
      return { queue, processing };
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to recover from backup', error as Error);
      throw error;
    }
  }

  async clean(): Promise<void> {
    try {
      await fs.writeFile(this.queueFile, JSON.stringify([]));
      await fs.writeFile(this.processingFile, JSON.stringify([]));
      this.monitor.recordMetric('storage_cleaned', 1);
    } catch (error) {
      this.logger.error('QueueStorage', 'Failed to clean storage', error as Error);
      throw error;
    }
  }
}