import { Injectable } from '@nestjs/common';
import { LRUCache } from 'lru-cache';

/**
 * In-memory caching service using LRU (Least Recently Used) cache
 *
 * Use cases:
 * - Tenant subscriptions (changes infrequently)
 * - Plan capabilities (static data)
 * - Tenant settings (low update frequency)
 * - User permissions (moderate update frequency)
 *
 * DO NOT cache:
 * - Real-time data (invoices, members, payments)
 * - Frequently changing data
 * - Large datasets
 */
@Injectable()
export class CacheService {
  private cache: LRUCache<string, any>;

  constructor() {
    this.cache = new LRUCache({
      max: 500, // Maximum 500 items in cache
      ttl: 1000 * 60 * 5, // Default TTL: 5 minutes
      updateAgeOnGet: true, // Reset TTL on access (keeps hot data longer)
      updateAgeOnHas: false, // Don't reset TTL on existence check
    });
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or undefined
   */
  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (optional, defaults to 5 min)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    if (ttl) {
      this.cache.set(key, value, { ttl });
    } else {
      this.cache.set(key, value);
    }
  }

  /**
   * Check if key exists in cache
   * @param key Cache key
   * @returns True if key exists
   */
  has(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Delete key from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns Cache stats object
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.cache.max,
      calculatedSize: this.cache.calculatedSize,
    };
  }

  /**
   * Invalidate cache entries matching a pattern
   * Useful for invalidating all entries for a tenant
   *
   * @param pattern String pattern to match (e.g., 'tenant:abc123')
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const keysArray = Array.from(this.cache.keys());
    for (const key of keysArray) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Get or set pattern: Try to get from cache, if miss, compute and cache
   *
   * @param key Cache key
   * @param factory Function to compute value if cache miss
   * @param ttl Optional TTL in milliseconds
   * @returns Cached or computed value
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttl);
    return value;
  }
}
