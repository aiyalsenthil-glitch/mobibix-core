import {
  Controller,
  Post,
  Headers,
  Req,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Post('webhook')
  async handleWebhook(
    @Req() req: any,
    @Headers('x-REMOVED_PAYMENT_INFRA-signature') signature: string,
  ) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.error('RAZORPAY_WEBHOOK_SECRET is not set');
      throw new BadRequestException('Webhook secret missing');
    }

    // Prefer the captured raw body buffer (set by main.ts). If not present,
    // fall back to stringifying the parsed body (best-effort).
    const rawBody: Buffer =
      req.rawBody ??
      (Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body)));

    if (!signature) {
      this.logger.warn('Missing x-REMOVED_PAYMENT_INFRA-signature header');
      throw new BadRequestException('Missing signature header');
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // Use timingSafeEqual for comparison to avoid timing attacks and ensure
    // we compare buffers of equal length.
    const sigBuf = Buffer.from(signature, 'utf8');
    const expBuf = Buffer.from(expectedSignature, 'utf8');

    this.logger.debug(
      `rawBody.length=${rawBody.length} sigLen=${sigBuf.length} expLen=${expBuf.length}`,
    );

    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      this.logger.warn('Invalid webhook signature', {
        signature,
        expected: expectedSignature,
      });
      throw new BadRequestException('Invalid webhook signature');
    }

    const payload = JSON.parse(rawBody.toString());

    if (payload.event !== 'payment.captured') {
      return { status: 'ignored' };
    }

    const payment = payload.payload.payment.entity;

    const exists = await this.prisma.payment.findFirst({
      where: { REMOVED_PAYMENT_INFRAPaymentId: payment.id },
    });

    if (exists) {
      return { status: 'already_processed' };
    }

    return { status: 'processed' };
  }

  // Debug endpoint: returns computed signature and a short raw-body snippet.
  // Only enabled outside production to avoid leaking sensitive data.
  @Post('webhook-debug')
  async debugWebhook(@Req() req: any) {
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Not allowed in production');
    }

    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      throw new BadRequestException('Webhook secret missing');
    }

    const rawBody: Buffer =
      req.rawBody ??
      (Buffer.isBuffer(req.body)
        ? req.body
        : Buffer.from(JSON.stringify(req.body)));

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    return {
      expectedSignature,
      rawBodySnippet: rawBody.toString('utf8', 0, 500),
      rawBodyLength: rawBody.length,
    };
  }
}
