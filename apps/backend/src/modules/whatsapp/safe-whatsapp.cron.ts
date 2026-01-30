import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AutomationSafetyService } from './automation-safety.service';
import { EntityResolverService } from './entity-resolver.service';

/**
 * ────────────────────────────────────────────────
 * SAFE WHATSAPP AUTOMATION CRON
 * ────────────────────────────────────────────────
 *
 * RESPONSIBILITY: Create CustomerReminder entries ONLY
 *
 * DOES:
 * ✅ Load enabled WhatsAppAutomation records
 * ✅ Resolve entities via EntityResolverService
 * ✅ Evaluate conditions (structured JSON)
 * ✅ Apply offsetDays for scheduling
 * ✅ Enforce ALL safety rules via AutomationSafetyService
 * ✅ Create SCHEDULED CustomerReminder entries
 * ✅ Deduplicate reminders
 *
 * DOES NOT:
 * ❌ Send WhatsApp messages (handled by ReminderService)
 * ❌ Decide templates dynamically
 * ❌ Bypass feature or opt-in checks
 * ❌ Use hardcoded template names
 * ❌ Perform mass operations without event context
 *
 * GUARANTEES:
 * - All reminders are event-driven
 * - Only UTILITY templates are used
 * - Messages are expected by customers
 * - Opt-in flags are enforced (GYM)
 * - No broadcast scenarios
 */
@Injectable()
export class SafeWhatsAppCron {
  private readonly logger = new Logger(SafeWhatsAppCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly safetyService: AutomationSafetyService,
    private readonly entityResolver: EntityResolverService,
  ) {}

  /**
   * ⏰ Create Reminder Entries from Safe Automation Rules
   * Runs every day at 6 AM IST
   */
  @Cron('0 6 * * *')
  async createRemindersFromSafeAutomations() {
    this.logger.log('🚀 Starting safe automation reminder creation...');

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
      let safetyBlocked = 0;

      // 2️⃣ Process each automation
      for (const automation of automations) {
        const result = await this.processSafeAutomation(automation);
        created += result.created;
        skipped += result.skipped;
        safetyBlocked += result.safetyBlocked;
      }

      this.logger.log(
        `✅ Automation complete: ${created} created, ${skipped} skipped, ${safetyBlocked} blocked by safety rules`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Failed to process automations: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * ────────────────────────────────────────────────
   * PROCESS SINGLE AUTOMATION (SAFE WORKFLOW)
   * ────────────────────────────────────────────────
   */
  private async processSafeAutomation(automation: any): Promise<{
    created: number;
    skipped: number;
    safetyBlocked: number;
  }> {
    let created = 0;
    let skipped = 0;
    let safetyBlocked = 0;

    try {
      // Parse automation
      const {
        moduleType,
        eventType,
        templateKey,
        offsetDays,
        conditions,
        requiresOptIn,
      } = automation;

      // Map template to feature
      const feature = this.safetyService.mapTemplateKeyToFeature(templateKey);
      if (!feature) {
        this.logger.warn(`Unknown template key: ${templateKey}`);
        return { created, skipped, safetyBlocked };
      }

      // 1️⃣ Get all tenants with enabled WhatsApp
      const settings = await this.prisma.whatsAppSetting.findMany({
        where: { enabled: true },
      });

      for (const setting of settings) {
        // 2️⃣ Resolve eligible entities via EntityResolver
        const entities = await this.entityResolver.resolveEntities(
          moduleType,
          eventType,
          setting.tenantId,
          offsetDays,
          conditions,
        );

        if (entities.length === 0) {
          skipped++;
          continue;
        }

        // 3️⃣ Event context safety check
        const contextCheck = this.safetyService.validateEventContextSafety(
          eventType,
          entities.length,
        );

        if (!contextCheck.safe) {
          this.logger.warn(`Context check failed: ${contextCheck.reason}`);
          safetyBlocked++;
          continue;
        }

        // 4️⃣ Process each entity
        for (const entity of entities) {
          // 5️⃣ Run ALL safety checks
          const safetyCheck = await this.safetyService.validateAutomationSafety(
            setting.tenantId,
            moduleType,
            eventType,
            templateKey,
            feature,
            entity.customerId,
            requiresOptIn,
          );

          if (!safetyCheck.safe) {
            this.logger.debug(
              `Safety check failed for ${entity.customerId}: ${safetyCheck.reasons.join(', ')}`,
            );
            safetyBlocked++;
            continue;
          }

          // 6️⃣ Create reminder if not duplicate
          const reminderCreated = await this.createReminderIfNotExists(
            setting.tenantId,
            entity.customerId,
            automation,
            entity.metadata,
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

    return { created, skipped, safetyBlocked };
  }

  /**
   * ────────────────────────────────────────────────
   * CREATE REMINDER WITH DEDUPLICATION
   * ────────────────────────────────────────────────
   */
  private async createReminderIfNotExists(
    tenantId: string,
    customerId: string,
    automation: any,
    metadata?: Record<string, any>,
  ): Promise<boolean> {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + automation.offsetDays);
    scheduledDate.setHours(9, 0, 0, 0); // Schedule for 9 AM

    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 🔒 DEDUPLICATION: Check if reminder already exists
    const existing = await this.prisma.customerReminder.findFirst({
      where: {
        tenantId,
        customerId,
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

    // ✅ Create new reminder (SCHEDULED status)
    await this.prisma.customerReminder.create({
      data: {
        tenantId,
        customerId,
        triggerType: 'DATE', // All automations use DATE-based scheduling
        triggerValue: scheduledDate.toISOString().split('T')[0], // YYYY-MM-DD
        channel: 'WHATSAPP',
        templateKey: automation.templateKey,
        status: 'SCHEDULED',
        scheduledAt: scheduledDate,
      },
    });

    this.logger.debug(
      `Created reminder for ${customerId} using template ${automation.templateKey}`,
    );

    return true;
  }
}
