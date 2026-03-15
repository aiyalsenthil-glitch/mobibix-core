import {
  Controller,
  Post,
  Body,
  BadRequestException,
  UseGuards,
  Req,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../auth/guards/tenant.guard';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentStatus, UserRole, ModuleType } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { PaymentActivationService } from './payment-activation.service';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../../security/permission-registry';

@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('payments')
export class PaymentsVerifyController {
  private readonly logger = new Logger(PaymentsVerifyController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly prisma: PrismaService,
    private readonly paymentActivationService: PaymentActivationService,
  ) {}

  // Rate limited to 10 requests per 60 seconds (higher than createOrder to allow retries)
  @RequirePermission(PERMISSIONS.CORE.BILLING.MANAGE)
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

    // 🆕 Check if order expired
    if (existingPayment.expiresAt && new Date() > existingPayment.expiresAt) {
      await this.prisma.payment.update({
        where: { id: existingPayment.id },
        data: { status: PaymentStatus.EXPIRED },
      });

      throw new BadRequestException(
        'Payment order expired. Please create a new order.',
      );
    }

    // ✅ VERIFY TENANTID MATCHES (defensive check)
    if (existingPayment.tenantId !== req.user.tenantId) {
      throw new ForbiddenException('Payment does not belong to this tenant');
    }

    // ✅ 3️⃣ Trigger unified activation service (idempotent)
    const result =
      await this.paymentActivationService.activateSubscriptionFromPayment(
        existingPayment.id,
      );

    return {
      success: true,
      status: result.status,
      subscriptionId: result.subscriptionId,
      message:
        result.status === 'already_processed'
          ? 'Subscription already activated'
          : 'Subscription activated successfully',
    };
  }

  /**
   * FALLBACK: Retry subscription activation if webhook/verify failed
   * Call this if user sees "SUBSCRIPTION_EXPIRED" after successful payment
   *
   * Uses unified PaymentActivationService (idempotent)
   */
  @RequirePermission(PERMISSIONS.CORE.BILLING.MANAGE)
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

    // Find the successful payment by orderId
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

    // ✅ Use unified activation service (idempotent)
    const result =
      await this.paymentActivationService.activateSubscriptionFromPayment(
        payment.id,
      );

    this.logger.log(
      `[RETRY] Subscription: paymentId=${payment.id}, status=${result.status}`,
    );

    return {
      success: true,
      status: result.status,
      subscriptionId: result.subscriptionId,
      message:
        result.status === 'already_processed'
          ? 'Subscription already activated'
          : 'Subscription activated successfully',
    };
  }
}
