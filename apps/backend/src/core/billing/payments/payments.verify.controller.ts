import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
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
      orderId: string;
      paymentId: string;
      signature: string;
      planId: string;
    },
  ) {
    const { orderId, paymentId, signature, planId } = body;

    if (!orderId || !paymentId || !signature || !planId) {
      throw new BadRequestException('Missing payment details');
    }

    // 1️⃣ Verify Razorpay signature (FINAL & CORRECT)
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      throw new BadRequestException('Invalid payment signature');
    }

    // 2️⃣ Upgrade subscription (SOURCE OF TRUTH)
    await this.subscriptionsService.upgradeSubscription(
      req.user.tenantId,
      planId,
    );

    // 3️⃣ Store payment record (NO plan.price here)
    await this.prisma.payment.create({
      data: {
        tenantId: req.user.tenantId,
        planId,

        amount: 0, // pricing handled elsewhere
        currency: 'INR',
        status: 'SUCCESS',

        provider: 'RAZORPAY',
        providerOrderId: orderId,
        providerPaymentId: paymentId,
        providerSignature: signature,
      },
    });

    return { success: true };
  }
}
