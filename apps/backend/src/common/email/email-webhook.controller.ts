import { Controller, Post, Body, Headers, Req, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { Public } from '../../core/auth/decorators/public.decorator';
import { Webhook } from 'svix';

@Controller('webhooks/resend')
export class EmailWebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('inbound')
  async handleInboundEmail(
    @Req() req: any,
    @Body() payload: any,
    @Headers('webhook-id') msgId: string,
    @Headers('webhook-timestamp') msgTimestamp: string,
    @Headers('webhook-signature') msgSignature: string,
  ) {
    const secret = process.env.RESEND_WEBHOOK_SECRET;

    if (secret) {
      if (!msgId || !msgTimestamp || !msgSignature) {
        throw new BadRequestException('Missing svix headers');
      }

      try {
        const wh = new Webhook(secret);
        const rawBody = req.rawBody?.toString('utf8');
        if (!rawBody) throw new BadRequestException('Raw body not available');
        
        wh.verify(rawBody, {
          'webhook-id': msgId,
          'webhook-timestamp': msgTimestamp,
          'webhook-signature': msgSignature,
        });
      } catch (err) {
        console.error('Webhook verification failed', err);
        throw new BadRequestException('Invalid signature');
      }
    }

    const data = payload.data;
    if (!data) return { status: 'ignored' };

    const toAddress = Array.isArray(data.to) ? data.to[0] : data.to;
    const fromAddress = data.from;
    const subject = data.subject;
    const bodyHtml = data.html;
    const bodyText = data.text;
    const messageId = data.message_id || payload.id;

    await this.prisma.inboundEmail.create({
      data: {
        fromAddress,
        fromName: data.from_name || null,
        toAddress,
        subject,
        bodyHtml,
        bodyText,
        resendMessageId: messageId,
        metadata: data.headers || {},
      },
    });

    return { status: 'success' };
  }
}
