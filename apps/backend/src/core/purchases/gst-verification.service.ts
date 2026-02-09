import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UnverifiedLegacyReport {
  totalCount: number;
  purchases: Array<{
    id: string;
    invoiceNumber: string;
    invoiceDate: Date;
    supplierName: string;
    totalGst: number;
    cgst: number | null;
    sgst: number | null;
    igst: number | null;
    reason: string;
  }>;
  actionRequired: string;
}

@Injectable()
export class GSTVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all unverified legacy GST records for CA review
   */
  async getUnverifiedLegacy(
    tenantId: string,
    shopId?: string,
  ): Promise<UnverifiedLegacyReport> {
    const where: any = {
      tenantId,
      isLegacyGstApproximation: true,
      verifiedAt: null,
    };

    if (shopId) {
      where.shopId = shopId;
    }

    const purchases = await this.prisma.purchase.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        supplierName: true,
        totalGst: true,
        cgst: true,
        sgst: true,
        igst: true,
        gstApproximationReason: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return {
      totalCount: purchases.length,
      purchases: purchases.map((p) => ({
        ...p,
        reason: p.gstApproximationReason || 'Backfilled during migration',
      })),
      actionRequired:
        purchases.length > 0
          ? `${purchases.length} purchases require GST verification by CA`
          : 'All legacy GST data verified',
    };
  }

  /**
   * CA verifies and corrects legacy GST amounts
   */
  async verifyLegacyGST(
    tenantId: string,
    purchaseId: string,
    cgst: number,
    sgst: number,
    igst: number,
    verifiedByUserId: string,
  ): Promise<void> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase || purchase.tenantId !== tenantId) {
      throw new BadRequestException('Purchase not found');
    }

    if (!purchase.isLegacyGstApproximation) {
      throw new BadRequestException(
        'Purchase GST already verified or not legacy',
      );
    }

    const totalGst = cgst + sgst + igst;
    if (totalGst !== purchase.totalGst) {
      throw new BadRequestException(
        `Total GST mismatch. Expected: ${purchase.totalGst}, Got: ${totalGst}`,
      );
    }

    // Update with verified amounts
    await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        cgst,
        sgst,
        igst,
        isLegacyGstApproximation: false,
        verifiedByUserId,
        verifiedAt: new Date(),
      },
    });

    // Update InvoiceItems with verified rates
    const items = await this.prisma.purchaseItem.findMany({
      where: { purchaseId },
    });

    if (items.length > 0) {
      // Simple split: distribute GST proportionally to item amounts
      const totalItemAmount = items.reduce(
        (sum, item) => sum + item.purchasePrice * item.quantity,
        0,
      );

      for (const item of items) {
        const itemProportion =
          (item.purchasePrice * item.quantity) / totalItemAmount;
        const itemGst = Math.round(purchase.totalGst * itemProportion);

        await this.prisma.purchaseItem.update({
          where: { id: item.id },
          data: {
            cgstAmount: Math.round(itemGst * (cgst / totalGst)),
            sgstAmount: Math.round(itemGst * (sgst / totalGst)),
            igstAmount: Math.round(itemGst * (igst / totalGst)),
          },
        });
      }
    }
  }

  /**
   * Check if GST rates are within standard ranges
   */
  validateGSTRates(
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
  ): boolean {
    const validRates = [0, 5, 9, 18];
    return (
      validRates.includes(cgstRate) &&
      validRates.includes(sgstRate) &&
      validRates.includes(igstRate)
    );
  }
}
