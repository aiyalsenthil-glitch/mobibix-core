import { SetMetadata } from '@nestjs/common';

/**
 * Decorator to set custom rate limit for specific endpoints
 * @param ttl Time to live in milliseconds
 * @param limit Maximum requests allowed in TTL window
 */
export const RateLimit = (ttl: number, limit: number) =>
  SetMetadata('throttler', { ttl, limit });

/**
 * Skip rate limiting for specific endpoint
 */
export const SkipThrottle = () => SetMetadata('skipThrottle', true);
