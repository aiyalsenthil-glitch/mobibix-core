import { Logger } from '@nestjs/common';

/**
 * Async Error Handling Utilities
 *
 * Provides fault-tolerant wrappers for async operations to prevent
 * cascading failures and improve system reliability.
 */

/**
 * Execute multiple promises with individual error handling
 * Unlike Promise.all which fails fast on first error, this executes
 * all promises and returns results with error states preserved.
 *
 * @param promises Array of promises to execute
 * @returns Array of settled results
 *
 * @example
 * const results = await executeAllSettled([
 *   sendEmail(user1),
 *   sendEmail(user2),
 *   sendEmail(user3),
 * ]);
 *
 * const successful = results.filter(r => r.status === 'fulfilled');
 * const failed = results.filter(r => r.status === 'rejected');
 */
export async function executeAllSettled<T>(
  promises: Promise<T>[],
): Promise<Array<PromiseSettledResult<T>>> {
  return Promise.allSettled(promises);
}

/**
 * Execute promise with timeout
 * Rejects if promise doesn't resolve within specified time
 *
 * @param promise Promise to execute
 * @param timeoutMs Timeout in milliseconds
 * @param errorMessage Custom error message on timeout
 * @returns Promise result or rejects on timeout
 *
 * @example
 * const data = await withTimeout(
 *   fetch('https://api.example.com/data'),
 *   5000,
 *   'API request timed out'
 * );
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out',
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs),
  );

  return Promise.race([promise, timeout]);
}

/**
 * Execute async function with retry logic
 * Automatically retries on failure with exponential backoff
 *
 * @param fn Async function to execute
 * @param maxRetries Maximum number of retry attempts
 * @param delayMs Base delay between retries (exponential backoff applied)
 * @param logger Optional logger for retry attempts
 * @returns Promise result
 *
 * @example
 * const data = await withRetry(
 *   () => fetchFromUnreliableAPI(),
 *   3,
 *   1000,
 *   logger
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000,
  logger?: Logger,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries) {
        if (logger) {
          logger.error(
            `Operation failed after ${maxRetries} attempts`,
            error instanceof Error ? error.stack : String(error),
          );
        }
        throw error;
      }

      const backoffDelay = delayMs * Math.pow(2, attempt - 1);

      if (logger) {
        logger.warn(
          `Attempt ${attempt}/${maxRetries} failed. Retrying in ${backoffDelay}ms...`,
          error instanceof Error ? error.message : String(error),
        );
      }

      await new Promise((resolve) => setTimeout(resolve, backoffDelay));
    }
  }

  throw lastError;
}

/**
 * Execute async function with fallback value on error
 * Returns default value instead of throwing on failure
 *
 * @param fn Async function to execute
 * @param fallback Fallback value to return on error
 * @param logger Optional logger for errors
 * @returns Promise result or fallback value
 *
 * @example
 * const config = await withFallback(
 *   () => fetchConfig(),
 *   { defaultSetting: true },
 *   logger
 * );
 */
export async function withFallback<T>(
  fn: () => Promise<T>,
  fallback: T,
  logger?: Logger,
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (logger) {
      logger.warn(
        'Operation failed, using fallback value',
        error instanceof Error ? error.message : String(error),
      );
    }
    return fallback;
  }
}

/**
 * Execute multiple async operations safely with logging
 * Logs individual failures but doesn't stop execution
 *
 * @param operations Array of async functions
 * @param logger Logger instance for error tracking
 * @param operationNames Optional names for operations (for logging)
 * @returns Array of results (successful) and errors
 *
 * @example
 * const { results, errors } = await executeSafely([
 *   () => sendEmail(user1),
 *   () => sendEmail(user2),
 *   () => sendSMS(user3),
 * ], logger, ['Email User1', 'Email User2', 'SMS User3']);
 */
export async function executeSafely<T>(
  operations: Array<() => Promise<T>>,
  logger: Logger,
  operationNames?: string[],
): Promise<{
  results: T[];
  errors: Array<{ index: number; error: unknown; name?: string }>;
}> {
  const promises = operations.map((op, index) =>
    op().catch((error) => ({
      __error: true,
      index,
      error,
      name: operationNames?.[index],
    })),
  );

  const settled = await Promise.all(promises);

  const results: T[] = [];
  const errors: Array<{ index: number; error: unknown; name?: string }> = [];

  settled.forEach((result, index) => {
    if (result && typeof result === 'object' && '__error' in result) {
      const errorResult = result as {
        __error: boolean;
        index: number;
        error: unknown;
        name?: string;
      };
      errors.push({
        index: errorResult.index,
        error: errorResult.error,
        name: errorResult.name,
      });
      logger.error(
        `Operation${errorResult.name ? ` "${errorResult.name}"` : ` ${index + 1}`} failed`,
        errorResult.error instanceof Error
          ? errorResult.error.stack
          : String(errorResult.error),
      );
    } else {
      results.push(result as T);
    }
  });

  return { results, errors };
}

/**
 * Circuit breaker pattern for async operations
 * Prevents cascading failures by opening circuit after threshold failures
 */
export class CircuitBreaker<T> {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private fn: () => Promise<T>,
    private threshold: number = 5,
    private resetTimeoutMs: number = 60000,
    private logger?: Logger,
  ) {}

  async execute(): Promise<T> {
    if (this.state === 'OPEN') {
      const timeSinceFailure = Date.now() - this.lastFailureTime;

      if (timeSinceFailure >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        if (this.logger) {
          this.logger.log('Circuit breaker entering HALF_OPEN state');
        }
      } else {
        throw new Error('Circuit breaker is OPEN - operation blocked');
      }
    }

    try {
      const result = await this.fn();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
        if (this.logger) {
          this.logger.log('Circuit breaker CLOSED - service recovered');
        }
      }

      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        if (this.logger) {
          this.logger.error(
            `Circuit breaker OPEN after ${this.failures} failures`,
            error instanceof Error ? error.stack : String(error),
          );
        }
      }

      throw error;
    }
  }

  getState() {
    return this.state;
  }

  reset() {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
  }
}
