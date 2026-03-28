import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import Razorpay from 'REMOVED_PAYMENT_INFRA';
import { Public } from '../../core/auth/decorators/public.decorator';
import { SkipSubscriptionCheck } from '../../core/auth/decorators/skip-subscription-check.decorator';
import { FitnessJwtGuard } from './guards/fitness-jwt.guard';
import { PrismaService } from '../../core/prisma/prisma.service';

// Plan amounts in paise (INR)
const PRO_PLANS = {
  MONTHLY:  { amountPaise: 9900,   label: '₹99/month',    durationDays: 30 },
  ANNUAL:   { amountPaise: 79900,  label: '₹799/year',    durationDays: 365 },
  LIFETIME: { amountPaise: 199900, label: '₹1,999 one-time', durationDays: null },
} as const;

type ProPlan = keyof typeof PRO_PLANS;

@Controller('fitness/pro')
@Public()
@SkipSubscriptionCheck()
@UseGuards(FitnessJwtGuard)
export class FitnessProController {
  private readonly REMOVED_PAYMENT_INFRA: Razorpay | null;

  constructor(private readonly prisma: PrismaService) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    this.REMOVED_PAYMENT_INFRA = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;
  }

  @Get('status')
  async getStatus(@Req() req: any) {
    const { fitnessProfileId } = req.user;
    const profile = await this.prisma.fitnessProfile.findUnique({
      where: { id: fitnessProfileId },
      select: { tier: true, proExpiresAt: true },
    });
    const isPro =
      profile?.tier === 'PRO' &&
      (profile.proExpiresAt === null || profile.proExpiresAt > new Date());

    return {
      tier: profile?.tier ?? 'FREE',
      isPro,
      proExpiresAt: profile?.proExpiresAt ?? null,
      plans: PRO_PLANS,
    };
  }

  @Post('order')
  async createOrder(@Req() req: any, @Body() body: { plan: ProPlan }) {
    if (!this.REMOVED_PAYMENT_INFRA) throw new InternalServerErrorException('Payment not configured');

    const plan = PRO_PLANS[body.plan];
    if (!plan) throw new BadRequestException('Invalid plan. Choose MONTHLY, ANNUAL, or LIFETIME');

    const { fitnessProfileId } = req.user;

    const order = await this.REMOVED_PAYMENT_INFRA.orders.create({
      amount: plan.amountPaise,
      currency: 'INR',
      receipt: `fp_${fitnessProfileId.slice(-8)}_${Date.now()}`,
      payment_capture: true,
      notes: { fitnessProfileId, plan: body.plan },
    });

    return {
      orderId: order.id,
      amount: plan.amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      plan: body.plan,
      label: plan.label,
    };
  }

  @Post('verify')
  async verifyPayment(
    @Req() req: any,
    @Body() body: { orderId: string; paymentId: string; signature: string; plan: ProPlan },
  ) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) throw new InternalServerErrorException('Payment not configured');

    const expected = createHmac('sha256', keySecret)
      .update(`${body.orderId}|${body.paymentId}`)
      .digest('hex');

    if (expected !== body.signature) {
      throw new BadRequestException('Payment verification failed. Invalid signature.');
    }

    const { fitnessProfileId } = req.user;
    const plan = PRO_PLANS[body.plan];
    if (!plan) throw new BadRequestException('Invalid plan');

    const proExpiresAt = plan.durationDays
      ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000)
      : null; // lifetime = null

    await this.prisma.fitnessProfile.update({
      where: { id: fitnessProfileId },
      data: { tier: 'PRO', proExpiresAt },
    });

    return {
      success: true,
      tier: 'PRO',
      proExpiresAt,
      message: plan.durationDays
        ? `Pro activated! Valid until ${proExpiresAt?.toLocaleDateString('en-IN')}`
        : 'Lifetime Pro activated!',
    };
  }
}
