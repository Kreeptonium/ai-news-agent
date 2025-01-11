import { AIProcessor } from '../../src/processor/AIProcessor';
import type { NewsArticle } from '../../src/scraper/NewsScraper';

describe('AIProcessor', () => {
  let processor: AIProcessor;
  let mockArticle: NewsArticle;

  beforeEach(() => {
    processor = new AIProcessor();
    mockArticle = {
      title: 'Test AI Article',
      content: 'This is a test article about artificial intelligence and its impact on technology.',
      url: 'http://test.com/article',
      source: 'Test Source'
    };
  });

  describe('content processing', () => {
    it('should process article content successfully', async () => {
      const result = await processor.processContent(mockArticle);
      
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('hashtags');
      expect(result).toHaveProperty('sentiment');
      expect(result).toHaveProperty('category');
      expect(result).toHaveProperty('keyPoints');
    });

    it('should generate appropriate hashtags', async () => {
      const result = await processor.processContent(mockArticle);
      
      expect(result.hashtags).toBeInstanceOf(Array);
      expect(result.hashtags.length).toBeLessThanOrEqual(5);
      expect(result.hashtags[0]).toMatch(/^#/);
    });

    it('should provide valid sentiment analysis', async () => {
      const result = await processor.processContent(mockArticle);
      
      expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
    });

    it('should generate reasonable length summary', async () => {
      const result = await processor.processContent(mockArticle);
      
      expect(result.summary.length).toBeLessThanOrEqual(150);
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should handle articles with minimal content', async () => {
      const shortArticle = {
        ...mockArticle,
        content: 'Very short content.'
      };

      const result = await processor.processContent(shortArticle);
      
      expect(result.summary).toBeDefined();
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });

    it('should extract relevant key points', async () => {
      const result = await processor.processContent(mockArticle);
      
      expect(result.keyPoints).toBeInstanceOf(Array);
      expect(result.keyPoints.length).toBeLessThanOrEqual(5);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });
  });

  describe('error handling', () => {
    it('should handle empty content gracefully', async () => {
      const emptyArticle = {
        ...mockArticle,
        content: ''
      };

      await expect(processor.processContent(emptyArticle)).resolves.not.toThrow();
    });

    it('should handle malformed input', async () => {
      const malformedArticle = {
        ...mockArticle,
        content: null as unknown as string
      };

      await expect(processor.processContent(malformedArticle)).rejects.toThrow();
    });
  });
});