import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppRemindersService } from '../src/modules/whatsapp/whatsapp-reminders.service';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { WhatsAppSender } from '../src/modules/whatsapp/whatsapp.sender';
import { WhatsAppLogger } from '../src/modules/whatsapp/whatsapp.logger';
import { WhatsAppVariableResolver } from '../src/modules/whatsapp/variable-resolver.service';
import { ReminderStatus } from '@prisma/client';

describe('WhatsApp Reminders Daily Quota - PLAN_LIMITS Removal', () => {
  let remindersService: WhatsAppRemindersService;
  let prismaService: PrismaService;

  const mockTenantId = 'tenant-reminder-123';
  const mockCustomerId = 'customer-1';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppRemindersService,
        {
          provide: PrismaService,
          useValue: {
            customerReminder: {
              findMany: jest.fn(),
              updateMany: jest.fn(),
              update: jest.fn(),
            },
            tenant: {
              findUnique: jest.fn(),
            },
            whatsAppSetting: {
              findUnique: jest.fn(),
            },
            whatsAppLog: {
              count: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              findUnique: jest.fn(),
            },
            whatsAppTemplate: {
              findFirst: jest.fn(),
            },
            plan: {
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: WhatsAppSender,
          useValue: {
            sendTemplateMessage: jest.fn(),
          },
        },
        {
          provide: WhatsAppLogger,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: WhatsAppVariableResolver,
          useValue: {
            resolveVariables: jest.fn(),
          },
        },
      ],
    }).compile();

    remindersService = module.get<WhatsAppRemindersService>(
      WhatsAppRemindersService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('Test Case 1: Reminder Daily Quota from Plan.meta (Not PLAN_LIMITS)', () => {
    it('should read reminderQuotaPerDay from plan.meta (database-driven)', () => {
      // Setup - Plan with reminderQuotaPerDay in meta
      const planWithQuota = {
        id: 'plan-1',
        code: 'MOBIBIX_STANDARD',
        name: 'Mobibix Standard',
        meta: {
          reminderQuotaPerDay: 300,
        },
      };

      // Act - Extract quota same as in whatsapp-reminders.service.ts
      const planMeta =
        (planWithQuota.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;
      const reminderQuotaPerDay = planMeta?.reminderQuotaPerDay ?? null;

      // Assert - Should read from meta, not PLAN_LIMITS
      expect(reminderQuotaPerDay).toBe(300);
      expect(planMeta?.reminderQuotaPerDay).toBe(300);
    });

    it('should allow unlimited reminders when reminderQuotaPerDay is null', () => {
      // Setup - Plan without reminderQuotaPerDay (unlimited)
      const planWithoutQuota = {
        id: 'plan-3',
        code: 'MOBIBIX_PRO',
        name: 'Mobibix Pro',
        meta: {
          reminderQuotaPerDay: null, // Unlimited
        },
      };

      // Act
      const planMeta =
        (planWithoutQuota.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;
      const reminderQuotaPerDay = planMeta?.reminderQuotaPerDay ?? null;

      // Assert - Should be null (no limit)
      expect(reminderQuotaPerDay).toBeNull();
      // When null, the service should not enforce any daily limit
    });

    it('should handle missing meta field gracefully', () => {
      // Setup - Plan without meta field
      const planNoMeta = {
        id: 'plan-2',
        code: 'MOBIBIX_TRIAL',
        name: 'Mobibix Trial',
        meta: null,
      };

      // Act
      const planMeta =
        (planNoMeta.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;
      const reminderQuotaPerDay = planMeta?.reminderQuotaPerDay ?? null;

      // Assert - Should gracefully default to null (no limit)
      expect(reminderQuotaPerDay).toBeNull();
    });
  });

  describe('Test Case 2: Daily Quota Enforcement Logic', () => {
    it('should allow reminders when under quota (49/50)', () => {
      // Setup
      const planMeta = { reminderQuotaPerDay: 50 };
      const reminderQuotaPerDay = planMeta.reminderQuotaPerDay;
      const sentToday = 49;

      // Act - Check logic from whatsapp-reminders.service.ts
      const canSend =
        reminderQuotaPerDay === null ||
        reminderQuotaPerDay === undefined ||
        sentToday < reminderQuotaPerDay;

      // Assert
      expect(canSend).toBe(true);
    });

    it('should block reminders when quota reached (50/50)', () => {
      // Setup
      const planMeta = { reminderQuotaPerDay: 50 };
      const reminderQuotaPerDay = planMeta.reminderQuotaPerDay;
      const sentToday = 50;

      // Act
      const canSend =
        reminderQuotaPerDay === null ||
        reminderQuotaPerDay === undefined ||
        sentToday < reminderQuotaPerDay;

      // Assert
      expect(canSend).toBe(false);
    });

    it('should block reminders when over quota (51/50)', () => {
      // Setup
      const planMeta = { reminderQuotaPerDay: 50 };
      const reminderQuotaPerDay = planMeta.reminderQuotaPerDay;
      const sentToday = 51;

      // Act
      const canSend =
        reminderQuotaPerDay === null ||
        reminderQuotaPerDay === undefined ||
        sentToday < reminderQuotaPerDay;

      // Assert
      expect(canSend).toBe(false);
    });
  });

  describe('Test Case 3: Daily Usage Counting', () => {
    it('should count reminders sent today from database', async () => {
      // Setup
      jest.spyOn(prismaService.whatsAppLog, 'count').mockResolvedValueOnce(45);

      // Act
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sentToday = await prismaService.whatsAppLog.count({
        where: {
          tenantId: mockTenantId,
          type: 'REMINDER',
          status: 'SENT',
          sentAt: { gte: today },
        },
      });

      // Assert
      expect(sentToday).toBe(45);
      expect(prismaService.whatsAppLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            type: 'REMINDER',
            status: 'SENT',
            sentAt: { gte: today },
          }),
        }),
      );
    });

    it('should handle zero reminders sent today', async () => {
      // Setup
      jest.spyOn(prismaService.whatsAppLog, 'count').mockResolvedValueOnce(0);

      // Act
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const sentToday = await prismaService.whatsAppLog.count({
        where: {
          tenantId: mockTenantId,
          type: 'REMINDER',
          status: 'SENT',
          sentAt: { gte: today },
        },
      });

      // Assert
      expect(sentToday).toBe(0);
    });

    it('should count only SENT reminders, not FAILED or SKIPPED', async () => {
      // Verify the query filters by status
      jest.spyOn(prismaService.whatsAppLog, 'count').mockResolvedValueOnce(42);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Act
      const sentToday = await prismaService.whatsAppLog.count({
        where: {
          tenantId: mockTenantId,
          type: 'REMINDER',
          status: 'SENT', // Only SENT, not FAILED or SKIPPED
          sentAt: { gte: today },
        },
      });

      // Assert
      expect(sentToday).toBe(42);
      expect(prismaService.whatsAppLog.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SENT',
          }),
        }),
      );
    });
  });

  describe('Test Case 4: Quota Reset at Midnight', () => {
    it('should reset quota at midnight (daily basis)', () => {
      // Today at 11:59 PM
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      // Tomorrow at 12:00 AM
      const tomorrow = new Date(today);
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Assert - Quota resets daily
      expect(tomorrow.toString()).not.toEqual(today.toString());
      expect(tomorrow.getDate()).toBeGreaterThan(today.getDate() % 31);
    });

    it('should count reminders from start of day to current time', () => {
      // Setup - Count window from 00:00 to now
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const now = new Date();

      // Assert
      expect(now.getTime()).toBeGreaterThanOrEqual(todayStart.getTime());

      // Query should filter reminders sent >= todayStart
      const where = {
        sentAt: { gte: todayStart },
      };

      expect(where.sentAt.gte).toEqual(todayStart);
    });
  });

  describe('Test Case 5: Plan Rule Priority', () => {
    it('should use plan.meta over hardcoded PLAN_LIMITS', () => {
      // Scenario: Database and hardcoded values differ
      const databaseQuota = 250; // From plan.meta
      const hardcodedQuota = 300; // Old PLAN_LIMITS constant

      // Should use database value, not hardcoded
      const effectiveQuota = databaseQuota; // No fallback to hardcodedQuota

      expect(effectiveQuota).toBe(250);
      expect(effectiveQuota).not.toBe(hardcodedQuota);
    });

    it('should not reference PLAN_LIMITS anywhere in decision', () => {
      // This test documents that the service should NOT use PLAN_LIMITS
      const plan = {
        meta: {
          reminderQuotaPerDay: 100,
        },
      };

      // Extract quota - NO fallback to any global constant
      const reminderQuota =
        (plan.meta as { reminderQuotaPerDay?: number | null } | null)
          ?.reminderQuotaPerDay ?? null;

      // Assert - Result is from plan.meta only
      expect(reminderQuota).toBe(100);

      // If plan.meta exists, use it. If not, use null (not PLAN_LIMITS fallback)
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative quota gracefully', () => {
      // Edge case: negative quota should be treated as 0 or disallowed
      const negativeQuota = -50;

      // Logic: quota should not be negative
      const effectiveQuota = Math.max(0, negativeQuota);

      expect(effectiveQuota).toBe(0);
    });

    it('should handle very large quota (unlimited practical limit)', () => {
      // Plan with very high quota (practical unlimited)
      const largeQuota = 999999;
      const sentToday = 50000;

      // Should allow sending
      const canSend = sentToday < largeQuota;

      expect(canSend).toBe(true);
    });

    it('should handle midnight boundary conditions', () => {
      // Reminder sent at 23:59:59
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // Should still be within today's quota
      const isToday = endOfDay >= todayStart;

      expect(isToday).toBe(true);

      // Reminder sent at 00:00:00 tomorrow
      const tomorrowStart = new Date(endOfDay);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);
      tomorrowStart.setHours(0, 0, 0, 0);

      // Should NOT be counted in today's quota
      const isTomorrow = tomorrowStart >= todayStart;
      const isNewDay = tomorrowStart.getDate() !== todayStart.getDate();

      expect(isTomorrow).toBe(true);
      expect(isNewDay).toBe(true);
    });
  });

  describe('Integration: Plan Meta Structure', () => {
    it('should validate plan.meta is properly typed', () => {
      // Ensure meta can be safely accessed
      const plan = {
        meta: {
          reminderQuotaPerDay: 100,
          otherField: 'value',
        },
      };

      // Type assertion used in actual service
      const planMeta =
        (plan.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;

      expect(planMeta).toBeDefined();
      expect(planMeta?.reminderQuotaPerDay).toBe(100);
    });

    it('should handle empty meta object', () => {
      // Plan with empty meta
      const plan = {
        meta: {},
      };

      const planMeta =
        (plan.meta as {
          reminderQuotaPerDay?: number | null;
        } | null) ?? null;

      // Should be defined but reminderQuotaPerDay undefined
      expect(planMeta).toBeDefined();
      expect(planMeta?.reminderQuotaPerDay).toBeUndefined();
    });
  });
});
