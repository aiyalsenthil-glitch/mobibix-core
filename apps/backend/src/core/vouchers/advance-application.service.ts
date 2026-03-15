import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AdvanceBalance {
  advanceVoucherId: string;
  totalAdvance: number;
  appliedAmount: number;
  availableBalance: number;
}

@Injectable()
export class AdvanceApplicationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Apply supplier advance to a purchase (settlement)
   */
  async applyAdvanceToPurchase(
    tenantId: string,
    advanceVoucherId: string,
    purchaseId: string,
    appliedAmount: number,
  ): Promise<void> {
    // Validate advance exists and belongs to tenant
    const advance = await this.prisma.paymentVoucher.findFirst({
      where: { id: advanceVoucherId, tenantId },
    });

    if (!advance || advance.tenantId !== tenantId) {
      throw new BadRequestException('Advance voucher not found');
    }

    if (advance.voucherSubType !== 'ADVANCE') {
      throw new BadRequestException(
        'Voucher is not an advance (sub-type must be ADVANCE)',
      );
    }

    // Validate purchase exists
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: purchaseId, tenantId },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new BadRequestException('Purchase not found');
    }

    // Check available balance
    const balance = await this.getAdvanceBalance(tenantId, advanceVoucherId);

    if (appliedAmount > balance.availableBalance) {
      throw new BadRequestException(
        `Applied amount (${appliedAmount}) exceeds available balance (${balance.availableBalance})`,
      );
    }

    if (appliedAmount <= 0) {
      throw new BadRequestException('Applied amount must be greater than 0');
    }

    // Check for duplicate application
    const existing = await this.prisma.advanceApplication.findUnique({
      where: {
        advanceVoucherId_purchaseId: {
          advanceVoucherId,
          purchaseId,
        },
      },
    });

    if (existing) {
      throw new BadRequestException('Advance already applied to this purchase');
    }

    // Apply advance (atomic transaction)
    await this.prisma.$transaction(async (tx) => {
      // Create advance application record
      await tx.advanceApplication.create({
        data: {
          advanceVoucherId,
          purchaseId,
          appliedAmount,
          appliedAt: new Date(),
        },
      });

      // Update purchase paidAmount to reflect advance application
      const newPaidAmount = purchase.paidAmount + appliedAmount;
      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
        },
      });

      // Optionally: Create financial entry for settlement
      // await tx.financialEntry.create({ ... })
    });
  }

  /**
   * Get advance balance (total - applied)
   */
  async getAdvanceBalance(
    tenantId: string,
    advanceVoucherId: string,
  ): Promise<AdvanceBalance> {
    const advance = await this.prisma.paymentVoucher.findFirst({
      where: { id: advanceVoucherId, tenantId },
      include: {
        advanceApplications: true,
      },
    });

    if (!advance || advance.tenantId !== tenantId) {
      throw new BadRequestException('Advance voucher not found');
    }

    const appliedAmount = advance.advanceApplications.reduce(
      (sum, app) => sum + app.appliedAmount,
      0,
    );

    return {
      advanceVoucherId,
      totalAdvance: advance.amount,
      appliedAmount,
      availableBalance: advance.amount - appliedAmount,
    };
  }

  /**
   * Get all advances for a supplier
   */
  async getSupplierAdvances(
    tenantId: string,
    supplierName: string,
  ): Promise<AdvanceBalance[]> {
    const advances = await this.prisma.paymentVoucher.findMany({
      where: {
        tenantId,
        voucherSubType: 'ADVANCE',
        // Note: Need to add reference field to PaymentVoucher or use another method to filter by supplier
      },
    });

    return advances.map((adv) => {
      // Note: advanceApplications relation not yet defined in schema
      const appliedAmount = 0; // Would need to query AdvanceApplication separately

      return {
        advanceVoucherId: adv.id,
        totalAdvance: adv.amount,
        appliedAmount,
        availableBalance: adv.amount - appliedAmount,
      };
    });
  }

  /**
   * Get advances applied to a purchase
   */
  async getPurchaseAdvances(
    tenantId: string,
    purchaseId: string,
  ): Promise<
    Array<{
      advanceVoucherId: string;
      advanceNumber: string;
      appliedAmount: number;
      appliedAt: Date;
    }>
  > {
    const applications = await this.prisma.advanceApplication.findMany({
      where: {
        purchaseId,
        purchase: { tenantId },
      },
    });

    // Would need to join with PaymentVoucher separately
    return applications.map((app) => ({
      advanceVoucherId: app.advanceVoucherId,
      advanceNumber: 'VOUCHER', // Would need to fetch from PaymentVoucher
      appliedAmount: app.appliedAmount,
      appliedAt: app.appliedAt,
    }));
  }

  /**
   * Reverse an advance application (refund)
   */
  async reverseAdvanceApplication(
    tenantId: string,
    applicationId: string,
  ): Promise<void> {
    const application = await this.prisma.advanceApplication.findFirst({
      where: {
        id: applicationId,
        purchase: { tenantId },
      },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // Fetch purchase and voucher separately
    const purchase = await this.prisma.purchase.findFirst({
      where: { id: application.purchaseId, tenantId },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new BadRequestException('Application not found');
    }

    // Reverse: remove application and restore purchase paidAmount
    await this.prisma.$transaction(async (tx) => {
      await tx.advanceApplication.delete({
        where: { id: applicationId },
      });

      await tx.purchase.update({
        where: { id: application.purchaseId },
        data: {
          paidAmount: purchase.paidAmount - application.appliedAmount,
        },
      });
    });
  }
}
