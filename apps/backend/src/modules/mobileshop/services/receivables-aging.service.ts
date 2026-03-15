import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * ReceivablesAgingService: Track customer payment dues by age buckets
 *
 * Purpose: Show outstanding invoices grouped by days overdue
 * Used for: Cash flow management, collection prioritization
 */
@Injectable()
export class ReceivablesAgingService {
  private readonly logger = new Logger(ReceivablesAgingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get receivables aging report
   * Groups unpaid/partial invoices by age: 0-30, 31-60, 61-90, 90+ days
   */
  async getAgingReport(
    tenantId: string,
    shopId?: string,
  ): Promise<{
    current: number;
    thirtyToSixty: number;
    sixtyToNinety: number;
    ninetyPlus: number;
    total: number;
    totalDue: number;
    details: {
      current: Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>;
      thirtyToSixty: Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>;
      sixtyToNinety: Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>;
      ninetyPlus: Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>;
    };
  }> {
    // Fetch all unpaid/partial invoices
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const today = new Date();
    let current = 0,
      thirtyToSixty = 0,
      sixtyToNinety = 0,
      ninetyPlus = 0,
      totalDue = 0;

    const details = {
      current: [] as Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>,
      thirtyToSixty: [] as Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>,
      sixtyToNinety: [] as Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>,
      ninetyPlus: [] as Array<{
        invoiceId: string;
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>,
    };

    for (const invoice of invoices) {
      const daysOld = Math.floor(
        (today.getTime() - invoice.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const balanceDue = invoice.totalAmount - invoice.paidAmount;
      totalDue += balanceDue;

      const item = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName:
          invoice.customer?.name || invoice.customerName || 'Unknown',
        customerPhone: invoice.customer?.phone || invoice.customerPhone || '',
        invoiceDate: invoice.createdAt,
        invoiceAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceDue,
        daysOverdue: daysOld,
      };

      if (daysOld <= 30) {
        current += balanceDue;
        details.current.push(item);
      } else if (daysOld <= 60) {
        thirtyToSixty += balanceDue;
        details.thirtyToSixty.push(item);
      } else if (daysOld <= 90) {
        sixtyToNinety += balanceDue;
        details.sixtyToNinety.push(item);
      } else {
        ninetyPlus += balanceDue;
        details.ninetyPlus.push(item);
      }
    }

    this.logger.log(
      `Receivables aging: current=₹${current}, 30-60=₹${thirtyToSixty}, 60-90=₹${sixtyToNinety}, 90+=₹${ninetyPlus}`,
    );

    return {
      current,
      thirtyToSixty,
      sixtyToNinety,
      ninetyPlus,
      total: invoices.length,
      totalDue,
      details,
    };
  }

  /**
   * Get top delinquent customers (highest overdue amounts)
   */
  async getTopDelinquentCustomers(
    tenantId: string,
    shopId?: string,
    limit: number = 10,
  ): Promise<
    Array<{
      customerId: string;
      customerName: string;
      phone: string;
      totalOverdue: number;
      invoiceCount: number;
      oldestInvoiceDate: Date;
    }>
  > {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        ...(shopId && { shopId }),
        status: { in: ['UNPAID', 'PARTIALLY_PAID'] },
      },
      include: { customer: { select: { id: true, name: true, phone: true } } },
    });

    // Group by customer
    const customerMap = new Map<
      string,
      {
        customerId: string;
        customerName: string;
        phone: string;
        totalOverdue: number;
        invoiceCount: number;
        oldestInvoiceDate: Date;
      }
    >();

    for (const invoice of invoices) {
      if (!invoice.customer) continue;

      const customerId = invoice.customer.id;
      const balanceDue = invoice.totalAmount - invoice.paidAmount;

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId,
          customerName: invoice.customer.name,
          phone: invoice.customer.phone,
          totalOverdue: 0,
          invoiceCount: 0,
          oldestInvoiceDate: invoice.createdAt,
        });
      }

      const customer = customerMap.get(customerId)!;
      customer.totalOverdue += balanceDue;
      customer.invoiceCount += 1;
      if (invoice.createdAt < customer.oldestInvoiceDate) {
        customer.oldestInvoiceDate = invoice.createdAt;
      }
    }

    // Sort by total overdue (descending) and take top N
    const result = Array.from(customerMap.values())
      .sort((a, b) => b.totalOverdue - a.totalOverdue)
      .slice(0, limit);

    this.logger.debug(
      `Top ${limit} delinquent customers: ${result.map((c) => `${c.customerName} (₹${c.totalOverdue})`).join(', ')}`,
    );

    return result;
  }

  /**
   * Export aging report as CSV
   */
  async exportAsCSV(tenantId: string, shopId?: string): Promise<string> {
    const report = await this.getAgingReport(tenantId, shopId);

    let csv =
      'Age Bucket,Invoice Number,Customer,Phone,Invoice Date,Invoice Amount,Paid,Balance Due,Days Overdue\n';

    const addRows = (
      bucket: string,
      items: Array<{
        invoiceNumber: string;
        customerName: string;
        customerPhone: string;
        invoiceDate: Date;
        invoiceAmount: number;
        paidAmount: number;
        balanceDue: number;
        daysOverdue: number;
      }>,
    ) => {
      for (const item of items) {
        csv += `${bucket},${item.invoiceNumber},${item.customerName},${item.customerPhone},${item.invoiceDate.toISOString().split('T')[0]},${item.invoiceAmount},${item.paidAmount},${item.balanceDue},${item.daysOverdue}\n`;
      }
    };

    addRows('0-30 days', report.details.current);
    addRows('31-60 days', report.details.thirtyToSixty);
    addRows('61-90 days', report.details.sixtyToNinety);
    addRows('90+ days', report.details.ninetyPlus);

    csv += `\nSummary,,,,,,,,\n`;
    csv += `0-30 days,,,,,,,,₹${report.current}\n`;
    csv += `31-60 days,,,,,,,,₹${report.thirtyToSixty}\n`;
    csv += `61-90 days,,,,,,,,₹${report.sixtyToNinety}\n`;
    csv += `90+ days,,,,,,,,₹${report.ninetyPlus}\n`;
    csv += `Total Receivables,,,,,,,,₹${report.totalDue}\n`;

    return csv;
  }
}
