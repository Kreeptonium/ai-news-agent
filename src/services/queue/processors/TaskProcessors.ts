import { Task, TaskStatus } from '../TaskQueue';
import { NewsArticle } from '../../../scraper/NewsScraper';
import { ContentProcessor } from '../../../processor/ContentProcessor';
import { TwitterService } from '../../../twitter/TwitterService';
import { LoggingService } from '../../../monitoring/LoggingService';
import { MonitoringService } from '../../../monitoring/MonitoringService';
import { RateLimiter } from '../../rate-limiter/RateLimiter';

export class ArticleProcessor {
  constructor(
    private contentProcessor: ContentProcessor,
    private twitterService: TwitterService,
    private rateLimiter: RateLimiter,
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {}

  async processArticle(task: Task<NewsArticle>): Promise<void> {
    try {
      // Check rate limits
      if (!await this.rateLimiter.checkLimit('processing')) {
        throw new Error('Rate limit exceeded for processing');
      }

      // Process content
      const processedContent = await this.contentProcessor.processArticle(task.data);

      // Check if we should post now or schedule
      if (processedContent.scheduledTime) {
        return this.schedulePost(processedContent);
      }

      // Post to Twitter
      if (!await this.rateLimiter.checkLimit('twitter_post')) {
        throw new Error('Rate limit exceeded for Twitter');
      }

      await this.twitterService.post(processedContent);

      this.monitor.recordMetric('article_processed', 1, {
        source: task.data.source
      });

    } catch (error) {
      this.logger.error('ArticleProcessor', 'Failed to process article', error as Error);
      throw error;
    }
  }

  private async schedulePost(content: any): Promise<void> {
    // Implementation for scheduling posts
  }
}

export class PostProcessor {
  constructor(
    private twitterService: TwitterService,
    private rateLimiter: RateLimiter,
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {}

  async processPost(task: Task): Promise<void> {
    try {
      if (!await this.rateLimiter.checkLimit('twitter_post')) {
        throw new Error('Rate limit exceeded for Twitter');
      }

      if (Array.isArray(task.data)) {
        await this.twitterService.postThread(task.data);
      } else {
        await this.twitterService.post(task.data);
      }

      this.monitor.recordMetric('post_published', 1);

    } catch (error) {
      this.logger.error('PostProcessor', 'Failed to process post', error as Error);
      throw error;
    }
  }
}

export class RetryProcessor {
  constructor(
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {}

  async processRetry(task: Task): Promise<void> {
    try {
      const retryDelay = Math.pow(2, task.attempts) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, retryDelay));

      task.status = TaskStatus.PENDING;
      task.updatedAt = new Date();

      this.monitor.recordMetric('task_retry', 1, {
        type: task.type,
        attempt: task.attempts
      });

    } catch (error) {
      this.logger.error('RetryProcessor', 'Failed to process retry', error as Error);
      throw error;
    }
  }
}