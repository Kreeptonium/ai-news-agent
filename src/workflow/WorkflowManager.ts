// ... (previous imports)
import { MemorySystem } from '../core/MemorySystem';

export class WorkflowManager {
  private memory: MemorySystem;
  
  // ... (previous properties)

  constructor(
    scraper: NewsScraper,
    contentProcessor: ContentProcessor,
    aiProcessor: AIProcessor,
    twitterService: TwitterService,
    logger: LoggingService,
    monitor: MonitoringService,
    agent: BaseAgent
  ) {
    // ... (previous initialization)
    this.memory = new MemorySystem(agent);
  }

  async initialize(): Promise<void> {
    try {
      await this.memory.initialize();
      await this.twitterService.initialize();
      this.logger.info('WorkflowManager', 'Workflow initialized successfully');
    } catch (error) {
      this.logger.error('WorkflowManager', 'Failed to initialize workflow', error as Error);
      throw error;
    }
  }

  async processNewsArticle(article: NewsArticle) {
    try {
      // Check if article was already processed
      if (this.memory.isArticleProcessed(article.url)) {
        this.logger.info('WorkflowManager', 'Article already processed', { url: article.url });
        return null;
      }

      // Find related content
      const relatedContent = await this.memory.getRelatedContent({
        title: article.title,
        content: article.content
      });

      // Add context to AI processing
      const aiResult = await this.aiProcessor.processContent(article, {
        relatedContent: relatedContent
      });

      // Create and schedule post
      const contentData = this.createContentData(article, aiResult);
      const post = TemplateSelector.selectTemplate(contentData);
      const priority = this.calculatePriority(aiResult);
      const postId = await this.scheduler.schedulePost(post, priority);

      // Record in memory
      await this.memory.addProcessedArticle({
        url: article.url,
        title: article.title,
        processedDate: new Date(),
        postId
      });

      return postId;
    } catch (error) {
      this.logger.error('WorkflowManager', 'Failed to process article', error as Error);
      throw error;
    }
  }

  async runMainLoop() {
    try {
      this.logger.info('WorkflowManager', 'Starting main processing loop');
      
      // Clean old memory periodically
      setInterval(() => {
        this.memory.cleanOldMemory().catch(error => {
          this.logger.error('WorkflowManager', 'Failed to clean memory', error as Error);
        });
      }, 24 * 60 * 60 * 1000); // Once per day

      // Start posting loop
      this.runPostingLoop().catch(error => {
        this.logger.error('WorkflowManager', 'Posting loop failed', error as Error);
      });

      // Main scraping loop
      while (true) {
        const articles = await this.scraper.scrapeAll();
        this.monitor.recordMetric('articles_scraped', articles.length);

        for (const article of articles) {
          await this.processNewsArticle(article).catch(error => {
            this.logger.error('WorkflowManager', 'Failed to process article', error as Error);
          });
        }

        // Save memory state
        await this.memory.saveMemory();

        // Wait before next cycle
        await new Promise(resolve => setTimeout(resolve, 900000));
      }
    } catch (error) {
      this.logger.error('WorkflowManager', 'Main loop failed', error as Error);
      throw error;
    }
  }

  getStatus(): Record<string, any> {
    return {
      queueStatus: this.scheduler.getQueueStatus(),
      memoryStats: this.memory.getMemoryStats(),
      isTwitterReady: this.twitterService.isReady
    };
  }

  // ... (remaining methods)
}