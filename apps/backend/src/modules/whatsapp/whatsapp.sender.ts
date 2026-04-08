import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * 🧱 MOBIBIX OPEN CORE STUB: WhatsApp Integration
 * 
 * This service is a functional stub for the MobiBix Cloud WhatsApp Engine.
 * It provides a standardized logging interface to ensure the core remains 
 * operational while signaling where enterprise-grade messaging triggers occur.
 */
@Injectable()
export class WhatsAppSender {
  private readonly logger = new Logger('WhatsAppSender');

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log-based Stub for Template Messages
   * Turns code into a development sales funnel
   */
  async sendTemplateMessage(
    tenantId: string,
    notificationType: string,
    phone: string,
    templateName: string,
    parameters: string[],
    options?: any,
  ): Promise<{
    success: boolean;
    messageId?: string;
    skipped?: boolean;
    reason?: string;
    upgrade?: string;
  }> {
    console.log('\n--- [MobiBix Core] WhatsApp Logic Triggered ---');
    console.log(`📍 Feature: ${notificationType}`);
    console.log(`📱 Recipient: ${phone}`);
    console.log(`📝 Template: ${templateName}`);
    console.log(`📦 Data: ${JSON.stringify(parameters)}`);
    console.log('--- [MobiBix Core] Feature stubbed for Open Source ---\n');

    // Return structured response for 'Feature Gate Messaging'
    return {
      success: true,
      messageId: `stub_${Date.now()}`,
      reason: 'WhatsApp feature available in MobiBix Cloud',
      upgrade: 'https://mobibix.in/upgrade?feature=whatsapp'
    };
  }

  /**
   * Log-based Stub for Text Messages
   */
  async sendTextMessage(
    tenantId: string,
    phone: string,
    text: string,
    whatsAppNumberId?: string,
    isBot = false,
  ): Promise<{ success: boolean; messageId?: string; upgrade?: string }> {
    console.log(`[MobiBix Stub] WhatsApp Send Text: to=${phone}, msg="${text.substring(0, 50)}..."`);
    
    return {
      success: true,
      messageId: `stub_text_${Date.now()}`,
      upgrade: 'https://mobibix.in/upgrade?feature=whatsapp-chat'
    };
  }

  /**
   * Log-based Stub for SMS
   */
  async sendSms(
    tenantId: string,
    phone: string,
    text: string,
  ): Promise<{ success: boolean; messageId?: string; upgrade?: string }> {
    console.log(`[MobiBix Stub] SMS Send: to=${phone}, msg="${text.substring(0, 50)}..."`);
    
    return {
      success: true,
      messageId: `stub_sms_${Date.now()}`,
      upgrade: 'https://mobibix.in/upgrade?feature=sms'
    };
  }

  // Placeholder for internal dependency resolution to prevent compilation errors
  async resolveNotificationNumberId(tenantId: string): Promise<string | undefined> {
    return undefined;
  }
}
