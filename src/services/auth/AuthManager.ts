import { LoggingService } from '../../monitoring/LoggingService';
import { MonitoringService } from '../../monitoring/MonitoringService';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

interface ApiKey {
  key: string;
  secret: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  createdAt: Date;
  lastUsed?: Date;
}

interface JWTPayload {
  keyId: string;
  name: string;
  permissions: string[];
  exp: number;
}

export class AuthManager {
  private apiKeys: Map<string, ApiKey> = new Map();
  private readonly JWT_SECRET: string;
  private readonly TOKEN_EXPIRY = '1h';

  constructor(
    private logger: LoggingService,
    private monitor: MonitoringService,
    jwtSecret?: string
  ) {
    this.JWT_SECRET = jwtSecret || crypto.randomBytes(32).toString('hex');
    this.loadInitialKeys();
  }

  private loadInitialKeys() {
    // Load API keys from environment or configuration
    const defaultKey: ApiKey = {
      key: process.env.DEFAULT_API_KEY || 'default-key',
      secret: process.env.DEFAULT_API_SECRET || 'default-secret',
      name: 'Default API Key',
      permissions: ['read', 'write'],
      rateLimit: 100,
      createdAt: new Date()
    };
    
    this.apiKeys.set(defaultKey.key, defaultKey);
  }

  async validateApiKey(key: string, secret: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      this.monitor.recordMetric('auth_failure', 1, { reason: 'invalid_key' });
      return false;
    }

    const isValid = apiKey.secret === secret;
    if (isValid) {
      apiKey.lastUsed = new Date();
      this.monitor.recordMetric('auth_success', 1);
    } else {
      this.monitor.recordMetric('auth_failure', 1, { reason: 'invalid_secret' });
    }

    return isValid;
  }

  async generateToken(key: string): Promise<string | null> {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) {
      this.logger.error('AuthManager', 'Token generation failed - invalid key');
      return null;
    }

    try {
      const payload: JWTPayload = {
        keyId: key,
        name: apiKey.name,
        permissions: apiKey.permissions,
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
      };

      const token = jwt.sign(payload, this.JWT_SECRET);
      this.monitor.recordMetric('token_generated', 1);
      return token;
    } catch (error) {
      this.logger.error('AuthManager', 'Token generation failed', error as Error);
      return null;
    }
  }

  async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as JWTPayload;
      
      // Verify key still exists and is valid
      if (!this.apiKeys.has(decoded.keyId)) {
        throw new Error('Invalid key ID');
      }

      this.monitor.recordMetric('token_verified', 1);
      return decoded;
    } catch (error) {
      this.logger.error('AuthManager', 'Token verification failed', error as Error);
      this.monitor.recordMetric('token_verification_failed', 1);
      return null;
    }
  }

  async createApiKey(
    name: string,
    permissions: string[] = ['read'],
    rateLimit: number = 100
  ): Promise<ApiKey> {
    const key = crypto.randomBytes(16).toString('hex');
    const secret = crypto.randomBytes(32).toString('hex');

    const apiKey: ApiKey = {
      key,
      secret,
      name,
      permissions,
      rateLimit,
      createdAt: new Date()
    };

    this.apiKeys.set(key, apiKey);
    this.monitor.recordMetric('api_key_created', 1);

    return apiKey;
  }

  async revokeApiKey(key: string): Promise<boolean> {
    const exists = this.apiKeys.delete(key);
    if (exists) {
      this.monitor.recordMetric('api_key_revoked', 1);
    }
    return exists;
  }

  hasPermission(token: JWTPayload, requiredPermission: string): boolean {
    return token.permissions.includes(requiredPermission);
  }

  getApiKeyInfo(key: string): Omit<ApiKey, 'secret'> | null {
    const apiKey = this.apiKeys.get(key);
    if (!apiKey) return null;

    const { secret, ...info } = apiKey;
    return info;
  }

  getAuthStats(): Record<string, any> {
    return {
      totalKeys: this.apiKeys.size,
      activeKeys: Array.from(this.apiKeys.values()).filter(key => {
        const lastUsed = key.lastUsed || key.createdAt;
        const hoursSinceLastUse = 
          (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60);
        return hoursSinceLastUse < 24;
      }).length
    };
  }
}