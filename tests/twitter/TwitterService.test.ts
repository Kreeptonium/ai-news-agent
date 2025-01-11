import { TwitterService } from '../../src/twitter/TwitterService';
import type { ProcessedContent } from '../../src/processor/ContentProcessor';

// Mock ElizaOS Twitter client
jest.mock('@elizaos/agent-twitter-client', () => ({
  TwitterClient: jest.fn().mockImplementation(() => ({
    initialize: jest.fn().mockResolvedValue(undefined),
    verifySession: jest.fn().mockResolvedValue(true),
    authenticate: jest.fn().mockResolvedValue(undefined),
    post: jest.fn().mockResolvedValue(undefined),
    cleanup: jest.fn().mockResolvedValue(undefined)
  }))
}));

describe('TwitterService', () => {
  let twitterService: TwitterService;
  let mockContent: ProcessedContent;

  beforeEach(() => {
    twitterService = new TwitterService({
      username: 'test_user'
    });

    mockContent = {
      title: 'Test Article',
      summary: 'Test summary',
      hashtags: ['#AI', '#Tech'],
      sourceUrl: 'http://test.com',
      sentiment: 'positive',
      category: 'Technology',
      tweetContent: 'Test tweet content #AI #Tech http://test.com'
    };
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(twitterService.initialize()).resolves.not.toThrow();
    });

    it('should handle initialization failure', async () => {
      const TwitterClient = require('@elizaos/agent-twitter-client').TwitterClient;
      TwitterClient.mockImplementation(() => ({
        initialize: jest.fn().mockRejectedValue(new Error('Init failed'))
      }));

      const failingService = new TwitterService({ username: 'test_user' });
      await expect(failingService.initialize()).rejects.toThrow('Init failed');
    });
  });

  describe('tweet posting', () => {
    beforeEach(async () => {
      await twitterService.initialize();
    });

    it('should post tweet successfully', async () => {
      await expect(twitterService.postTweet(mockContent)).resolves.toBe(true);
    });

    it('should handle long tweets', async () => {
      const longContent = {
        ...mockContent,
        tweetContent: 'A'.repeat(300)
      };

      await expect(twitterService.postTweet(longContent)).resolves.toBe(true);
    });

    it('should fail when not initialized', async () => {
      const uninitializedService = new TwitterService({ username: 'test_user' });
      await expect(uninitializedService.postTweet(mockContent)).rejects.toThrow('not initialized');
    });
  });

  describe('cleanup', () => {
    it('should cleanup successfully', async () => {
      await twitterService.initialize();
      await expect(twitterService.cleanup()).resolves.not.toThrow();
    });
  });
});