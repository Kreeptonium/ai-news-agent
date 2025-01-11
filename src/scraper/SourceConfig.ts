export interface SourceConfig {
  name: string;
  baseUrl: string;
  selectors: {
    article: string;
    title: string;
    content: string;
    date?: string;
    author?: string;
    link?: string;
  };
  rateLimit: {
    requestsPerMinute: number;
    pauseBetweenRequests: number;
  };
}

export const defaultSourceConfigs: Record<string, SourceConfig> = {
  'techcrunch-ai': {
    name: 'TechCrunch AI',
    baseUrl: 'https://techcrunch.com/artificial-intelligence/',
    selectors: {
      article: 'article.post-block',
      title: 'h2.post-block__title a',
      content: 'div.post-block__content',
      date: 'time.post-block__time',
      author: 'span.post-block__author',
      link: 'h2.post-block__title a'
    },
    rateLimit: {
      requestsPerMinute: 20,
      pauseBetweenRequests: 3000
    }
  },
  'venturebeat-ai': {
    name: 'VentureBeat AI',
    baseUrl: 'https://venturebeat.com/category/ai/',
    selectors: {
      article: 'article.ArticleListing',
      title: 'h2.ArticleListing__title',
      content: 'p.ArticleListing__excerpt',
      date: 'time.ArticleListing__time',
      author: 'span.ArticleListing__author',
      link: 'a.ArticleListing__link'
    },
    rateLimit: {
      requestsPerMinute: 15,
      pauseBetweenRequests: 4000
    }
  }
};