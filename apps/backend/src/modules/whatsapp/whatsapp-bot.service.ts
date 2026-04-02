import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export type BotMode = 'REPAIR' | 'SALES' | 'MIXED' | 'OFF';

const PRESETS: Record<Exclude<BotMode, 'OFF'>, Array<{ keyword: string; replyText: string; exactMatch: boolean; sortOrder: number }>> = {
  REPAIR: [
    { keyword: 'status', replyText: 'Hi! Please reply with your Job Card number (e.g. JC-1234) to check your repair status.', exactMatch: false, sortOrder: 1 },
    { keyword: 'ready', replyText: 'Your device is ready for pickup! Please visit us during business hours. Thank you for choosing us.', exactMatch: false, sortOrder: 2 },
    { keyword: 'price', replyText: 'Our repair pricing depends on the model and issue. Please visit our shop or call us for a quick quote.', exactMatch: false, sortOrder: 3 },
    { keyword: 'warranty', replyText: 'All repairs come with a 30-day service warranty. Contact us if you face any issues within this period.', exactMatch: false, sortOrder: 4 },
  ],
  SALES: [
    { keyword: 'price', replyText: 'Thanks for your interest! Please visit our shop or check our latest offers. We will send you a price list shortly.', exactMatch: false, sortOrder: 1 },
    { keyword: 'offer', replyText: 'We have exciting offers running this week! Visit our shop or reply "DETAILS" for more information.', exactMatch: false, sortOrder: 2 },
    { keyword: 'buy', replyText: 'Great! We carry a wide range of products. Reply with what you are looking for and we will help you find the best deal.', exactMatch: false, sortOrder: 3 },
    { keyword: 'stock', replyText: 'We maintain a large stock of devices and accessories. Please call us or visit for the latest availability.', exactMatch: false, sortOrder: 4 },
  ],
  MIXED: [
    { keyword: 'status', replyText: 'Hi! Please reply with your Job Card number (e.g. JC-1234) to check your repair status.', exactMatch: false, sortOrder: 1 },
    { keyword: 'price', replyText: 'Our pricing depends on the service or product. Please visit us or call for a quick quote.', exactMatch: false, sortOrder: 2 },
    { keyword: 'offer', replyText: 'Check out our latest offers — repairs and new devices! Visit our shop for deals.', exactMatch: false, sortOrder: 3 },
    { keyword: 'warranty', replyText: 'All repairs carry a 30-day service warranty. Contact us for any post-repair issues.', exactMatch: false, sortOrder: 4 },
    { keyword: 'buy', replyText: 'We sell phones, accessories, and offer repairs. Reply with what you need and we will assist you.', exactMatch: false, sortOrder: 5 },
    { keyword: 'ready', replyText: 'Your device is ready for pickup! Visit us during business hours. Thank you!', exactMatch: false, sortOrder: 6 },
  ],
};

const DEFAULT_WELCOME: Record<Exclude<BotMode, 'OFF'>, string> = {
  REPAIR: 'Hi! Thank you for contacting us. For repair status reply with your Job Card number. For pricing or other queries, our team will assist you shortly.',
  SALES: 'Hi! Welcome! Looking to buy a device or accessory? Reply with what you need and our team will assist you.',
  MIXED: 'Hi! Welcome to our shop. For repair status send your Job Card number. For purchases or pricing, our team is here to help!',
};

@Injectable()
export class WhatsAppBotService {
  constructor(private readonly prisma: PrismaService) {}

  async getBotConfig(tenantId: string) {
    const config = await (this.prisma as any).whatsAppBotConfig.findUnique({
      where: { tenantId },
    });
    return config || { tenantId, mode: 'OFF', botEnabled: false };
  }

  async upsertBotConfig(tenantId: string, dto: {
    mode?: BotMode;
    botEnabled?: boolean;
    welcomeMessage?: string;
    outOfHoursMsg?: string;
    businessHoursOn?: boolean;
    businessHoursStart?: string;
    businessHoursEnd?: string;
  }) {
    const updateData: any = { ...dto };
    if (dto.botEnabled === true) {
      // Mutual Exclusivity: Turn off menu bot if keyword bot is active
      updateData.menuBotEnabled = false;
    }
    return (this.prisma as any).whatsAppBotConfig.upsert({
      where: { tenantId },
      update: updateData,
      create: { tenantId, ...updateData },
    });
  }

  /**
   * Apply preset keyword rules for a mode (clears existing rules first).
   */
  async applyPreset(tenantId: string, mode: Exclude<BotMode, 'OFF'>) {
    const rules = PRESETS[mode];
    const welcome = DEFAULT_WELCOME[mode];

    await (this.prisma as any).whatsAppAutoReply.deleteMany({ where: { tenantId } });
    await (this.prisma as any).whatsAppAutoReply.createMany({
      data: rules.map(r => ({ tenantId, ...r, enabled: true })),
    });
    await (this.prisma as any).whatsAppBotConfig.upsert({
      where: { tenantId },
      update: { mode, botEnabled: true, welcomeMessage: welcome },
      create: { tenantId, mode, botEnabled: true, welcomeMessage: welcome },
    });
    return { mode, rulesCreated: rules.length, welcomeMessage: welcome };
  }

  // ── Auto-reply CRUD ────────────────────────────────────────────────────────

  async listRules(tenantId: string) {
    return (this.prisma as any).whatsAppAutoReply.findMany({
      where: { tenantId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async createRule(tenantId: string, dto: { keyword: string; replyText: string; exactMatch?: boolean; sortOrder?: number }) {
    return (this.prisma as any).whatsAppAutoReply.create({
      data: { tenantId, ...dto, enabled: true },
    });
  }

  async updateRule(tenantId: string, ruleId: string, dto: Partial<{ keyword: string; replyText: string; exactMatch: boolean; enabled: boolean; sortOrder: number }>) {
    return (this.prisma as any).whatsAppAutoReply.updateMany({
      where: { id: ruleId, tenantId },
      data: dto,
    });
  }

  async deleteRule(tenantId: string, ruleId: string) {
    return (this.prisma as any).whatsAppAutoReply.deleteMany({
      where: { id: ruleId, tenantId },
    });
  }

  // ── Message matching ───────────────────────────────────────────────────────

  /**
   * Check incoming text against keyword rules.
   * Returns the reply text if matched, null otherwise.
   */
  async matchKeyword(tenantId: string, incomingText: string): Promise<string | null> {
    const config = await (this.prisma as any).whatsAppBotConfig.findUnique({
      where: { tenantId },
    });

    if (!config?.botEnabled || config.mode === 'OFF') return null;

    // Business hours gate
    if (config.businessHoursOn && config.businessHoursStart && config.businessHoursEnd) {
      const now = new Date();
      const [sh, sm] = config.businessHoursStart.split(':').map(Number);
      const [eh, em] = config.businessHoursEnd.split(':').map(Number);
      const nowMins = now.getHours() * 60 + now.getMinutes();
      const startMins = sh * 60 + sm;
      const endMins = eh * 60 + em;
      if (nowMins < startMins || nowMins > endMins) {
        return config.outOfHoursMsg || null;
      }
    }

    const rules = await (this.prisma as any).whatsAppAutoReply.findMany({
      where: { tenantId, enabled: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const lower = incomingText.toLowerCase().trim();
    for (const rule of rules) {
      const kw = rule.keyword.toLowerCase().trim();
      const matched = rule.exactMatch ? lower === kw : lower.includes(kw);
      if (matched) return rule.replyText;
    }

    return null; // Don't spam welcome message on every miss
  }
}
