import { BasePost, ThreadPost, PostMetrics, PostValidationError } from './types/PostTypes';

export class PostFormatter {
  private readonly MAX_CHARS = 280;
  private readonly URL_LENGTH = 23;
  private readonly MAX_IMAGES = 4;
  private readonly MAX_POLL_OPTIONS = 4;
  private readonly MAX_POLL_DURATION = 10080; // 7 days in minutes

  validatePost(post: BasePost): PostValidationError[] {
    const errors: PostValidationError[] = [];
    const metrics = this.getPostMetrics(post);

    // Check content length
    if (metrics.characterCount > this.MAX_CHARS) {
      errors.push({
        type: 'content',
        message: `Content exceeds ${this.MAX_CHARS} characters`
      });
    }

    // Validate media
    if (post.media) {
      if (post.media.length > this.MAX_IMAGES) {
        errors.push({
          type: 'media',
          message: `Maximum ${this.MAX_IMAGES} media items allowed`
        });
      }

      // Check if mixing video with other media
      const hasVideo = post.media.some(m => m.type === 'video');
      if (hasVideo && post.media.length > 1) {
        errors.push({
          type: 'media',
          message: 'Cannot combine video with other media'
        });
      }
    }

    // Validate poll
    if (post.poll) {
      if (post.poll.options.length > this.MAX_POLL_OPTIONS) {
        errors.push({
          type: 'poll',
          message: `Maximum ${this.MAX_POLL_OPTIONS} poll options allowed`
        });
      }

      if (post.poll.duration > this.MAX_POLL_DURATION) {
        errors.push({
          type: 'poll',
          message: 'Poll duration cannot exceed 7 days'
        });
      }

      if (post.media) {
        errors.push({
          type: 'poll',
          message: 'Cannot combine polls with media'
        });
      }
    }

    return errors;
  }

  formatPost(post: BasePost): string {
    let content = post.content;

    // Handle URLs
    content = this.formatUrls(content);

    // Add ellipsis if content is too long
    if (content.length > this.MAX_CHARS) {
      content = content.substring(0, this.MAX_CHARS - 3) + '...';
    }

    return content;
  }

  formatThread(posts: ThreadPost[]): ThreadPost[] {
    return posts.map((post, index) => ({
      ...post,
      content: this.formatThreadPost(post, index + 1, posts.length)
    }));
  }

  private formatThreadPost(post: ThreadPost, currentIndex: number, totalPosts: number): string {
    let content = post.content;

    // Add thread numbering if not present
    if (!content.startsWith(`${currentIndex}/`)) {
      content = `${currentIndex}/${totalPosts} ${content}`;
    }

    return this.formatPost({ ...post, content });
  }

  private formatUrls(content: string): string {
    // Simple URL regex
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return content.replace(urlRegex, () => '[link]');
  }

  getPostMetrics(post: BasePost): PostMetrics {
    const urlCount = (post.content.match(/(https?:\/\/[^\s]+)/g) || []).length;
    const contentLength = post.content.length - (urlCount * (this.URL_LENGTH - 5));

    return {
      characterCount: contentLength,
      mediaCount: post.media?.length || 0,
      hasLink: urlCount > 0,
      hasPoll: !!post.poll
    };
  }

  // Template generators for different types of posts
  generateNewsTemplate(title: string, summary: string, link: string, hashtags: string[]): BasePost {
    return {
      content: `📰 ${title}\n\n${summary}\n\n${link}\n\n${hashtags.join(' ')}`
    };
  }

  generateThreadTemplate(title: string, points: string[], link: string, hashtags: string[]): ThreadPost[] {
    const thread: ThreadPost[] = [];

    // First post with title and introduction
    thread.push({
      index: 1,
      content: `🧵 ${title}\n\n${link}`,
      delay: 1000
    });

    // Add each point as a separate post
    points.forEach((point, index) => {
      thread.push({
        index: index + 2,
        content: point,
        delay: 1000
      });
    });

    // Final post with hashtags
    thread.push({
      index: points.length + 2,
      content: `💡 Follow for more AI & tech updates!\n\n${hashtags.join(' ')}`,
      delay: 1000
    });

    return thread;
  }
}