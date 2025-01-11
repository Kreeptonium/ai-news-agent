interface ScheduledPost {
  id: string;
  content: any;  // Can be BasePost or ThreadPost[]
  scheduledTime: Date;
  priority: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export class PostScheduler {
  private postQueue: ScheduledPost[] = [];
  private readonly minTimeBetweenPosts = 5 * 60 * 1000; // 5 minutes
  private readonly maxPostsPerDay = 48; // 24 hours / 30 minutes
  private lastPostTime: Date | null = null;

  async schedulePost(content: any, priority: number = 1): Promise<string> {
    const id = this.generateId();
    const scheduledTime = await this.calculateNextPostTime();

    const scheduledPost: ScheduledPost = {
      id,
      content,
      scheduledTime,
      priority,
      retryCount: 0,
      maxRetries: 3,
      status: 'pending'
    };

    this.postQueue.push(scheduledPost);
    this.sortQueue();

    return id;
  }

  async getNextPost(): Promise<ScheduledPost | null> {
    if (this.postQueue.length === 0) return null;

    // Check if we can post now
    if (!this.canPostNow()) return null;

    const post = this.postQueue[0];
    if (post.scheduledTime > new Date()) return null;

    post.status = 'processing';
    return post;
  }

  async markPostComplete(id: string): Promise<void> {
    const post = this.findPost(id);
    if (post) {
      post.status = 'completed';
      this.lastPostTime = new Date();
      this.removePost(id);
    }
  }

  async markPostFailed(id: string): Promise<void> {
    const post = this.findPost(id);
    if (post) {
      post.retryCount++;
      if (post.retryCount >= post.maxRetries) {
        post.status = 'failed';
        this.removePost(id);
      } else {
        // Reschedule for later
        post.status = 'pending';
        post.scheduledTime = new Date(Date.now() + (15 * 60 * 1000)); // 15 minutes later
        this.sortQueue();
      }
    }
  }

  private findPost(id: string): ScheduledPost | undefined {
    return this.postQueue.find(post => post.id === id);
  }

  private removePost(id: string): void {
    this.postQueue = this.postQueue.filter(post => post.id !== id);
  }

  private sortQueue(): void {
    this.postQueue.sort((a, b) => {
      // Sort by priority first
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Then by scheduled time
      return a.scheduledTime.getTime() - b.scheduledTime.getTime();
    });
  }

  private async calculateNextPostTime(): Promise<Date> {
    const now = new Date();
    
    // If no posts yet, start with current time
    if (!this.lastPostTime) {
      return now;
    }

    // Calculate next available slot
    const nextSlot = new Date(Math.max(
      now.getTime(),
      this.lastPostTime.getTime() + this.minTimeBetweenPosts
    ));

    // Check if we've hit daily limit
    const postsInLast24h = this.postQueue.filter(post => 
      post.scheduledTime.getTime() > now.getTime() - (24 * 60 * 60 * 1000)
    ).length;

    if (postsInLast24h >= this.maxPostsPerDay) {
      // Schedule for next day
      nextSlot.setDate(nextSlot.getDate() + 1);
      nextSlot.setHours(9, 0, 0, 0); // Start at 9 AM
    }

    return nextSlot;
  }

  private canPostNow(): boolean {
    if (!this.lastPostTime) return true;

    const now = new Date();
    const timeSinceLastPost = now.getTime() - this.lastPostTime.getTime();
    return timeSinceLastPost >= this.minTimeBetweenPosts;
  }

  private generateId(): string {
    return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getQueueStatus(): {
    queueLength: number;
    nextScheduledPost: Date | null;
    postsInLast24h: number;
  } {
    const now = new Date();
    const nextPost = this.postQueue[0]?.scheduledTime || null;
    const postsInLast24h = this.postQueue.filter(post => 
      post.scheduledTime.getTime() > now.getTime() - (24 * 60 * 60 * 1000)
    ).length;

    return {
      queueLength: this.postQueue.length,
      nextScheduledPost: nextPost,
      postsInLast24h
    };
  }

  clearQueue(): void {
    this.postQueue = [];
    this.lastPostTime = null;
  }
}