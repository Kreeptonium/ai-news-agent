import { NewsScraper } from '../../src/scraper/NewsScraper';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('NewsScraper', () => {
  let scraper: NewsScraper;

  beforeEach(() => {
    scraper = new NewsScraper();
    jest.clearAllMocks();
  });

  describe('scraping process', () => {
    it('should scrape articles successfully', async () => {
      // Mock successful response
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <html>
            <article class="post-block">
              <h2 class="post-block__title">
                <a href="/test-article">Test AI Article</a>
              </h2>
              <div class="post-block__content">
                Test content about AI advancements.
              </div>
              <time class="post-block__time" datetime="2025-01-10T10:00:00Z">
                January 10, 2025
              </time>
              <span class="post-block__author">John Doe</span>
            </article>
          </html>
        `
      });

      const articles = await scraper.scrapeAll();
      expect(articles.length).toBeGreaterThan(0);
      expect(articles[0]).toHaveProperty('title', 'Test AI Article');
      expect(articles[0]).toHaveProperty('content');
      expect(articles[0]).toHaveProperty('url');
    });

    it('should handle empty responses', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: '<html><body></body></html>'
      });

      const articles = await scraper.scrapeAll();
      expect(articles).toHaveLength(0);
    });

    it('should handle network errors', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const articles = await scraper.scrapeAll();
      expect(articles).toHaveLength(0);
    });

    it('should respect rate limits', async () => {
      const startTime = Date.now();
      
      // Make multiple requests
      mockedAxios.get.mockResolvedValue({
        data: '<html><body></body></html>'
      });

      await scraper.scrapeAll();
      await scraper.scrapeAll();
      
      const endTime = Date.now();
      const timeDiff = endTime - startTime;
      
      // Should have waited due to rate limiting
      expect(timeDiff).toBeGreaterThan(1000);
    });
  });

  describe('article validation', () => {
    it('should filter invalid articles', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: `
          <html>
            <article class="post-block">
              <h2 class="post-block__title">
                <a href="/test-article"></a>
              </h2>
              <div class="post-block__content"></div>
            </article>
          </html>
        `
      });

      const articles = await scraper.scrapeAll();
      expect(articles).toHaveLength(0);
    });

    it('should handle malformed HTML', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: '<html><article>Malformed HTML'
      });

      const articles = await scraper.scrapeAll();
      expect(articles).toHaveLength(0);
    });
  });

  afterAll(() => {
    scraper.cleanup();
  });
});