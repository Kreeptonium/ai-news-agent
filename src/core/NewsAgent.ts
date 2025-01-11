import { BaseAgent, NewsAgentConfig } from './BaseAgent';
import { TwitterService } from '../twitter/TwitterService';
import { NewsScraper } from '../scraper/NewsScraper';
import { ContentProcessor } from '../processor/ContentProcessor';
import { AIProcessor } from '../processor/AIProcessor';

export class NewsAgent extends BaseAgent {
  private twitterService: TwitterService;
  private scraper: NewsScraper;
  private contentProcessor: ContentProcessor;
  private aiProcessor: AIProcessor;
  private isRunning: boolean = false;

  constructor(config: NewsAgentConfig) {
    super(config);
    
    this.twitterService = new TwitterService({
      username: config.twitter?.username
    });
    
    this.scraper = new NewsScraper(config.newsSourceUrls);
    this.contentProcessor = new ContentProcessor();
    this.aiProcessor = new AIProcessor();
  }

  protected async registerActions(): Promise<void> {
    await super.registerActions();

    this.actions.register('scrapeNews', async () => {
      console.log('Scraping news...');
      return this.scraper.scrapeAll();
    });

    this.actions.register('processContent', async (articles: any[]) => {
      console.log('Processing articles...');
      const processedArticles = [];
      
      for (const article of articles) {
        const aiResult = await this.aiProcessor.processContent(article);
        const processed = await this.contentProcessor.processArticle({
          ...article,
          aiAnalysis: aiResult
        });
        processedArticles.push(processed);
      }
      
      return processedArticles;
    });

    this.actions.register('postToTwitter', async (content: any) => {
      console.log('Posting to Twitter...');
      return this.twitterService.postTweet(content);
    });
  }

  async initialize(): Promise<void> {
    try {
      await super.initialize();
      await this.twitterService.initialize();
      console.log('News agent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize news agent:', error);
      throw error;
    }
  }

  async start(): Promise<void> {
    await super.start();
    this.isRunning = true;
    await this.runMainLoop();
  }

  private async runMainLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        // 1. Scrape news
        const articles = await this.actions.execute('scrapeNews');
        
        if (articles && articles.length > 0) {
          // 2. Process content
          const processedArticles = await this.actions.execute('processContent', articles);
          
          // 3. Post to Twitter
          for (const article of processedArticles) {
            await this.actions.execute('postToTwitter', article);
            // Add delay between posts
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }

        // Wait for the configured interval
        await new Promise(resolve => setTimeout(resolve, this.config.postingInterval));
      } catch (error) {
        console.error('Error in main loop:', error);
        await this.handleError(error);
      }
    }
  }

  private async handleError(error: any): Promise<void> {
    console.error('Agent encountered an error:', error);
    // Implement error recovery logic
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    await this.twitterService.cleanup();
    await super.stop();
  }
}