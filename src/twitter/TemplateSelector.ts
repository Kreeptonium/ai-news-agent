import { BasePost, ThreadPost } from './types/PostTypes';
import { PostTemplates } from './PostTemplates';
import { MediaTemplates } from './MediaTemplates';

export enum ContentType {
  BREAKING_NEWS = 'BREAKING_NEWS',
  RESEARCH_PAPER = 'RESEARCH_PAPER',
  PRODUCT_LAUNCH = 'PRODUCT_LAUNCH',
  INDUSTRY_ANALYSIS = 'INDUSTRY_ANALYSIS',
  TUTORIAL = 'TUTORIAL',
  TOOL_COMPARISON = 'TOOL_COMPARISON'
}

export interface ContentData {
  type: ContentType;
  data: Record<string, any>;
  images?: string[];
}

export class TemplateSelector {
  static selectTemplate(content: ContentData): BasePost | ThreadPost[] {
    switch (content.type) {
      case ContentType.BREAKING_NEWS:
        return this.createBreakingNews(content);
      
      case ContentType.RESEARCH_PAPER:
        return this.createResearchThread(content);
      
      case ContentType.PRODUCT_LAUNCH:
        return this.createProductLaunch(content);
      
      case ContentType.INDUSTRY_ANALYSIS:
        return this.createIndustryAnalysis(content);
      
      case ContentType.TUTORIAL:
        return this.createTutorial(content);
      
      case ContentType.TOOL_COMPARISON:
        return this.createToolComparison(content);
      
      default:
        throw new Error(`Unknown content type: ${content.type}`);
    }
  }

  private static createBreakingNews(content: ContentData): BasePost {
    const post = PostTemplates.breakingNews(
      content.data.title,
      content.data.summary,
      content.data.link,
      content.data.hashtags
    );

    // Add image if available
    if (content.images?.[0]) {
      post.media = [MediaTemplates.newsImage(content.images[0])];
    }

    return post;
  }

  private static createResearchThread(content: ContentData): ThreadPost[] {
    const thread = PostTemplates.researchThread({
      title: content.data.title,
      keyPoints: content.data.keyPoints,
      implications: content.data.implications,
      link: content.data.link,
      hashtags: content.data.hashtags
    });

    // Add visuals if available
    if (content.images) {
      thread[1].media = MediaTemplates.researchVisuals(content.images);
    }

    return thread;
  }

  private static createProductLaunch(content: ContentData): ThreadPost[] {
    const thread = PostTemplates.productLaunch({
      name: content.data.name,
      features: content.data.features,
      link: content.data.link,
      hashtags: content.data.hashtags
    });

    // Add product images if available
    if (content.images) {
      thread[0].media = [MediaTemplates.newsImage(content.images[0])];
      if (content.images.length > 1) {
        thread[1].media = MediaTemplates.comparisonGrid(content.images.slice(1));
      }
    }

    return thread;
  }

  private static createIndustryAnalysis(content: ContentData): ThreadPost[] {
    return PostTemplates.industryAnalysis({
      topic: content.data.topic,
      points: content.data.points,
      conclusion: content.data.conclusion,
      hashtags: content.data.hashtags
    });
  }

  private static createTutorial(content: ContentData): ThreadPost[] {
    const thread = PostTemplates.technicalTutorial({
      topic: content.data.topic,
      steps: content.data.steps,
      codeSnippets: content.data.codeSnippets,
      resources: content.data.resources,
      hashtags: content.data.hashtags
    });

    // Add step images if available
    if (content.images) {
      content.images.forEach((image, index) => {
        if (thread[index + 1]) {
          thread[index + 1].media = [MediaTemplates.newsImage(image)];
        }
      });
    }

    return thread;
  }

  private static createToolComparison(content: ContentData): ThreadPost[] {
    const thread = PostTemplates.toolComparison({
      title: content.data.title,
      comparisons: content.data.comparisons,
      hashtags: content.data.hashtags
    });

    // Add comparison images if available
    if (content.images) {
      thread[1].media = MediaTemplates.comparisonGrid(content.images);
    }

    return thread;
  }
}

// Usage example:
/*
const content: ContentData = {
  type: ContentType.BREAKING_NEWS,
  data: {
    title: "GPT-5 Released",
    summary: "Revolutionary new AI model",
    link: "https://example.com",
    hashtags: ["#AI", "#GPT5"]
  },
  images: ["image1.jpg"]
};

const post = TemplateSelector.selectTemplate(content);
await twitterService.post(post);
*/