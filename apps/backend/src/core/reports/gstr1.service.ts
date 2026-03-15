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
  summary: {
    totalInvoices: number;
    b2bCount: number;
    b2cCount: number;
    exportCount: number;
    totalTaxableAmount: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
  };
  records: GSTR1Record[];
  meta: {
    page: number;
    limit: number;
    totalPages: number;
    totalRecords: number;
  };
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
    page: number = 1,
    limit: number = 50,
  ): Promise<GSTR1Report> {
    const skip = (page - 1) * limit;
    const where: any = {
      tenantId,
      invoiceDate: { gte: startDate, lte: endDate },
      status: { not: 'VOIDED' },
      deletedAt: null,
    };

    // 1. Run summary aggregations and paginated fetch in parallel
    const [summaryAgg, b2bCount, invoices, totalRecords] = await Promise.all([
      // Total revenue and tax sums
      this.prisma.invoice.aggregate({
        where,
        _sum: { totalAmount: true, cgst: true, sgst: true, igst: true },
        _count: { id: true },
      }),
      // Count of B2B invoices (those with a GST number captured at time of sale)
      this.prisma.invoice.count({
        where: {
          ...where,
          AND: [
            { customerGstin: { not: null } },
            { customerGstin: { not: "" } },
          ],
        },
      }),
      // Paginated records
      this.prisma.invoice.findMany({
        where,
        include: { items: true, customer: true },
        orderBy: { invoiceDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const records: GSTR1Record[] = invoices.map((invoice) => {
      const baseAmount = invoice.items.reduce((sum, item) => sum + item.lineTotal, 0);
      const isB2B = !!invoice.customer?.gstNumber;

      return {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.customer?.name || invoice.customerName,
        gstinUin: invoice.customer?.gstNumber || '',
        invoiceAmount: paiseToRupees(invoice.totalAmount),
        taxableAmount: paiseToRupees(baseAmount),
        cgstAmount: paiseToRupees(invoice.cgst || 0),
        sgstAmount: paiseToRupees(invoice.sgst || 0),
        igstAmount: paiseToRupees(invoice.igst || 0),
        category: isB2B ? 'B2B' : 'B2C',
      };
    });

    return {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      generatedDate: new Date(),
      summary: {
        totalInvoices: summaryAgg._count.id,
        b2bCount,
        b2cCount: summaryAgg._count.id - b2bCount,
        exportCount: 0,
        totalTaxableAmount: paiseToRupees(summaryAgg._sum.totalAmount || 0),
        totalCgst: paiseToRupees(summaryAgg._sum.cgst || 0),
        totalSgst: paiseToRupees(summaryAgg._sum.sgst || 0),
        totalIgst: paiseToRupees(summaryAgg._sum.igst || 0),
      },
      records,
      meta: {
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit),
        totalRecords,
      },
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
    const hsnGroups = await this.prisma.invoiceItem.groupBy({
      by: ['hsnCode', 'cgstRate', 'sgstRate', 'igstRate'],
      where: {
        invoice: {
          tenantId,
          invoiceDate: { gte: startDate, lte: endDate },
          status: { not: 'VOIDED' },
          deletedAt: null,
        },
      },
      _sum: {
        quantity: true,
        lineTotal: true,
        cgstAmount: true,
        sgstAmount: true,
        igstAmount: true,
      },
    });

    return hsnGroups.map((group) => ({
      hsnCode: group.hsnCode || 'UNKNOWN',
      quantity: group._sum.quantity || 0,
      unitPrice: paiseToRupees(Math.round((group._sum.lineTotal || 0) / (group._sum.quantity || 1))),
      totalAmount: paiseToRupees(group._sum.lineTotal || 0),
      cgstRate: Number(group.cgstRate),
      cgstAmount: paiseToRupees(group._sum.cgstAmount || 0),
      sgstRate: Number(group.sgstRate),
      sgstAmount: paiseToRupees(group._sum.sgstAmount || 0),
      igstRate: Number(group.igstRate),
      igstAmount: paiseToRupees(group._sum.igstAmount || 0),
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
