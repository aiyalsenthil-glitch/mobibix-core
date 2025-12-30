import { Controller, Post, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { Request } from 'express';
import * as crypto from 'crypto';
import { PaymentStatus } from '@prisma/client';

@Controller('payments')
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: Request) {
    try {
      const signature = req.headers['x-REMOVED_PAYMENT_INFRA-signature'] as string;
      const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
      if (!signature || !secret) return;

      const rawBody = (req as any).rawBody;
      const expected = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expected !== signature) {
        this.logger.warn('Invalid webhook signature');
        return;
      }
      console.log('✅ WEBHOOK REACHED NESTJS');
      console.log('Event Type:', req.body.event);
      return { status: 'ok' };
      const payload = JSON.parse(rawBody.toString());
      const event = payload.event;

      this.logger.log(`🔔 Razorpay event: ${event}`);

      if (event !== 'payment.captured') return;

      const p = payload.payload.payment.entity;

      await this.prisma.payment.create({
        data: {
          tenantId: p.notes?.tenantId, // must be sent during order creation
          planId: p.notes?.planId, // must be sent during order creation
          amount: p.amount,
          currency: p.currency,
          status: PaymentStatus.SUCCESS, // ✅ CORRECT ENUM
          provider: 'RAZORPAY',
          providerOrderId: p.order_id,
          providerPaymentId: p.id,
          providerSignature: signature,
        },
      });

      this.logger.log(`💰 Payment SUCCESS: ${p.id}`);
    } catch (err) {
      this.logger.error('Webhook error', err);
    }
  }
}
