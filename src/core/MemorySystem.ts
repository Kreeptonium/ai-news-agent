import { BaseAgent } from '@elizaos/core';

interface MemoryEntry {
  type: string;
  content: any;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ProcessedArticle {
  url: string;
  title: string;
  processedDate: Date;
  postId?: string;
}

export class MemorySystem {
  private agent: BaseAgent;
  private processedArticles: Map<string, ProcessedArticle> = new Map();
  private postHistory: MemoryEntry[] = [];
  private readonly MAX_HISTORY = 1000;

  constructor(agent: BaseAgent) {
    this.agent = agent;
  }

  async initialize(): Promise<void> {
    try {
      // Load memory from ElizaOS persistence
      const savedMemory = await this.agent.memory.get('newsbot_memory');
      if (savedMemory) {
        this.processedArticles = new Map(savedMemory.processedArticles);
        this.postHistory = savedMemory.postHistory;
      }
    } catch (error) {
      console.error('Failed to initialize memory system:', error);
      // Continue with empty memory if loading fails
    }
  }

  async saveMemory(): Promise<void> {
    try {
      await this.agent.memory.set('newsbot_memory', {
        processedArticles: Array.from(this.processedArticles.entries()),
        postHistory: this.postHistory
      });
    } catch (error) {
      console.error('Failed to save memory:', error);
      throw error;
    }
  }

  async addProcessedArticle(article: ProcessedArticle): Promise<void> {
    this.processedArticles.set(article.url, article);
    await this.saveMemory();
  }

  isArticleProcessed(url: string): boolean {
    return this.processedArticles.has(url);
  }

  async addPostToHistory(type: string, content: any, metadata?: Record<string, any>): Promise<void> {
    this.postHistory.unshift({
      type,
      content,
      timestamp: new Date(),
      metadata
    });

    // Maintain history limit
    if (this.postHistory.length > this.MAX_HISTORY) {
      this.postHistory = this.postHistory.slice(0, this.MAX_HISTORY);
    }

    await this.saveMemory();
  }

  getRecentPosts(hours: number = 24): MemoryEntry[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.postHistory.filter(entry => entry.timestamp > cutoff);
  }

  async cleanOldMemory(days: number = 30): Promise<void> {
    const cutoff = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
    
    // Clean old processed articles
    for (const [url, article] of this.processedArticles.entries()) {
      if (article.processedDate < cutoff) {
        this.processedArticles.delete(url);
      }
    }

    // Clean old post history
    this.postHistory = this.postHistory.filter(entry => entry.timestamp > cutoff);

    await this.saveMemory();
  }

  async getRelatedContent(article: { title: string; content: string }): Promise<MemoryEntry[]> {
    // Find related content based on title similarity
    return this.postHistory.filter(entry => {
      if (entry.type !== 'article') return false;
      
      const titleSimilarity = this.calculateSimilarity(
        article.title,
        entry.content.title
      );
      
      return titleSimilarity > 0.7; // 70% similarity threshold
    });
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple Jaccard similarity for demonstration
    const set1 = new Set(str1.toLowerCase().split(' '));
    const set2 = new Set(str2.toLowerCase().split(' '));
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    return intersection.size / union.size;
  }

  getMemoryStats(): Record<string, any> {
    return {
      processedArticlesCount: this.processedArticles.size,
      postHistoryCount: this.postHistory.length,
      oldestPost: this.postHistory[this.postHistory.length - 1]?.timestamp,
      newestPost: this.postHistory[0]?.timestamp,
      memorySize: JSON.stringify({
        processedArticles: Array.from(this.processedArticles.entries()),
        postHistory: this.postHistory
      }).length
    };
  }
}