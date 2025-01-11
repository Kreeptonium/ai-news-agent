import { NewsArticle } from '../../src/scraper/NewsScraper';
import { BasePost, ThreadPost } from '../../src/twitter/types/PostTypes';
import { LoggingService } from '../../src/monitoring/LoggingService';
import { MonitoringService } from '../../src/monitoring/MonitoringService';

export const createMockArticle = (overrides?: Partial<NewsArticle>): NewsArticle => ({
  title: 'Test Article',
  content: 'Test content for the article',
  url: 'https://test.com/article',
  source: 'Test Source',
  publishDate: new Date(),
  ...overrides
});

export const createMockPost = (overrides?: Partial<BasePost>): BasePost => ({
  content: 'Test post content',
  media: [],
  scheduledTime: new Date(),
  ...overrides
});

export const createMockThreadPost = (overrides?: Partial<ThreadPost>): ThreadPost[] => ([
  {
    index: 1,
    content: 'First post in thread',
    delay: 1000
  },
  {
    index: 2,
    content: 'Second post in thread',
    delay: 1000
  }
].map((post, index) => ({
  ...post,
  ...(overrides || {}),
  index: index + 1
})));

export class MockLogger implements LoggingService {
  public logs: any[] = [];

  debug(module: string, message: string, data?: any) {
    this.logs.push({ level: 'debug', module, message, data });
  }

  info(module: string, message: string, data?: any) {
    this.logs.push({ level: 'info', module, message, data });
  }

  warn(module: string, message: string, data?: any) {
    this.logs.push({ level: 'warn', module, message, data });
  }

  error(module: string, message: string, error?: Error, data?: any) {
    this.logs.push({ level: 'error', module, message, error, data });
  }

  getLogsByLevel(level: string) {
    return this.logs.filter(log => log.level === level);
  }

  clearLogs() {
    this.logs = [];
  }
}

export class MockMonitor implements MonitoringService {
  public metrics: any[] = [];
  public errors: any[] = [];

  recordMetric(name: string, value: number, tags: Record<string, string> = {}) {
    this.metrics.push({ name, value, tags, timestamp: new Date() });
  }

  recordError(error: Error, module: string, context: Record<string, any> = {}) {
    this.errors.push({ error, module, context, timestamp: new Date() });
  }

  getMetrics(name: string, timeRange: { start: number; end: number }) {
    return this.metrics.filter(m => 
      m.name === name && 
      m.timestamp.getTime() >= timeRange.start &&
      m.timestamp.getTime() <= timeRange.end
    );
  }

  clearMetrics() {
    this.metrics = [];
    this.errors = [];
  }
}

export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      await waitFor(delay * Math.pow(2, i)); // Exponential backoff
    }
  }
  
  throw lastError!;
};