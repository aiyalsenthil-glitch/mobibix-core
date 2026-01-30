import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppLogger } from './whatsapp.logger';
import { toWhatsAppPhone } from '../../common/utils/phone.util';
import { ReminderChannel, ReminderStatus } from '@prisma/client';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';

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
            },
          },
        },
        take: 100, // Batch limit to avoid overwhelming DB
      });

      this.logger.debug(
        `Found ${pendingReminders.length} pending WhatsApp reminders`,
      );

      if (pendingReminders.length === 0) {
        return {
          success: true,
          reminderIds: [],
        };
      }

      // 2️⃣ Process each reminder
      for (const reminder of pendingReminders) {
        remindersToProcess.push(reminder.id);

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

    try {
      // 1️⃣ Check tenant WhatsApp is enabled
      const whatsAppSetting = await this.prisma.whatsAppSetting.findUnique({
        where: { tenantId },
      });

      if (!whatsAppSetting?.enabled) {
        // Silently skip - tenant has disabled WhatsApp
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

      // 4️⃣ Build template parameters
      const parameters = this.buildTemplateParameters(reminder, customer);

      // 5️⃣ Send message via WhatsAppSender
      // Note: WhatsAppSender handles subscription/plan checks internally
      const result = await this.whatsAppSender.sendTemplateMessage(
        tenantId,
        WhatsAppFeature.REMINDER,
        whatsAppPhone,
        templateKey,
        parameters,
      );

      // 6️⃣ Handle result and update status
      if (result.skipped) {
        // Plan-level or feature-level block
        await this.updateReminderStatus(
          reminderId,
          ReminderStatus.SKIPPED,
          'Blocked by subscription plan or feature limit',
        );
        await this.logAttempt(
          tenantId,
          customer.id,
          whatsAppPhone,
          'SKIPPED',
          'Blocked by subscription plan',
        );
        return;
      }

      if (result.success) {
        await this.updateReminderStatus(reminderId, ReminderStatus.SENT);
        await this.logAttempt(tenantId, customer.id, whatsAppPhone, 'SUCCESS');
      } else {
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
          status === ReminderStatus.FAILED ? failureReason : undefined,
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
      const logStatus: 'SENT' | 'FAILED' =
        status === 'SUCCESS' ? 'SENT' : 'FAILED';

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
