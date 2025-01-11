import { NewsAgent } from '../../src/core/NewsAgent';
import { NewsAgentConfig } from '../../src/core/BaseAgent';

// Mock ElizaOS core and Twitter client
jest.mock('@elizaos/core', () => ({
  BaseAgent: class MockElizaBaseAgent {
    constructor(config: any) {}
    initialize() {
      return Promise.resolve();
    }
  }
}));

jest.mock('@elizaos/agent-twitter-client', () => ({
  TwitterClient: class MockTwitterClient {
    initialize() {
      return Promise.resolve();
    }
  }
}));

describe('NewsAgent', () => {
  let agent: NewsAgent;
  let mockConfig: NewsAgentConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'TestNewsAgent',
      description: 'Test news agent instance',
      newsSourceUrls: ['http://test.com'],
      postingInterval: 1000,
      memory: {
        enabled: true,
        type: 'test'
      }
    };
    agent = new NewsAgent(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should register all required actions', async () => {
      await agent.initialize();
      // @ts-ignore - accessing protected property for testing
      expect(agent.actions.execute('scrapeNews')).resolves.toBeDefined();
      // @ts-ignore
      expect(agent.actions.execute('processContent')).resolves.toBeDefined();
      // @ts-ignore
      expect(agent.actions.execute('postToTwitter')).resolves.toBeDefined();
    });
  });

  describe('main loop', () => {
    beforeEach(async () => {
      await agent.initialize();
    });

    it('should start and stop main loop without errors', async () => {
      const startPromise = agent.start();
      // Wait a short time to let the loop run
      await new Promise(resolve => setTimeout(resolve, 100));
      await agent.stop();
      await expect(startPromise).resolves.not.toThrow();
    });

    it('should handle errors gracefully', async () => {
      // @ts-ignore - accessing protected property for testing
      agent.actions.register('scrapeNews', async () => {
        throw new Error('Test error');
      });

      const startPromise = agent.start();
      await new Promise(resolve => setTimeout(resolve, 100));
      await agent.stop();
      await expect(startPromise).resolves.not.toThrow();
    });
  });
});