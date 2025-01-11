import { TwitterClient } from '@elizaos/agent-twitter-client';
import { BasePost, ThreadPost, MediaContent, Poll } from './types/PostTypes';
import { PostFormatter } from './PostFormatter';

interface TwitterConfig {
  username: string;
  sessionData?: string;
  automationDelay?: number;
  retryAttempts?: number;
}

export class TwitterService {
  private client: TwitterClient;
  private formatter: PostFormatter;
  private config: TwitterConfig;
  private isReady: boolean = false;

  constructor(config: TwitterConfig) {
    this.config = {
      automationDelay: 2000,
      retryAttempts: 3,
      ...config
    };
    
    this.client = new TwitterClient({
      username: this.config.username,
      sessionData: this.config.sessionData
    });

    this.formatter = new PostFormatter();
  }

  async initialize(): Promise<void> {
    try {
      await this.client.initialize();
      await this.verifyAuthentication();
      this.isReady = true;
      console.log('Twitter service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Twitter service:', error);
      throw error;
    }
  }

  private async verifyAuthentication(): Promise<void> {
    try {
      const isAuthenticated = await this.client.verifySession();
      if (!isAuthenticated) {
        console.log('Session expired, initiating new login...');
        await this.authenticate();
      }
    } catch (error) {
      console.error('Authentication verification failed:', error);
      throw error;
    }
  }

  private async authenticate(): Promise<void> {
    try {
      await this.client.authenticate();
      console.log('Authentication successful');
    } catch (error) {
      console.error('Authentication failed:', error);
      throw error;
    }
  }

  async post(post: BasePost): Promise<string | null> {
    if (!this.isReady) {
      throw new Error('Twitter service not initialized');
    }

    // Validate post
    const errors = this.formatter.validatePost(post);
    if (errors.length > 0) {
      throw new Error(`Invalid post: ${errors.map(e => e.message).join(', ')}`);
    }

    try {
      // Format content
      const formattedContent = this.formatter.formatPost(post);

      // Handle media upload if present
      const mediaIds = post.media ? await this.uploadMedia(post.media) : [];

      // Handle poll if present
      const pollOptions = post.poll ? this.formatPoll(post.poll) : undefined;

      // Post tweet
      const tweetId = await this.client.post(formattedContent, {
        mediaIds,
        poll: pollOptions
      });

      await this.delay();
      return tweetId;
    } catch (error) {
      console.error('Failed to post tweet:', error);
      throw error;
    }
  }

  async postThread(posts: ThreadPost[]): Promise<boolean> {
    try {
      const formattedPosts = this.formatter.formatThread(posts);
      let previousTweetId: string | null = null;

      for (const post of formattedPosts) {
        // Validate each post
        const errors = this.formatter.validatePost(post);
        if (errors.length > 0) {
          throw new Error(`Invalid post at index ${post.index}: ${errors.map(e => e.message).join(', ')}`);
        }

        // Post as reply if not first tweet
        if (previousTweetId) {
          previousTweetId = await this.client.reply({
            content: post.content,
            replyTo: previousTweetId,
            media: post.media
          });
        } else {
          previousTweetId = await this.post(post);
        }

        // Add delay between posts
        await this.delay(post.delay);
      }

      return true;
    } catch (error) {
      console.error('Failed to post thread:', error);
      return false;
    }
  }

  private async uploadMedia(media: MediaContent[]): Promise<string[]> {
    const mediaIds: string[] = [];

    for (const item of media) {
      try {
        const mediaId = await this.client.uploadMedia({
          type: item.type,
          url: item.url,
          altText: item.altText
        });
        mediaIds.push(mediaId);
      } catch (error) {
        console.error(`Failed to upload media: ${item.url}`, error);
        throw error;
      }
    }

    return mediaIds;
  }

  private formatPoll(poll: Poll): any {
    return {
      options: poll.options.map(opt => opt.text),
      duration: poll.duration
    };
  }

  private async delay(customDelay?: number): Promise<void> {
    const delayTime = customDelay || this.config.automationDelay;
    await new Promise(resolve => setTimeout(resolve, delayTime));
  }

  async cleanup(): Promise<void> {
    try {
      await this.client.cleanup();
      this.isReady = false;
      console.log('Twitter service cleaned up successfully');
    } catch (error) {
      console.error('Failed to cleanup Twitter service:', error);
      throw error;
    }
  }
}