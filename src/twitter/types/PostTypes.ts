export type MediaType = 'image' | 'video' | 'gif';

export interface MediaContent {
  type: MediaType;
  url: string;
  altText?: string;  // Accessibility description
}

export interface PollOption {
  text: string;
  position: number;
}

export interface Poll {
  options: PollOption[];
  duration: number;  // Duration in minutes
}

export interface BasePost {
  content: string;
  media?: MediaContent[];
  poll?: Poll;
  scheduledTime?: Date;
}

export interface ThreadPost extends BasePost {
  index: number;
  delay?: number;  // Delay in milliseconds before posting next
}

export interface PostMetrics {
  characterCount: number;
  mediaCount: number;
  hasLink: boolean;
  hasPoll: boolean;
}

export type PostValidationError = {
  type: 'content' | 'media' | 'poll' | 'general';
  message: string;
};