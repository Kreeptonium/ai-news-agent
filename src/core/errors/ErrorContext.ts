export const createErrorContext = (
  module: string,
  operation: string,
  data?: Record<string, any>,
  retry?: {
    count: number;
    maxRetries: number;
    lastAttempt: Date;
  }
) => ({
  module,
  operation,
  data,
  retry
});