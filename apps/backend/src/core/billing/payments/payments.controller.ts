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
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleType, UserRole } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';

@UseGuards(JwtAuthGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // 🔒 CREATE RAZORPAY ORDER (JWT REQUIRED)
  // Rate limited to 5 requests per 60 seconds to prevent abuse
  // ─────────────────────────────────────────────
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
          planId_billingCycle: {
            planId: body.planId,
            billingCycle: body.billingCycle,
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

      // If pending/success order exists, return it instead of creating new one
      if (existingOrder) {
        return {
          orderId: existingOrder.providerOrderId,
          amount: existingOrder.amount,
          currency: existingOrder.currency,
          key: process.env.RAZORPAY_KEY_ID,
          idempotent: true, // Flag to indicate this is a cached response
        };
      }

      // 3️⃣ Create Razorpay order
      const order = await this.paymentsService.createOrder({
        amount: planPrice.price,
        tenantId,
        planId: plan.id,
      });

      // 4️⃣ SAVE INIT PAYMENT
      await this.prisma.payment.create({
        data: {
          tenantId,
          planId: plan.id,
          billingCycle: body.billingCycle,
          priceSnapshot: planPrice.price,
          provider: 'RAZORPAY',
          providerOrderId: order.id,
          amount: planPrice.price, // INR paise
          currency: 'INR',
          status: 'PENDING', // 👈 INIT STATE
        },
      });

      // 5️⃣ RETURN SAME RESPONSE (Android unchanged)
      return {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
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
  @Get('history')
  async getHistory(@Req() req: any) {
    return this.prisma.payment.findMany({
      where: {
        tenantId: req.user.tenantId,
        status: 'SUCCESS',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        planId: true,
        amount: true,
        currency: true,
        status: true,
        provider: true,
        createdAt: true,
      },
    });
  }
}
