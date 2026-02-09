import { Module, Global } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Global cache module - available throughout the application
 * Import once in AppModule, use everywhere without re-importing
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}
