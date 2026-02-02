import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppLogger } from './whatsapp.logger';
import { toWhatsAppPhone } from '../../common/utils/phone.util';
import { ReminderChannel, ReminderStatus } from '@prisma/client';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';
import {
  WhatsAppVariableResolver,
  VariableResolutionContext,
} from './variable-resolver.service';
import { WhatsAppModule } from './variable-registry';

interface ReminderTemplateParams {
  [key: string]: string | number;
}

interface ProcessReminderResult {
  success: boolean;
  error?: string;
  reminderIds: string[];
}

@Injectable()
export class WhatsAppRemindersService {
  private readonly logger = new Logger(WhatsAppRemindersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsAppSender: WhatsAppSender,
    private readonly whatsAppLogger: WhatsAppLogger,
    private readonly variableResolver: WhatsAppVariableResolver,
  ) {}

  /**
   * Process pending WhatsApp reminders
   * Called by scheduled job (e.g., every 5 minutes)
   *
   * Flow:
   * 1. Find all SCHEDULED reminders where scheduledAt <= now
   * 2. Filter for WHATSAPP channel only
   * 3. For each reminder:
   *    a. Load customer + tenant
   *    b. Check tenant WhatsApp enabled
   *    c. Resolve phone number
   *    d. Build template parameters
   *    e. Send via WhatsAppSender
   *    f. Update reminder status (SENT/FAILED)
   *    g. Log attempt
   * 4. Return summary
   *
   * Idempotency:
   * - Only process reminders with status = SCHEDULED
   * - Update immediately to SENT/FAILED to prevent double-send
   * - Use DB transaction where possible
   */
  async processScheduledReminders(): Promise<ProcessReminderResult> {
    const now = new Date();
    const remindersToProcess: string[] = [];

    try {
      // 1️⃣ Find all pending WhatsApp reminders scheduled for now or past
      const pendingReminders = await this.prisma.customerReminder.findMany({
        where: {
          status: ReminderStatus.SCHEDULED,
          channel: ReminderChannel.WHATSAPP,
          scheduledAt: { lte: now },
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              tenantId: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              tenantType: true,
            },
          },
        },
        take: 100, // Batch limit to avoid overwhelming DB
      });

      if (pendingReminders.length === 0) {
        return {
          success: true,
          reminderIds: [],
        };
      }

      // 2️⃣ Process each reminder
      for (const reminder of pendingReminders) {
        remindersToProcess.push(reminder.id);

        this.logger.log(
          `[CRON] Processing reminder ${reminder.id}, scheduledAt=${reminder.scheduledAt?.toISOString()}, now=${new Date().toISOString()}`,
        );

        try {
          await this.processSingleReminder(reminder);
        } catch (err) {
          // ⚠️ Fail gracefully - don't crash on individual reminder errors
          this.logger.error(
            `Failed to process reminder ${reminder.id}`,
            err instanceof Error ? err.message : String(err),
          );
        }
      }

      return {
        success: true,
        reminderIds: remindersToProcess,
      };
    } catch (err) {
      this.logger.error(
        'Error processing scheduled reminders',
        err instanceof Error ? err.message : String(err),
      );

      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        reminderIds: remindersToProcess,
      };
    }
  }

  /**
   * Process a single reminder
   * Separated for testability
   */
  private async processSingleReminder(reminder: any): Promise<void> {
    const { id: reminderId, tenantId, customer, templateKey } = reminder;

    // 0️⃣ Atomic Lock: Try to mark as SENT immediately to prevent race conditions
    // This ensures only ONE process can pick up this reminder.
    // If it fails (count === 0), it means another process already handled it.
    const { count } = await this.prisma.customerReminder.updateMany({
      where: {
        id: reminderId,
        status: ReminderStatus.SCHEDULED,
      },
      data: {
        status: ReminderStatus.SENT, // Optimistically mark as SENT (Processing)
        sentAt: new Date(),
        updatedAt: new Date(),
      },
    });

    if (count === 0) {
      this.logger.warn(
        `[WhatsAppReminders] Atomic Lock Failed for ${reminderId}. Already processed.`,
      );
      return;
    }

    try {
      // 1️⃣ Check tenant WhatsApp is enabled
      const whatsAppSetting = await this.prisma.whatsAppSetting.findUnique({
        where: { tenantId },
      });

      // Permissive Default: Only skip if explicitly set to false
      if (whatsAppSetting && whatsAppSetting.enabled === false) {
        await this.updateReminderStatus(
          reminderId,
          ReminderStatus.SKIPPED,
          'WhatsApp disabled for tenant',
        );
        return;
      }

      // 2️⃣ Resolve phone number
      const phone = customer.phone;
      if (!phone) {
        await this.updateReminderStatus(
          reminderId,
          ReminderStatus.FAILED,
          'Customer phone number not found',
        );
        await this.logAttempt(
          tenantId,
          customer.id,
          'UNKNOWN',
          'FAILED',
          'Customer phone number not found',
        );
        return;
      }

      // 3️⃣ Convert to WhatsApp format
      const whatsAppPhone = toWhatsAppPhone(phone);
      if (!whatsAppPhone) {
        await this.updateReminderStatus(
          reminderId,
          ReminderStatus.FAILED,
          'Invalid phone number format',
        );
        await this.logAttempt(
          tenantId,
          customer.id,
          phone,
          'FAILED',
          'Invalid phone number format',
        );
        return;
      }

      // 4️⃣ Build template parameters using Variable Resolver
      let parameters: string[] = [];

      // Fetch template definition to get variable keys
      // Try finding by templateKey (standard) OR metaTemplateName (legacy/direct reference)
      // Get the LATEST active template for this key
      const template = await this.prisma.whatsAppTemplate.findFirst({
        where: {
          status: 'ACTIVE',
          OR: [{ templateKey: templateKey }, { metaTemplateName: templateKey }],
        },
        orderBy: { updatedAt: 'desc' },
      });

      console.log(
        `[WhatsAppReminders] Processing reminder for ${customer.phone}, Template: ${templateKey}`,
      );

      if (
        template?.variables &&
        Array.isArray(template.variables) &&
        template.variables.length > 0
      ) {
        // Resolve variables dynamically
        const variableKeys = template.variables as string[];

        // Find Member for context (Link Customer -> Member via phone)
        const member = await this.prisma.member.findFirst({
          where: { tenantId, phone: customer.phone },
        });

        // 4a. For MOBILE_SHOP, we need to fetch the default Shop for context
        let shopId: string | undefined;
        if (reminder.tenant?.tenantType === 'MOBILESHOP') {
          const shop = await this.prisma.shop.findFirst({
            where: { tenantId },
            select: { id: true },
          });
          shopId = shop?.id;
        }

        console.log(`[DEBUG] Reminder ${reminderId}: tenantType=${reminder.tenant?.tenantType}, templateKey=${templateKey}`);

        const context: VariableResolutionContext = {
          module:
            reminder.tenant?.tenantType === 'MOBILESHOP'
              ? WhatsAppModule.MOBILE_SHOP
              : WhatsAppModule.GYM,
          tenantId,
          memberId: member?.id, // May be null for Mobile Shop
          // 🚨 CRITICAL FIX: Trigger value could be Invoice ID OR JobCard ID
          // We pass it to both; the resolver will use the one that matches the variable source
          invoiceId: reminder.triggerValue || undefined,
          jobCardId: reminder.triggerValue || undefined, // Support Job Cards
          shopId,
        };

        // 5. Determine Event Type for Mobile Shop to ensure correct variable scoping
        let eventType: string | undefined;
        if (context.module === WhatsAppModule.MOBILE_SHOP) {
            // Map template/trigger to EventType
            if (templateKey === 'Invoice Create' || templateKey === 'invoice_created_confirmation_v1') {
                eventType = 'INVOICE_CREATED';
            } else if (templateKey === 'JOB READY' || templateKey === 'job_status_ready_v1') {
                eventType = 'JOB_READY';
            } else if (templateKey.includes('followup')) {
                eventType = 'FOLLOW_UP_SCHEDULED'; 
            }
             // Add more mappings as needed based on seed data
        }

        const resolvedMap = await this.variableResolver.resolveVariables(
          variableKeys,
          { ...context, eventType }, 
        );

        // Check for resolution errors
        const errors = variableKeys
            .map(k => resolvedMap.get(k))
            .filter(r => r?.error);
            
        if (errors.length > 0) {
            const errorMsg = `Variable resolution failed: ${errors.map(e => e ? `${e.key} (${e.error})` : 'unknown').join(', ')}`;
            this.logger.error(errorMsg);
            // Mark as FAILED and abort
            await this.updateReminderStatus(reminderId, ReminderStatus.FAILED, errorMsg);
            await this.logAttempt(tenantId, customer.id, whatsAppPhone, 'FAILED', errorMsg);
            return;
        }

        // Map back to array in order
        parameters = variableKeys.map((key) => {
          const res = resolvedMap.get(key);
          return res?.formatted || '';
        });

        console.log(
          `[WhatsAppReminders] Resolved Parameters: ${JSON.stringify(parameters)}`,
        );
      } else {
        // Fallback for manually seeded templates or missing definitions
        // Use the old hardcoded logic as fail-safe
        parameters = this.buildTemplateParameters(reminder, customer);
        console.log(
          `[WhatsAppReminders] Fallback Parameters: ${JSON.stringify(parameters)}`,
        );
      }

      // 5️⃣ Send message via WhatsAppSender
      const result = await this.whatsAppSender.sendTemplateMessage(
        tenantId,
        WhatsAppFeature.REMINDER,
        whatsAppPhone,
        template?.metaTemplateName || templateKey,
        parameters,
      );

      // 6️⃣ Handle result and update status
      if (result.skipped) {
        const reason =
          result.reason || 'Blocked by subscription plan or feature limit';
        await this.updateReminderStatus(
          reminderId,
          ReminderStatus.SKIPPED,
          reason,
        );
        await this.logAttempt(
          tenantId,
          customer.id,
          whatsAppPhone,
          'SKIPPED',
          reason,
        );
        return;
      }

      if (result.success) {
        // ✅ Already marked as SENT by the Atomic Lock.
        // Just log the success attempt.
        await this.logAttempt(tenantId, customer.id, whatsAppPhone, 'SUCCESS');
      } else {
        // ❌ Revert status to FAILED
        await this.updateReminderStatus(
          reminderId,
          ReminderStatus.FAILED,
          result.error?.message || 'Unknown error from WhatsApp API',
        );
        await this.logAttempt(
          tenantId,
          customer.id,
          whatsAppPhone,
          'FAILED',
          result.error?.message || 'Unknown error',
        );
      }
    } catch (err) {
      // ❌ Revert status to FAILED on crash
      const errorMsg = err instanceof Error ? err.message : String(err);
      await this.updateReminderStatus(
        reminderId,
        ReminderStatus.FAILED,
        errorMsg,
      );
      await this.logAttempt(
        tenantId,
        customer.id,
        customer.phone || 'UNKNOWN',
        'FAILED',
        errorMsg,
      );
    }
  }

  /**
   * Build template parameters based on reminder type and customer data
   * Use context from triggerType and triggerValue
   */
  private buildTemplateParameters(reminder: any, customer: any): string[] {
    const parameters: ReminderTemplateParams = {
      customerName: customer.name || 'valued customer',
      // Add more based on triggerType
    };

    // Example: For payment reminders, include amount
    if (reminder.triggerType === 'AFTER_INVOICE') {
      parameters.daysRemaining = reminder.triggerValue;
    }

    // Convert to array format (WhatsApp API expects array)
    return Object.values(parameters).map(String);
  }

  /**
   * Update reminder status in DB with error reason
   */
  private async updateReminderStatus(
    reminderId: string,
    status: ReminderStatus,
    failureReason?: string,
  ): Promise<void> {
    await this.prisma.customerReminder.update({
      where: { id: reminderId },
      data: {
        status,
        sentAt: status === ReminderStatus.SENT ? new Date() : undefined,
        failureReason:
          status === ReminderStatus.FAILED || status === ReminderStatus.SKIPPED
            ? failureReason
            : undefined,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Log attempt in WhatsAppLog
   * Handles both success and failure cases
   */
  private async logAttempt(
    tenantId: string,
    customerId: string,
    phone: string,
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED',
    error?: string,
  ): Promise<void> {
    try {
      // Map reminder statuses to WhatsAppLog statuses
      let logStatus: 'SENT' | 'FAILED' | 'SKIPPED';
      if (status === 'SUCCESS') logStatus = 'SENT';
      else if (status === 'SKIPPED') logStatus = 'SKIPPED';
      else logStatus = 'FAILED';

      await this.whatsAppLogger.log({
        tenantId,
        memberId: customerId, // Customer ID
        phone,
        type: 'REMINDER',
        status: logStatus,
        error: error || null,
      });
    } catch (err) {
      // Logging should not crash the process
      this.logger.warn(
        `Failed to log WhatsApp attempt: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Get retry statistics for monitoring
   * Returns count of reminders in each status for a tenant
   */
  async getReminderStats(tenantId: string) {
    const stats = await this.prisma.customerReminder.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: {
        id: true,
      },
    });

    return stats.reduce(
      (acc, item) => ({
        ...acc,
        [item.status]: item._count.id,
      }),
      {},
    );
  }

  /**
   * Retry failed reminders (manual operation)
   * Reset status to SCHEDULED for manual retry
   * Only if original failure reason is temporary (e.g., API timeout)
   */
  async retryFailedReminders(
    tenantId: string,
    limit: number = 10,
  ): Promise<number> {
    // 1️⃣ Find failed reminders (within last 24h)
    const failedReminders = await this.prisma.customerReminder.findMany({
      where: {
        tenantId,
        status: ReminderStatus.FAILED,
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
      select: { id: true },
      take: limit,
    });

    if (failedReminders.length === 0) {
      return 0;
    }

    // 2️⃣ Reset them to SCHEDULED
    const result = await this.prisma.customerReminder.updateMany({
      where: {
        id: { in: failedReminders.map((r) => r.id) },
      },
      data: {
        status: ReminderStatus.SCHEDULED,
        failureReason: null,
        scheduledAt: new Date(),
      },
    });

    return result.count;
  }
}
