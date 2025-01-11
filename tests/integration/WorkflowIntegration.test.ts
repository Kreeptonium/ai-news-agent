import { WorkflowManager } from '../../src/workflow/WorkflowManager';
import { MockLogger, MockMonitor, createMockArticle, retryOperation } from '../utils/TestHelpers';
import { NewsArticle } from '../../src/scraper/NewsScraper';
import { ErrorHandler } from '../../src/core/errors/ErrorHandler';
import { AlertManager } from '../../src/monitoring/alerts/AlertManager';

// Mock dependencies
const mockScraper = {
  scrapeAll: jest.fn(),
  cleanup: jest.fn()
};

const mockProcessor = {
  processArticle: jest.fn(),
  cleanup: jest.fn()
};

const mockTwitter = {
  initialize: jest.fn(),
  post: jest.fn(),
  postThread: jest.fn(),
  cleanup: jest.fn(),
  isReady: true
};

describe('Workflow Integration Tests', () => {
  let workflow: WorkflowManager;
  let logger: MockLogger;
  let monitor: MockMonitor;
  let errorHandler: ErrorHandler;
  let alertManager: AlertManager;

  beforeEach(() => {
    logger = new MockLogger();
    monitor = new MockMonitor();
    errorHandler = new ErrorHandler(logger, monitor);
    alertManager = new AlertManager(logger, monitor);

    workflow = new WorkflowManager(
      mockScraper as any,
      mockProcessor as any,
      mockTwitter as any,
      logger,
      monitor,
      errorHandler,
      alertManager
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    logger.clearLogs();
    monitor.clearMetrics();
  });

  describe('Article Processing Flow', () => {
    it('should process and post a single article successfully', async () => {
      const article = createMockArticle();
      const processedContent = {
        title: article.title,
        summary: 'Processed content',
        hashtags: ['#AI', '#Tech']
      };

      mockProcessor.processArticle.mockResolvedValueOnce(processedContent);
      mockTwitter.post.mockResolvedValueOnce('tweet-id-123');

      await workflow.processNewsArticle(article);

      expect(mockProcessor.processArticle).toHaveBeenCalledWith(article);
      expect(mockTwitter.post).toHaveBeenCalled();
      expect(logger.getLogsByLevel('info')).toHaveLength(2);
      expect(monitor.metrics).toHaveLength(2);
    });

    it('should handle article processing failure and retry', async () => {
      const article = createMockArticle();
      mockProcessor.processArticle
        .mockRejectedValueOnce(new Error('Processing failed'))
        .mockResolvedValueOnce({
          title: article.title,
          summary: 'Processed content',
          hashtags: ['#AI']
        });

      await workflow.processNewsArticle(article);

      expect(mockProcessor.processArticle).toHaveBeenCalledTimes(2);
      expect(logger.getLogsByLevel('error')).toHaveLength(1);
      expect(monitor.metrics.find(m => m.name === 'processing_retry')).toBeTruthy();
    });
  });

  describe('Scraping Integration', () => {
    it('should handle multiple articles from scraper', async () => {
      const articles: NewsArticle[] = [
        createMockArticle({ url: 'test1.com' }),
        createMockArticle({ url: 'test2.com' })
      ];

      mockScraper.scrapeAll.mockResolvedValueOnce(articles);
      mockProcessor.processArticle.mockImplementation(article => ({
        title: article.title,
        summary: 'Processed content',
        hashtags: ['#AI']
      }));

      await workflow.runMainLoop(1); // Run one iteration

      expect(mockProcessor.processArticle).toHaveBeenCalledTimes(2);
      expect(mockTwitter.post).toHaveBeenCalledTimes(2);
    });

    it('should continue processing if one article fails', async () => {
      const articles = [
        createMockArticle({ url: 'test1.com' }),
        createMockArticle({ url: 'test2.com' })
      ];

      mockScraper.scrapeAll.mockResolvedValueOnce(articles);
      mockProcessor.processArticle
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          title: articles[1].title,
          summary: 'Processed content',
          hashtags: ['#AI']
        });

      await workflow.runMainLoop(1);

      expect(mockTwitter.post).toHaveBeenCalledTimes(1);
      expect(logger.getLogsByLevel('error')).toHaveLength(1);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from Twitter API failures', async () => {
      const article = createMockArticle();
      mockProcessor.processArticle.mockResolvedValue({
        title: article.title,
        summary: 'Content',
        hashtags: ['#AI']
      });

      mockTwitter.post
        .mockRejectedValueOnce(new Error('Twitter API error'))
        .mockResolvedValueOnce('tweet-id-123');

      await workflow.processNewsArticle(article);

      expect(mockTwitter.post).toHaveBeenCalledTimes(2);
      expect(monitor.metrics.find(m => m.name === 'twitter_retry')).toBeTruthy();
    });

    it('should handle rate limits appropriately', async () => {
      const article = createMockArticle();
      mockTwitter.post.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(workflow.processNewsArticle(article)).rejects.toThrow();
      
      expect(monitor.metrics.find(m => m.name === 'rate_limit_hit')).toBeTruthy();
      expect(alertManager.getActiveAlerts()).toHaveLength(1);
    });
  });

  describe('System Health Monitoring', () => {
    it('should track system health metrics', async () => {
      await workflow.checkSystemHealth();

      const healthMetrics = monitor.metrics.filter(m => 
        m.name.startsWith('health_')
      );
      
      expect(healthMetrics.length).toBeGreaterThan(0);
    });

    it('should trigger alerts on system issues', async () => {
      mockTwitter.isReady = false;
      await workflow.checkSystemHealth();

      const alerts = alertManager.getActiveAlerts();
      expect(alerts.some(a => a.type === 'api_health')).toBeTruthy();
    });
  });
});