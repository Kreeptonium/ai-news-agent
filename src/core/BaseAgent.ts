import { BaseAgent as ElizaBaseAgent, AgentConfig } from '@elizaos/core';

export interface NewsAgentConfig extends AgentConfig {
  name: string;
  description: string;
  newsSourceUrls: string[];
  postingInterval: number;
  memory: {
    enabled: boolean;
    type: string;
  };
}

export class BaseAgent extends ElizaBaseAgent {
  protected config: NewsAgentConfig;

  constructor(config: NewsAgentConfig) {
    super(config);
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      console.log(`Initializing agent: ${this.config.name}`);
      await super.initialize();
      await this.setupMemory();
      await this.registerActions();
      console.log('Agent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agent:', error);
      throw error;
    }
  }

  private async setupMemory(): Promise<void> {
    if (this.config.memory.enabled) {
      // Initialize memory provider
      console.log('Setting up memory system...');
      // TODO: Implement memory setup
    }
  }

  protected async registerActions(): Promise<void> {
    // Register core actions
    this.actions.register('healthCheck', async () => {
      return { status: 'healthy', timestamp: new Date().toISOString() };
    });
  }

  async start(): Promise<void> {
    console.log('Starting agent...');
    await this.runHealthCheck();
  }

  private async runHealthCheck(): Promise<void> {
    try {
      const health = await this.actions.execute('healthCheck');
      console.log('Health check result:', health);
    } catch (error) {
      console.error('Health check failed:', error);
    }
  }

  async stop(): Promise<void> {
    console.log('Stopping agent...');
    // Cleanup code here
  }
}