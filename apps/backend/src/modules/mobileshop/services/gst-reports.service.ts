import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { paiseToRupees } from '../../../core/utils/currency.utils';

/**
 * GSTReportsService: Generate GST compliance reports
 *
 * Handles:
 * - GSTR-1 B2B (Sales to registered customers with GSTIN)
 * - GSTR-1 B2C (Summary of sales to unregistered customers)
 * - GSTR-2 (Inward supplies from registered suppliers)
 * - CSV export for filing
 *
 * Note: Simplified Phase-1 version. Phase-2 adds GSTR-3B reconciliation
 */
@Injectable()
export class GSTReportsService {
  private readonly logger = new Logger(GSTReportsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GSTR-1 B2B: Sales to registered customers (with GSTIN)
   * Typically filed monthly
   */
  async getGSTR1B2B(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        customer: {
          gstNumber: { not: null }, // B2B: Only invoices to GSTIN customers
        },
        status: { in: ['PAID', 'PARTIALLY_PAID'] }, // Only paid invoices
        ...(shopId && { shopId }),
      },
      include: {
        customer: true,
        items: true,
      },
    });

    this.logger.debug(`GSTR-1 B2B: Found ${invoices.length} invoices`);

    return invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerGstin: inv.customer?.gstNumber,
      customerName: inv.customer?.name,
      invoiceValue: paiseToRupees(inv.totalAmount),
      taxableValue: paiseToRupees(inv.subTotal),
      cgst: paiseToRupees(inv.cgst || 0),
      sgst: paiseToRupees(inv.sgst || 0),
      igst: paiseToRupees(inv.igst || 0),
      totalTax: paiseToRupees((inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0)),
    }));
  }

  /**
   * GSTR-1 B2C: Summary of sales to unregistered customers (no GSTIN)
   * Typically one summary row for B2C sales
   */
  async getGSTR1B2C(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        customer: {
          gstNumber: null, // B2C: Only invoices without GSTIN
        },
        status: { in: ['PAID', 'PARTIALLY_PAID'] },
        ...(shopId && { shopId }),
      },
      include: { items: true },
    });

    this.logger.debug(`GSTR-1 B2C: Found ${invoices.length} invoices`);

    // Group by HSN code for HSN-wise reporting
    const hsnWise = new Map<
      string,
      {
        hsn: string;
        invoiceCount: number;
        taxableValue: number;
        cgst: number;
        sgst: number;
        igst: number;
        totalTax: number;
      }
    >();

    for (const inv of invoices) {
      for (const item of inv.items) {
        const hsnCode = item.hsnCode || 'UNCLASSIFIED';

        if (!hsnWise.has(hsnCode)) {
          hsnWise.set(hsnCode, {
            hsn: hsnCode,
            invoiceCount: 0,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
            totalTax: 0,
          });
        }

        const existing = hsnWise.get(hsnCode)!;
        existing.invoiceCount += 1;
        existing.taxableValue += paiseToRupees(item.rate);
        existing.cgst += paiseToRupees(item.cgstAmount || 0);
        existing.sgst += paiseToRupees(item.sgstAmount || 0);
        existing.igst += paiseToRupees(item.igstAmount || 0);
        existing.totalTax = existing.cgst + existing.sgst + existing.igst;
      }
    }

    return Array.from(hsnWise.values());
  }

  /**
   * GSTR-2 (Inward Supplies): Purchases from registered suppliers
   * Helps track ITC eligibility
   */
  async getGSTR2(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ) {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        supplierGstin: { not: null }, // Only GST-registered suppliers
        status: { in: ['SUBMITTED', 'PARTIALLY_PAID', 'PAID'] },
        ...(shopId && { shopId }),
      },
      include: {
        party: true,
        items: true,
      },
    });

    this.logger.debug(`GSTR-2: Found ${purchases.length} purchases`);

    return purchases.map((purch) => ({
      billNumber: purch.invoiceNumber,
      billDate: purch.invoiceDate,
      supplierGstin: purch.supplierGstin,
      supplierName: purch.party?.name || purch.supplierName,
      invoiceValue: paiseToRupees(purch.grandTotal),
      taxableValue: paiseToRupees(purch.subTotal),
      cgst: paiseToRupees(purch.cgst || 0),
      sgst: paiseToRupees(purch.sgst || 0),
      igst: paiseToRupees(purch.igst || 0),
      totalTax: paiseToRupees((purch.cgst || 0) + (purch.sgst || 0) + (purch.igst || 0)),
      itcEligible: true, // Can claim ITC if supplier is registered
    }));
  }

  /**
   * Export GSTR-1 as CSV for filing with tax authority
   */
  async exportGSTR1AsCSV(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ): Promise<string> {
    const b2b = await this.getGSTR1B2B(tenantId, fromDate, toDate, shopId);
    const b2c = await this.getGSTR1B2C(tenantId, fromDate, toDate, shopId);

    let csv = 'GSTR-1 Report\n';
    csv += `From: ${fromDate.toDateString()}\n`;
    csv += `To: ${toDate.toDateString()}\n\n`;

    // B2B section: Individual invoices to registered customers
    csv += 'B2B - INVOICES TO REGISTERED CUSTOMERS\n';
    csv +=
      'Invoice No,Invoice Date,Customer GSTIN,Customer Name,Taxable Value,CGST,SGST,IGST,Total Tax\n';

    for (const item of b2b) {
      csv +=
        `${item.invoiceNumber},${item.invoiceDate.toISOString().split('T')[0]},` +
        `${item.customerGstin},${item.customerName},${item.taxableValue},` +
        `${item.cgst},${item.sgst},${item.igst},${item.totalTax}\n`;
    }

    // B2C section: Summary by HSN code
    csv += '\nB2C - SUMMARY BY HSN CODE\n';
    csv += 'HSN Code,Invoice Count,Taxable Value,CGST,SGST,IGST,Total Tax\n';

    for (const item of b2c) {
      csv +=
        `${item.hsn},${item.invoiceCount},${item.taxableValue},` +
        `${item.cgst},${item.sgst},${item.igst},${item.totalTax}\n`;
    }

    // Summary totals
    const b2bTotal = b2b.reduce((sum, i) => sum + i.totalTax, 0);
    const b2cTotal = b2c.reduce((sum, i) => sum + i.totalTax, 0);

    csv += `\nTOTAL GST LIABILITY: ${b2bTotal + b2cTotal}\n`;

    return csv;
  }

  /**
   * Export GSTR-2 as CSV for record keeping
   */
  async exportGSTR2AsCSV(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ): Promise<string> {
    const items = await this.getGSTR2(tenantId, fromDate, toDate, shopId);

    let csv = 'GSTR-2 Report (Inward Supplies)\n';
    csv += `From: ${fromDate.toDateString()}\n`;
    csv += `To: ${toDate.toDateString()}\n\n`;

    csv +=
      'Bill No,Bill Date,Supplier GSTIN,Supplier Name,Taxable Value,CGST,SGST,IGST,Total Tax,ITC Eligible\n';

    for (const item of items) {
      csv +=
        `${item.billNumber},${item.billDate.toISOString().split('T')[0]},` +
        `${item.supplierGstin},${item.supplierName},${item.taxableValue},` +
        `${item.cgst},${item.sgst},${item.igst},${item.totalTax},${item.itcEligible ? 'YES' : 'NO'}\n`;
    }

    const totalTax = items.reduce((sum, i) => sum + i.totalTax, 0);
    csv += `\nTOTAL INBOUND GST: ${totalTax}\n`;

    return csv;
  }
}
