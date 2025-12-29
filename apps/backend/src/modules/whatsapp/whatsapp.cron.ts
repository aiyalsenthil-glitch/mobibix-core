import { Injectable, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../core/prisma/prisma.service';
import { WhatsAppSender } from './whatsapp.sender';
import { WhatsAppTemplates } from './whatsapp.templates';
import { WhatsAppLogger } from './whatsapp.logger';

@Injectable()
export class WhatsAppCron implements OnModuleInit {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
    private readonly logger: WhatsAppLogger,
  ) {}

  /**
   * 🔥 HARD-CODED TEST (RUNS ON SERVER START)
   * This ignores DB completely
   */
  async onModuleInit() {
    console.log('🚀 WhatsApp HARD-CODED TEST STARTED');

    await this.sendHardcodedTestMessage();
  }

  /**
   * 🧪 Sends WhatsApp to ONE fixed test number
   */
  async sendHardcodedTestMessage() {
    const TEST_PHONE = '918838822461'; // 👈 PUT YOUR VERIFIED TEST NUMBER HERE

    console.log('📱 Sending WhatsApp to hardcoded number:', TEST_PHONE);

    const result = await this.sender.sendTemplateMessage(
      TEST_PHONE,
      WhatsAppTemplates.TEST,
      [],
    );

    console.log('📨 WhatsApp API result:', result);

    // Optional log (safe even if tenantId is fake)
    await this.logger.log({
      tenantId: 'TEST_TENANT',
      memberId: 'TEST_MEMBER',
      phone: TEST_PHONE,
      type: 'TEST',
      status: result.success ? 'SENT' : 'FAILED',
      error: result.success ? undefined : JSON.stringify(result.error),
    });
  }

  /**
   * ⏰ REAL CRON (NOT USED NOW)
   * Kept only so file structure stays future-ready
   */
  @Cron('0 6 * * *')
  async handleDailyWhatsApp() {
    // DO NOTHING FOR NOW
  }
}
