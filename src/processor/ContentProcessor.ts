import { AIProcessor } from './AIProcessor';
import { NewsArticle } from '../scraper/NewsScraper';
import { ContentType, ContentData } from '../twitter/TemplateSelector';

export class ContentProcessor {
  private aiProcessor: AIProcessor;

  constructor() {
    this.aiProcessor = new AIProcessor();
  }

  async processArticle(article: NewsArticle): Promise<ContentData> {
    try {
      // Get AI analysis of the article
      const aiAnalysis = await this.aiProcessor.processContent(article);

      // Determine content type based on analysis
      const contentType = this.determineContentType(aiAnalysis);

      // Process based on content type
      switch (contentType) {
        case ContentType.BREAKING_NEWS:
          return this.processBreakingNews(article, aiAnalysis);
        
        case ContentType.RESEARCH_PAPER:
          return this.processResearchPaper(article, aiAnalysis);
        
        case ContentType.PRODUCT_LAUNCH:
          return this.processProductLaunch(article, aiAnalysis);
        
        default:
          return this.processDefaultNews(article, aiAnalysis);
      }
    } catch (error) {
      console.error('Error processing article:', error);
      throw error;
    }
  }

  private determineContentType(aiAnalysis: any): ContentType {
    // Use AI analysis to determine content type
    if (this.containsKeywords(aiAnalysis.title, ['research', 'study', 'paper'])) {
      return ContentType.RESEARCH_PAPER;
    }

    if (this.containsKeywords(aiAnalysis.title, ['launches', 'released', 'announces', 'introduces'])) {
      return ContentType.PRODUCT_LAUNCH;
    }

    if (aiAnalysis.isBreakingNews) {
      return ContentType.BREAKING_NEWS;
    }

    return ContentType.BREAKING_NEWS; // Default type
  }

  private containsKeywords(text: string, keywords: string[]): boolean {
    const lowerText = text.toLowerCase();
    return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
  }

  private async processBreakingNews(article: NewsArticle, aiAnalysis: any): Promise<ContentData> {
    return {
      type: ContentType.BREAKING_NEWS,
      data: {
        title: aiAnalysis.summary.split('\n')[0], // First line as title
        summary: aiAnalysis.summary,
        link: article.url,
        hashtags: aiAnalysis.hashtags
      },
      images: article.images // If article has associated images
    };
  }

  private async processResearchPaper(article: NewsArticle, aiAnalysis: any): Promise<ContentData> {
    return {
      type: ContentType.RESEARCH_PAPER,
      data: {
        title: article.title,
        keyPoints: aiAnalysis.keyPoints,
        implications: aiAnalysis.implications || [],
        link: article.url,
        hashtags: [...aiAnalysis.hashtags, '#Research', '#AIResearch']
      },
      images: article.images
    };
  }

  private async processProductLaunch(article: NewsArticle, aiAnalysis: any): Promise<ContentData> {
    return {
      type: ContentType.PRODUCT_LAUNCH,
      data: {
        name: article.title,
        features: aiAnalysis.keyPoints,
        link: article.url,
        hashtags: [...aiAnalysis.hashtags, '#ProductLaunch']
      },
      images: article.images
    };
  }

  private async processDefaultNews(article: NewsArticle, aiAnalysis: any): Promise<ContentData> {
    return {
      type: ContentType.BREAKING_NEWS,
      data: {
        title: article.title,
        summary: aiAnalysis.summary,
        link: article.url,
        hashtags: aiAnalysis.hashtags
      },
      images: article.images
    };
  }
}