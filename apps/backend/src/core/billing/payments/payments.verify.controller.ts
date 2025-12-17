import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsVerifyController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('verify')
  async verifyPayment(
    @Req() req: any,
    @Body()
    body: {
      REMOVED_PAYMENT_INFRA_order_id: string;
      REMOVED_PAYMENT_INFRA_payment_id: string;
      REMOVED_PAYMENT_INFRA_signature: string;
      plan: 'BASIC' | 'PRO';
    },
  ) {
    const { REMOVED_PAYMENT_INFRA_order_id, REMOVED_PAYMENT_INFRA_payment_id, REMOVED_PAYMENT_INFRA_signature, plan } =
      body;

    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${REMOVED_PAYMENT_INFRA_order_id}|${REMOVED_PAYMENT_INFRA_payment_id}`)
      .digest('hex');

    if (generatedSignature !== REMOVED_PAYMENT_INFRA_signature) {
      throw new BadRequestException('Invalid payment signature');
    }
    await this.prisma.payment.create({
      data: {
        tenantId: req.user.tenantId,
        planName: plan,
        amount: plan === 'BASIC' ? 999 : 1999,
        currency: 'INR',
        REMOVED_PAYMENT_INFRAOrderId: REMOVED_PAYMENT_INFRA_order_id,
        REMOVED_PAYMENT_INFRAPaymentId: REMOVED_PAYMENT_INFRA_payment_id,
        REMOVED_PAYMENT_INFRASignature: REMOVED_PAYMENT_INFRA_signature,
      },
    });

    // ✅ PAYMENT VERIFIED — UPGRADE TENANT
    await this.subscriptionsService.upgradeSubscription(
      req.user.tenantId,
      plan,
    );

    return {
      success: true,
      plan,
    };
  }
}
