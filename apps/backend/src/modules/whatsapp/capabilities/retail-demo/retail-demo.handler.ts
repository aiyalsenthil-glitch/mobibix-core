import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { WhatsAppSender } from '../../whatsapp.sender';
import { RetailDemoMessages } from './retail-demo.messages';
import { RetailDemoCatalog } from './retail-demo.catalog';
import { WhatsAppFeature } from '../../../../core/billing/whatsapp-rules';

// --- CONSTANTS (Demo Content) ---
const PRODUCTS_DEMO_TEXT = 
`Here are our top selling items:

1. *Prestige Pressure Cooker 3L* - ₹1,450
2. *Pigeon Tawa 280mm* - ₹850
3. *Butterfly Mixer Grinder* - ₹3,200
4. *Milton Thermosteel Flask* - ₹950

Reply with the item name to check stock.`;

const BULK_DEMO_TEXT = 
`We offer special rates for bulk orders! 📦

Please share:
1. Product Name
2. Quantity required
3. Your Location

Our team will verify stock and call you with the best price.`;

const STAFF_HANDOVER_TEXT = 
`Okay, I have notified our sales team! 👤

Detailed assistance is on the way. You can continue chatting here, and a human will reply shortly.`;

const FALLBACK_DEMO_TEXT = 
`I didn't quite get that. 🤖

Reply with:
*1* for Products
*2* for Bulk Enquiry
*3* to talk to Staff`;

@Injectable()
export class RetailDemoHandler {
  private readonly logger = new Logger(RetailDemoHandler.name);
  private readonly token = process.env.WHATSAPP_ACCESS_TOKEN;
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender, // Used for Template (Greeting)
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
    // (Silently ensures Party exists for CRM)
    const party = await this.ensureLeadExists(tenantId, phone);
    const customerName = party.name === 'Guest' ? 'Friend' : party.name;

    // 2. Demo Routing Logic
    // STRICT ORDER: "1", "2", "3" -> Keywords -> Fallback

    if (this.isGreeting(cleanText)) {
      await this.sendWelcomeFlow(tenantId, phone, customerName);
      return;
    }

    if (cleanText === '1' || cleanText.includes('product')) {
      await this.sendFreeText(tenantId, phone, PRODUCTS_DEMO_TEXT);
      return;
    }

    if (cleanText === '2' || cleanText.includes('bulk')) {
      await this.sendFreeText(tenantId, phone, BULK_DEMO_TEXT);
      // Mark High Intent (Backend Logic)
      await this.markHighIntent(tenantId, phone);
      return;
    }

    if (cleanText === '3' || cleanText.includes('staff') || cleanText.includes('human')) {
      await this.sendFreeText(tenantId, phone, STAFF_HANDOVER_TEXT);
      // Stop future automation (conceptually, by not replying further)
      return;
    }

    // Fallback for unknown input
    await this.sendFreeText(tenantId, phone, FALLBACK_DEMO_TEXT);
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

  // --- Flows ---

  private async sendWelcomeFlow(tenantId: string, phone: string, name: string) {
    // 0. Fetch Shop Name for Template
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId, isActive: true },
      select: { name: true }
    });
    const shopName = shop?.name || 'Our Store';

    // 1. Send Greeting Template (retail_greeting) -- Expects {{1}} = Shop Name
    await this.sender.sendTemplateMessage(
      tenantId,
      'WELCOME' as WhatsAppFeature,
      phone,
      'retail_greeting',
      [shopName] // {{1}}
    );
    
    // 2. No Menu Text needed if template has buttons or if we rely on user typing 1/2/3
    // Keeping it simple as per "Demo-First" instruction.
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

  /**
   * PRIVATE: Free Text Sender for Session Messages
   * Isolates "Text" capability to this handler to avoid modifying global WhatsAppSender.
   */
  private async sendFreeText(tenantId: string, phone: string, text: string) {
    try {
        // 1. Get Sender ID (Re-using logic safely)
        const phoneNumberConfig = await this.prisma.whatsAppPhoneNumber.findFirst({
            where: { tenantId, isActive: true, purpose: 'DEFAULT' }
        });

        if (!phoneNumberConfig) {
            this.logger.error('[RETAIL_DEMO] No Active WhatsApp Number found');
            return;
        }

        const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberConfig.phoneNumberId}/messages`;

        // 2. Send Text Message
        await axios.post(
            url,
            {
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'text',
                text: { preview_url: false, body: text }
            },
            {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        // 3. Log (Minimal for demo)
        await this.prisma.whatsAppLog.create({
            data: {
                tenantId,
                phone,
                type: 'AUTOMATION', // or DEMO_REPLY
                status: 'SENT',
                metadata: { text_snippet: text.substring(0, 20) }
            }
        });

        this.logger.log(`[RETAIL_DEMO] Sent free text to ${phone}`);

    } catch (e) {
        this.logger.error(`[RETAIL_DEMO] Failed to send free text: ${e.message}`, e.response?.data);
    }
  }
}
