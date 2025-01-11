import { AuthManager } from '../services/auth/AuthManager';
import { LoggingService } from '../monitoring/LoggingService';
import { MonitoringService } from '../monitoring/MonitoringService';

export class AuthMiddleware {
  constructor(
    private authManager: AuthManager,
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {}

  authenticate = async (req: any, res: any, next: any) => {
    try {
      // Check for API key in headers
      const apiKey = req.headers['x-api-key'];
      const apiSecret = req.headers['x-api-secret'];

      if (!apiKey || !apiSecret) {
        this.monitor.recordMetric('auth_missing_credentials', 1);
        return res.status(401).json({
          error: 'Missing authentication credentials'
        });
      }

      // Validate API key
      const isValid = await this.authManager.validateApiKey(apiKey, apiSecret);
      if (!isValid) {
        this.monitor.recordMetric('auth_invalid_credentials', 1);
        return res.status(401).json({
          error: 'Invalid authentication credentials'
        });
      }

      // Generate JWT token
      const token = await this.authManager.generateToken(apiKey);
      if (!token) {
        this.monitor.recordMetric('auth_token_generation_failed', 1);
        return res.status(500).json({
          error: 'Failed to generate token'
        });
      }

      // Add token to request
      req.token = token;
      next();

    } catch (error) {
      this.logger.error('AuthMiddleware', 'Authentication failed', error as Error);
      this.monitor.recordMetric('auth_error', 1);
      return res.status(500).json({
        error: 'Authentication failed'
      });
    }
  };

  authorize = (requiredPermission: string) => {
    return async (req: any, res: any, next: any) => {
      try {
        // Get token from request
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
          this.monitor.recordMetric('auth_missing_token', 1);
          return res.status(401).json({
            error: 'Missing authorization token'
          });
        }

        // Verify token
        const decoded = await this.authManager.verifyToken(token);
        if (!decoded) {
          this.monitor.recordMetric('auth_invalid_token', 1);
          return res.status(401).json({
            error: 'Invalid token'
          });
        }

        // Check permission
        if (!this.authManager.hasPermission(decoded, requiredPermission)) {
          this.monitor.recordMetric('auth_insufficient_permissions', 1);
          return res.status(403).json({
            error: 'Insufficient permissions'
          });
        }

        // Add decoded token to request
        req.user = decoded;
        next();

      } catch (error) {
        this.logger.error('AuthMiddleware', 'Authorization failed', error as Error);
        this.monitor.recordMetric('auth_error', 1);
        return res.status(500).json({
          error: 'Authorization failed'
        });
      }
    };
  };

  rateLimit = async (req: any, res: any, next: any) => {
    try {
      const apiKey = req.headers['x-api-key'];
      const keyInfo = this.authManager.getApiKeyInfo(apiKey);

      if (!keyInfo) {
        return res.status(401).json({
          error: 'Invalid API key'
        });
      }

      // Implement rate limiting logic
      // This is a simple example; in production, use a proper rate limiting solution
      const rateLimitKey = `rate_limit:${apiKey}`;
      const currentRequests = parseInt(req.app.get(rateLimitKey) || '0');

      if (currentRequests >= keyInfo.rateLimit) {
        this.monitor.recordMetric('rate_limit_exceeded', 1);
        return res.status(429).json({
          error: 'Rate limit exceeded'
        });
      }

      req.app.set(rateLimitKey, currentRequests + 1);
      setTimeout(() => {
        req.app.set(rateLimitKey, currentRequests);
      }, 60000); // Reset after 1 minute

      next();

    } catch (error) {
      this.logger.error('AuthMiddleware', 'Rate limiting failed', error as Error);
      next();
    }
  };
}