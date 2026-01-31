import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsAppRemindersService } from './whatsapp-reminders.service';

@Injectable()
export class WhatsAppRemindersCron {
  private readonly logger = new Logger(WhatsAppRemindersCron.name);

  constructor(private readonly remindersService: WhatsAppRemindersService) {}

  /**
   * ⏰ Process Pending WhatsApp Reminders
   * Runs every 5 minutes
   *
   * Logic:
   * - Find all SCHEDULED reminders where scheduledAt <= now
   * - Filter for WHATSAPP channel
   * - Send via WhatsApp API
   * - Update status: SENT or FAILED
   * - Log every attempt
   *
   * Idempotency:
   * - Each reminder processed only once (status SCHEDULED → SENT/FAILED)
   * - If job crashes mid-way, remaining reminders stay SCHEDULED
   * - Retrying the job will process them again
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async processReminders() {
    this.logger.log('[CRON] WhatsApp reminder cron triggered');
    this.logger.debug('Starting scheduled reminder processing...');

    try {
      const result = await this.remindersService.processScheduledReminders();

      if (result.success) {
        if (result.reminderIds.length > 0) {
          this.logger.log(
            `Processed ${result.reminderIds.length} WhatsApp reminders`,
          );
        } else {
          this.logger.debug('No WhatsApp reminders due at this time');
        }
      } else {
        this.logger.error(`Reminder processing failed: ${result.error}`);
      }
    } catch (err) {
      // Prevent job crash on error
      this.logger.error(
        `Unexpected error in reminder job: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
