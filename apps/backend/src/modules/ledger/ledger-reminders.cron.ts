import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { addDays, startOfDay, endOfDay } from 'date-fns';
import { ReminderChannel, ReminderStatus } from '@prisma/client';

@Injectable()
export class LedgerRemindersCron {
  private readonly logger = new Logger(LedgerRemindersCron.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * ⏰ Ledger Automation: Generate Payment Reminders
   * Runs daily at 8:00 AM
   * Scans LedgerCollection for upcoming and overdue payments
   */
  @Cron('0 8 * * *')
  async generateReminders() {
    this.logger.log('Running Ledger Payment Reminder generation...');
    const today = startOfDay(new Date());
    const tomorrow = addDays(today, 1);
    const in3Days = addDays(today, 3);

    try {
      // 1. Same-Day Reminders (Due Today)
      await this.scanAndSchedule(today, 'PAYMENT_DUE', 'Today');

      // 2. Pre-Due Reminders (Due in 3 days)
      await this.scanAndSchedule(in3Days, 'PAYMENT_DUE', '3-day notice');

      // 3. Overdue Reminders (Due 3 days ago, 7 days ago, 14 days ago)
      const overdueOffsets = [3, 7, 14];
      for (const offset of overdueOffsets) {
        const targetDate = addDays(today, -offset);
        await this.scanAndSchedule(targetDate, 'PAYMENT_OVERDUE', `${offset} days overdue`);
      }

    } catch (err) {
      this.logger.error(`Failed to generate ledger reminders: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  private async scanAndSchedule(targetDate: Date, templateKey: string, label: string) {
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);

    const collections = await this.prisma.ledgerCollection.findMany({
      where: {
        dueDate: { gte: start, lte: end },
        paid: false,
        ledger: { status: 'ACTIVE' },
      },
      include: {
        ledger: {
          select: {
            customerId: true,
            tenantId: true,
          },
        },
      },
    });

    if (collections.length === 0) return;

    this.logger.log(`Found ${collections.length} collections for ${label} reminders`);

    let createdCount = 0;
    for (const col of collections) {
      const { tenantId, customerId } = col.ledger;

      // Check if reminder already exists for this collection and template to avoid duplicates
      const exists = await this.prisma.customerReminder.findFirst({
        where: {
          tenantId,
          customerId,
          triggerValue: col.id,
          templateKey,
        },
      });

      if (exists) continue;

      await this.prisma.customerReminder.create({
        data: {
          tenantId,
          customerId,
          channel: ReminderChannel.WHATSAPP,
          status: ReminderStatus.SCHEDULED,
          templateKey,
          triggerType: 'DIGITAL_LEDGER_PAYMENT',
          triggerValue: col.id,
          scheduledAt: new Date(), // Process immediately by the WhatsApp cron
        },
      });
      createdCount++;
    }

    if (createdCount > 0) {
      this.logger.log(`Scheduled ${createdCount} reminders for ${label}`);
    }
  }
}
