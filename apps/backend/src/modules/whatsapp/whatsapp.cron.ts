import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppTemplates } from './whatsapp.templates';
import { WhatsAppLogger } from './whatsapp.logger';
import { WhatsAppFeature } from '../../core/billing/whatsapp-rules';

@Injectable()
export class WhatsAppCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
    private readonly logger: WhatsAppLogger,
  ) {}

  /**
   * ⏰ Payment Due Reminder
   * Runs every day at 6 AM IST
   * Rule:
   * - Only PAYMENT DUE
   * - 1 day before due date
   * - Max 50 members per tenant
   * - 1 reminder per member (no repeat)
   */
  @Cron('0 6 * * *')
  async sendPaymentDueReminders() {
    // 1️⃣ Find all tenants where WhatsApp is enabled
    const settings = await this.prisma.whatsAppSetting.findMany({
      where: { enabled: true },
    });

    if (!settings.length) return;

    // 2️⃣ Calculate tomorrow (start & end)
    const tomorrowStart = new Date();
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    // 3️⃣ Loop tenants
    for (const setting of settings) {
      // 4️⃣ Count members ONCE per tenant
      const memberCount = await this.prisma.member.count({
        where: { tenantId: setting.tenantId },
      });

      // ❌ Skip tenant if member limit exceeded
      if (memberCount > 50) {
        continue;
      }

      // 5️⃣ Find members whose payment is due tomorrow
      const members = await this.prisma.member.findMany({
        where: {
          tenantId: setting.tenantId,
          paymentDueDate: {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          },
          paymentReminderSent: false,
        },
      });

      // 6️⃣ Loop members
      for (const member of members) {
        try {
          // 7️⃣ Send WhatsApp (UTILITY)
          const result = await this.sender.sendTemplateMessage(
            setting.tenantId,
            WhatsAppFeature.PAYMENT_DUE,
            member.phone,
            WhatsAppTemplates.PAYMENT_DUE,
            [String(member.feeAmount), member.paymentDueDate.toDateString()],
          );

          // 8️⃣ If success → mark reminder sent
          if (result.success) {
            await this.prisma.member.update({
              where: { id: member.id },
              data: { paymentReminderSent: true },
            });
          }

          // 9️⃣ Log result
          await this.logger.log({
            tenantId: setting.tenantId,
            memberId: member.id,
            phone: member.phone,
            type: 'PAYMENT_DUE',
            status: result.success ? 'SENT' : 'FAILED',
            error: result.success ? undefined : JSON.stringify(result.error),
          });
        } catch (err) {
          // 🔴 Hard failure (unexpected)
          await this.logger.log({
            tenantId: setting.tenantId,
            memberId: member.id,
            phone: member.phone,
            type: 'PAYMENT_DUE',
            status: 'FAILED',
            error: err.message,
          });
        }
      }
    }
  }
}
