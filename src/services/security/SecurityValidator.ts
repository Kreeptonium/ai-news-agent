import { LoggingService } from '../../monitoring/LoggingService';
import { MonitoringService } from '../../monitoring/MonitoringService';
import { NewsArticle } from '../../scraper/NewsScraper';

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  risk: 'low' | 'medium' | 'high';
}

export class SecurityValidator {
  private readonly UNSAFE_PATTERNS = [
    /<script\b[^>]*>([\s\S]*?)<\/script>/gi,
    /<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gi,
    /javascript:/gi,
    /data:/gi,
    /vbscript:/gi
  ];

  private readonly MALICIOUS_KEYWORDS = [
    'hack', 'crack', 'exploit', 'vulnerability', 'malware',
    'ransomware', 'phishing', 'stolen', 'leak'
  ];

  constructor(
    private logger: LoggingService,
    private monitor: MonitoringService
  ) {}

  async validateArticle(article: NewsArticle): Promise<ValidationResult> {
    const issues: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for XSS attempts
      if (this.containsXSSPatterns(article.content)) {
        issues.push('Potential XSS content detected');
        riskLevel = 'high';
      }

      // Check URLs
      if (!this.isValidURL(article.url)) {
        issues.push('Invalid or suspicious URL');
        riskLevel = 'medium';
      }

      // Check content length and structure
      if (!this.hasValidStructure(article)) {
        issues.push('Invalid content structure');
        riskLevel = 'medium';
      }

      // Check for malicious content
      if (this.containsMaliciousContent(article.content)) {
        issues.push('Potentially malicious content detected');
        riskLevel = 'high';
      }

      // Record metrics
      this.monitor.recordMetric('article_validation', 1, {
        risk: riskLevel,
        issues: issues.length
      });

      return {
        isValid: issues.length === 0,
        issues,
        risk: riskLevel
      };

    } catch (error) {
      this.logger.error('SecurityValidator', 'Validation failed', error as Error);
      return {
        isValid: false,
        issues: ['Validation failed'],
        risk: 'high'
      };
    }
  }

  async validatePostContent(content: string): Promise<ValidationResult> {
    const issues: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check for XSS and unsafe patterns
      if (this.containsXSSPatterns(content)) {
        issues.push('Unsafe content patterns detected');
        riskLevel = 'high';
      }

      // Check content length
      if (!this.isValidContentLength(content)) {
        issues.push('Invalid content length');
        riskLevel = 'medium';
      }

      // Check for malicious content
      if (this.containsMaliciousContent(content)) {
        issues.push('Potentially harmful content');
        riskLevel = 'high';
      }

      // Record metrics
      this.monitor.recordMetric('post_validation', 1, {
        risk: riskLevel,
        issues: issues.length
      });

      return {
        isValid: issues.length === 0,
        issues,
        risk: riskLevel
      };

    } catch (error) {
      this.logger.error('SecurityValidator', 'Post validation failed', error as Error);
      return {
        isValid: false,
        issues: ['Validation failed'],
        risk: 'high'
      };
    }
  }

  private containsXSSPatterns(content: string): boolean {
    return this.UNSAFE_PATTERNS.some(pattern => pattern.test(content));
  }

  private isValidURL(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return ['http:', 'https:'].includes(parsedUrl.protocol);
    } catch {
      return false;
    }
  }

  private hasValidStructure(article: NewsArticle): boolean {
    return (
      typeof article.title === 'string' &&
      article.title.length > 0 &&
      typeof article.content === 'string' &&
      article.content.length > 0 &&
      this.isValidURL(article.url)
    );
  }

  private containsMaliciousContent(content: string): boolean {
    const lowerContent = content.toLowerCase();
    return this.MALICIOUS_KEYWORDS.some(keyword => 
      lowerContent.includes(keyword.toLowerCase())
    );
  }

  private isValidContentLength(content: string): boolean {
    const MIN_LENGTH = 1;
    const MAX_LENGTH = 280; // Twitter limit
    return content.length >= MIN_LENGTH && content.length <= MAX_LENGTH;
  }

  async validateMedia(mediaUrl: string): Promise<ValidationResult> {
    const issues: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Check URL structure
      if (!this.isValidURL(mediaUrl)) {
        issues.push('Invalid media URL');
        riskLevel = 'medium';
      }

      // Check file extension
      if (!this.hasValidMediaExtension(mediaUrl)) {
        issues.push('Invalid media type');
        riskLevel = 'medium';
      }

      return {
        isValid: issues.length === 0,
        issues,
        risk: riskLevel
      };

    } catch (error) {
      this.logger.error('SecurityValidator', 'Media validation failed', error as Error);
      return {
        isValid: false,
        issues: ['Media validation failed'],
        risk: 'high'
      };
    }
  }

  private hasValidMediaExtension(url: string): boolean {
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4'];
    const extension = url.toLowerCase().split('.').pop();
    return extension ? validExtensions.includes(`.${extension}`) : false;
  }

  getValidationStats(): Record<string, any> {
    return {
      // Add validation statistics
    };
  }
}