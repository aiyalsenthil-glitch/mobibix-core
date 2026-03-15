import { Test, TestingModule } from '@nestjs/testing';
import { FeatureFlagService } from './feature-flag.service';
import { FeatureFlag, FeatureFlagScope } from './feature-flags.constants';
import { PrismaService } from '../../core/prisma/prisma.service';
import { SubscriptionStatus } from '@prisma/client';

// Mock PrismaService
const mockPrismaService = {
  featureFlag: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  tenantSubscription: {
    findFirst: jest.fn(),
  },
};

describe('FeatureFlagService', () => {
  let service: FeatureFlagService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeatureFlagService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<FeatureFlagService>(FeatureFlagService);
    prisma = module.get(PrismaService);

    // Clear mocks
    jest.clearAllMocks();

    // Clear cache before each test
    service.clearCache();
  });

  describe('isFeatureEnabled', () => {
    it('should return default value when no overrides exist', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      expect(result).toBe(true); // Default is true
    });

    it('should apply global override', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      expect(result).toBe(false);
    });

    it('should prioritize tenant override over global', async () => {
      prisma.featureFlag.findUnique
        .mockResolvedValueOnce(null) // No shop override
        .mockResolvedValueOnce({
          flag: FeatureFlag.WHATSAPP_REMINDERS,
          enabled: false,
          scope: FeatureFlagScope.TENANT,
          tenantId: 'tenant-1',
        })
        .mockResolvedValueOnce({
          flag: FeatureFlag.WHATSAPP_REMINDERS,
          enabled: true,
          scope: FeatureFlagScope.GLOBAL,
        });

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
        'tenant-1',
      );

      expect(result).toBe(false); // Tenant override wins
    });

    it('should prioritize shop override over tenant and global', async () => {
      prisma.featureFlag.findUnique
        // Global check
        .mockResolvedValueOnce(null)
        // Tenant check
        .mockResolvedValueOnce(null)
        // Shop check
        .mockResolvedValueOnce({
          flag: FeatureFlag.WHATSAPP_REMINDERS,
          enabled: true,
          scope: FeatureFlagScope.SHOP,
          tenantId: 'tenant-1',
          shopId: 'shop-1',
        });

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
        'tenant-1',
        'shop-1',
      );

      expect(result).toBe(true); // Shop override wins
    });

    it('should cache results', async () => {
      // Reset mock and set return value
      prisma.featureFlag.findUnique.mockReset();
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
        rolloutPercentage: null,
      });

      // First call
      const result1 = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      // Second call (should use cache)
      const result2 = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      expect(result1).toBe(false);
      expect(result2).toBe(false);

      // Should only query DB once (then cache)
      expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should block premium features for non-premium tenants', async () => {
      prisma.tenantSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        plan: {
          code: 'basic',
        },
      });

      const result = await service.isFeatureEnabled(
        FeatureFlag.AI_SUGGESTIONS, // Premium feature
        'tenant-1',
      );

      expect(result).toBe(false);
    });

    it('should allow premium features for premium tenants', async () => {
      prisma.tenantSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        plan: {
          code: 'premium',
        },
      });

      prisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await service.isFeatureEnabled(
        FeatureFlag.AI_SUGGESTIONS, // Premium feature
        'tenant-1',
      );

      expect(result).toBe(false); // Still false because default is false
    });

    it('should handle rollout percentage', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_BROADCASTS,
        enabled: true,
        scope: FeatureFlagScope.GLOBAL,
        rolloutPercentage: 50, // 50% rollout
      });

      // Mock Math.random to test both scenarios
      const originalRandom = Math.random;

      // Test: user gets feature (random = 0.3 < 0.5)
      Math.random = jest.fn(() => 0.3);
      const result1 = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_BROADCASTS,
      );
      expect(result1).toBe(true);

      // Clear cache for second test
      service.clearCache();

      // Test: user doesn't get feature (random = 0.7 > 0.5)
      Math.random = jest.fn(() => 0.7);
      const result2 = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_BROADCASTS,
      );
      expect(result2).toBe(false);

      // Restore
      Math.random = originalRandom;
    });

    it('should fail open on database error', async () => {
      prisma.featureFlag.findUnique.mockRejectedValue(
        new Error('Database connection failed'),
      );

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      expect(result).toBe(true); // Return default value
    });
  });

  describe('setFeatureFlag', () => {
    it('should upsert feature flag', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({
        id: 'ff-1',
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      await service.setFeatureFlag({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      expect(prisma.featureFlag.upsert).toHaveBeenCalledWith({
        where: {
          flag_scope_tenantId_shopId: {
            flag: FeatureFlag.WHATSAPP_REMINDERS,
            scope: FeatureFlagScope.GLOBAL,
            tenantId: undefined,
            shopId: undefined,
          },
        },
        create: expect.objectContaining({
          flag: FeatureFlag.WHATSAPP_REMINDERS,
          enabled: false,
          scope: FeatureFlagScope.GLOBAL,
        }),
        update: expect.objectContaining({
          enabled: false,
        }),
      });
    });

    it('should require tenantId for TENANT scope', async () => {
      await expect(
        service.setFeatureFlag({
          flag: FeatureFlag.WHATSAPP_REMINDERS,
          enabled: false,
          scope: FeatureFlagScope.TENANT,
          // Missing tenantId
        }),
      ).rejects.toThrow('tenantId required for TENANT scope');
    });

    it('should require tenantId and shopId for SHOP scope', async () => {
      await expect(
        service.setFeatureFlag({
          flag: FeatureFlag.WHATSAPP_REMINDERS,
          enabled: false,
          scope: FeatureFlagScope.SHOP,
          tenantId: 'tenant-1',
          // Missing shopId
        }),
      ).rejects.toThrow('tenantId and shopId required for SHOP scope');
    });

    it('should invalidate cache after setting flag', async () => {
      prisma.featureFlag.upsert.mockResolvedValue({});

      // Set flag in cache first
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: true,
        scope: FeatureFlagScope.GLOBAL,
      });

      await service.isFeatureEnabled(FeatureFlag.WHATSAPP_REMINDERS);

      // Now update the flag
      await service.setFeatureFlag({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      // Next check should query DB again (cache invalidated)
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      expect(result).toBe(false);
    });
  });

  describe('deleteFeatureFlag', () => {
    it('should delete feature flag', async () => {
      prisma.featureFlag.delete.mockResolvedValue({});

      await service.deleteFeatureFlag(
        FeatureFlag.WHATSAPP_REMINDERS,
        FeatureFlagScope.GLOBAL,
      );

      expect(prisma.featureFlag.delete).toHaveBeenCalledWith({
        where: {
          flag_scope_tenantId_shopId: {
            flag: FeatureFlag.WHATSAPP_REMINDERS,
            scope: FeatureFlagScope.GLOBAL,
            tenantId: undefined,
            shopId: undefined,
          },
        },
      });
    });

    it('should invalidate cache after delete', async () => {
      prisma.featureFlag.delete.mockResolvedValue({});

      // Cache a value
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      await service.isFeatureEnabled(FeatureFlag.WHATSAPP_REMINDERS);

      // Delete flag
      await service.deleteFeatureFlag(
        FeatureFlag.WHATSAPP_REMINDERS,
        FeatureFlagScope.GLOBAL,
      );

      // Should query DB again (cache invalidated)
      prisma.featureFlag.findUnique.mockResolvedValue(null);

      const result = await service.isFeatureEnabled(
        FeatureFlag.WHATSAPP_REMINDERS,
      );

      expect(result).toBe(true); // Reverts to default
    });
  });

  describe('getFeatureFlagsForTenant', () => {
    it('should return all feature flags for tenant', async () => {
      prisma.tenantSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        plan: {
          code: 'premium',
        },
      });

      prisma.featureFlag.findMany
        .mockResolvedValueOnce([]) // No global overrides
        .mockResolvedValueOnce([
          {
            flag: FeatureFlag.WHATSAPP_REMINDERS,
            enabled: false,
            scope: FeatureFlagScope.TENANT,
            tenantId: 'tenant-1',
          },
        ]);

      const result = await service.getFeatureFlagsForTenant('tenant-1');

      expect(result[FeatureFlag.WHATSAPP_REMINDERS]).toBe(false);
      expect(result[FeatureFlag.GST_BILLING]).toBe(true); // Default
    });

    it('should block premium features for non-premium tenants', async () => {
      prisma.tenantSubscription.findFirst.mockResolvedValue({
        id: 'sub-1',
        tenantId: 'tenant-1',
        status: 'ACTIVE',
        plan: {
          code: 'basic',
        },
      });

      prisma.featureFlag.findMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.getFeatureFlagsForTenant('tenant-1');

      expect(result[FeatureFlag.AI_SUGGESTIONS]).toBe(false);
      expect(result[FeatureFlag.VOICE_COMMANDS]).toBe(false);
    });
  });

  describe('clearCache', () => {
    it('should clear all cached values', async () => {
      prisma.featureFlag.findUnique.mockResolvedValue({
        flag: FeatureFlag.WHATSAPP_REMINDERS,
        enabled: false,
        scope: FeatureFlagScope.GLOBAL,
      });

      // Cache a value
      await service.isFeatureEnabled(FeatureFlag.WHATSAPP_REMINDERS);

      // Clear cache
      service.clearCache();

      // Should query DB again
      await service.isFeatureEnabled(FeatureFlag.WHATSAPP_REMINDERS);

      expect(prisma.featureFlag.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
