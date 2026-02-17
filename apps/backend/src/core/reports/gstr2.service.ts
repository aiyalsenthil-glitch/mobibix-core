import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface GSTR2Record {
  purchaseNumber: string;
  invoiceDate: Date;
  supplierName: string;
  supplierGstin: string;
  invoiceAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  itcEligible: boolean;
  itcCgstAmount: number;
  itcSgstAmount: number;
  itcIgstAmount: number;
}

export interface GSTR2Report {
  period: string;
  generatedDate: Date;
  totalPurchases: number;
  itcEligibleCount: number;
  legacyUnverifiedCount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalITC: number;
  records: GSTR2Record[];
}

@Injectable()
export class GSTR2Service {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate GSTR-2 purchase register with ITC tracking
   */
  async generatePurchaseRegister(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GSTR2Report> {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          notIn: ['DRAFT'],
        },
      },
      include: {
        items: true,
      },
    });

    const records: GSTR2Record[] = [];
    let itcEligibleCount = 0;
    let legacyUnverifiedCount = 0;
    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalITC = 0;

    for (const purchase of purchases) {
      // Check if ITC eligible (not legacy or legacy verified, AND supplier must be registered)
      const isLegacy = purchase.isLegacyGstApproximation;
      const isVerified = purchase.verifiedAt !== null;
      const hasGstin = !!purchase.supplierGstin && purchase.supplierGstin.trim() !== "";
      const itcEligible = (!isLegacy || (isLegacy && isVerified)) && hasGstin;

      if (isLegacy && !isVerified) {
        legacyUnverifiedCount++;
        continue; // Skip unverified legacy data
      }

      const baseAmount = purchase.subTotal || 0;

      // Calculate ITC (only eligible amounts)
      const itcCgst = itcEligible ? purchase.cgst || 0 : 0;
      const itcSgst = itcEligible ? purchase.sgst || 0 : 0;
      const itcIgst = itcEligible ? purchase.igst || 0 : 0;
      const itcTotal = itcCgst + itcSgst + itcIgst;

      records.push({
        purchaseNumber: purchase.invoiceNumber,
        invoiceDate: purchase.invoiceDate,
        supplierName: purchase.supplierName,
        supplierGstin: purchase.supplierGstin || '',
        invoiceAmount: purchase.grandTotal || (baseAmount + purchase.totalGst),
        taxableAmount: baseAmount,
        cgstAmount: purchase.cgst || 0,
        sgstAmount: purchase.sgst || 0,
        igstAmount: purchase.igst || 0,
        itcEligible,
        itcCgstAmount: itcCgst,
        itcSgstAmount: itcSgst,
        itcIgstAmount: itcIgst,
      });

      if (itcEligible) itcEligibleCount++;

      totalTaxableAmount += baseAmount;
      totalCgst += purchase.cgst || 0;
      totalSgst += purchase.sgst || 0;
      totalIgst += purchase.igst || 0;
      totalITC += itcTotal;
    }

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedDate: new Date(),
      totalPurchases: purchases.length,
      itcEligibleCount,
      legacyUnverifiedCount,
      totalTaxableAmount,
      totalCgst,
      totalSgst,
      totalIgst,
      totalITC,
      records,
    };
  }

  /**
   * Generate HSN-wise summary for GSTR-2
   */
  async generateHSNSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      hsnCode: string;
      quantity: number;
      unitPrice: number;
      totalAmount: number;
      cgstRate: number;
      cgstAmount: number;
      sgstRate: number;
      sgstAmount: number;
      igstRate: number;
      igstAmount: number;
      itcEligible: boolean;
    }>
  > {
    const items = await this.prisma.purchaseItem.findMany({
      where: {
        purchase: {
          tenantId,
          invoiceDate: { gte: startDate, lte: endDate },
          status: { notIn: ['DRAFT'] },
        },
      },
      include: {
        purchase: {
          select: {
            isLegacyGstApproximation: true,
            verifiedAt: true,
            supplierGstin: true,
          },
        },
      },
    });

    const hsnMap = new Map<
      string,
      {
        quantity: number;
        totalAmount: number;
        cgstAmount: number;
        sgstAmount: number;
        igstAmount: number;
        cgstRate: number;
        sgstRate: number;
        igstRate: number;
        count: number;
        itcEligibleCount: number;
      }
    >();

    for (const item of items) {
      // Check ITC eligibility
      const isLegacy = item.purchase.isLegacyGstApproximation;
      const isVerified = item.purchase.verifiedAt !== null;
      const hasGstin = !!item.purchase.supplierGstin && item.purchase.supplierGstin.trim() !== "";
      const itcEligible = (!isLegacy || (isLegacy && isVerified)) && hasGstin;

      const key = item.hsnSac || 'UNKNOWN';
      const existing = hsnMap.get(key) || {
        quantity: 0,
        totalAmount: 0,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 0,
        cgstRate: 0,
        sgstRate: 0,
        igstRate: 0,
        count: 0,
        itcEligibleCount: 0,
      };

      existing.quantity += item.quantity;
      existing.totalAmount += item.purchasePrice * item.quantity;
      existing.cgstAmount += item.cgstAmount || 0;
      existing.sgstAmount += item.sgstAmount || 0;
      existing.igstAmount += item.igstAmount || 0;
      existing.cgstRate = Number(item.cgstRate);
      existing.sgstRate = Number(item.sgstRate);
      existing.igstRate = Number(item.igstRate);
      existing.count++;
      if (itcEligible) existing.itcEligibleCount++;

      hsnMap.set(key, existing);
    }

    return Array.from(hsnMap.entries()).map(([hsnCode, data]) => ({
      hsnCode,
      quantity: data.quantity,
      unitPrice: Math.round(data.totalAmount / data.quantity),
      totalAmount: data.totalAmount,
      cgstRate: data.cgstRate,
      cgstAmount: data.cgstAmount,
      sgstRate: data.sgstRate,
      sgstAmount: data.sgstAmount,
      igstRate: data.igstRate,
      igstAmount: data.igstAmount,
      itcEligible: data.itcEligibleCount === data.count,
    }));
  }

  /**
   * Get ITC summary (total eligible ITC)
   */
  async getITCEligibleSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalITC: number;
    legacyUnverifiedCgst: number;
    legacyUnverifiedSgst: number;
    legacyUnverifiedIgst: number;
  }> {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: startDate, lte: endDate },
        status: { notIn: ['DRAFT'] },
      },
    });

    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let legacyUnverifiedCgst = 0;
    let legacyUnverifiedSgst = 0;
    let legacyUnverifiedIgst = 0;

    for (const purchase of purchases) {
      const hasGstin = !!purchase.supplierGstin && purchase.supplierGstin.trim() !== "";
      
      if (purchase.isLegacyGstApproximation && !purchase.verifiedAt) {
        // Unverified legacy - not included in ITC
        legacyUnverifiedCgst += purchase.cgst || 0;
        legacyUnverifiedSgst += purchase.sgst || 0;
        legacyUnverifiedIgst += purchase.igst || 0;
      } else if (hasGstin) {
        // Verified/Current AND has GSTIN - included in ITC
        totalCgst += purchase.cgst || 0;
        totalSgst += purchase.sgst || 0;
        totalIgst += purchase.igst || 0;
      }
    }

    return {
      totalCgst,
      totalSgst,
      totalIgst,
      totalITC: totalCgst + totalSgst + totalIgst,
      legacyUnverifiedCgst,
      legacyUnverifiedSgst,
      legacyUnverifiedIgst,
    };
  }

  /**
   * Verify GSTR-2 consistency (180-day ITC window, supplier GSTIN validation)
   */
  async verifyGSTR2Consistency(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    const TODAY = new Date();
    const ITC_WINDOW_DAYS = 180;

    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { items: true },
    });

    for (const purchase of purchases) {
      // Check 1: ITC window (180-day limit from invoice date)
      const daysSinceInvoice = Math.floor(
        (TODAY.getTime() - purchase.invoiceDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );

      if (
        daysSinceInvoice > ITC_WINDOW_DAYS &&
        !purchase.isLegacyGstApproximation
      ) {
        issues.push(
          `Purchase ${purchase.invoiceNumber}: ITC claim window expired (${daysSinceInvoice} days, limit: ${ITC_WINDOW_DAYS})`,
        );
      }

      // Check 2: Supplier GSTIN mandatory for ITC
      if (
        purchase.totalGst > 0 &&
        !purchase.supplierGstin &&
        !purchase.isLegacyGstApproximation
      ) {
        issues.push(
          `Purchase ${purchase.invoiceNumber}: Supplier GSTIN required for ITC claim (total GST: ${purchase.totalGst})`,
        );
      }

      // Check 3: Legacy data verification status
      if (purchase.isLegacyGstApproximation && !purchase.verifiedAt) {
        issues.push(
          `Purchase ${purchase.invoiceNumber}: Legacy GST data not verified by CA (reason: ${purchase.gstApproximationReason})`,
        );
      }

      // Check 4: Tax consistency
      const itemCgst = purchase.items.reduce(
        (sum, item) => sum + (item.cgstAmount || 0),
        0,
      );
      const itemSgst = purchase.items.reduce(
        (sum, item) => sum + (item.sgstAmount || 0),
        0,
      );
      const itemIgst = purchase.items.reduce(
        (sum, item) => sum + (item.igstAmount || 0),
        0,
      );

      if (
        itemCgst !== purchase.cgst ||
        itemSgst !== purchase.sgst ||
        itemIgst !== purchase.igst
      ) {
        issues.push(
          `Purchase ${purchase.invoiceNumber}: Tax amounts mismatch between header and items`,
        );
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues,
    };
  }
}
