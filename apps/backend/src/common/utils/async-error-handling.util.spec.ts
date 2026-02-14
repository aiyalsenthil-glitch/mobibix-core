import { Logger } from '@nestjs/common';
import {
  executeAllSettled,
  withTimeout,
  withRetry,
  withFallback,
  executeSafely,
  CircuitBreaker,
} from './async-error-handling.util';

describe('Async Error Handling Utilities', () => {
  let logger: jest.Mocked<Logger>;

  beforeEach(() => {
    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
      verbose: jest.fn(),
    } as any;
  });

  describe('executeAllSettled', () => {
    it('should execute all promises even if some fail', async () => {
      const results = await executeAllSettled([
        Promise.resolve('success1'),
        Promise.reject(new Error('failure')),
        Promise.resolve('success2'),
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });

    it('should return all successful results', async () => {
      const results = await executeAllSettled([
        Promise.resolve(1),
        Promise.resolve(2),
        Promise.resolve(3),
      ]);

      expect(results.every((r) => r.status === 'fulfilled')).toBe(true);
      expect(results.map((r) => (r as any).value)).toEqual([1, 2, 3]);
    });
  });

  describe('withTimeout', () => {
    it('should resolve if promise completes within timeout', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('done'), 100),
      );
      const result = await withTimeout(promise, 200);
      expect(result).toBe('done');
    });

    it('should reject if promise exceeds timeout', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('done'), 300),
      );
      await expect(withTimeout(promise, 100, 'Timeout!')).rejects.toThrow(
        'Timeout!',
      );
    });

    it('should use default error message if not provided', async () => {
      const promise = new Promise((resolve) =>
        setTimeout(() => resolve('done'), 300),
      );
      await expect(withTimeout(promise, 100)).rejects.toThrow(
        'Operation timed out',
      );
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt if no error', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withRetry(fn, 3, 100);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const fn = jest
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValue('success');

      const result = await withRetry(fn, 3, 50, logger);

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
    });

    it('should throw after max retries exceeded', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('persistent failure'));

      await expect(withRetry(fn, 3, 50, logger)).rejects.toThrow(
        'persistent failure',
      );
      expect(fn).toHaveBeenCalledTimes(3);
      expect(logger.error).toHaveBeenCalledTimes(1);
    });
  });

  describe('withFallback', () => {
    it('should return result on success', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const result = await withFallback(fn, 'fallback', logger);

      expect(result).toBe('success');
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('should return fallback on failure', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      const result = await withFallback(fn, 'fallback', logger);

      expect(result).toBe('fallback');
      expect(logger.warn).toHaveBeenCalledTimes(1);
    });

    it('should work without logger', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      const result = await withFallback(fn, 'fallback');

      expect(result).toBe('fallback');
    });
  });

  describe('executeSafely', () => {
    it('should execute all operations and collect results', async () => {
      const operations = [
        () => Promise.resolve('result1'),
        () => Promise.resolve('result2'),
        () => Promise.resolve('result3'),
      ];

      const { results, errors } = await executeSafely(operations, logger);

      expect(results).toHaveLength(3);
      expect(errors).toHaveLength(0);
    });

    it('should collect errors but continue execution', async () => {
      const operations = [
        () => Promise.resolve('success1'),
        () => Promise.reject(new Error('failure1')),
        () => Promise.resolve('success2'),
        () => Promise.reject(new Error('failure2')),
      ];

      const { results, errors } = await executeSafely(operations, logger);

      expect(results).toHaveLength(2);
      expect(errors).toHaveLength(2);
      expect(logger.error).toHaveBeenCalledTimes(2);
    });

    it('should include operation names in error logs', async () => {
      const operations = [() => Promise.reject(new Error('failure'))];
      const names = ['Operation Alpha'];

      await executeSafely(operations, logger, names);

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Operation Alpha'),
        expect.any(String),
      );
    });
  });

  describe('CircuitBreaker', () => {
    it('should execute successfully in CLOSED state', async () => {
      const fn = jest.fn().mockResolvedValue('success');
      const breaker = new CircuitBreaker(fn, 3, 1000, logger);

      const result = await breaker.execute();

      expect(result).toBe('success');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should open circuit after threshold failures', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      const breaker = new CircuitBreaker(fn, 3, 1000, logger);

      // First 3 failures
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();

      expect(breaker.getState()).toBe('OPEN');
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Circuit breaker OPEN'),
        expect.any(String),
      );

      // 4th attempt should be blocked
      await expect(breaker.execute()).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
    });

    it('should transition to HALF_OPEN after reset timeout', async () => {
      let callCount = 0;
      const fn = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          return Promise.reject(new Error('failure'));
        }
        return Promise.resolve('recovered');
      });

      const breaker = new CircuitBreaker(fn, 3, 100, logger);

      // Trigger circuit open
      await expect(breaker.execute()).rejects.toThrow('failure');
      await expect(breaker.execute()).rejects.toThrow('failure');
      await expect(breaker.execute()).rejects.toThrow('failure');

      expect(breaker.getState()).toBe('OPEN');

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should transition to HALF_OPEN and succeed
      const result = await breaker.execute();
      expect(result).toBe('recovered');
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('should reset circuit breaker manually', async () => {
      const fn = jest.fn().mockRejectedValue(new Error('failure'));
      const breaker = new CircuitBreaker(fn, 2, 1000);

      // Open circuit
      await expect(breaker.execute()).rejects.toThrow();
      await expect(breaker.execute()).rejects.toThrow();
      expect(breaker.getState()).toBe('OPEN');

      // Manual reset
      breaker.reset();
      expect(breaker.getState()).toBe('CLOSED');
    });
  });
});
