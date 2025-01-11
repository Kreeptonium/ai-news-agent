import { BaseAgent, NewsAgentConfig } from '../../src/core/BaseAgent';

// Mock ElizaOS core
jest.mock('@elizaos/core', () => ({
  BaseAgent: class MockElizaBaseAgent {
    constructor(config: any) {}
    initialize() {
      return Promise.resolve();
    }
  }
}));

describe('BaseAgent', () => {
  let agent: BaseAgent;
  let mockConfig: NewsAgentConfig;

  beforeEach(() => {
    mockConfig = {
      name: 'TestAgent',
      description: 'Test agent instance',
      newsSourceUrls: ['http://test.com'],
      postingInterval: 1000,
      memory: {
        enabled: true,
        type: 'test'
      }
    };
    agent = new BaseAgent(mockConfig);
  });

  describe('initialization', () => {
    it('should initialize successfully', async () => {
      await expect(agent.initialize()).resolves.not.toThrow();
    });

    it('should register health check action', async () => {
      await agent.initialize();
      // @ts-ignore - accessing protected property for testing
      const healthCheck = await agent.actions.execute('healthCheck');
      expect(healthCheck).toHaveProperty('status', 'healthy');
      expect(healthCheck).toHaveProperty('timestamp');
    });
  });

  describe('start and stop', () => {
    it('should start without errors', async () => {
      await expect(agent.start()).resolves.not.toThrow();
    });

    it('should stop without errors', async () => {
      await expect(agent.stop()).resolves.not.toThrow();
    });
  });
});