import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../core/prisma/prisma.service';

export class SubscriptionPaymentEvent {
  constructor(
    public readonly tenantId: string,
    public readonly amount: number,       // in rupees
    public readonly isFirstPayment: boolean,
  ) {}
}

@Injectable()
export class DistributorCommissionListener {
  private readonly logger = new Logger(DistributorCommissionListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('subscription.payment.completed')
  async handleSubscriptionPayment(event: SubscriptionPaymentEvent) {
    try {
      // Find if this tenant is linked to any distributor with commission
      const link = await this.prisma.distDistributorRetailer.findFirst({
        where: {
          retailerId: event.tenantId,
          status: 'ACTIVE',
        },
        include: {
          distributor: {
            select: {
              id: true,
              defaultFirstCommissionPct: true,
              defaultRecurringCommissionPct: true,
            },
          },
        },
      });

      if (!link) return; // Not distributor-linked

      // Determine commission rate for this payment
      const pct = event.isFirstPayment
        ? (link.firstCommissionPct ?? link.distributor.defaultFirstCommissionPct)
        : (link.recurringCommissionPct ?? link.distributor.defaultRecurringCommissionPct);

      if (!pct || pct <= 0) return; // 0% commission (e.g. self-linked users)

      const commissionAmount = (event.amount * pct) / 100;
      const entryType = event.isFirstPayment ? 'FIRST_COMMISSION' : 'RECURRING_COMMISSION';

      // Get current balance
      const lastEntry = await this.prisma.distCreditLedger.findFirst({
        where: { distributorId: link.distributorId, retailerId: event.tenantId },
        orderBy: { createdAt: 'desc' },
        select: { runningBalance: true },
      });

      const runningBalance = Number(lastEntry?.runningBalance ?? 0) + commissionAmount;

      await this.prisma.distCreditLedger.create({
        data: {
          distributorId: link.distributorId,
          retailerId: event.tenantId,
          entryType,
          amount: commissionAmount,
          runningBalance,
          description: `${pct}% ${event.isFirstPayment ? 'first' : 'recurring'} commission on ₹${event.amount} subscription`,
          entryDate: new Date(),
          referenceType: 'SUBSCRIPTION_PAYMENT',
        },
      });

      this.logger.log(
        `💰 Distributor ${link.distributorId} earned ₹${commissionAmount} (${pct}%) from tenant ${event.tenantId}`,
      );
    } catch (err: any) {
      this.logger.error(`Commission hook failed: ${err.message}`);
    }
  }
}
