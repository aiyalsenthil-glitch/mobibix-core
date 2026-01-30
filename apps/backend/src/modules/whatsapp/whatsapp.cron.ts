import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import { PlanRulesService } from '../../core/billing/plan-rules.service';

/**
 * WhatsApp Automation Cron Job
 *
 * RESPONSIBILITY: Create CustomerReminder entries based on WhatsAppAutomation rules
 *
 * DOES:
 * - Read enabled WhatsAppAutomation records
 * - Identify eligible members/customers
 * - Create SCHEDULED CustomerReminder entries
 * - Enforce plan restrictions
 * - Prevent duplicate reminders
 *
 * DOES NOT:
 * - Send WhatsApp messages (handled by WhatsAppRemindersService)
 * - Use hardcoded template names
 * - Use legacy flags (paymentReminderSent, etc.)
 */
@Injectable()
export class WhatsAppCron {
  private readonly logger = new Logger(WhatsAppCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planRulesService: PlanRulesService,
  ) {}

  /**
   * ⏰ Create Reminder Entries from Automation Rules
   * Runs every day at 6 AM IST
   */
  @Cron('0 6 * * *')
  async createRemindersFromAutomations() {
    this.logger.debug('Starting automation reminder creation...');

    try {
      // 1️⃣ Fetch all enabled automations
      const automations = await this.prisma.whatsAppAutomation.findMany({
        where: { enabled: true },
      });

      if (!automations.length) {
        this.logger.debug('No enabled automations found');
        return;
      }

      let created = 0;
      let skipped = 0;

      // 2️⃣ Process each automation
      for (const automation of automations) {
        const result = await this.processAutomation(automation);
        created += result.created;
        skipped += result.skipped;
      }

      this.logger.log(
        `Automation processing complete: ${created} reminders created, ${skipped} skipped`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to process automations: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Process a single automation rule
   */
  private async processAutomation(automation: any): Promise<{
    created: number;
    skipped: number;
  }> {
    let created = 0;
    let skipped = 0;

    try {
      // 1️⃣ Get all tenants with enabled WhatsApp
      const settings = await this.prisma.whatsAppSetting.findMany({
        where: { enabled: true },
      });

      for (const setting of settings) {
        const rules = await this.planRulesService.getPlanRulesForTenant(
          setting.tenantId,
        );

        if (!rules?.enabled) {
          skipped++;
          continue;
        }

        const feature = this.mapTemplateKeyToFeature(automation.templateKey);
        if (!feature || !rules.features.includes(feature)) {
          skipped++;
          continue;
        }

        // 3️⃣ Find eligible entities based on trigger type
        const results = await this.findEligibleEntities(
          setting.tenantId,
          automation,
        );

        for (const entity of results) {
          const reminderCreated = await this.createReminderIfNotExists(
            setting.tenantId,
            entity.customerId,
            automation,
          );

          if (reminderCreated) {
            created++;
          } else {
            skipped++;
          }
        }
      }
    } catch (err) {
      this.logger.error(
        `Failed to process automation ${automation.id}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return { created, skipped };
  }

  /**
   * Find eligible entities for reminder creation
   */
  private async findEligibleEntities(
    tenantId: string,
    automation: any,
  ): Promise<{ customerId: string }[]> {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + automation.offsetDays);
    targetDate.setHours(0, 0, 0, 0);

    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // Handle different trigger types
    switch (automation.triggerType) {
      case 'DATE': {
        const dateField = this.resolveGymDateField(automation.templateKey);

        if (!dateField) {
          return [];
        }

        return this.prisma.member
          .findMany({
            where: {
              tenantId,
              [dateField]: {
                gte: targetDate,
                lte: endDate,
              },
              isActive: true,
            },
            select: { id: true },
          })
          .then((members) => members.map((m) => ({ customerId: m.id })));
      }

      case 'AFTER_INVOICE':
        // Reminders after invoice creation
        const invoices = await this.prisma.invoice.findMany({
          where: {
            tenantId,
            createdAt: {
              gte: targetDate,
              lte: endDate,
            },
            customerId: { not: null },
          },
          select: { customerId: true },
        });
        return invoices
          .filter((inv) => inv.customerId)
          .map((inv) => ({ customerId: inv.customerId! }));

      case 'AFTER_JOB':
        // Reminders after job card completion
        const jobs = await this.prisma.jobCard.findMany({
          where: {
            tenantId,
            updatedAt: {
              gte: targetDate,
              lte: endDate,
            },
            status: 'DELIVERED',
            customerId: { not: null },
          },
          select: { customerId: true },
        });
        return jobs
          .filter((job) => job.customerId)
          .map((job) => ({ customerId: job.customerId! }));

      default:
        return [];
    }
  }

  /**
   * Create reminder if not already exists (deduplication)
   */
  private async createReminderIfNotExists(
    tenantId: string,
    customerId: string,
    automation: any,
  ): Promise<boolean> {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + automation.offsetDays);
    scheduledDate.setHours(9, 0, 0, 0); // Schedule for 9 AM

    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 4️⃣ DEDUPLICATION: Check if reminder already exists
    const existing = await this.prisma.customerReminder.findFirst({
      where: {
        tenantId,
        customerId,
        triggerType: automation.triggerType,
        templateKey: automation.templateKey,
        scheduledAt: {
          gte: dayStart,
          lte: dayEnd,
        },
        status: { in: ['SCHEDULED', 'SENT'] },
      },
    });

    if (existing) {
      return false; // Skip duplicate
    }

    // 5️⃣ Create new reminder
    await this.prisma.customerReminder.create({
      data: {
        tenantId,
        customerId,
        triggerType: automation.triggerType,
        triggerValue: String(automation.offsetDays),
        channel: 'WHATSAPP',
        templateKey: automation.templateKey,
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
      },
    });

    return true;
  }

  /**
   * Resolve which member date field to use for DATE triggers
   */
  private resolveGymDateField(
    templateKey: string,
  ): 'paymentDueDate' | 'membershipEndAt' | null {
    if (templateKey === 'PAYMENT_DUE') return 'paymentDueDate';
    if (templateKey === 'EXPIRY') return 'membershipEndAt';
    if (templateKey === 'REMINDER') return 'membershipEndAt';
    return null;
  }

  /**
   * Map template key to WhatsApp feature
   */
  private mapTemplateKeyToFeature(templateKey: string): WhatsAppFeature | null {
    const mapping: Record<string, WhatsAppFeature> = {
      WELCOME: WhatsAppFeature.WELCOME,
      PAYMENT_DUE: WhatsAppFeature.PAYMENT_DUE,
      EXPIRY: WhatsAppFeature.EXPIRY,
      REMINDER: WhatsAppFeature.REMINDER,
    };
    return mapping[templateKey] || null;
  }
}
