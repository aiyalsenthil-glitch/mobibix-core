import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AgingBucket {
  dayRange: string;
  count: number;
  totalAmount: number;
  outstandingAmount: number;
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: Date;
    daysOverdue: number;
    invoiceAmount: number;
    paidAmount: number;
    outstandingAmount: number;
  }>;
}

export interface ReceivablesAgingReport {
  asOfDate: Date;
  totalInvoices: number;
  totalInvoiceAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  buckets: Array<{
    dayRange: string;
    count: number;
    totalAmount: number;
    outstandingAmount: number;
    percentage: number;
  }>;
}

export interface PayablesAgingReport {
  asOfDate: Date;
  totalPurchases: number;
  totalPurchaseAmount: number;
  totalPaidAmount: number;
  totalOutstandingAmount: number;
  buckets: Array<{
    dayRange: string;
    count: number;
    totalAmount: number;
    outstandingAmount: number;
    percentage: number;
  }>;
}

@Injectable()
export class AgingReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get receivables aging report
   */
  async getReceivablesAging(
    tenantId: string,
    asOfDate?: Date,
  ): Promise<ReceivablesAgingReport> {
    const date = asOfDate || new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: {
          not: 'VOIDED',
        },
      },
    });

    // Group into age buckets
    const buckets = [
      { range: '0-30', label: '0-30 days', minDays: 0, maxDays: 30 },
      { range: '31-60', label: '31-60 days', minDays: 31, maxDays: 60 },
      { range: '61-90', label: '61-90 days', minDays: 61, maxDays: 90 },
      { range: '90+', label: '90+ days', minDays: 91, maxDays: Infinity },
    ];

    const agingBuckets: Array<{
      dayRange: string;
      count: number;
      totalAmount: number;
      outstandingAmount: number;
      percentage: number;
    }> = [];

    let totalInvoiceAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;

    for (const bucket of buckets) {
      let bucketCount = 0;
      let bucketTotalAmount = 0;
      let bucketOutstandingAmount = 0;

      for (const invoice of invoices) {
        const daysOverdue = Math.floor(
          (date.getTime() - invoice.invoiceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays) {
          bucketCount++;
          bucketTotalAmount += invoice.subTotal;
          bucketOutstandingAmount += invoice.subTotal - invoice.paidAmount;
        }
      }

      totalInvoiceAmount += bucketTotalAmount;
      totalOutstandingAmount += bucketOutstandingAmount;

      agingBuckets.push({
        dayRange: bucket.label,
        count: bucketCount,
        totalAmount: bucketTotalAmount,
        outstandingAmount: bucketOutstandingAmount,
        percentage:
          totalInvoiceAmount > 0
            ? Math.round(
                (bucketOutstandingAmount / totalInvoiceAmount) * 10000,
              ) / 100
            : 0,
      });
    }

    totalPaidAmount = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);

    return {
      asOfDate: date,
      totalInvoices: invoices.length,
      totalInvoiceAmount,
      totalPaidAmount,
      totalOutstandingAmount,
      buckets: agingBuckets,
    };
  }

  /**
   * Get payables aging report
   */
  async getPayablesAging(
    tenantId: string,
    asOfDate?: Date,
  ): Promise<PayablesAgingReport> {
    const date = asOfDate || new Date();

    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        status: {
          notIn: ['DRAFT'],
        },
      },
    });

    const buckets = [
      { range: '0-30', label: '0-30 days', minDays: 0, maxDays: 30 },
      { range: '31-60', label: '31-60 days', minDays: 31, maxDays: 60 },
      { range: '61-90', label: '61-90 days', minDays: 61, maxDays: 90 },
      { range: '90+', label: '90+ days', minDays: 91, maxDays: Infinity },
    ];

    const agingBuckets: Array<{
      dayRange: string;
      count: number;
      totalAmount: number;
      outstandingAmount: number;
      percentage: number;
    }> = [];

    let totalPurchaseAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;

    for (const bucket of buckets) {
      let bucketCount = 0;
      let bucketTotalAmount = 0;
      let bucketOutstandingAmount = 0;

      for (const purchase of purchases) {
        const daysOverdue = Math.floor(
          (date.getTime() - purchase.invoiceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays) {
          bucketCount++;
          bucketTotalAmount += purchase.subTotal;
          bucketOutstandingAmount += purchase.subTotal - purchase.paidAmount;
        }
      }

      totalPurchaseAmount += bucketTotalAmount;
      totalOutstandingAmount += bucketOutstandingAmount;

      agingBuckets.push({
        dayRange: bucket.label,
        count: bucketCount,
        totalAmount: bucketTotalAmount,
        outstandingAmount: bucketOutstandingAmount,
        percentage:
          totalPurchaseAmount > 0
            ? Math.round(
                (bucketOutstandingAmount / totalPurchaseAmount) * 10000,
              ) / 100
            : 0,
      });
    }

    totalPaidAmount = purchases.reduce((sum, pur) => sum + pur.paidAmount, 0);

    return {
      asOfDate: date,
      totalPurchases: purchases.length,
      totalPurchaseAmount,
      totalPaidAmount,
      totalOutstandingAmount,
      buckets: agingBuckets,
    };
  }

  /**
   * Get detailed receivables aging with invoice list
   */
  async getDetailedReceivablesAging(
    tenantId: string,
    asOfDate?: Date,
  ): Promise<Array<AgingBucket>> {
    const date = asOfDate || new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'VOIDED' },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const buckets = [
      { range: '0-30', label: '0-30 days', minDays: 0, maxDays: 30 },
      { range: '31-60', label: '31-60 days', minDays: 31, maxDays: 60 },
      { range: '61-90', label: '61-90 days', minDays: 61, maxDays: 90 },
      { range: '90+', label: '90+ days', minDays: 91, maxDays: Infinity },
    ];

    const result: AgingBucket[] = [];

    for (const bucket of buckets) {
      const bucketInvoices: AgingBucket['invoices'] = [];
      let totalAmount = 0;
      let totalOutstanding = 0;

      for (const invoice of invoices) {
        const daysOverdue = Math.floor(
          (date.getTime() - invoice.invoiceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays) {
          const outstanding = invoice.subTotal - invoice.paidAmount;
          bucketInvoices.push({
            invoiceNumber: invoice.invoiceNumber,
            invoiceDate: invoice.invoiceDate,
            daysOverdue,
            invoiceAmount: invoice.subTotal,
            paidAmount: invoice.paidAmount,
            outstandingAmount: outstanding,
          });
          totalAmount += invoice.subTotal;
          totalOutstanding += outstanding;
        }
      }

      result.push({
        dayRange: bucket.label,
        count: bucketInvoices.length,
        totalAmount,
        outstandingAmount: totalOutstanding,
        invoices: bucketInvoices,
      });
    }

    return result;
  }

  /**
   * Get detailed payables aging with purchase list
   */
  async getDetailedPayablesAging(
    tenantId: string,
    asOfDate?: Date,
  ): Promise<Array<AgingBucket>> {
    const date = asOfDate || new Date();

    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT'] },
      },
      orderBy: { invoiceDate: 'desc' },
    });

    const buckets = [
      { range: '0-30', label: '0-30 days', minDays: 0, maxDays: 30 },
      { range: '31-60', label: '31-60 days', minDays: 31, maxDays: 60 },
      { range: '61-90', label: '61-90 days', minDays: 61, maxDays: 90 },
      { range: '90+', label: '90+ days', minDays: 91, maxDays: Infinity },
    ];

    const result: AgingBucket[] = [];

    for (const bucket of buckets) {
      const bucketPurchases: AgingBucket['invoices'] = [];
      let totalAmount = 0;
      let totalOutstanding = 0;

      for (const purchase of purchases) {
        const daysOverdue = Math.floor(
          (date.getTime() - purchase.invoiceDate.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        if (daysOverdue >= bucket.minDays && daysOverdue <= bucket.maxDays) {
          const paid = purchase.paidAmount;
          bucketPurchases.push({
            invoiceNumber: purchase.invoiceNumber,
            invoiceDate: purchase.invoiceDate,
            daysOverdue,
            invoiceAmount: purchase.subTotal,
            paidAmount: paid,
            outstandingAmount: purchase.subTotal - paid,
          });
          totalAmount += purchase.subTotal;
          totalOutstanding += purchase.subTotal - paid;
        }
      }

      result.push({
        dayRange: bucket.label,
        count: bucketPurchases.length,
        totalAmount,
        outstandingAmount: totalOutstanding,
        invoices: bucketPurchases,
      });
    }

    return result;
  }
}
