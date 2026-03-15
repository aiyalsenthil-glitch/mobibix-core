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
   * Check if GST rates are within standard ranges [0, 5, 9, 18]
   * AND follow the business rule: If IGST > 0, then CGST=SGST=0 (interstate)
   * If IGST = 0, then CGST=SGST (same-state)
   *
   * Valid combinations:
   * - (0, 0, 0): No tax
   * - (5, 5, 0), (9, 9, 0), (18, 18, 0): Same-state with equal CGST+SGST
   * - (0, 0, 5), (0, 0, 9), (0, 0, 18): Interstate (IGST only)
   * - (5, 5, 10), (9, 9, 18): Same-state combined rate (CGST+SGST = IGST for display)
   * - (18, 18, 36): Invalid because 36% is not a standard rate
   */
  validateGSTRates(
    cgstRate: number,
    sgstRate: number,
    igstRate: number,
  ): boolean {
    const validStandardRates = [0, 5, 9, 18];
    // Valid combined rates: 0, 5, 9, 10 (5+5), 12 (6+6 hypothetical), 18 (9+9 or standalone), 28 (14+14 hypothetical), 36 (18+18)
    // BUT: 36 is NOT in standard rates, so (18,18,36) should fail
    const validCombinedRates = [0, 5, 9, 10, 12, 18, 28]; // Exclude 36

    // Step 1: CGST and SGST must be from standard rates
    if (
      !validStandardRates.includes(cgstRate) ||
      !validStandardRates.includes(sgstRate)
    ) {
      return false;
    }

    // Step 2: If CGST and SGST are both non-zero, they must be equal (same-state transaction)
    if (cgstRate > 0 && sgstRate > 0 && cgstRate !== sgstRate) {
      return false;
    }

    // Step 3: Special case - no tax (0, 0, 0)
    if (cgstRate === 0 && sgstRate === 0 && igstRate === 0) {
      return true;
    }

    // Step 4: Interstate transaction (0, 0, X) - IGST must be standard rate
    if (cgstRate === 0 && sgstRate === 0) {
      return validStandardRates.includes(igstRate);
    }

    // Step 5: Same-state transaction (X, X, Y)
    // IGST can be:
    // a) 0 (no IGST in same-state)
    // b) CGST+SGST (combined display, e.g., 5+5=10, 9+9=18)
    const combined = cgstRate + sgstRate;
    if (igstRate === 0) {
      return true; // (5,5,0), (9,9,0), (18,18,0) valid
    }
    if (igstRate === combined) {
      // Combined display: must be in valid combined rates (excludes 36)
      return validCombinedRates.includes(combined);
    }

    return false; // IGST doesn't match expected pattern
  }
}
