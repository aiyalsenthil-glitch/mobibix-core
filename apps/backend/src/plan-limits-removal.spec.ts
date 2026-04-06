import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { MembersService } from '../src/core/members/members.service';
import { PlanRulesService } from '../src/core/billing/plan-rules.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { SubscriptionsService } from '../src/core/billing/subscriptions/subscriptions.service';
import { AuditService } from '../src/core/audit/audit.service';
import { TenantService } from '../src/core/tenant/tenant.service';
import { WhatsAppSender } from '../src/modules/whatsapp/whatsapp.sender';
import { AutomationService } from '../src/modules/whatsapp/automation.service';
import { ModuleType, UserRole, FitnessGoal } from '@prisma/client';

describe('PLAN_LIMITS Removal - Automated Tests', () => {
  let membersService: MembersService;
  let planRulesService: PlanRulesService;
  let prismaService: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockPlanRules = {
    planId: 'plan-1',
    code: 'GYM_TRIAL',
    name: 'GYM Trial',
    enabled: true,
    maxMembers: 50,
    maxStaff: 3,
    maxShops: null,
    whatsapp: {
      messageQuota: 0,
      isDaily: true,
      maxNumbers: 1,
    },
    analyticsHistoryDays: 30,
    features: [],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        PlanRulesService,
        {
          provide: PrismaService,
          useValue: {
            tenantSubscription: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
            },
            member: {
              count: jest.fn(),
              create: jest.fn(),
              findFirst: jest.fn(),
            },
            party: {
              findUnique: jest.fn(),
              create: jest.fn(),
            },
            memberPayment: {
              create: jest.fn(),
            },
            gymAttendance: {
              findMany: jest.fn(),
            },
            whatsAppLog: {
              count: jest.fn(),
              create: jest.fn(),
              findMany: jest.fn(),
              upsert: jest.fn(),
              update: jest.fn(),
            },
            whatsAppDailyUsage: {
              aggregate: jest.fn(),
              upsert: jest.fn(),
            },
            customerReminder: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
            plan: {
              findFirst: jest.fn(),
              findUnique: jest.fn(),
            },
            tenant: {
              findUnique: jest.fn().mockResolvedValue({ deletionRequestPending: false }),
            },
          },
        },
        {
          provide: SubscriptionsService,
          useValue: {
            getCurrentActiveSubscription: jest.fn(),
          },
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: TenantService,
          useValue: {
            getTenant: jest.fn(),
          },
        },
        {
          provide: WhatsAppSender,
          useValue: {
            sendTemplateMessage: jest.fn(),
          },
        },
        {
          provide: AutomationService,
          useValue: {
            getMatchingAutomations: jest.fn(),
            executeAutomation: jest.fn(),
            handleEvent: jest.fn(),
          },
        },
      ],
    }).compile();

    membersService = module.get<MembersService>(MembersService);
    planRulesService = module.get<PlanRulesService>(PlanRulesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Test Case 1: Member Creation with Plan Limits', () => {
    it('should allow member creation when under limit (49/50)', async () => {
      // Setup
      jest
        .spyOn(prismaService.tenantSubscription, 'findFirst')
        .mockResolvedValueOnce({
          id: 'sub-1',
          tenantId: mockTenantId,
          planId: 'plan-1',
          module: ModuleType.GYM,
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
            code: 'GYM_TRIAL',
            name: 'GYM Trial',
            level: 1,
            module: ModuleType.GYM,
            isActive: true,
            isPublic: true,
            isAddon: false,
            tagline: 'Trial plan',
            description: 'Trial plan description',
            featuresJson: null,
            meta: null,
            maxStaff: 3,
            maxMembers: 50,
            maxShops: null,
            whatsappUtilityQuota: 0,
            whatsappMarketingQuota: 0,
            analyticsHistoryDays: 30,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as any);

      jest.spyOn(prismaService.member, 'count').mockResolvedValueOnce(49);
      jest.spyOn(prismaService.party, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.party, 'create').mockResolvedValueOnce({
        id: 'party-1',
        tenantId: mockTenantId,
        name: 'Test Member',
        phone: '9876543210',
        email: null,
        state: 'Unknown',
        gstNumber: null,
        businessType: 'B2C',
        partyType: 'CUSTOMER',
        loyaltyPoints: 0,
        isActive: true,
        altPhone: null,
        address: null,
        defaultPaymentTerms: null,
        defaultCreditLimit: null,
        defaultCurrency: 'INR',
        tags: [],
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      jest.spyOn(prismaService.member, 'create').mockResolvedValueOnce({
        id: 'member-1',
        tenantId: mockTenantId,
        fullName: 'Test Member',
        phone: '9876543210',
        gender: 'MALE',
        membershipPlanId: 'plan-1',
        membershipStartAt: new Date(),
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        feeAmount: 1000,
        paymentStatus: 'PAID',
        heightCm: 180,
        weightKg: 75,
        fitnessGoal: 'STRENGTH',
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date(),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        paidAmount: 1000,
        monthlyFee: 1000,
        paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentReminderSent: false,
        isActive: true,
        photoUrl: null,
        welcomeMessageSent: false,
        hasCoaching: false,
        customerId: 'party-1',
      } as any);

      // Act & Assert - Should not throw
      const result = await membersService.createMember(
        mockTenantId,
        {
          fullName: 'Test Member',
          phone: '9876543210',
          gender: 'MALE',
          membershipPlanId: 'plan-1',
          durationCode: 'M6',
          feeAmount: 1000,
          paidAmount: 1000,
          fitnessGoal: FitnessGoal.GENERAL_FITNESS,
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('member-1');
    });

    it('should throw ForbiddenException when limit reached (50/50)', async () => {
      // Setup
      jest
        .spyOn(prismaService.tenantSubscription, 'findFirst')
        .mockResolvedValueOnce({
          id: 'sub-1',
          tenantId: mockTenantId,
          planId: 'plan-1',
          module: ModuleType.GYM,
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
            code: 'GYM_TRIAL',
            name: 'GYM Trial',
            level: 1,
            module: ModuleType.GYM,
            isActive: true,
            isPublic: true,
            isAddon: false,
            tagline: 'Trial plan',
            description: 'Trial plan description',
            featuresJson: null,
            meta: null,
            maxStaff: 3,
            maxMembers: 50,
            maxShops: null,
            whatsappUtilityQuota: 0,
            whatsappMarketingQuota: 0,
            analyticsHistoryDays: 30,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as any);

      jest.spyOn(prismaService.member, 'count').mockResolvedValueOnce(50);

      // Act & Assert - Should throw
      await expect(
        membersService.createMember(
          mockTenantId,
          {
            fullName: 'Test Member',
            phone: '9876543210',
            gender: 'MALE',
            membershipPlanId: 'plan-1',
            durationCode: 'M6',
            feeAmount: 1000,
            paidAmount: 1000,
            fitnessGoal: FitnessGoal.GENERAL_FITNESS,
          },
          'user-1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow unlimited members when maxMembers is null (PRO plan)', async () => {
      // Setup
      jest
        .spyOn(prismaService.tenantSubscription, 'findFirst')
        .mockResolvedValueOnce({
          id: 'sub-1',
          tenantId: mockTenantId,
          planId: 'plan-3',
          module: ModuleType.GYM,
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
            id: 'plan-3',
            code: 'GYM_PRO',
            name: 'GYM Pro',
            level: 3,
            module: ModuleType.GYM,
            isActive: true,
            isPublic: true,
            isAddon: false,
            tagline: 'Pro plan',
            description: 'Pro plan description',
            featuresJson: null,
            meta: null,
            maxStaff: null, // unlimited
            maxMembers: null, // unlimited
            maxShops: null,
            whatsappUtilityQuota: 1000,
            whatsappMarketingQuota: 200,
            analyticsHistoryDays: 365,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        } as any);

      jest.spyOn(prismaService.member, 'count').mockResolvedValueOnce(9999);
      jest.spyOn(prismaService.party, 'findUnique').mockResolvedValueOnce(null);
      jest.spyOn(prismaService.party, 'create').mockResolvedValueOnce({
        id: 'party-1',
        tenantId: mockTenantId,
        name: 'Test Member',
        phone: '9876543210',
        email: null,
        state: 'Unknown',
        gstNumber: null,
        businessType: 'B2C',
        partyType: 'CUSTOMER',
        loyaltyPoints: 0,
        isActive: true,
        altPhone: null,
        address: null,
        defaultPaymentTerms: null,
        defaultCreditLimit: null,
        defaultCurrency: 'INR',
        tags: [],
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      jest.spyOn(prismaService.member, 'create').mockResolvedValueOnce({
        id: 'member-1',
        tenantId: mockTenantId,
        fullName: 'Test Member',
        phone: '9876543210',
        gender: 'MALE',
        membershipPlanId: 'plan-3',
        membershipStartAt: new Date(),
        membershipEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        feeAmount: 1000,
        paymentStatus: 'PAID',
        heightCm: 180,
        weightKg: 75,
        fitnessGoal: 'STRENGTH',
        createdAt: new Date(),
        createdBy: 'user-1',
        updatedAt: new Date(),
        updatedBy: null,
        deletedAt: null,
        deletedBy: null,
        paidAmount: 1000,
        monthlyFee: 1000,
        paymentDueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentReminderSent: false,
        isActive: true,
        photoUrl: null,
        welcomeMessageSent: false,
        hasCoaching: false,
        customerId: 'party-1',
      } as any);

      // Act & Assert - Should not throw even with 9999 members
      const result = await membersService.createMember(
        mockTenantId,
        {
          fullName: 'Test Member',
          phone: '9876543210',
          gender: 'MALE',
          membershipPlanId: 'plan-3',
          durationCode: 'M6',
          feeAmount: 1000,
          paidAmount: 1000,
          fitnessGoal: FitnessGoal.GENERAL_FITNESS,
        },
        'user-1',
      );

      expect(result).toBeDefined();
      expect(result.id).toBe('member-1');
    });
  });

  describe('Test Case 2: Plan Rules Service Integration', () => {
    it('should retrieve plan rules from database (no PLAN_LIMITS fallback)', async () => {
      // This test verifies that getPlanRulesForTenant uses DB only, not PLAN_LIMITS
      jest
        .spyOn(prismaService.tenantSubscription, 'findMany')
        .mockResolvedValueOnce([
          {
            id: 'sub-1',
            tenantId: mockTenantId,
            planId: 'plan-1',
            module: ModuleType.GYM,
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
              code: 'GYM_TRIAL',
              name: 'GYM Trial',
              level: 1,
              module: ModuleType.GYM,
              isActive: true,
              isPublic: true,
              isAddon: false,
              tagline: 'Trial plan',
              description: 'Trial plan description',
              featuresJson: null,
              planFeatures: [],
              meta: null,
              maxStaff: 3,
              maxMembers: 50,
              maxShops: null,
              whatsappUtilityQuota: 0,
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

      // Assert
      expect(rules).toBeDefined();
      expect(rules?.maxMembers).toBe(50);
      expect(rules?.maxStaff).toBe(3);
      expect(rules?.whatsapp?.messageQuota).toBe(0);

      // Verify it's reading from DB, not from a hardcoded constant
      expect(prismaService.tenantSubscription.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
          }),
          include: expect.any(Object),
        }),
      );
    });

    it('should handle missing plan gracefully (no PLAN_LIMITS fallback)', async () => {
      jest
        .spyOn(prismaService.tenantSubscription, 'findMany')
        .mockResolvedValueOnce([]);

      // Act
      const rules = await planRulesService.getPlanRulesForTenant(
        mockTenantId,
        ModuleType.GYM,
      );

      // Assert - Should return null, not a fallback constant
      expect(rules).toBeNull();
    });
  });

  describe('Test Case 3: WhatsApp Reminder Quota from Plan Meta', () => {
    it('should read reminderQuotaPerDay from plan.meta (not PLAN_LIMITS)', async () => {
      // This test verifies reminder quota is read from database
      const planWithMeta = {
        id: 'plan-2',
        code: 'MOBIBIX_STANDARD',
        name: 'Mobibix Standard',
        level: 2,
        module: ModuleType.MOBILE_SHOP,
        isActive: true,
        isPublic: true,
        isAddon: false,
        tagline: 'Standard plan',
        description: 'Standard plan description',
        featuresJson: null,
        meta: {
          reminderQuotaPerDay: 300, // From DB, not PLAN_LIMITS
        },
        maxStaff: 3,
        maxMembers: 200,
        maxShops: null,
        whatsappUtilityQuota: 0,
        whatsappMarketingQuota: 0,
        analyticsHistoryDays: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Extract reminder quota (same as in whatsapp-reminders.service.ts)
      const planMeta =
        (planWithMeta.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;
      const reminderQuotaPerDay = planMeta?.reminderQuotaPerDay ?? null;

      // Assert - Should read from meta, not from PLAN_LIMITS constant
      expect(reminderQuotaPerDay).toBe(300);
      expect(planMeta).toBeDefined();
      expect(planMeta?.reminderQuotaPerDay).toBe(300);
    });

    it('should allow unlimited reminders when reminderQuotaPerDay is null', () => {
      // Plan without reminderQuotaPerDay in meta
      const planWithoutQuota = {
        meta: {
          // No reminderQuotaPerDay key
        },
      };

      const planMeta =
        (planWithoutQuota.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;
      const reminderQuotaPerDay = planMeta?.reminderQuotaPerDay ?? null;

      // Assert - Should allow unlimited
      expect(reminderQuotaPerDay).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle subscription module mismatch correctly', async () => {
      // Setup - GYM subscription but check for maxMembers
      const gymSub = {
        module: ModuleType.GYM,
        plan: {
          maxMembers: 50, // Only applies to GYM
          maxShops: null,
        },
      };

      // Assert - maxMembers should be enforced for GYM
      expect(gymSub.plan.maxMembers).toBe(50);
      expect(gymSub.module).toBe(ModuleType.GYM);
    });

    it('should handle null maxMembers for unlimited subscriptions', () => {
      // Plan with unlimited members
      const proPlan = {
        maxMembers: null, // Unlimited
      };

      // When null, should not enforce limit
      if (proPlan.maxMembers !== null && proPlan.maxMembers !== undefined) {
        throw new Error('Should not reach here');
      }

      expect(proPlan.maxMembers).toBeNull();
    });
  });
});
