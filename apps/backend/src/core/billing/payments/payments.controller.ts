import { Controller, Post, Get, Body, UseGuards, Req } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  // ─────────────────────────────────────────────
  // CREATE RAZORPAY ORDER
  // ─────────────────────────────────────────────
  @Post('create-order')
  async createOrder(@Req() req: any, @Body() body: { plan: 'BASIC' | 'PRO' }) {
    const amount = body.plan === 'BASIC' ? 999 : 1999;

    const order = await this.paymentsService.createOrder(amount);

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    };
  }

  // ─────────────────────────────────────────────
  // PAYMENT HISTORY (TENANT)
  // ─────────────────────────────────────────────
  @Get('history')
  async getPaymentHistory(@Req() req: any) {
    return this.prisma.payment.findMany({
      where: { tenantId: req.user.tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
