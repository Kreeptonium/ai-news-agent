import { MonitoringService } from '../../src/monitoring/MonitoringService';

describe('MonitoringService', () => {
  let monitoring: MonitoringService;

  beforeEach(() => {
    monitoring = new MonitoringService();
  });

  describe('metrics recording', () => {
    it('should record and retrieve metrics', () => {
      monitoring.recordMetric('test_metric', 100, { tag: 'value' });
      
      const now = Date.now();
      const metrics = monitoring.getMetrics('test_metric', {
        start: now - 1000,
        end: now + 1000
      });

      expect(metrics).toHaveLength(1);
      expect(metrics[0].value).toBe(100);
      expect(metrics[0].tags).toEqual({ tag: 'value' });
    });

    it('should calculate metric statistics', () => {
      monitoring.recordMetric('test_metric', 100);
      monitoring.recordMetric('test_metric', 200);
      
      const now = Date.now();
      const stats = monitoring.getMetricStats('test_metric', {
        start: now - 1000,
        end: now + 1000
      });

      expect(stats).toEqual({
        min: 100,
        max: 200,
        avg: 150,
        count: 2
      });
    });
  });

  describe('error recording', () => {
    it('should record and retrieve errors', () => {
      const error = new Error('Test error');
      monitoring.recordError(error, 'test_module', { context: 'test' });
      
      const errors = monitoring.getRecentErrors(1);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].module).toBe('test_module');
      expect(errors[0].context).toEqual({ context: 'test' });
    });
  });

  describe('health status', () => {
    it('should provide health status', () => {
      monitoring.recordMetric('test_metric', 100);
      monitoring.recordError(new Error('Test error'), 'test_module');
      
      const status = monitoring.getHealthStatus();
      expect(status).toHaveProperty('errorCount');
      expect(status).toHaveProperty('metrics.test_metric');
      expect(status).toHaveProperty('lastError');
    });
  });

  describe('cleanup', () => {
    it('should cleanup old data', () => {
      // Record old metric
      const oldMetric = {
        value: 100,
        timestamp: Date.now() - (25 * 60 * 60 * 1000), // 25 hours ago
        tags: {}
      };
      monitoring['metrics'].set('test_metric', [oldMetric]);

      monitoring.cleanup();

      const metrics = monitoring.getMetrics('test_metric', {
        start: 0,
        end: Date.now()
      });
      expect(metrics).toHaveLength(0);
    });
  });
});