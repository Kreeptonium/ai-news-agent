import { LoggingService } from '../../monitoring/LoggingService';
import { MonitoringService } from '../../monitoring/MonitoringService';

interface FilterConfig {
  profanityFilter: boolean;
  sensitiveTopicsFilter: boolean;
  harassmentFilter: boolean;
  spamFilter: boolean;
}

interface FilterResult {
  isAllowed: boolean;
  reason?: string;
  modifications?: string[];
}

export class ContentFilter {
  private config: FilterConfig;

  // These would be more comprehensive in production
  private readonly PROFANITY_LIST = ['badword1', 'badword2'];
  private readonly SENSITIVE_TOPICS = ['sensitive1', 'sensitive2'];
  private readonly SPAM_PATTERNS = [
    /\b(buy|cheap|discount|offer)\b/gi,
    /\b(free|win|winner|prize)\b/gi
  ];

  constructor(
    private logger: LoggingService,
    private monitor: MonitoringService,
    config?: Partial<FilterConfig>
  ) {
    this.config = {
      profanityFilter: true,
      sensitiveTopicsFilter: true,
      harassmentFilter: true,
      spamFilter: true,
      ...config
    };
  }

  async filterContent(content: string): Promise<FilterResult> {
    const modifications: string[] = [];
    let filteredContent = content;
    let isAllowed = true;
    let reason: string | undefined;

    try {
      // Check profanity
      if (this.config.profanityFilter) {
        const profanityResult = this.checkProfanity(filteredContent);
        if (!profanityResult.isAllowed) {
          isAllowed = false;
          reason = 'Contains profanity';
        } else if (profanityResult.modified) {
          filteredContent = profanityResult.content;
          modifications.push('Profanity filtered');
        }
      }

      // Check sensitive topics
      if (this.config.sensitiveTopicsFilter) {
        const sensitiveResult = this.checkSensitiveTopics(filteredContent);
        if (!sensitiveResult.isAllowed) {
          isAllowed = false;
          reason = 'Contains sensitive topics';
        }
      }

      // Check harassment
      if (this.config.harassmentFilter) {
        const harassmentResult = this.checkHarassment(filteredContent);
        if (!harassmentResult.isAllowed) {
          isAllowed = false;
          reason = 'Contains harassment';
        }
      }

      // Check spam
      if (this.config.spamFilter) {
        const spamResult = this.checkSpam(filteredContent);
        if (!spamResult.isAllowed) {
          isAllowed = false;
          reason = 'Detected as spam';
        }
      }

      // Record metrics
      this.monitor.recordMetric('content_filtered', 1, {
        allowed: isAllowed,
        modifications: modifications.length
      });

      return {
        isAllowed,
        reason,
        modifications
      };

    } catch (error) {
      this.logger.error('ContentFilter', 'Filtering failed', error as Error);
      return {
        isAllowed: false,
        reason: 'Filtering error'
      };
    }
  }

  private checkProfanity(content: string): {
    isAllowed: boolean;
    modified: boolean;
    content: string;
  } {
    let modified = false;
    let filteredContent = content;

    for (const word of this.PROFANITY_LIST) {
      if (content.toLowerCase().includes(word)) {
        filteredContent = filteredContent.replace(
          new RegExp(word, 'gi'),
          '*'.repeat(word.length)
        );
        modified = true;
      }
    }

    return {
      isAllowed: true,
      modified,
      content: filteredContent
    };
  }

  private checkSensitiveTopics(content: string): {
    isAllowed: boolean;
  } {
    const contentLower = content.toLowerCase();
    const hasSensitiveTopics = this.SENSITIVE_TOPICS.some(topic =>
      contentLower.includes(topic.toLowerCase())
    );

    return {
      isAllowed: !hasSensitiveTopics
    };
  }

  private checkHarassment(content: string): {
    isAllowed: boolean;
  } {
    // Implement harassment detection logic
    return {
      isAllowed: true
    };
  }

  private checkSpam(content: string): {
    isAllowed: boolean;
  } {
    const isSpam = this.SPAM_PATTERNS.some(pattern =>
      pattern.test(content)
    );

    return {
      isAllowed: !isSpam
    };
  }

  updateConfig(newConfig: Partial<FilterConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };
  }

  getFilterStats(): Record<string, any> {
    return {
      config: this.config,
      // Add filtering statistics
    };
  }
}