import { WorkflowManager } from '../../src/workflow/WorkflowManager';
import { NewsArticle } from '../../src/scraper/NewsScraper';

// Create mock services
const mockScraper = {
  scrapeAll: jest.fn()
};

const mockContentProcessor = {
  processArticle: jest.fn()
};

const mockAIProcessor = {
  processContent: jest.fn()
};

const mockTwitterService = {
  initialize: jest.fn(),
  post: jest.fn(),
  postThread: jest.fn(),
  cleanup: jest.fn()
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn()
};

const mockMonitor = {
  recordMetric: jest.fn()
};

describe('WorkflowManager', () => {
  let workflowManager: WorkflowManager;
  let mockArticle: NewsArticle;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    workflowManager = new WorkflowManager(
      mockScraper as any,
      mockContentProcessor as any,
      mockAIProcessor as any,
      mockTwitterService as any,
      mockLogger as any,
      mockMonitor as any
    );

    mockArticle = {
      title: 'Test Article',
      content: 'Test content',
      url: 'https://test.com',
      source: 'Test Source'
    };
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await workflowManager.initialize();
      expect(mockTwitterService.initialize).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowManager',
        'Workflow initialized successfully'
      );
    });

    it('should handle initialization errors', async () => {
      mockTwitterService.initialize.mockRejectedValue(new Error('Init failed'));
      
      await expect(workflowManager.initialize()).rejects.toThrow('Init failed');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('article processing', () => {
    beforeEach(() => {
      mockAIProcessor.processContent.mockResolvedValue({
        isBreakingNews: true,
        summary: 'Test summary',
        hashtags: ['#Test']
      });
    });

    it('should process article successfully', async () => {
      await workflowManager.processNewsArticle(mockArticle);
      
      expect(mockAIProcessor.processContent).toHaveBeenCalledWith(mockArticle);
      expect(mockTwitterService.post).toHaveBeenCalled();
      expect(mockMonitor.recordMetric).toHaveBeenCalledWith('article_processing_success', 1);
    });

    it('should handle processing errors', async () => {
      mockAIProcessor.processContent.mockRejectedValue(new Error('Processing failed'));
      
      await expect(workflowManager.processNewsArticle(mockArticle)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMonitor.recordMetric).toHaveBeenCalledWith('article_processing_failure', 1);
    });
  });

  describe('main loop', () => {
    beforeEach(() => {
      mockScraper.scrapeAll.mockResolvedValue([mockArticle]);
    });

    it('should process all articles', async () => {
      await workflowManager.runMainLoop();
      
      expect(mockScraper.scrapeAll).toHaveBeenCalled();
      expect(mockAIProcessor.processContent).toHaveBeenCalled();
      expect(mockMonitor.recordMetric).toHaveBeenCalledWith('articles_scraped', 1);
    });

    it('should continue processing if one article fails', async () => {
      const articles = [mockArticle, { ...mockArticle, url: 'https://test2.com' }];
      mockScraper.scrapeAll.mockResolvedValue(articles);
      mockAIProcessor.processContent.mockRejectedValueOnce(new Error('Failed'));
      
      await workflowManager.runMainLoop();
      
      expect(mockLogger.error).toHaveBeenCalled();
      expect(mockMonitor.recordMetric).toHaveBeenCalledWith('articles_scraped', 2);
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await workflowManager.cleanup();
      
      expect(mockTwitterService.cleanup).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'WorkflowManager',
        'Cleanup completed successfully'
      );
    });
  });
});