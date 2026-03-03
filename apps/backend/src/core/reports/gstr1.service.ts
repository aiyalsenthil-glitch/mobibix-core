import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { paiseToRupees } from '../utils/currency.utils';

interface GSTR1Record {
  invoiceNumber: string;
  invoiceDate: Date;
  customerName: string;
  gstinUin: string;
  invoiceAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  category: 'B2B' | 'B2C' | 'EXPORT' | 'DEEMED';
}

export interface GSTR1Report {
  period: string;
  generatedDate: Date;
  totalInvoices: number;
  b2bCount: number;
  b2cCount: number;
  exportCount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  records: GSTR1Record[];
}

@Injectable()
export class GSTR1Service {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate GSTR-1 sales register for a period
   */
  async generateSalesRegister(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<GSTR1Report> {
    // Get all invoices (excluding cancellations) in period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: {
          gte: startDate,
          lte: endDate,
        },
        status: {
          not: 'VOIDED', // Exclude voided invoices
        },
      },
      include: {
        items: true,
        customer: true,
      },
    });

    const records: GSTR1Record[] = [];
    let b2bCount = 0;
    let b2cCount = 0;
    const exportCount = 0;
    let totalTaxableAmount = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    for (const invoice of invoices) {
      // Skip if any item is legacy GST approximation and unverified
      const hasUnverifiedLegacy = invoice.items.some((item) => {
        // Would need to check related Purchase's legacy flag
        // For now, assume invoices from purchases are verified
        return false;
      });

      if (hasUnverifiedLegacy) {
        continue; // Skip unverified legacy data
      }

      const baseAmount = invoice.items.reduce(
        (sum, item) => sum + item.lineTotal,
        0,
      );

      // Determine category
      let category: 'B2B' | 'B2C' | 'EXPORT' | 'DEEMED' = 'B2C';
      if (invoice.customer?.gstNumber) {
        category = 'B2B';
      } else if (invoice.customer?.state) {
        // For inter-state without GST, could be B2C Large or Export
        category = 'B2C';
      }

      records.push({
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.customer?.name || invoice.customerName,
        gstinUin: invoice.customer?.gstNumber || '',
        invoiceAmount: paiseToRupees(invoice.subTotal),
        taxableAmount: paiseToRupees(baseAmount),
        cgstAmount: paiseToRupees(invoice.cgst || 0),
        sgstAmount: paiseToRupees(invoice.sgst || 0),
        igstAmount: paiseToRupees(invoice.igst || 0),
        category,
      });

      if (category === 'B2B') b2bCount++;
      else if (category === 'B2C') b2cCount++;

      totalTaxableAmount += baseAmount;
      totalCgst += invoice.cgst || 0;
      totalSgst += invoice.sgst || 0;
      totalIgst += invoice.igst || 0;
    }

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedDate: new Date(),
      totalInvoices: invoices.length,
      b2bCount,
      b2cCount,
      exportCount,
      totalTaxableAmount: paiseToRupees(totalTaxableAmount),
      totalCgst: paiseToRupees(totalCgst),
      totalSgst: paiseToRupees(totalSgst),
      totalIgst: paiseToRupees(totalIgst),
      records,
    };
  }

  /**
   * Generate HSN-wise summary for GSTR-1
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
    }>
  > {
    const items = await this.prisma.invoiceItem.findMany({
      where: {
        invoice: {
          tenantId,
          invoiceDate: { gte: startDate, lte: endDate },
          status: { not: 'VOIDED' },
        },
      },
    });

    // Group by HSN and aggregate
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
      }
    >();

    for (const item of items) {
      const key = item.hsnCode || 'UNKNOWN';
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
      };

      existing.quantity += item.quantity;
      existing.totalAmount += item.lineTotal;
      existing.cgstAmount += item.cgstAmount || 0;
      existing.sgstAmount += item.sgstAmount || 0;
      existing.igstAmount += item.igstAmount || 0;
      existing.cgstRate = Number(item.cgstRate);
      existing.sgstRate = Number(item.sgstRate);
      existing.igstRate = Number(item.igstRate);
      existing.count++;

      hsnMap.set(key, existing);
    }

    return Array.from(hsnMap.entries()).map(([hsnCode, data]) => ({
      hsnCode,
      quantity: data.quantity,
      unitPrice: paiseToRupees(Math.round(data.totalAmount / data.quantity)),
      totalAmount: paiseToRupees(data.totalAmount),
      cgstRate: data.cgstRate,
      cgstAmount: paiseToRupees(data.cgstAmount),
      sgstRate: data.sgstRate,
      sgstAmount: paiseToRupees(data.sgstAmount),
      igstRate: data.igstRate,
      igstAmount: paiseToRupees(data.igstAmount),
    }));
  }

  /**
   * Verify GSTR-1 data consistency (no over-billing, all rates valid)
   */
  async verifyGSTR1Consistency(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{
    isConsistent: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: { items: true },
    });

    for (const invoice of invoices) {
      // Check 1: Verify no over-collection
      if (invoice.paidAmount > invoice.subTotal) {
        issues.push(
          `Invoice ${invoice.invoiceNumber}: Over-collection detected (${invoice.paidAmount} > ${invoice.subTotal})`,
        );
      }

      // Check 2: Verify tax amounts match items
      const itemCgst = invoice.items.reduce(
        (sum, item) => sum + (item.cgstAmount || 0),
        0,
      );
      const itemSgst = invoice.items.reduce(
        (sum, item) => sum + (item.sgstAmount || 0),
        0,
      );
      const itemIgst = invoice.items.reduce(
        (sum, item) => sum + (item.igstAmount || 0),
        0,
      );

      if (itemCgst !== invoice.cgst) {
        issues.push(
          `Invoice ${invoice.invoiceNumber}: CGST mismatch (items: ${itemCgst}, header: ${invoice.cgst})`,
        );
      }
      if (itemSgst !== invoice.sgst) {
        issues.push(
          `Invoice ${invoice.invoiceNumber}: SGST mismatch (items: ${itemSgst}, header: ${invoice.sgst})`,
        );
      }
      if (itemIgst !== invoice.igst) {
        issues.push(
          `Invoice ${invoice.invoiceNumber}: IGST mismatch (items: ${itemIgst}, header: ${invoice.igst})`,
        );
      }

      // Check 3: Verify valid GST rates
      for (const item of invoice.items) {
        const validRates = [0, 5, 12, 18];
        if (
          !validRates.includes(Number(item.cgstRate)) ||
          !validRates.includes(Number(item.sgstRate)) ||
          !validRates.includes(Number(item.igstRate))
        ) {
          issues.push(
            `Invoice ${invoice.invoiceNumber}, Item ${item.id}: Invalid GST rates (CGST: ${item.cgstRate}, SGST: ${item.sgstRate}, IGST: ${item.igstRate})`,
          );
        }
      }
    }

    return {
      isConsistent: issues.length === 0,
      issues,
    };
  }
}
