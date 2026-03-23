import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WhatsAppRemindersService } from './whatsapp-reminders.service';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class WhatsAppRemindersCron {
  private readonly logger = new Logger(WhatsAppRemindersCron.name);

  constructor(
    private readonly remindersService: WhatsAppRemindersService,
    private readonly prisma: PrismaService,
  ) {}

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
    this.logger.debug('Checking for scheduled WhatsApp reminders...');
    try {
      const result = await this.remindersService.processScheduledReminders();

      if (result.success) {
        if (result.reminderIds.length > 0) {
          this.logger.log(
            `Processed ${result.reminderIds.length} WhatsApp reminders`,
          );
        } else {
          this.logger.debug('No pending reminders found');
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

  /**
   * 🧹 Expire stale SCHEDULED reminders older than 7 days
   * Runs daily at 02:00 to keep the table clean and prevent slow scans
   */
  @Cron('0 2 * * *')
  async expireStaleReminders() {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      const { count } = await this.prisma.customerReminder.updateMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lt: cutoff },
        },
        data: { status: 'FAILED', failureReason: 'Expired — not processed within 7 days' },
      });
      if (count > 0) {
        this.logger.log(`Expired ${count} stale SCHEDULED reminders older than 7 days`);
      }
    } catch (err) {
      this.logger.error(`Failed to expire stale reminders: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
