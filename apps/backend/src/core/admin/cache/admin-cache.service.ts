import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class AdminCacheService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async get<T>(key: string): Promise<T | undefined> {
    return this.cacheManager.get<T>(key);
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    // Note: cache-manager v5+ uses ms for TTL, but nestjs/cache-manager might differ.
    // Ensure you align with your exact cache-manager config.
    await this.cacheManager.set(key, value, ttl);
  }

  async invalidate(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // cache-manager doesn't support pattern deletion natively, you need to use the store client
    // For Redis:
    const store = (this.cacheManager as any).store;
    if (store && store.getClient) {
        const client = store.getClient();
        if (client) {
             const keys = await client.keys(pattern);
             if (keys.length > 0) {
                 await client.del(...keys);
             }
        }
    }
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttl?: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined && cached !== null) {
      return cached;
    }
    const result = await factory();
    await this.set(key, result, ttl);
    return result;
  }
}
