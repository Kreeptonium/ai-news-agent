import { ThreadTemplateGenerator } from '../templates/ThreadTemplates';
import { TwitterAutomation } from '../twitter/TwitterAutomation';
import { NewsService, AIService, YouTubeService } from '../services';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface ContentManagerConfig {
    aiService?: AIService;
    youtubeService?: YouTubeService;
    newsService?: NewsService;
}

type ContentType = 'news' | 'tutorial' | 'product_review' | 'industry_insight' | 'youtube_ai' | 'youtube_tech' | 'youtube_tutorial';

interface Thread {
    text: string;
    media?: {
        type: 'image';
        url: string;
        alt: string;
    }[];
}

export default class ContentManager {
    private twitter: TwitterAutomation;
    private newsService: NewsService;
    private aiService: AIService;
    private youtubeService: YouTubeService;
    
    private contentTypes: ContentType[] = [
        'news',
        'tutorial',
        'product_review',
        'industry_insight',
        'youtube_ai',
        'youtube_tech',
        'youtube_tutorial'
    ];

    constructor(config?: ContentManagerConfig) {
        if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_ENDPOINT) {
            throw new Error('OpenAI API configuration is not set');
        }
        if (!process.env.YOUTUBE_API_KEY) {
            throw new Error('YouTube API key is not set');
        }

        this.twitter = new TwitterAutomation();
        this.newsService = config?.newsService || new NewsService();
        this.aiService = config?.aiService || new AIService({
            apiKey: process.env.OPENAI_API_KEY,
            endpoint: process.env.OPENAI_API_ENDPOINT
        });
        this.youtubeService = config?.youtubeService || new YouTubeService({
            apiKey: process.env.YOUTUBE_API_KEY
        });
    }

    public async generateAndPost(contentType?: ContentType): Promise<boolean> {
        const type = contentType || this.contentTypes[Math.floor(Math.random() * this.contentTypes.length)];
        
        try {
            let thread: Thread[] = [];
            switch (type) {
                case 'youtube_ai':
                    thread = await this.createYouTubeContent('ai');
                    break;
                case 'youtube_tech':
                    thread = await this.createYouTubeContent('tech');
                    break;
                case 'youtube_tutorial':
                    thread = await this.createYouTubeContent('tutorial');
                    break;
                case 'news':
                    thread = await this.createNewsContent();
                    break;
                case 'tutorial':
                    thread = await this.createTutorialContent();
                    break;
                case 'product_review':
                    thread = await this.createProductReviewContent();
                    break;
                case 'industry_insight':
                    thread = await this.createInsightContent();
                    break;
                default:
                    throw new Error(`Unknown content type: ${type}`);
            }

            // Supplement with relevant YouTube content if available
            if (!type.startsWith('youtube_')) {
                const relevantVideo = await this.getRelevantVideo(thread[0].text);
                if (relevantVideo) {
                    thread.push({
                        text: `🎥 Related Video:\n${relevantVideo.title}\n\nWatch: ${relevantVideo.url}`,
                        media: [{
                            type: 'image' as const,
                            url: relevantVideo.thumbnailUrl,
                            alt: relevantVideo.title
                        }]
                    });
                }
            }

            const success = await this.twitter.postThread(thread);
            console.log(`Posted ${type} content: ${success ? 'Success' : 'Failed'}`);
            return success;

        } catch (error) {
            console.error(`Error generating/posting ${type} content:`, error);
            throw error;
        }
    }

    public async close(): Promise<void> {
        await this.twitter.close();
    }

    private async createYouTubeContent(category: 'ai' | 'tech' | 'tutorial' | 'news'): Promise<Thread[]> {
        const videos = await this.youtubeService.fetchLatestVideos(category);
        if (videos.length === 0) {
            throw new Error(`No ${category} videos found`);
        }

        const video = videos[0];

        const aiAnalysis = await this.aiService.analyzeContent(
            `${video.title}\n\n${video.description}`
        );

        const imagePrompt = await this.aiService.improveImagePrompt(
            `${video.title} ${video.description.slice(0, 100)}`
        );
        const generatedImage = await this.aiService.generateImage(imagePrompt);

        return [
            {
                text: `🎥 ${video.title}\n\n${aiAnalysis.summary.slice(0, 100)}...\n\nWatch now 👇`,
                media: [{
                    type: 'image' as const,
                    url: video.thumbnailUrl,
                    alt: video.title
                }]
            },
            {
                text: `Key Takeaways:\n${aiAnalysis.summary.slice(100, 250)}\n\n🔗 ${video.url}\n📱 Via ${video.channelTitle}`,
                media: [{
                    type: 'image' as const,
                    url: generatedImage,
                    alt: `AI visualization for ${video.title}`
                }]
            },
            {
                text: `Topics covered:\n${this.youtubeService.extractTopics(video).map((topic: string) => `• ${topic}`).join('\n')}\n\n${aiAnalysis.suggestedTags.slice(0, 3).join(' ')}`
            }
        ];
    }

    private async createNewsContent(): Promise<Thread[]> {
        const newsArticles = await this.newsService.fetchLatestNews();
        if (newsArticles.length === 0) {
            throw new Error('No news articles found');
        }

        const article = newsArticles[0];

        const aiAnalysis = await this.aiService.analyzeContent(
            `${article.title}\n\n${article.summary}`
        );

        const imagePrompt = await this.aiService.improveImagePrompt(
            `${article.title} ${article.summary?.slice(0, 100)}`
        );
        const generatedImage = await this.aiService.generateImage(imagePrompt);

        return [
            {
                text: `📰 ${article.title}\n\n${aiAnalysis.summary.slice(0, 100)}...\n\nRead more 👇`,
                media: [{
                    type: 'image' as const,
                    url: article.imageUrl || generatedImage,
                    alt: article.title
                }]
            },
            {
                text: `Key Points:\n${aiAnalysis.summary.slice(100, 250)}\n\n🔗 ${article.url}\n📱 Via ${article.source}`,
                media: article.imageUrl ? [{
                    type: 'image' as const,
                    url: generatedImage,
                    alt: `AI visualization for ${article.title}`
                }] : undefined
            },
            {
                text: `Impact & Analysis:\n${aiAnalysis.analysis}\n\n${aiAnalysis.suggestedTags.slice(0, 3).join(' ')}`
            }
        ];
    }

    private async createTutorialContent(): Promise<Thread[]> {
        const tutorials = await this.newsService.fetchLatestTutorials();
        if (tutorials.length === 0) {
            throw new Error('No tutorials found');
        }

        const tutorial = tutorials[0];

        const aiAnalysis = await this.aiService.analyzeContent(
            `${tutorial.title}\n\n${tutorial.description}`
        );

        const imagePrompt = await this.aiService.improveImagePrompt(
            `Learning path visualization for ${tutorial.title}`
        );
        const generatedImage = await this.aiService.generateImage(imagePrompt);

        return [
            {
                text: `📚 Tutorial: ${tutorial.title}\n\n${aiAnalysis.summary.slice(0, 100)}...\n\nLearn more 👇`,
                media: [{
                    type: 'image' as const,
                    url: tutorial.imageUrl || generatedImage,
                    alt: tutorial.title
                }]
            },
            {
                text: `What you'll learn:\n${aiAnalysis.keyPoints.map((point: string) => `• ${point}`).join('\n')}\n\n🔗 ${tutorial.url}`,
                media: tutorial.imageUrl ? [{
                    type: 'image' as const,
                    url: generatedImage,
                    alt: `Learning path for ${tutorial.title}`
                }] : undefined
            },
            {
                text: `Pre-requisites:\n${tutorial.prerequisites.map((req: string) => `• ${req}`).join('\n')}\n\nDifficulty: ${tutorial.difficulty}\n\n${aiAnalysis.suggestedTags.slice(0, 3).join(' ')}`
            }
        ];
    }

    private async createProductReviewContent(): Promise<Thread[]> {
        const reviews = await this.newsService.fetchLatestProductReviews();
        if (reviews.length === 0) {
            throw new Error('No product reviews found');
        }

        const review = reviews[0];

        const aiAnalysis = await this.aiService.analyzeContent(
            `${review.title}\n\n${review.summary}`
        );

        const imagePrompt = await this.aiService.improveImagePrompt(
            `${review.productName} key features visualization`
        );
        const generatedImage = await this.aiService.generateImage(imagePrompt);

        return [
            {
                text: `🔍 Product Review: ${review.productName}\n\n${aiAnalysis.summary.slice(0, 100)}...\n\nFull review 👇`,
                media: [{
                    type: 'image' as const,
                    url: review.productImage || generatedImage,
                    alt: review.productName
                }]
            },
            {
                text: `Key Features:\n${review.features.map((feature: string) => `• ${feature}`).join('\n')}\n\nRating: ${review.rating}/5\n\n🔗 ${review.url}`,
                media: review.productImage ? [{
                    type: 'image' as const,
                    url: generatedImage,
                    alt: `Features of ${review.productName}`
                }] : undefined
            },
            {
                text: `Pros:\n${review.pros.map((pro: string) => `✅ ${pro}`).join('\n')}\n\nCons:\n${review.cons.map((con: string) => `❌ ${con}`).join('\n')}`
            },
            {
                text: `Final Verdict:\n${aiAnalysis.conclusion}\n\n${aiAnalysis.suggestedTags.slice(0, 3).join(' ')}`
            }
        ];
    }

    private async createInsightContent(): Promise<Thread[]> {
        const insights = await this.newsService.fetchLatestInsights();
        if (insights.length === 0) {
            throw new Error('No industry insights found');
        }

        const insight = insights[0];

        const aiAnalysis = await this.aiService.analyzeContent(
            `${insight.title}\n\n${insight.content}`
        );

        const imagePrompt = await this.aiService.improveImagePrompt(
            `Trend visualization for ${insight.title}`
        );
        const generatedImage = await this.aiService.generateImage(imagePrompt);

        return [
            {
                text: `🔮 Industry Insight: ${insight.title}\n\n${aiAnalysis.summary.slice(0, 100)}...\n\nDeep dive 👇`,
                media: [{
                    type: 'image' as const,
                    url: insight.imageUrl || generatedImage,
                    alt: insight.title
                }]
            },
            {
                text: `Key Trends:\n${insight.trends.map((trend: string) => `📈 ${trend}`).join('\n')}\n\n🔗 ${insight.url}`,
                media: insight.imageUrl ? [{
                    type: 'image' as const,
                    url: generatedImage,
                    alt: `Trend visualization for ${insight.title}`
                }] : undefined
            },
            {
                text: `Impact Analysis:\n${aiAnalysis.analysis}\n\nPredictions:\n${insight.predictions.map((pred: string) => `🎯 ${pred}`).join('\n')}`,
            },
            {
                text: `Action Items:\n${insight.actionItems.map((item: string) => `✅ ${item}`).join('\n')}\n\n${aiAnalysis.suggestedTags.slice(0, 3).join(' ')}`
            }
        ];
    }

    private async getRelevantVideo(content: string) {
        try {
            return await this.youtubeService.getRelevantVideo(content);
        } catch (error) {
            console.warn('Error getting relevant video:', error);
            return null;
        }
    }
}