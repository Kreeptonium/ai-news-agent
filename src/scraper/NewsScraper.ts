import axios from 'axios';
import cheerio from 'cheerio';
import { RateLimiter } from './RateLimiter';
import { SourceConfig, defaultSourceConfigs } from './SourceConfig';

export interface NewsArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publishDate?: Date;
  author?: string;
}

export class NewsScraper {
  private rateLimiter: RateLimiter;
  private sourceConfigs: Record<string, SourceConfig>;
  private lastScrapedUrls: Set<string> = new Set();

  constructor(customConfigs?: Record<string, SourceConfig>) {
    this.rateLimiter = new RateLimiter();
    this.sourceConfigs = { ...defaultSourceConfigs, ...customConfigs };
  }

  async scrapeAll(): Promise<NewsArticle[]> {
    const articles: NewsArticle[] = [];
    
    for (const [sourceId, config] of Object.entries(this.sourceConfigs)) {
      try {
        // Check rate limits before scraping
        await this.rateLimiter.checkLimit(
          sourceId,
          config.rateLimit.requestsPerMinute,
          config.rateLimit.pauseBetweenRequests
        );

        const sourceArticles = await this.scrapeSource(sourceId, config);
        articles.push(...sourceArticles);
      } catch (error) {
        console.error(`Error scraping ${config.name}:`, error);
      }
    }

    return articles;
  }

  private async scrapeSource(sourceId: string, config: SourceConfig): Promise<NewsArticle[]> {
    try {
      const response = await axios.get(config.baseUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AI_News_Bot/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5'
        }
      });

      const $ = cheerio.load(response.data);
      const articles: NewsArticle[] = [];

      $(config.selectors.article).each((_, element) => {
        try {
          const $article = $(element);
          const url = this.extractUrl($article, config);

          // Skip if we've already scraped this URL
          if (this.lastScrapedUrls.has(url)) {
            return;
          }

          const article = this.extractArticleData($article, config, url);
          if (this.isValidArticle(article)) {
            articles.push(article);
            this.lastScrapedUrls.add(url);
          }
        } catch (error) {
          console.error('Error processing article element:', error);
        }
      });

      // Maintain a reasonable size for the URL cache
      if (this.lastScrapedUrls.size > 1000) {
        const urlsArray = Array.from(this.lastScrapedUrls);
        this.lastScrapedUrls = new Set(urlsArray.slice(urlsArray.length - 1000));
      }

      return articles;
    } catch (error) {
      console.error(`Error scraping ${config.name}:`, error);
      return [];
    }
  }

  private extractUrl($article: cheerio.Cheerio, config: SourceConfig): string {
    let url = '';
    if (config.selectors.link) {
      url = $article.find(config.selectors.link).attr('href') || '';
    }
    
    if (!url) {
      throw new Error('Could not extract article URL');
    }

    // Ensure absolute URL
    return url.startsWith('http') ? url : new URL(url, config.baseUrl).toString();
  }

  private extractArticleData($article: cheerio.Cheerio, config: SourceConfig, url: string): NewsArticle {
    const title = $article.find(config.selectors.title).text().trim();
    const content = $article.find(config.selectors.content).text().trim();
    const author = config.selectors.author ? 
      $article.find(config.selectors.author).text().trim() : undefined;
    
    let publishDate: Date | undefined;
    if (config.selectors.date) {
      const dateStr = $article.find(config.selectors.date).attr('datetime') || 
                     $article.find(config.selectors.date).text().trim();
      publishDate = dateStr ? new Date(dateStr) : undefined;
    }

    return {
      title,
      content,
      url,
      source: config.name,
      author,
      publishDate
    };
  }

  private isValidArticle(article: NewsArticle): boolean {
    return Boolean(
      article.title &&
      article.content &&
      article.url &&
      article.title.length > 5 &&
      article.content.length > 20
    );
  }

  cleanup(): void {
    this.rateLimiter.cleanup();
    this.lastScrapedUrls.clear();
  }
}