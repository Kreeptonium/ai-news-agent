export interface NewsArticle {
    title: string;
    description: string;
    url: string;
    urlToImage?: string;
    publishedAt: string;
    source: {
        name: string;
        category: 'AI' | 'Tech' | 'Dev' | 'Research';
    };
    content?: string;
}

export interface NewsSource {
    ai: string[];
    tech: string[];
    dev: string[];
    research: string[];
    tutorials: string[];
    reviews: string[];
    insights: string[];
}