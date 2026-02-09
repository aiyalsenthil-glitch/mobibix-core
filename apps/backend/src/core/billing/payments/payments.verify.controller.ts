import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
  Req,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, UserRole, ModuleType } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('payments')
export class PaymentsVerifyController {
  private readonly logger = new Logger(PaymentsVerifyController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
  ) {}

  // Rate limited to 10 requests per 60 seconds (higher than createOrder to allow retries)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify')
  async verifyPayment(
    @Req() req: any,
    @Body()
    body: {
      orderId: string;
      paymentId: string;
      signature: string;
      planId: string;
      billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    },
  ) {
    const { orderId, paymentId, signature, planId, billingCycle } = body;

    if (!orderId || !paymentId || !signature || !planId || !billingCycle) {
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

    // 2️⃣ Find payment record
    const existingPayment = await this.prisma.payment.findFirst({
      where: {
        provider: 'RAZORPAY',
        providerOrderId: orderId,
        tenantId: req.user.tenantId,
      },
    });

    if (!existingPayment) {
      throw new BadRequestException('Payment order not found');
    }

    // 3️⃣ Idempotency: if already verified, skip subscription creation
    if (existingPayment.status === PaymentStatus.SUCCESS) {
      return { success: true, alreadyVerified: true };
    }

    // 4️⃣ Update payment to SUCCESS
    await this.prisma.payment.update({
      where: { id: existingPayment.id },
      data: {
        status: PaymentStatus.SUCCESS,
        providerPaymentId: paymentId,
        providerSignature: signature,
      },
    });

    // 5️⃣ 🔥 CREATE/ACTIVATE SUBSCRIPTION
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { tenantType: true },
    });

    const module =
      (tenant?.tenantType || '').toUpperCase().replace(/[\s_-]/g, '') === 'GYM'
        ? ModuleType.GYM
        : ModuleType.MOBILE_SHOP;

    // 🔒 SECURITY FIX: Use planId and billingCycle from the TRUSTED payment record
    // Do NOT use the values from the request body (which could be tampered with)
    await this.subscriptionsService.buyPlanPhase1({
      tenantId: req.user.tenantId,
      planId: existingPayment.planId,
      module,
      billingCycle: existingPayment.billingCycle,
    });

    return { success: true, subscriptionCreated: true };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔄 FALLBACK: Retry subscription creation if webhook/verify failed
  // Call this if user sees "SUBSCRIPTION_EXPIRED" after successful payment
  // ═══════════════════════════════════════════════════════════════════════════
  @Post('retry-subscription')
  async retrySubscriptionCreation(
    @Req() req: any,
    @Body()
    body: {
      orderId: string;
      billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
    },
  ) {
    const { orderId, billingCycle } = body;

    if (!orderId || !billingCycle) {
      throw new BadRequestException(
        'Missing orderId or billingCycle for retry',
      );
    }

    // 1️⃣ Find the successful payment by orderId
    const payment = await this.prisma.payment.findFirst({
      where: {
        provider: 'RAZORPAY',
        providerOrderId: orderId,
        tenantId: req.user.tenantId,
        status: PaymentStatus.SUCCESS, // Only retry if payment is confirmed SUCCESS
      },
    });

    if (!payment) {
      throw new BadRequestException(
        'No successful payment found for this order',
      );
    }

    // 2️⃣ Call buyPlanPhase1 - will auto-upgrade if subscription exists
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: req.user.tenantId },
      select: { tenantType: true },
    });

    const module =
      (tenant?.tenantType || '').toUpperCase().replace(/[\s_-]/g, '') === 'GYM'
        ? 'GYM'
        : 'MOBILE_SHOP';

    const subscription = await this.subscriptionsService.buyPlanPhase1({
      tenantId: req.user.tenantId,
      planId: payment.planId,
      module,
      billingCycle,
    });

    this.logger.log(
      `✅ Retry-subscription: paymentId=${payment.id}, ` +
        `subscriptionId=${subscription.id}, planId=${payment.planId}`,
    );

    return {
      success: true,
      subscriptionCreated: true,
      subscriptionId: subscription.id,
      message: 'Subscription created/upgraded successfully',
    };
  }
}
