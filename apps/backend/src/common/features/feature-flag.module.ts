import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlagGuard } from './feature-flag.guard';

/**
 * Feature Flag Module
 *
 * Provides feature flag management system with:
 * - Dynamic feature toggling (global/tenant/shop level)
 * - In-memory caching for performance
 * - Guard for route protection
 * - Premium feature gating
 */
@Module({
  providers: [FeatureFlagService, FeatureFlagGuard],
  exports: [FeatureFlagService, FeatureFlagGuard],
})
export class FeatureFlagModule {}
