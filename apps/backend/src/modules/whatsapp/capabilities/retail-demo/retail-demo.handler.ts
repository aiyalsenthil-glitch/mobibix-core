import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { WhatsAppSender } from '../../whatsapp.sender';
import { RetailDemoCatalog } from './retail-demo.catalog';
import { WhatsAppFeature } from '../../../../core/billing/whatsapp-rules';

// --- CONSTANTS (Demo Content) ---

// LEVEL 1: MENU (Implicitly handled via logic, but fallback mentions it)
const FALLBACK_DEMO_TEXT = 
`I didn't quite get that 🙂

Reply with:
1 for Products
2 for Bulk Enquiry
3 to Talk to Staff`;

// LEVEL 2A: PRODUCTS LIST
const PRODUCTS_LIST_TEXT = 
`Here are our top selling items:

1. Prestige Pressure Cooker 3L – ₹1,450
2. Pigeon Tawa 280mm – ₹850
3. Butterfly Mixer Grinder – ₹3,200
4. Milton Thermosteel Flask – ₹950

Reply with the item number (1–4).`;

// LEVEL 2B: BULK PROMPT
const BULK_PROMPT_TEXT = 
`Please reply with:
- Product Name
- Quantity
- Location

(e.g., 'Plates and mugs, 10 qty, Salem')`;

// LEVEL 2C / 3: STAFF HANDOVER / CLOSE
const STAFF_HANDOVER_TEXT = 
`Thank you. Our team has been notified and will contact you shortly.`;

const PRODUCT_THANKS_TEXT = 
`Thank you for your interest.
Our team will contact you shortly with availability details.`;

const BULK_THANKS_TEXT = 
`Thank you for the details.
Our team will review your request and contact you shortly.`;


// --- TYPE DEFINITIONS ---

type DemoStep = 'MENU' | 'PRODUCT_SELECTION' | 'BULK_DETAILS' | 'WAITING_FOR_STAFF';

interface DemoSession {
  step: DemoStep;
  lastBuffer: number; // Timestamp to prevent double processing if needed
}

@Injectable()
export class RetailDemoHandler {
  private readonly logger = new Logger(RetailDemoHandler.name);
  private readonly token = process.env.WHATSAPP_ACCESS_TOKEN;
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  // In-Memory Session Store for Demo (No DB persistence requested)
  private sessions = new Map<string, DemoSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly sender: WhatsAppSender,
    private readonly catalogHelper: RetailDemoCatalog,
  ) {}

  async handleMessage(tenantId: string, phone: string, text: string): Promise<void> {
    const cleanText = text.trim();
    const cleanLower = cleanText.toLowerCase();
    this.logger.log(`[RETAIL_DEMO] Msg from ${phone}: '${cleanText}'`);

    // 0. STOP if Staff Replied Recently (24h protection)
    if (await this.hasStaffRepliedRecently(tenantId, phone)) {
      this.logger.log(`[RETAIL_DEMO] Staff active. Skipping automation.`);
      return;
    }

    // 1. Ensure Lead Exists (CRM)
    const party = await this.ensureLeadExists(tenantId, phone);
    const customerName = party.name === 'Guest' ? 'Friend' : party.name;

    // 2. Resolve Session State
    let session = this.sessions.get(phone);
    if (!session) {
      // If no session, start at MENU
      session = { step: 'MENU', lastBuffer: Date.now() };
      this.sessions.set(phone, session);
    }

    // 3. Logic Flow Engine
    switch (session.step) {
      case 'MENU':
        await this.handleMenuStep(tenantId, phone, cleanLower, customerName, session);
        break;

      case 'PRODUCT_SELECTION':
        await this.handleProductSelection(tenantId, phone, cleanLower, session);
        break;
      
      case 'BULK_DETAILS':
        await this.handleBulkDetails(tenantId, phone, cleanText, session);
        break;

      case 'WAITING_FOR_STAFF':
        // STOP AUTOMATION explicitly.
        // We do absolutely nothing here. Staff must take over.
        this.logger.log(`[RETAIL_DEMO] Automation stopped for ${phone}. Waiting for staff.`);
        break;
    }
  }

  // --- STEP HANDLERS ---

  private async handleMenuStep(
    tenantId: string, 
    phone: string, 
    text: string, 
    customerName: string, 
    session: DemoSession
  ) {
    // Check for Greetings first to send Welcome Template (only if context implies start)
    // But per requirements, we treat "1", "2", "3" strictly.
    
    // GREETING OVERRIDE: If text looks like "hi", send Greeting Template but stay in MENU
    // The requirement says: "Greeting template is already sent... After greeting, user replies..."
    // So we assume the user is REPLYING to the greeting or menu.
    
    if (text === '1' || text.includes('product')) {
      await this.sendFreeText(tenantId, phone, PRODUCTS_LIST_TEXT);
      session.step = 'PRODUCT_SELECTION';
      return;
    }

    if (text === '2' || text.includes('bulk')) {
      await this.sendFreeText(tenantId, phone, BULK_PROMPT_TEXT);
      session.step = 'BULK_DETAILS';
      return;
    }

    if (text === '3' || text.includes('staff')) {
      await this.sendFreeText(tenantId, phone, STAFF_HANDOVER_TEXT);
      session.step = 'WAITING_FOR_STAFF';
      return; // Stop
    }

    // Handling "Hi" re-entry or unknown inputs at MENU level
    if (['hi', 'hello', 'menu', 'start'].some(w => text.includes(w))) {
        // Resend Greeting Template (as a "Menu")
        await this.sendWelcomeFlow(tenantId, phone);
        // State remains MENU
        return;
    }

    // Fallback
    await this.sendFreeText(tenantId, phone, FALLBACK_DEMO_TEXT);
  }

  private async handleProductSelection(tenantId: string, phone: string, text: string, session: DemoSession) {
    // Expecting 1-4, but actually accept ANY text as selection for demo simplicity
    // Requirement: "Reply with the item number (1–4). Then wait for next user message." -> "After product selection... Send FREE TEXT... Stop"
    
    // Validate minimally? Input text length > 0 is enough.
    if (text.length > 0) {
      await this.sendFreeText(tenantId, phone, PRODUCT_THANKS_TEXT);
      await this.markHighIntent(tenantId, phone, 'PRODUCT_INTEREST');
      session.step = 'WAITING_FOR_STAFF';
    }
  }

  private async handleBulkDetails(tenantId: string, phone: string, rawText: string, session: DemoSession) {
    // Expecting: Name, Qty, Location.
    // "When any non-empty text is received... Proceed to THANK YOU step."
    if (rawText.length > 0) {
      await this.sendFreeText(tenantId, phone, BULK_THANKS_TEXT);
      await this.markHighIntent(tenantId, phone, 'BULK_ENQUIRY');
      session.step = 'WAITING_FOR_STAFF';
    }
  }

  // --- HELPERS ---

  private async sendWelcomeFlow(tenantId: string, phone: string) {
    const shop = await this.prisma.shop.findFirst({
      where: { tenantId, isActive: true },
      select: { name: true }
    });
    const shopName = shop?.name || 'Our Store';

    await this.sender.sendTemplateMessage(
      tenantId,
      'WELCOME' as WhatsAppFeature,
      phone,
      'retail_greeting',
      [shopName]
    );
  }

  private async hasStaffRepliedRecently(tenantId: string, phone: string): Promise<boolean> {
    const lastStaffLog = await this.prisma.whatsAppLog.findFirst({
        where: { tenantId, phone, type: 'MANUAL', sentAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } }
    });
    return !!lastStaffLog;
  }

  private async ensureLeadExists(tenantId: string, phone: string) {
    let party = await this.prisma.party.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
    if (!party) {
      party = await this.prisma.party.create({
        data: { tenantId, phone, name: 'Guest', partyType: 'CUSTOMER', tags: ['WHATSAPP_LEAD'] }
      });
    }
    return party;
  }

  private async markHighIntent(tenantId: string, phone: string, tag: string) {
    try {
        const party = await this.prisma.party.findUnique({ where: { tenantId_phone: { tenantId, phone } } });
        if (party && !party.tags.includes('HIGH_INTENT')) {
            await this.prisma.party.update({
                where: { id: party.id },
                data: { tags: { push: ['HIGH_INTENT', tag] } }
            });
        }
    } catch (e) { this.logger.error(`Failed to mark intent: ${e}`); }
  }

  // --- SENDER ---

  private async sendFreeText(tenantId: string, phone: string, text: string) {
    try {
        const phoneNumberConfig = await this.prisma.whatsAppPhoneNumber.findFirst({
            where: { tenantId, isActive: true, purpose: 'DEFAULT' }
        });

        if (!phoneNumberConfig) {
            this.logger.error('[RETAIL_DEMO] No Active WhatsApp Number found');
            return;
        }

        const url = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberConfig.phoneNumberId}/messages`;

        await axios.post(url, {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: phone,
            type: 'text',
            text: { preview_url: false, body: text }
        }, {
            headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' }
        });

        // LOG TO DB (Required for Frontend to see the reply)
        await this.prisma.whatsAppLog.create({
            data: {
                tenantId,
                phone,
                type: 'AUTOMATION',
                status: 'SENT',
                metadata: { text_snippet: text.substring(0, 50) } // Store snippet
            }
        });

    } catch (e) {
        this.logger.error(`[RETAIL_DEMO] Failed to send free text: ${e.message}`);
    }
  }
}
