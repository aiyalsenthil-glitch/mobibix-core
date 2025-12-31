import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // 🌐 RAZORPAY WEBHOOK (PUBLIC – NO JWT)
  // ─────────────────────────────────────────────
  @Public()
  @Post('webhook')
  async handleWebhook(@Req() req: Request) {
    const event = req.body;

    // ⚠️ Later: verify Razorpay signature
    if (event.event !== 'payment.captured') {
      return { ignored: true };
    }

    const payment = event.payload.payment.entity;

    const tenantId = payment.notes?.tenantId;
    const planId = payment.notes?.planId;

    if (!tenantId || !planId) {
      throw new BadRequestException('Missing tenantId or planId in payment');
    }

    // ✅ SAVE REAL PAYMENT
    await this.prisma.payment.updateMany({
      where: {
        providerOrderId: payment.order_id,
        tenantId,
      },
      data: {
        providerPaymentId: payment.id,
        amount: payment.amount / 100, // final confirmed amount
        currency: payment.currency,
        status: 'SUCCESS', // enum-safe
      },
    });

    return { status: 'payment saved' };
  }

  // ─────────────────────────────────────────────
  // 🔒 CREATE RAZORPAY ORDER (JWT REQUIRED)
  // ─────────────────────────────────────────────
  @Post('create-order')
  async createOrder(@Req() req: any, @Body() body: { planId: string }) {
    try {
      // 1️⃣ Validate plan exists
      const plan = await this.prisma.plan.findUnique({
        where: { id: body.planId },
      });

      if (!plan) {
        throw new NotFoundException('Plan not found');
      }

      // 2️⃣ Validate price
      if (plan.price === null || plan.price <= 0) {
        throw new BadRequestException('Invalid plan price');
      }

      // 3️⃣ Create Razorpay order
      // 3️⃣ Create Razorpay order
      const order = await this.paymentsService.createOrder({
        amount: plan.price,
        tenantId: req.user.tenantId,
        planId: plan.id,
      });

      // 4️⃣ SAVE INIT PAYMENT (IMPORTANT STEP-2)
      await this.prisma.payment.create({
        data: {
          tenantId: req.user.tenantId,
          planId: plan.id,
          provider: 'RAZORPAY',
          providerOrderId: order.id,
          amount: plan.price, // INR value
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
      console.error('❌ Create-order failed:', err);

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
