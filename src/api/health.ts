import { HealthChecker } from '../services/health/HealthChecker';

export class HealthAPI {
  constructor(private healthChecker: HealthChecker) {}

  async getHealthStatus(): Promise<any> {
    const status = await this.healthChecker.checkHealth();

    // Return detailed status for monitoring systems
    return {
      status: status.status,
      timestamp: status.timestamp,
      components: status.components,
      checks: {
        queue: this.getComponentDetails(status.components.queue),
        twitter: this.getComponentDetails(status.components.twitter),
        storage: this.getComponentDetails(status.components.storage),
        system: this.getComponentDetails(status.components.system),
        rateLimiter: this.getComponentDetails(status.components.rateLimiter)
      }
    };
  }

  async getLivenessCheck(): Promise<any> {
    // Simple check for kubernetes liveness probe
    return {
      status: 'alive',
      timestamp: new Date()
    };
  }

  async getReadinessCheck(): Promise<any> {
    // Check if service is ready to handle requests
    const status = this.healthChecker.getLastCheck();
    if (!status) {
      return {
        status: 'not_ready',
        message: 'Health check not performed yet'
      };
    }

    return {
      status: status.status === 'healthy' ? 'ready' : 'not_ready',
      components: Object.entries(status.components).reduce(
        (acc, [name, health]) => ({
          ...acc,
          [name]: health.status === 'healthy'
        }), {}
      )
    };
  }

  private getComponentDetails(component: any) {
    if (!component) return { status: 'unknown' };

    return {
      status: component.status,
      message: component.message,
      lastCheck: component.lastCheck,
      details: component.details || {}
    };
  }
}