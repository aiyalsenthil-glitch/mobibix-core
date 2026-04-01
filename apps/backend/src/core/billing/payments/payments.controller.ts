import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { BillingType } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../auth/guards/tenant.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleType, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { SkipSubscriptionCheck } from '../../auth/decorators/skip-subscription-check.decorator';
import { ModulePermission, RequirePermission } from '../../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../../security/permission-registry';

@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  // 🔒 CREATE RAZORPAY ORDER (JWT REQUIRED)
  // Rate limited to 5 requests per 60 seconds to prevent abuse
  // ─────────────────────────────────────────────
  @SkipSubscriptionCheck()
  @RequirePermission(PERMISSIONS.CORE.BILLING.MANAGE)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('create-order')
  async createOrder(
    @Req() req: any,
    @Body()
    body: { planId: string; billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' },
  ) {
    try {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        throw new BadRequestException('Tenant not found for user');
      }

      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
      });

      if (!tenant) {
        throw new BadRequestException('Tenant does not exist');
      }

      const normalizedTenantType = (tenant.tenantType || '')
        .toUpperCase()
        .replace(/[\s_-]/g, '');
      const tenantModule =
        normalizedTenantType === 'MOBILESHOP'
          ? ModuleType.MOBILE_SHOP
          : normalizedTenantType === 'GYM'
            ? ModuleType.GYM
            : undefined;

      if (!tenantModule) {
        throw new BadRequestException('Unsupported tenant module');
      }

      // 1️⃣ Validate plan exists
      const plan = await this.prisma.plan.findUnique({
        where: { id: body.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      if (!plan.isActive || !plan.isPublic) {
        throw new BadRequestException('Plan is not available for purchase');
      }

      if (
        plan.module !== tenantModule &&
        plan.module !== ModuleType.WHATSAPP_CRM
      ) {
        throw new ForbiddenException(
          'Plan module does not match tenant module',
        );
      }

      // 2️⃣ Get price from PlanPrice table
      const planPrice = await this.prisma.planPrice.findUnique({
        where: {
          planId_billingCycle_currency: {
            planId: body.planId,
            billingCycle: body.billingCycle,
            currency: tenant.currency || 'INR',
          },
        },
      });

      if (!planPrice || !planPrice.isActive) {
        throw new BadRequestException(
          `No active price found for plan "${plan.name}" @ ${body.billingCycle}`,
        );
      }

      // 🛡️ IDEMPOTENCY CHECK: Prevent duplicate orders from double-clicks
      // Check if there's already a pending or successful order for this tenant+plan+cycle
      const existingOrder = await this.prisma.payment.findFirst({
        where: {
          tenantId,
          planId: body.planId,
          billingCycle: body.billingCycle,
          status: {
            in: ['PENDING', 'SUCCESS'],
          },
          createdAt: {
            // Only check orders created in the last 10 minutes
            gte: new Date(Date.now() - 10 * 60 * 1000),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      // If pending/success order exists, check if expired
      if (existingOrder) {
        const isExpired =
          existingOrder.expiresAt && new Date() > existingOrder.expiresAt;

        if (isExpired) {
          // Mark as expired and allow new order creation
          await this.prisma.payment.update({
            where: { id: existingOrder.id },
            data: { status: 'EXPIRED' },
          });
          this.logger.log(
            `Marked expired payment ${existingOrder.id} as EXPIRED`,
          );
        } else if (
          existingOrder.status === 'PENDING' ||
          existingOrder.status === 'SUCCESS'
        ) {
          // Still valid, return existing order
          return {
            orderId: existingOrder.providerOrderId,
            amount: existingOrder.amount,
            currency: existingOrder.currency,
            key: process.env.RAZORPAY_KEY_ID,
            expiresAt: existingOrder.expiresAt,
            idempotent: true, // Flag to indicate this is a cached response
          };
        }
      }

      // 3️⃣ Create Razorpay order with expiry
      const { order, expiresAt } = await this.paymentsService.createOrder({
        amount: planPrice.price,
        tenantId,
        planId: plan.id,
        module: tenantModule,
        billingCycle: body.billingCycle,
      });

      // 4️⃣ SAVE INIT PAYMENT with expiresAt
      await this.prisma.payment.create({
        data: {
          tenantId,
          planId: plan.id,
          module: tenantModule,      // ✅ Required by PaymentActivationService
          billingCycle: body.billingCycle,
          priceSnapshot: planPrice.price,
          provider: 'RAZORPAY',
          providerOrderId: order.id,
          amount: planPrice.price, // INR paise
          currency: 'INR',
          status: 'PENDING', // 👈 INIT STATE
          expiresAt, // 🆕 Store expiry time
        },
      });

      // 5️⃣ RETURN with expiry info (frontend can show countdown timer)
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        expiresAt, // 🆕 Frontend can show countdown
      };
    } catch (err: any) {
      // rethrow known HTTP errors
      if (err?.status) {
        throw err;
      }

      // unknown / Razorpay / env errors
      throw new InternalServerErrorException(
        err?.message || 'Payment order creation failed',
      );
    }
  }

  // ─────────────────────────────────────────────
  // 🔒 PAYMENT HISTORY (JWT + TENANT)
  // ─────────────────────────────────────────────
  @SkipSubscriptionCheck()
  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
  @Get('history')
  async getHistory(@Req() req: any) {
    const payments = await this.prisma.payment.findMany({
      where: {
        tenantId: req.user.tenantId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });

    // Resolve plan names
    const planIds = [...new Set(payments.map((p) => p.planId).filter(Boolean))];
    const plans = planIds.length
      ? await this.prisma.plan.findMany({
          where: { id: { in: planIds } },
          select: { id: true, name: true, code: true },
        })
      : [];

    const planMap = new Map(plans.map((p) => [p.id, p]));

    return payments.map((p) => ({
      id: p.id,
      tenantId: p.tenantId,
      planId: p.planId,
      plan: p.planId ? planMap.get(p.planId) || null : null,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      providerOrderId: p.providerOrderId,
      providerPaymentId: p.providerPaymentId,
      billingCycle: p.billingCycle,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));
  }

  // ─────────────────────────────────────────────
  // 🔒 CREATE AUTOPAY SUBSCRIPTION (RAZORPAY)
  // Returns Razorpay subscriptionId so the frontend can open the checkout.
  // Webhook subscription.activated → activates the TenantSubscription.
  // MONTHLY, QUARTERLY, and YEARLY all have Razorpay plan IDs mapped.
  // ─────────────────────────────────────────────
  @SkipSubscriptionCheck()
  @RequirePermission(PERMISSIONS.CORE.BILLING.MANAGE)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('create-subscription')
  async createAutoPaySubscription(
    @Req() req: any,
    @Body() body: { planId: string; billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY' },
  ) {
    const tenantId = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant not found');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new BadRequestException('Tenant does not exist');

    const normalizedType = (tenant.tenantType || '').toUpperCase().replace(/[\s_-]/g, '');
    const tenantModule =
      normalizedType === 'MOBILESHOP'
        ? ModuleType.MOBILE_SHOP
        : normalizedType === 'GYM'
          ? ModuleType.GYM
          : undefined;

    if (!tenantModule) throw new BadRequestException('Unsupported tenant module');

    const plan = await this.prisma.plan.findUnique({ where: { id: body.planId } });
    if (!plan || !plan.isActive || !plan.isPublic) {
      throw new BadRequestException('Plan not available for purchase');
    }
    if (plan.module !== tenantModule && plan.module !== ModuleType.WHATSAPP_CRM) {
      throw new ForbiddenException('Plan module does not match tenant');
    }

    // Ensure PlanPrice has REMOVED_PAYMENT_INFRAPlanId (set by init-wa-REMOVED_PAYMENT_INFRA-plans script)
    const planPrice = await this.prisma.planPrice.findUnique({
      where: {
        planId_billingCycle_currency: {
          planId: body.planId,
          billingCycle: body.billingCycle,
          currency: tenant.currency || 'INR',
        },
      },
    });
    if (!planPrice?.REMOVED_PAYMENT_INFRAPlanId) {
      throw new BadRequestException(
        `AutoPay is not configured for this plan/cycle. Run the Razorpay plan init script first, or use single payment instead.`,
      );
    }

    try {
      const result = await this.subscriptionsService.buyPlanPhase1({
        tenantId,
        planId: body.planId,
        module: tenantModule,
        billingCycle: body.billingCycle,
        billingType: BillingType.AUTOPAY,
      });

      return {
        subscriptionId: result.subscriptionId,
        key: process.env.RAZORPAY_KEY_ID,
      };
    } catch (err: any) {
      if (err?.status) throw err;
      throw new InternalServerErrorException(err?.message || 'Failed to create subscription');
    }
  }
}
