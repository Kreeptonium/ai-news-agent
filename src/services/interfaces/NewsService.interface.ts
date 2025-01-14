import { Article, Tutorial, ProductReview, IndustryInsight } from '../../types/content';

export interface INewsService {
    readonly sources: {
        ai: string[];
        tech: string[];
        dev: string[];
        research: string[];
        tutorials: string[];
        reviews: string[];
        insights: string[];
    };

    // Core content fetching methods
    fetchLatestNews(): Promise<Article[]>;
    fetchLatestTutorials(): Promise<Tutorial[]>;
    fetchLatestProductReviews(): Promise<ProductReview[]>;
    fetchLatestInsights(): Promise<IndustryInsight[]>;

    // Source management methods
    addSource(url: string, category: string): Promise<void>;
    removeSource(url: string, category: string): Promise<void>;
    getSources(category: string): Promise<string[]>;
    getCategories(): string[];
}