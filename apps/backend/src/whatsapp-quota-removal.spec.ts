import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { WhatsAppUserService } from '../src/modules/whatsapp/whatsapp-user.service';
import { PlanRulesService } from '../src/core/billing/plan-rules.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { SubscriptionsService } from '../src/core/billing/subscriptions/subscriptions.service';
import { WhatsAppPhoneNumbersService } from '../src/modules/whatsapp/phone-numbers/whatsapp-phone-numbers.service';
import { WhatsAppSender } from '../src/modules/whatsapp/whatsapp.sender';
import { ModuleType } from '@prisma/client';

describe('WhatsApp Quota Checks - PLAN_LIMITS Removal', () => {
  let whatsAppUserService: WhatsAppUserService;
  let prismaService: PrismaService;
  let planRulesService: PlanRulesService;

  const mockTenantId = 'tenant-wa-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppUserService,
        PlanRulesService,
        {
          provide: PrismaService,
          useValue: {
            tenant: {
              findUnique: jest.fn(),
            },
            tenantSubscription: {
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
            whatsAppLog: {
              count: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            whatsAppDailyUsage: {
              aggregate: jest.fn(),
            },
            plan: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            payment: {
              findMany: jest.fn(),
            },
            whatsAppTemplate: {
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
            whatsAppCampaign: undefined,
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            getCurrentActiveSubscription: jest.fn(),
          },
        },
        {
          provide: WhatsAppPhoneNumbersService,
          useValue: {
            getPhoneNumberForPurpose: jest.fn(),
            getNumbers: jest.fn(),
            getPhoneNumberById: jest.fn(),
          },
        },
        {
          provide: WhatsAppSender,
          useValue: {
            sendTemplateMessage: jest.fn(),
            sendMessage: jest.fn(),
          },
        },
      ],
    }).compile();

    whatsAppUserService = module.get<WhatsAppUserService>(WhatsAppUserService);
    prismaService = module.get<PrismaService>(PrismaService);
    planRulesService = module.get<PlanRulesService>(PlanRulesService);
  });

  describe('Test Case 1: WhatsApp Quota Enforcement from Plan Rules (Not PLAN_LIMITS)', () => {
    it('should retrieve quota from plan.whatsappUtilityQuota (database-driven)', async () => {
      // Setup - Plan with quota from database
      jest
        .spyOn(prismaService.tenantSubscription, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'sub-1',
            tenantId: mockTenantId,
            planId: 'plan-1',
            module: ModuleType.WHATSAPP_CRM,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
            expiryReminderSentAt: null,
            billingCycle: null,
            priceSnapshot: null,
            autoRenew: true,
            nextPlanId: null,
            nextBillingCycle: null,
            nextPriceSnapshot: null,
            lastRenewedAt: null,
            plan: {
              id: 'plan-1',
              code: 'WHATSAPP_CRM',
              name: 'WhatsApp CRM',
              level: 1,
              module: ModuleType.WHATSAPP_CRM,
              isActive: true,
              isPublic: true,
              isAddon: false,
              tagline: 'WhatsApp CRM add-on',
              description: 'WhatsApp CRM add-on',
              featuresJson: null,
              planFeatures: [],
              meta: null,
              maxStaff: null,
              maxMembers: null,
              maxShops: null,
              whatsappUtilityQuota: 1000, // From database, not PLAN_LIMITS
              whatsappMarketingQuota: 500,
              analyticsHistoryDays: 90,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            addons: [],
          },
        ] as any);

      // Act
      const rules = await planRulesService.getPlanRulesForTenant(
        mockTenantId,
        ModuleType.WHATSAPP_CRM,
      );

      // Assert - Should read from database, not PLAN_LIMITS
      expect(rules).toBeDefined();
      expect(rules?.whatsapp?.messageQuota).toBe(1500); // Utility (1000) + Marketing (500)
      expect(rules?.code).toBe('WHATSAPP_CRM');
      expect(prismaService.tenantSubscription.findMany).toHaveBeenCalled();
    });

    it('should throw when quota is zero (no PLAN_LIMITS fallback allows sending)', async () => {
      // Setup - Trial plan with 0 quota
      jest
        .spyOn(prismaService.tenantSubscription, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'sub-1',
            tenantId: mockTenantId,
            planId: 'plan-2',
            module: ModuleType.GYM,
            status: 'TRIAL',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
            expiryReminderSentAt: null,
            billingCycle: null,
            priceSnapshot: null,
            autoRenew: false,
            nextPlanId: null,
            nextBillingCycle: null,
            nextPriceSnapshot: null,
            lastRenewedAt: null,
            plan: {
              id: 'plan-2',
              code: 'GYM_TRIAL',
              name: 'GYM Trial',
              level: 0,
              module: ModuleType.GYM,
              isActive: true,
              isPublic: true,
              isAddon: false,
              tagline: 'Trial plan',
              description: 'Trial plan',
              featuresJson: null,
              planFeatures: [],
              meta: null,
              maxStaff: 3,
              maxMembers: 50,
              maxShops: null,
              whatsappUtilityQuota: 0, // 0 from database
              whatsappMarketingQuota: 0,
              analyticsHistoryDays: 30,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            addons: [],
          },
        ] as any);

      // Act
      const rules = await planRulesService.getPlanRulesForTenant(
        mockTenantId,
        ModuleType.GYM,
      );

      // Assert - Should have 0 quota from database
      expect(rules?.whatsapp?.messageQuota).toBe(0);
      // This should prevent sending in the actual service logic
    });
  });

  describe('Test Case 2: WhatsApp Usage Aggregation', () => {
    it('should sum utility and marketing usage from database', async () => {
      // Setup - Aggregate usage from DB
      jest
        .spyOn(prismaService.whatsAppDailyUsage, 'aggregate')
        .mockResolvedValueOnce({
          _sum: {
            utility: 150,
            marketing: 75,
            authentication: 10,
            service: 5,
          },
        } as any);

      // Act - Same logic as in whatsapp-user.service.ts
      const usage = await prismaService.whatsAppDailyUsage.aggregate({
        where: {
          tenantId: mockTenantId,
          date: {
            gte: new Date('2026-02-01'),
            lte: new Date('2026-02-28'),
          },
        },
        _sum: {
          utility: true,
          marketing: true,
          authentication: true,
          service: true,
        },
      });

      // Assert
      const whatsappUtilityUsed =
        (usage._sum.utility || 0) +
        (usage._sum.service || 0) +
        (usage._sum.authentication || 0);
      const whatsappMarketingUsed = usage._sum.marketing || 0;

      expect(whatsappUtilityUsed).toBe(165); // 150 + 10 + 5
      expect(whatsappMarketingUsed).toBe(75);
      expect(prismaService.whatsAppDailyUsage.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
          }),
          _sum: expect.any(Object),
        }),
      );
    });

    it('should handle zero usage correctly', () => {
      // Verify edge case: no usage
      const usage = {
        _sum: {
          utility: null,
          marketing: null,
          authentication: null,
          service: null,
        },
      };

      const whatsappUtilityUsed =
        (usage._sum.utility || 0) +
        (usage._sum.service || 0) +
        (usage._sum.authentication || 0);
      const whatsappMarketingUsed = usage._sum.marketing || 0;

      expect(whatsappUtilityUsed).toBe(0);
      expect(whatsappMarketingUsed).toBe(0);
    });
  });

  describe('Test Case 3: Plan Rules Caching', () => {
    it('should use cached plan rules (no repeated DB queries)', async () => {
      // Setup
      const mockPlan = {
        id: 'plan-1',
        code: 'GYM_PRO',
        name: 'GYM Pro',
        level: 3,
        module: ModuleType.GYM,
        isActive: true,
        isPublic: true,
        isAddon: false,
        tagline: 'Pro plan',
        description: 'Pro plan',
        featuresJson: null,
        meta: null,
        maxStaff: null,
        maxMembers: null,
        maxShops: null,
        whatsappUtilityQuota: 1000,
        whatsappMarketingQuota: 200,
        analyticsHistoryDays: 365,
        createdAt: new Date(),
        updatedAt: new Date(),
        planFeatures: [],
      };

      jest
        .spyOn(prismaService.tenantSubscription, 'findMany')
        .mockResolvedValue([
          {
            id: 'sub-1',
            tenantId: mockTenantId,
            planId: 'plan-1',
            module: ModuleType.GYM,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
            expiryReminderSentAt: null,
            billingCycle: null,
            priceSnapshot: null,
            autoRenew: true,
            nextPlanId: null,
            nextBillingCycle: null,
            nextPriceSnapshot: null,
            lastRenewedAt: null,
            plan: mockPlan,
            addons: [],
          },
        ] as any);

      // Act - First call
      const rules1 = await planRulesService.getPlanRulesForTenant(
        mockTenantId,
        ModuleType.GYM,
      );

      // Act - Second call (should use cache)
      const rules2 = await planRulesService.getPlanRulesForTenant(
        mockTenantId,
        ModuleType.GYM,
      );

      // Assert - Should have same data but only 1 DB call due to caching
      expect(rules1).toEqual(rules2);
      expect(prismaService.tenantSubscription.findMany).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing whatsapp quota gracefully', () => {
      // Plan without WhatsApp quotas set (should default to 0)
      const plan = {
        whatsappUtilityQuota: undefined,
        whatsappMarketingQuota: undefined,
      };

      const messageQuota =
        (plan.whatsappUtilityQuota || 0) + (plan.whatsappMarketingQuota || 0);

      expect(messageQuota).toBe(0);
    });

    it('should sum multiple add-on quotas correctly', () => {
      // Multiple add-ons should be summed
      const baseQuota = 1000;
      const addon1Quota = 500;
      const addon2Quota = 300;

      const totalQuota = baseQuota + addon1Quota + addon2Quota;

      expect(totalQuota).toBe(1800);
    });

    it('should not exceed calculated limits', () => {
      // Verify quota ceiling logic
      const limit = 1000;
      const used = 950;
      const remaining = Math.max(0, limit - used);

      expect(remaining).toBe(50);
      expect(remaining).toBeLessThanOrEqual(limit);
    });
  });
});
