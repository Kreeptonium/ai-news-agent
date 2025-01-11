export class ScrapingError extends Error {
  constructor(
    message: string,
    public url?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'ScrapingError';
  }
}

export class ContentProcessingError extends Error {
  constructor(
    message: string,
    public articleId?: string,
    public stage?: string
  ) {
    super(message);
    this.name = 'ContentProcessingError';
  }
}

export class TwitterError extends Error {
  constructor(
    message: string,
    public action?: string,
    public isRateLimit?: boolean
  ) {
    super(message);
    this.name = 'TwitterError';
  }
}

export class MemoryError extends Error {
  constructor(
    message: string,
    public operation?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'MemoryError';
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public value?: any
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class SystemError extends Error {
  constructor(
    message: string,
    public component?: string,
    public fatal?: boolean
  ) {
    super(message);
    this.name = 'SystemError';
  }
}