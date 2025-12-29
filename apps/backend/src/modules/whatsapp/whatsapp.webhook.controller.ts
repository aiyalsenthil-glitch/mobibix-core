import { Controller, Get, Query } from '@nestjs/common';
import { Public } from '../../core/auth/decorators/public.decorator';
@Public()
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
      return challenge; // 👈 Nest will send 200 automatically
    }
    return 'Forbidden';
  }
}
