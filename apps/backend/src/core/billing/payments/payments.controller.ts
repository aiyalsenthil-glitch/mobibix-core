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
//import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

//@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // 🔒 CREATE RAZORPAY ORDER (JWT REQUIRED)
  // ─────────────────────────────────────────────
  @Post('create-order')
  async createOrder(@Req() req: any, @Body() body: { planId: string }) {
    try {
      // 1️⃣ Validate plan exists
      console.log('BODY TYPE:', typeof body, body instanceof Buffer);

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
