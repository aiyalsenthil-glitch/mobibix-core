import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppTemplates } from './whatsapp.templates';
import { WhatsAppLogger } from './whatsapp.logger';

@Injectable()
export class WhatsAppCron {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
    private readonly logger: WhatsAppLogger,
  ) {}

  /**
   * ⏰ Daily expiry reminder
   * Runs every day at 6 AM
   */
  @Cron('0 6 * * *')
  async sendExpiryReminders() {
    const settings = await this.prisma.whatsAppSetting.findMany({
      where: { enabled: true },
    });

    if (!settings.length) return;

    const today = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(today.getDate() + 3);

    for (const setting of settings) {
      const subscription = await this.prisma.tenantSubscription.findUnique({
        where: { tenantId: setting.tenantId },
        include: {
          plan: true,
          tenant: {
            select: {
              name: true,
            },
          },
        },
      });

      // ❌ No active subscription / no plan / no tenant
      if (
        !subscription ||
        !subscription.plan ||
        !subscription.tenant ||
        subscription.status !== 'ACTIVE'
      ) {
        continue;
      }

      // ❌ TRIAL & BASIC plans should NOT get WhatsApp
      if (
        subscription.plan.name === 'TRIAL' ||
        subscription.plan.name === 'BASIC'
      ) {
        continue;
      }

      const members = await this.prisma.member.findMany({
        where: {
          tenantId: setting.tenantId,
          membershipEndAt: {
            gte: today,
            lte: expiryDate,
          },
        },
      });

      for (const member of members) {
        const result = await this.sender.sendTemplateMessage(
          member.phone,
          WhatsAppTemplates.EXPIRY,
          [
            member.fullName, // {{1}}
            subscription.tenant.name, // {{2}} Gym name
            '3', // {{3}} days remaining
          ],
        );

        await this.logger.log({
          tenantId: setting.tenantId,
          memberId: member.id,
          phone: member.phone,
          type: 'EXPIRY',
          status: result.success ? 'SENT' : 'FAILED',
          error: result.success ? undefined : JSON.stringify(result.error),
        });
      }
    }
  }
}
