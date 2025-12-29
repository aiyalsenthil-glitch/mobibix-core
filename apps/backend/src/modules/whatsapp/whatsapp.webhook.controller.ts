import { Controller, Get, Query } from '@nestjs/common';

@Controller('webhook/whatsapp')
export class WhatsAppWebhookController {
  @Get()
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const VERIFY_TOKEN = 'NotifyHub_Verify'; // same as Meta UI

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ WhatsApp webhook verified');
      return challenge; // 👈 Nest will send 200 automatically
    }

    console.log('❌ WhatsApp webhook verification failed');
    return 'Forbidden';
  }
}
