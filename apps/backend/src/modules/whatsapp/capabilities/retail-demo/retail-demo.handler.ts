import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { WhatsAppSender } from '../../whatsapp.sender';
import { RetailDemoMessages } from './retail-demo.messages';
import { RetailDemoCatalog } from './retail-demo.catalog';
import { WhatsAppFeature } from '../../../../core/billing/whatsapp-rules';

@Injectable()
export class RetailDemoHandler {
  private readonly logger = new Logger(RetailDemoHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
    private readonly catalogHelper: RetailDemoCatalog,
  ) {}

  async handleMessage(tenantId: string, phone: string, text: string): Promise<void> {
    const cleanText = text.trim().toLowerCase();
    console.log(`[RETAIL_DEMO] Handle Message: '${cleanText}' from ${phone}`);

    // 0. STOP if Staff Replied Recently (24h)
    const staffReplied = await this.hasStaffRepliedRecently(tenantId, phone);
    console.log(`[RETAIL_DEMO] Staff Replied Recently? ${staffReplied}`);

    if (staffReplied) {
      this.logger.log(`[RETAIL_DEMO] Skipping automation - Staff active for ${phone}`);
      return;
    }

    // 1. Lead Gen: Ensure Customer Exists
    const party = await this.ensureLeadExists(tenantId, phone);
    const customerName = party.name === 'Guest' ? 'Friend' : party.name;

    // 2. Ecommerce Deep Link Handling (Product Context)
    // "I'm interested in..." or just a product name
    if (this.isProductContext(cleanText)) {
       await this.sendProductContextOptions(tenantId, phone, text);
       return;
    }

    // 3. Main Menu Logic
    if (this.isGreeting(cleanText)) {
      await this.sendWelcomeFlow(tenantId, phone, customerName);
    } else if (cleanText === '1' || cleanText.includes('product') || cleanText.includes('catalog')) {
      await this.sendCatalogFlow(tenantId, phone);
    } else if (cleanText === '2' || cleanText.includes('bulk') || cleanText.includes('wholesale')) {
      await this.sendBulkEnquiryFlow(tenantId, phone);
    } else if (cleanText === '3' || cleanText.includes('staff') || cleanText.includes('human')) {
      await this.sendStaffHandover(tenantId, phone);
    } else if (this.isBulkResponse(cleanText)) {
       // Heuristic: If they type a long string or number after we asked for bulk details
       await this.sendEnquiryConfirm(tenantId, phone);
    } else {
      await this.sendFallback(tenantId, phone);
    }
  }

  // --- Checks ---

  private async hasStaffRepliedRecently(tenantId: string, phone: string): Promise<boolean> {
    const lastStaffReply = await this.prisma.whatsAppLog.findFirst({
      where: {
        tenantId,
        phone,
        type: 'MANUAL',
        sentAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
        }
      },
      orderBy: { sentAt: 'desc' }
    });
    return !!lastStaffReply;
  }

  private isGreeting(text: string): boolean {
    return ['hi', 'hello', 'hey', 'start', 'menu', 'enquire'].some(w => text.includes(w));
  }

  private isProductContext(text: string): boolean {
    // Basic heuristic for demo deep links
    return text.includes('interested in') || 
           ['cooker', 'tawa', 'pan', 'kadai', 'flask'].some(p => text.includes(p));
  }

  private isBulkResponse(text: string): boolean {
    // If text contains numbers or typical location keywords, assume it's a reply to bulk enquiry
    return /\d/.test(text) || ['chennai', 'road', 'street', 'nagar'].some(w => text.includes(w));
  }

  // --- Flows ---

  private async sendWelcomeFlow(tenantId: string, phone: string, name: string) {
    // 1. Send Greeting Template (retail_greeting)
    await this.sender.sendTemplateMessage(
      tenantId,
      'WELCOME' as WhatsAppFeature,
      phone,
      'retail_greeting',
      [] // No variables
    );
    // 2. Send Menu Text
    await this.sendText(tenantId, phone, RetailDemoMessages.WELCOME.menu);
  }

  private async sendCatalogFlow(tenantId: string, phone: string) {
    // For Demo: Use the helper, fallback to Mock if empty
    let productsList = await this.catalogHelper.getFormattedCatalog(tenantId);
    if (!productsList) {
       productsList = `1. Prestige Cooker 3L\n2. Pigeon Tawa\n3. Butterfly Mixer\n4. Milton Flask`;
    }
    const message = `${RetailDemoMessages.CATALOG.header}${productsList}${RetailDemoMessages.CATALOG.footer}`;
    await this.sendText(tenantId, phone, message);
  }

  private async sendBulkEnquiryFlow(tenantId: string, phone: string) {
    await this.sendText(tenantId, phone, RetailDemoMessages.ENQUIRY.requestDetails);
    // Mark as High Intent (update Party tags if possible)
    await this.markHighIntent(tenantId, phone);
  }

  private async sendEnquiryConfirm(tenantId: string, phone: string) {
    await this.sendText(tenantId, phone, RetailDemoMessages.ENQUIRY.confirmed);
  }

  private async sendStaffHandover(tenantId: string, phone: string) {
    await this.sendText(tenantId, phone, RetailDemoMessages.HANDOVER.message);
  }

  private async sendProductContextOptions(tenantId: string, phone: string, originalText: string) {
    const msg = `Regarding "${originalText}":\n\n1️⃣ Check Price & Stock\n2️⃣ Place Bulk Order\n3️⃣ Talk to Staff`;
    await this.sendText(tenantId, phone, msg);
  }

  private async sendFallback(tenantId: string, phone: string) {
    await this.sendText(tenantId, phone, RetailDemoMessages.FALLBACK.default);
  }

  // --- Helpers ---

  private async ensureLeadExists(tenantId: string, phone: string) {
    let party = await this.prisma.party.findUnique({
      where: { tenantId_phone: { tenantId, phone } },
    });

    if (!party) {
      this.logger.log(`[RETAIL_DEMO] Creating new lead for ${phone}`);
      party = await this.prisma.party.create({
        data: {
          tenantId,
          phone,
          name: 'Guest',
          partyType: 'CUSTOMER',
          tags: ['WHATSAPP_LEAD']
        },
      });
    }
    return party;
  }

  private async markHighIntent(tenantId: string, phone: string) {
    // Add 'HIGH_INTENT' tag
    try {
        const party = await this.prisma.party.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
        if (party && !party.tags.includes('HIGH_INTENT')) {
            await this.prisma.party.update({
                where: { id: party.id },
                data: { tags: { push: 'HIGH_INTENT' } }
            });
        }
    } catch (e) {
        this.logger.error(`Failed to mark high intent: ${e}`);
    }
  }

  private async sendText(tenantId: string, phone: string, content: string) {
    return this.sender.sendTemplateMessage(
      tenantId,
      'WELCOME' as WhatsAppFeature, 
      phone,
      'bot_text_response', 
      [content]
    );
  }
}
