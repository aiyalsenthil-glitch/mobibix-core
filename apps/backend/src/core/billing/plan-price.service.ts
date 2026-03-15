/**
 * PlanPrice Service
 *
 * Manages plan pricing across different billing cycles.
 * This is the single source of truth for plan pricing in V1.
 *
 * Key Responsibilities:
 * - Get price for Plan + BillingCycle combo
 * - Create/update plan prices
 * - Support price snapshots for existing subscriptions
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingCycle } from '@prisma/client';

export interface PlanPriceInput {
  planId: string;
  billingCycle: BillingCycle;
  currency?: string;
}

export interface PlanPriceResponse {
  price: number;
  billingCycle: BillingCycle;
  currency: string;
  REMOVED_PAYMENT_INFRAPlanId?: string;
}

@Injectable()
export class PlanPriceService {
  private readonly logger = new Logger(PlanPriceService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get price for a Plan + BillingCycle combo
   */
  async getPlanPrice(input: PlanPriceInput): Promise<PlanPriceResponse> {
    const { planId, billingCycle, currency = 'INR' } = input;

    const planPrice = await this.prisma.planPrice.findUnique({
      where: {
        planId_billingCycle_currency: {
          planId,
          billingCycle,
          currency,
        },
      },
      select: {
        price: true,
        isActive: true,
        REMOVED_PAYMENT_INFRAPlanId: true,
        currency: true,
      },
    });

    if (planPrice && planPrice.isActive) {
      return {
        price: planPrice.price,
        billingCycle,
        currency: planPrice.currency,
        REMOVED_PAYMENT_INFRAPlanId: planPrice.REMOVED_PAYMENT_INFRAPlanId || undefined,
      };
    }

    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!plan) {
      throw new BadRequestException(`Plan not found: ${planId}`);
    }

    throw new BadRequestException(
      `No price found for plan ${plan.name} @ ${billingCycle}. ` +
        `Create PlanPrice record for this billingCycle.`,
    );
  }

  /**
   * Create or update a plan price
   * This is for admin APIs (future Phase 2)
   */
  async setPlanPrice(
    planId: string,
    billingCycle: BillingCycle,
    price: number,
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
      select: { name: true },
    });

    if (!plan) {
      throw new BadRequestException(`Plan not found: ${planId}`);
    }

    const planPrice = await this.prisma.planPrice.upsert({
      where: {
        planId_billingCycle_currency: {
          planId,
          billingCycle,
          currency: 'INR', // Default to INR for setPlanPrice if not specified (legacy)
        },
      },
      create: {
        planId,
        billingCycle,
        price,
        currency: 'INR',
        isActive: true,
      },
      update: {
        price,
        updatedAt: new Date(),
      },
    });

    this.logger.log(
      `Set price for ${plan.name}@${billingCycle} = ₹${price / 100}`,
    );
    return planPrice;
  }

  /**
   * Disable a plan price (soft delete)
   * This prevents new subscriptions from using this price,
   * but existing subscriptions keep their snapshots
   */
  async disablePlanPrice(planId: string, billingCycle: BillingCycle) {
    return this.prisma.planPrice.update({
      where: {
        planId_billingCycle_currency: {
          planId,
          billingCycle,
          currency: 'INR', // Default for now
        },
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * List all prices for a plan
   */
  async getPlanPrices(planId: string) {
    return this.prisma.planPrice.findMany({
      where: { planId },
      orderBy: { billingCycle: 'asc' },
    });
  }
}
