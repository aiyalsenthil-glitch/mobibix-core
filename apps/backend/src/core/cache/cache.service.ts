import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { LRUCache } from 'lru-cache';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private l1Cache: LRUCache<string, any>;
  private redis: Redis | null = null;
  private pubsub: Redis | null = null;

  constructor(private readonly configService: ConfigService) {
    this.l1Cache = new LRUCache({
      max: 1000,
      ttl: 1000 * 60 * 5, // 5 minutes default
      updateAgeOnGet: true,
    });
  }

  async onModuleInit() {
    const url = this.configService.get<string>('REDIS_URL');
    const host = this.configService.get<string>('REDIS_HOST');
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD');
    const useTls = this.configService.get<string>('REDIS_TLS') === 'true';

    if (url || host) {
      try {
        const options: any = { host, port, password };
        if (useTls) {
          options.tls = {};
        }

        if (url) {
          this.redis = new Redis(url);
          this.pubsub = new Redis(url);
        } else {
          this.redis = new Redis(options);
          this.pubsub = new Redis(options);
        }

        this.pubsub.subscribe('cache-invalidation', (err) => {
          if (err) this.logger.error(`Redis PubSub Error: ${err.message}`);
        });

        this.pubsub.on('message', (channel, message) => {
          if (channel === 'cache-invalidation') {
            const { pattern } = JSON.parse(message);
            this.l1Cache.delete(pattern); // Simple match for now
            this.logger.debug(`L1 Cache Invalidation Received: ${pattern}`);
          }
        });

        this.logger.log(`Redis Cache Initialized (L2): ${host}:${port}`);
      } catch (err) {
        this.logger.error(`Failed to initialize Redis: ${err.message}`);
      }
    } else {
      this.logger.warn(
        'REDIS_HOST not set. Falling back to L1 (Memory) cache only.',
      );
    }
  }

  onModuleDestroy() {
    this.redis?.disconnect();
    this.pubsub?.disconnect();
  }

  async get<T>(key: string): Promise<T | undefined> {
    // 1. Try L1
    const l1Val = this.l1Cache.get(key);
    if (l1Val !== undefined) return l1Val as T;

    // 2. Try L2 (Redis)
    if (this.redis) {
      try {
        const l2Val = await this.redis.get(key);
        if (l2Val) {
          const parsed = JSON.parse(l2Val);
          // Backfill L1
          this.l1Cache.set(key, parsed);
          return parsed as T;
        }
      } catch (err) {
        this.logger.warn(`Redis Get Error: ${err.message}`);
      }
    }

    return undefined;
  }

  async set<T>(
    key: string,
    value: T,
    ttlMs: number = 1000 * 60 * 5,
  ): Promise<void> {
    // 1. Set L1
    this.l1Cache.set(key, value, { ttl: ttlMs });

    // 2. Set L2 (Redis)
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(value), 'PX', ttlMs);
      } catch (err) {
        this.logger.warn(`Redis Set Error: ${err.message}`);
      }
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // 1. Invalidate L1 locally
    Array.from(this.l1Cache.keys())
      .filter((k) => k.includes(pattern))
      .forEach((k) => this.l1Cache.delete(k));

    // 2. Broadcast to other nodes (PubSub)
    if (this.pubsub) {
      await this.pubsub.publish(
        'cache-invalidation',
        JSON.stringify({ pattern }),
      );
    }

    // 3. Clear L2 (Redis) - Prefix scanning in Redis is expensive,
    // usually we'd use sets or different key structures,
    // but for now we'll do simple key-based invalidation if possible or let TTL handle it.
  }

  async delete(key: string): Promise<void> {
    this.l1Cache.delete(key);
    if (this.redis) {
      await this.redis.del(key);
    }
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) return cached;

    const value = await factory();
    await this.set(key, value, ttlMs);
    return value;
  }
}
