import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EntityResolverService } from './entity-resolver.service';
import { AutomationSafetyService } from './automation-safety.service';
import { ModuleType } from '@prisma/client';

/**
 * ────────────────────────────────────────────────
 * SAFE WHATSAPP AUTOMATION CRON
 * ────────────────────────────────────────────────
 *
 * RESPONSIBILITY: Create CustomerReminder entries based on WhatsAppAutomation rules
 *
 * ARCHITECTURE:
 * - EVENT-DRIVEN: Uses EntityResolver to find specific entities per event
 * - SAFETY-FIRST: Uses AutomationSafetyService to enforce all rules
 * - MULTI-TENANT: Processes all tenants with enabled WhatsApp
 * - DEDUPLICATION: Prevents duplicate reminders
 *
 * DOES:
 * ✅ Read enabled WhatsAppAutomation records
 * ✅ Resolve eligible entities via EntityResolver
 * ✅ Enforce template, feature, and opt-in safety
 * ✅ Create SCHEDULED CustomerReminder entries
 * ✅ Prevent duplicate reminders (day-level dedup)
 *
 * DOES NOT:
 * ❌ Send WhatsApp messages (handled by WhatsAppRemindersService)
 * ❌ Use hardcoded template names
 * ❌ Use legacy flags (paymentReminderSent, etc.)
 * ❌ Allow marketing/auth templates
 * ❌ Process coaching events without opt-in
 */
@Injectable()
export class WhatsAppCron {
  private readonly logger = new Logger(WhatsAppCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityResolver: EntityResolverService,
    private readonly safetyService: AutomationSafetyService,
  ) {}

  /**
   * ⏰ Create Reminder Entries from Automation Rules
   * Runs every day at 6 AM IST
   *
   * WORKFLOW:
   * 1. Fetch all enabled automations
   * 2. For each automation, process all tenants with WhatsApp enabled
   * 3. Resolve entities via EntityResolver (event-driven)
   * 4. Run safety checks (template, feature, opt-in)
   * 5. Create deduplicated CustomerReminder entries
   */
  @Cron('0 6 * * *')
  async createRemindersFromAutomations() {
    this.logger.debug('🚀 Starting safe automation reminder creation...');

    try {
      // 1️⃣ Fetch all enabled automations
      const automations = await this.prisma.whatsAppAutomation.findMany({
        where: { enabled: true },
      });

      if (!automations.length) {
        this.logger.debug('No enabled automations found');
        return;
      }

      this.logger.log(`Found ${automations.length} enabled automations`);

      let totalCreated = 0;
      let totalSkipped = 0;

      // 2️⃣ Process each automation
      for (const automation of automations) {
        const result = await this.processAutomation(automation);
        totalCreated += result.created;
        totalSkipped += result.skipped;
      }

      this.logger.log(
        `✅ Automation processing complete: ${totalCreated} reminders created, ${totalSkipped} skipped`,
      );
    } catch (err) {
      this.logger.error(
        `❌ Failed to process automations: ${err instanceof Error ? err.message : String(err)}`,
        err instanceof Error ? err.stack : undefined,
      );
    }
  }

  /**
   * ────────────────────────────────────────────────
   * PROCESS SINGLE AUTOMATION
   * ────────────────────────────────────────────────
   * For each tenant with WhatsApp enabled:
   * 1. Resolve eligible entities (event-driven)
   * 2. Run safety checks
   * 3. Create deduplicated reminders
   */
  private async processAutomation(automation: any): Promise<{
    created: number;
    skipped: number;
  }> {
    let created = 0;
    let skipped = 0;

    try {
      this.logger.debug(
        `Processing automation ${automation.id} (${automation.moduleType}.${automation.eventType})`,
      );

      // 1️⃣ Get all tenants with enabled WhatsApp
      const settings = await this.prisma.whatsAppSetting.findMany({
        where: { enabled: true },
      });

      for (const setting of settings) {
        try {
          // 2️⃣ Resolve entities for this event (event-driven)
          const entities = await this.entityResolver.resolveEntities(
            automation.moduleType as ModuleType,
            automation.eventType,
            setting.tenantId,
            automation.offsetDays,
            automation.conditions,
          );

          if (!entities.length) {
            this.logger.debug(
              `No entities found for automation ${automation.id} in tenant ${setting.tenantId}`,
            );
            continue;
          }

          this.logger.debug(
            `Found ${entities.length} entities for automation ${automation.id} in tenant ${setting.tenantId}`,
          );

          // 3️⃣ Run safety checks and create reminders
          for (const entity of entities) {
            const success = await this.createSafeReminder(
              setting.tenantId,
              entity.customerId,
              automation,
            );

            if (success) {
              created++;
            } else {
              skipped++;
            }
          }
        } catch (tenantErr) {
          this.logger.error(
            `Failed to process automation ${automation.id} for tenant ${setting.tenantId}: ${tenantErr instanceof Error ? tenantErr.message : String(tenantErr)}`,
          );
          skipped++;
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
   * ────────────────────────────────────────────────
   * CREATE SAFE REMINDER
   * ────────────────────────────────────────────────
   * Enforce ALL safety checks before creating reminder:
   * 1. Template safety (UTILITY only)
   * 2. Feature safety (plan supports feature)
   * 3. Opt-in safety (coaching requires consent)
   * 4. Deduplication (no duplicate reminders)
   */
  private async createSafeReminder(
    tenantId: string,
    customerId: string,
    automation: any,
  ): Promise<boolean> {
    try {
      // ─────────────────────────────────────────────
      // A. TEMPLATE SAFETY CHECK
      // ─────────────────────────────────────────────
      const templateCheck = await this.safetyService.validateTemplateSafety(
        tenantId,
        automation.templateKey,
      );

      if (!templateCheck.safe) {
        this.logger.warn(
          `Template safety check failed for automation ${automation.id}: ${templateCheck.reason}`,
        );
        return false;
      }

      // ─────────────────────────────────────────────
      // B. FEATURE SAFETY CHECK
      // ─────────────────────────────────────────────
      const feature = this.safetyService.mapTemplateKeyToFeature(
        automation.templateKey,
      );

      if (!feature) {
        this.logger.warn(
          `Unknown template key ${automation.templateKey} for automation ${automation.id}`,
        );
        return false;
      }

      const featureCheck = await this.safetyService.validateFeatureSafety(
        tenantId,
        feature,
      );

      if (!featureCheck.allowed) {
        this.logger.debug(
          `Feature safety check failed for automation ${automation.id}: ${featureCheck.reason}`,
        );
        return false;
      }

      // ─────────────────────────────────────────────
      // C. OPT-IN SAFETY CHECK
      // ─────────────────────────────────────────────
      if (automation.requiresOptIn) {
        const optInCheck = await this.safetyService.validateOptInSafety(
          automation.moduleType as ModuleType,
          automation.eventType,
          customerId,
        );

        if (!optInCheck.allowed) {
          this.logger.debug(
            `Opt-in check failed for customer ${customerId}: ${optInCheck.reason}`,
          );
          return false;
        }
      }

      // ─────────────────────────────────────────────
      // D. DEDUPLICATION CHECK
      // ─────────────────────────────────────────────
      const alreadyExists = await this.checkDuplicateReminder(
        tenantId,
        customerId,
        automation,
      );

      if (alreadyExists) {
        this.logger.debug(
          `Reminder already exists for customer ${customerId}, automation ${automation.id}`,
        );
        return false;
      }

      // ─────────────────────────────────────────────
      // E. CREATE REMINDER
      // ─────────────────────────────────────────────
      const scheduledDate = this.calculateScheduledDate(automation.offsetDays);

      await this.prisma.customerReminder.create({
        data: {
          tenantId,
          customerId,
          triggerType: 'DATE', // All automations are date-based now
          triggerValue: String(automation.offsetDays),
          channel: 'WHATSAPP',
          templateKey: automation.templateKey,
          status: 'SCHEDULED',
          scheduledAt: scheduledDate,
        },
      });

      this.logger.debug(
        `✅ Created safe reminder for customer ${customerId}, template ${automation.templateKey}`,
      );

      return true;
    } catch (err) {
      this.logger.error(
        `Failed to create safe reminder: ${err instanceof Error ? err.message : String(err)}`,
      );
      return false;
    }
  }

  /**
   * ────────────────────────────────────────────────
   * HELPER: CHECK DUPLICATE REMINDER
   * ────────────────────────────────────────────────
   * Prevents duplicate reminders on the same day
   */
  private async checkDuplicateReminder(
    tenantId: string,
    customerId: string,
    automation: any,
  ): Promise<boolean> {
    const scheduledDate = this.calculateScheduledDate(automation.offsetDays);

    const dayStart = new Date(scheduledDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(scheduledDate);
    dayEnd.setHours(23, 59, 59, 999);

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

    return !!existing;
  }

  /**
   * ────────────────────────────────────────────────
   * HELPER: CALCULATE SCHEDULED DATE
   * ────────────────────────────────────────────────
   * Returns date + offsetDays at 9 AM
   */
  private calculateScheduledDate(offsetDays: number): Date {
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + offsetDays);
    scheduledDate.setHours(9, 0, 0, 0); // Schedule for 9 AM
    return scheduledDate;
  }
}
