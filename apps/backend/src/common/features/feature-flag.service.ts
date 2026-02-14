import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  FeatureFlag,
  FeatureFlagScope,
  FeatureFlagConfig,
  DEFAULT_FEATURE_FLAGS,
  PREMIUM_FEATURES,
} from './feature-flags.constants';

/**
 * Feature Flag Service
 *
 * Manages feature flags with caching and tenant/shop-level overrides.
 * Supports:
 * - Global, tenant, and shop-level flags
 * - In-memory caching for performance
 * - Gradual rollout (percentage-based)
 * - Premium feature gating
 */
@Injectable()
export class FeatureFlagService {
  private readonly logger = new Logger(FeatureFlagService.name);

  // Cache: tenantId:shopId:flag -> enabled
  private cache = new Map<string, boolean>();

  // Cache TTL: 5 minutes
  private readonly CACHE_TTL = 5 * 60 * 1000;

  // Cache expiry tracking
  private cacheExpiry = new Map<string, number>();

  constructor(private prisma: PrismaService) {}
  /**
   * Check if a feature is enabled for the given context
   *
   * @param flag - The feature flag to check
   * @param tenantId - The tenant ID (optional for global checks)
   * @param shopId - The shop ID (optional for shop-level checks)
   * @returns true if feature is enabled
   */
  async isFeatureEnabled(
    flag: FeatureFlag,
    tenantId?: string,
    shopId?: string,
  ): Promise<boolean> {
    try {
      // Build cache key
      const cacheKey = this.buildCacheKey(flag, tenantId, shopId);

      // Check cache first
      const cached = this.getCached(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      // Check premium features against tenant plan
      if (tenantId && PREMIUM_FEATURES.has(flag)) {
        const hasPremium = await this.checkTenantPlan(tenantId);
        if (!hasPremium) {
          this.setCache(cacheKey, false);
          return false;
        }
      }

      // Check feature flags in order of specificity:
      // 1. Shop-level override
      // 2. Tenant-level override
      // 3. Global override
      // 4. Default value

      let enabled = DEFAULT_FEATURE_FLAGS[flag] ?? false;

      // Check global override
      const globalFlag = await this.getFeatureFlagFromDB(
        flag,
        FeatureFlagScope.GLOBAL,
      );
      if (globalFlag) {
        enabled = this.evaluateFlag(globalFlag);
      }

      // Check tenant override
      if (tenantId) {
        const tenantFlag = await this.getFeatureFlagFromDB(
          flag,
          FeatureFlagScope.TENANT,
          tenantId,
        );
        if (tenantFlag) {
          enabled = this.evaluateFlag(tenantFlag);
        }
      }

      // Check shop override
      if (tenantId && shopId) {
        const shopFlag = await this.getFeatureFlagFromDB(
          flag,
          FeatureFlagScope.SHOP,
          tenantId,
          shopId,
        );
        if (shopFlag) {
          enabled = this.evaluateFlag(shopFlag);
        }
      }

      // Cache result
      this.setCache(cacheKey, enabled);

      return enabled;
    } catch (error) {
      this.logger.error(
        `Error checking feature flag ${flag} for tenant ${tenantId}, shop ${shopId}`,
        error as Error,
      );
      // Fail open: return default value on error
      return DEFAULT_FEATURE_FLAGS[flag] ?? false;
    }
  }

  /**
   * Set a feature flag value
   *
   * @param config - Feature flag configuration
   */
  async setFeatureFlag(config: FeatureFlagConfig): Promise<void> {
    try {
      // Validate scope requirements
      if (config.scope === FeatureFlagScope.TENANT && !config.tenantId) {
        throw new BadRequestException('tenantId required for TENANT scope');
      }
      if (
        config.scope === FeatureFlagScope.SHOP &&
        (!config.tenantId || !config.shopId)
      ) {
        throw new BadRequestException(
          'tenantId and shopId required for SHOP scope',
        );
      }

      // Upsert flag in database
      await this.prisma.featureFlag.upsert({
        where: {
          flag_scope_tenantId_shopId: {
            flag: config.flag,
            scope: config.scope,
            tenantId: (config.tenantId || undefined) as string,
            shopId: (config.shopId || undefined) as string,
          },
        },
        create: {
          flag: config.flag,
          enabled: config.enabled,
          scope: config.scope,
          tenantId: config.tenantId || null,
          shopId: config.shopId || null,
          rolloutPercentage: config.rolloutPercentage || null,
          metadata: (config.metadata as any) || null,
        },
        update: {
          enabled: config.enabled,
          rolloutPercentage: config.rolloutPercentage || null,
          metadata: (config.metadata as any) || null,
        },
      });

      // Invalidate cache
      const cacheKey = this.buildCacheKey(
        config.flag,
        config.tenantId,
        config.shopId,
      );
      this.invalidateCache(cacheKey);

      this.logger.log(
        `Feature flag ${config.flag} set to ${config.enabled} for scope ${config.scope}`,
      );
    } catch (error) {
      this.logger.error(
        `Error setting feature flag ${config.flag}`,
        error as Error,
      );
      throw error;
    }
  }

  /**
   * Delete a feature flag (revert to default)
   *
   * @param flag - The feature flag
   * @param scope - The scope
   * @param tenantId - The tenant ID (for tenant/shop scope)
   * @param shopId - The shop ID (for shop scope)
   */
  async deleteFeatureFlag(
    flag: FeatureFlag,
    scope: FeatureFlagScope,
    tenantId?: string,
    shopId?: string,
  ): Promise<void> {
    try {
      await this.prisma.featureFlag.delete({
        where: {
          flag_scope_tenantId_shopId: {
            flag,
            scope,
            tenantId: (tenantId || undefined) as string,
            shopId: (shopId || undefined) as string,
          },
        },
      });

      // Invalidate cache
      const cacheKey = this.buildCacheKey(flag, tenantId, shopId);
      this.invalidateCache(cacheKey);

      this.logger.log(`Feature flag ${flag} deleted for scope ${scope}`);
    } catch (error) {
      this.logger.error(`Error deleting feature flag ${flag}`, error as Error);
      throw error;
    }
  }

  /**
   * Get all feature flags for a tenant
   *
   * @param tenantId - The tenant ID
   * @returns Map of feature flags to enabled status
   */
  async getFeatureFlagsForTenant(
    tenantId: string,
  ): Promise<Record<FeatureFlag, boolean>> {
    try {
      // Start with defaults
      const flags: Record<FeatureFlag, boolean> = { ...DEFAULT_FEATURE_FLAGS };

      // Get global overrides
      const globalFlags = await this.prisma.featureFlag.findMany({
        where: { scope: FeatureFlagScope.GLOBAL },
      });

      for (const flag of globalFlags) {
        flags[flag.flag as FeatureFlag] = this.evaluateFlag(flag);
      }

      // Get tenant overrides
      const tenantFlags = await this.prisma.featureFlag.findMany({
        where: {
          scope: FeatureFlagScope.TENANT,
          tenantId,
        },
      });

      for (const flag of tenantFlags) {
        flags[flag.flag as FeatureFlag] = this.evaluateFlag(flag);
      }

      // Filter premium features by plan
      const hasPremium = await this.checkTenantPlan(tenantId);
      if (!hasPremium) {
        for (const premiumFeature of PREMIUM_FEATURES) {
          flags[premiumFeature] = false;
        }
      }

      return flags;
    } catch (error) {
      this.logger.error(
        `Error getting feature flags for tenant ${tenantId}`,
        error as Error,
      );
      return DEFAULT_FEATURE_FLAGS;
    }
  }

  /**
   * Clear cache (useful for testing or forced refresh)
   */
  clearCache(): void {
    this.cache.clear();
    this.cacheExpiry.clear();
    this.logger.log('Feature flag cache cleared');
  }

  // ==================== PRIVATE METHODS ====================

  /**
   * Get feature flag from database
   */
  private async getFeatureFlagFromDB(
    flag: FeatureFlag,
    scope: FeatureFlagScope,
    tenantId?: string,
    shopId?: string,
  ) {
    try {
      return await this.prisma.featureFlag.findUnique({
        where: {
          flag_scope_tenantId_shopId: {
            flag,
            scope,
            tenantId: (tenantId || undefined) as string,
            shopId: (shopId || undefined) as string,
          },
        },
      });
    } catch (error) {
      this.logger.warn(
        `Error fetching feature flag ${flag} from DB`,
        error as Error,
      );
      return null;
    }
  }

  /**
   * Evaluate feature flag (handles rollout percentage)
   */
  private evaluateFlag(flag: any): boolean {
    if (!flag.enabled) {
      return false;
    }

    // If no rollout percentage, feature is fully enabled
    if (
      flag.rolloutPercentage === null ||
      flag.rolloutPercentage === undefined
    ) {
      return true;
    }

    // Gradual rollout: use random percentage
    // In production, you'd use a consistent hash based on tenantId/userId
    // to ensure same user always gets same result
    const random = Math.random() * 100;
    return random < flag.rolloutPercentage;
  }

  /**
   * Check if tenant has premium plan
   */
  private async checkTenantPlan(tenantId: string): Promise<boolean> {
    try {
      // Check tenant's subscription plan
      const subscription = await this.prisma.tenantSubscription.findFirst({
        where: {
          tenantId,
          status: 'ACTIVE',
        },
        include: {
          plan: {
            select: { code: true },
          },
        },
      });

      // Check if tenant is on premium/business plan
      // Note: Adjust this logic based on your plan codes
      return (
        subscription?.plan?.code === 'premium' ||
        subscription?.plan?.code === 'business'
      );
    } catch (error) {
      this.logger.warn(
        `Error checking tenant plan for ${tenantId}`,
        error as Error,
      );
      // Fail open: allow premium features on error
      return true;
    }
  }

  /**
   * Build cache key
   */
  private buildCacheKey(
    flag: FeatureFlag,
    tenantId?: string,
    shopId?: string,
  ): string {
    return `${tenantId || 'global'}:${shopId || 'all'}:${flag}`;
  }

  /**
   * Get from cache if valid
   */
  private getCached(key: string): boolean | undefined {
    const expiry = this.cacheExpiry.get(key);

    // Check if expired
    if (expiry && expiry < Date.now()) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return undefined;
    }

    return this.cache.get(key);
  }

  /**
   * Set cache with TTL
   */
  private setCache(key: string, value: boolean): void {
    this.cache.set(key, value);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Invalidate specific cache key
   */
  private invalidateCache(key: string): void {
    this.cache.delete(key);
    this.cacheExpiry.delete(key);
  }
}
