import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  ForbiddenException,
} from '@nestjs/common';
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
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }

    throw new ForbiddenException('Invalid verify token');
  }

  // Optional (can stay empty for Phase-1)
  @Post()
  @Public()
  handleWebhook(@Body() body: any) {
    return { received: true };
  }
}
