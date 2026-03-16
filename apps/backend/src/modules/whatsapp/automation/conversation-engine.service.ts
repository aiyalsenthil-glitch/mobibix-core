import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export enum ConversationState {
  MAIN_MENU = 'MAIN_MENU',
  AWAITING_REPAIR_ID = 'AWAITING_REPAIR_ID',
}

@Injectable()
export class ConversationEngineService {
  private readonly logger = new Logger(ConversationEngineService.name);
  private readonly STATE_EXPIRY_MINUTES = 30;

  constructor(
    private prisma: PrismaService,
    @InjectQueue('whatsapp-send') private waQueue: Queue,
  ) {}

  async processMessage(tenantId: string, senderPhone: string, text: string) {
    this.logger.log(`Processing automation for ${tenantId}:${senderPhone} -> ${text}`);

    // 1. Manage State (Load or Init)
    const state = await this.getOrInitState(tenantId, senderPhone);

    // 2. State Logic
    switch (state.step) {
      case ConversationState.MAIN_MENU:
        await this.handleMainMenu(tenantId, senderPhone, text);
        break;

      case ConversationState.AWAITING_REPAIR_ID:
        await this.handleRepairIdLookup(tenantId, senderPhone, text);
        break;

      default:
        await this.sendFallback(tenantId, senderPhone);
        break;
    }
  }

  private async handleMainMenu(tenantId: string, senderPhone: string, text: string) {
    const input = text.trim();

    if (input === '1') {
      await this.updateState(tenantId, senderPhone, ConversationState.AWAITING_REPAIR_ID);
      await this.sendReply(tenantId, senderPhone, '🔍 Please send your *Repair ID* (e.g., R1234).');
    } else if (input === '2') {
      await this.sendReply(tenantId, senderPhone, '💰 *MobiBix Pricing Table*:\n- Basic: ₹999/mo\n- Pro: ₹2499/mo\n- Enterprise: Contact us.');
    } else if (input === '3') {
      await this.sendReply(tenantId, senderPhone, '📍 *Store Location*:\nMobibix HQ, Sector 5, Bangalore.\nOpen 10 AM - 8 PM.');
    } else {
      await this.sendFallback(tenantId, senderPhone);
    }
  }

  private async handleRepairIdLookup(tenantId: string, senderPhone: string, text: string) {
    const repairId = text.trim().toUpperCase();
    
    // Mocking a repair lookup - in production this would query the JobCard table
    const status = repairId.startsWith('R') ? 'READY_FOR_COLLECTION' : 'NOT_FOUND';

    if (status === 'NOT_FOUND') {
      await this.sendReply(tenantId, senderPhone, `❌ Repair ID *${repairId}* not found. Returning to main menu.`);
    } else {
      await this.sendReply(tenantId, senderPhone, `✅ Job Card *${repairId}* Status: *${status}*.\nYou can collect your device anytime.`);
    }

    await this.updateState(tenantId, senderPhone, ConversationState.MAIN_MENU);
  }

  private async sendFallback(tenantId: string, phone: string) {
    const menu = `Hello! How can we help? 👋\n\n1️⃣ *Repair Status*\n2️⃣ *Pricing*\n3️⃣ *Store Location*\n\nPlease reply with *1*, *2*, or *3*.`;
    await this.sendReply(tenantId, phone, menu);
  }

  private async sendReply(tenantId: string, to: string, body: string) {
    await this.waQueue.add('send-message', {
      tenantId,
      to: `${to}@s.whatsapp.net`,
      body,
    });
  }

  private async getOrInitState(tenantId: string, phoneNumber: string) {
    let state = await this.prisma.whatsAppConversationState.findUnique({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
    });

    const now = new Date();
    const isExpired = state && now > new Date(state.expiresAt);

    if (!state || isExpired) {
      state = await this.prisma.whatsAppConversationState.upsert({
        where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
        update: {
          step: ConversationState.MAIN_MENU,
          expiresAt: new Date(Date.now() + this.STATE_EXPIRY_MINUTES * 60000),
        },
        create: {
          tenantId,
          phoneNumber,
          step: ConversationState.MAIN_MENU,
          expiresAt: new Date(Date.now() + this.STATE_EXPIRY_MINUTES * 60000),
        },
      });
    }

    return state;
  }

  private async updateState(tenantId: string, phoneNumber: string, step: string) {
    await this.prisma.whatsAppConversationState.update({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
      data: {
        step,
        expiresAt: new Date(Date.now() + this.STATE_EXPIRY_MINUTES * 60000),
      },
    });
  }
}
