import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * DailySalesReportService: Generate daily sales summary with GST breakdown
 *
 * Purpose: End-of-day sales reconciliation, tax tracking
 * Used for: Daily closing, accounting integration, cash flow tracking
 */
@Injectable()
export class DailySalesReportService {
  private readonly logger = new Logger(DailySalesReportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get daily sales report for a date range
   * Groups sales by date with GST breakdown
   */
  async getDailySalesReport(
    tenantId: string,
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      totalInvoices: number;
      totalSales: number;
      totalGST: number;
      netSales: number;
      paidAmount: number;
      pendingAmount: number;
      gstBreakdown: {
        cgst: number;
        sgst: number;
        igst: number;
      };
    }>
  > {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        shopId,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PAID'] }, // Exclude VOIDED
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by date
    const dailyMap = new Map<
      string,
      {
        date: string;
        totalInvoices: number;
        totalSales: number;
        totalGST: number;
        netSales: number;
        paidAmount: number;
        pendingAmount: number;
        gstBreakdown: { cgst: number; sgst: number; igst: number };
      }
    >();

    for (const invoice of invoices) {
      const dateKey = invoice.createdAt.toISOString().split('T')[0]; // YYYY-MM-DD

      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalInvoices: 0,
          totalSales: 0,
          totalGST: 0,
          netSales: 0,
          paidAmount: 0,
          pendingAmount: 0,
          gstBreakdown: { cgst: 0, sgst: 0, igst: 0 },
        });
      }

      const day = dailyMap.get(dateKey)!;
      day.totalInvoices += 1;
      day.totalSales += invoice.totalAmount;
      day.totalGST += invoice.gstAmount;
      day.netSales += invoice.totalAmount - invoice.gstAmount;
      day.paidAmount += invoice.paidAmount;
      day.pendingAmount += invoice.totalAmount - invoice.paidAmount;

      // GST breakdown (CGST + SGST for intrastate, IGST for interstate)
      // Assuming intrastate: CGST = SGST = gstAmount / 2
      day.gstBreakdown.cgst += invoice.gstAmount / 2;
      day.gstBreakdown.sgst += invoice.gstAmount / 2;
    }

    const result = Array.from(dailyMap.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    this.logger.log(
      `Daily sales report: ${result.length} days, total sales=₹${result.reduce((sum, d) => sum + d.totalSales, 0)}`,
    );

    return result;
  }

  /**
   * Get summary for today's sales (quick dashboard widget)
   */
  async getTodaySales(
    tenantId: string,
    shopId: string,
  ): Promise<{
    date: string;
    totalInvoices: number;
    totalSales: number;
    totalGST: number;
    netSales: number;
    cashSales: number;
    cardSales: number;
    upiSales: number;
    pendingAmount: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        shopId,
        createdAt: { gte: today, lt: tomorrow },
        status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PAID'] },
      },
    });

    let totalInvoices = 0,
      totalSales = 0,
      totalGST = 0,
      netSales = 0,
      pendingAmount = 0;
    let cashSales = 0,
      cardSales = 0,
      upiSales = 0;

    for (const invoice of invoices) {
      totalInvoices += 1;
      totalSales += invoice.totalAmount;
      totalGST += invoice.gstAmount;
      netSales += invoice.totalAmount - invoice.gstAmount;
      pendingAmount += invoice.totalAmount - invoice.paidAmount;

      // Sum by payment method (from direct fields)
      cashSales += invoice.cashAmount || 0;
      cardSales += invoice.cardAmount || 0;
      upiSales += invoice.upiAmount || 0;
    }

    this.logger.log(
      `Today's sales: ${totalInvoices} invoices, ₹${totalSales} total (₹${cashSales} cash, ₹${cardSales} card, ₹${upiSales} UPI)`,
    );

    return {
      date: today.toISOString().split('T')[0],
      totalInvoices,
      totalSales,
      totalGST,
      netSales,
      cashSales,
      cardSales,
      upiSales,
      pendingAmount,
    };
  }

  /**
   * Export daily sales as CSV
   */
  async exportDailySalesCSV(
    tenantId: string,
    shopId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<string> {
    const report = await this.getDailySalesReport(
      tenantId,
      shopId,
      startDate,
      endDate,
    );

    let csv =
      'Date,Total Invoices,Total Sales,Net Sales,GST Amount,CGST,SGST,Paid Amount,Pending Amount\n';

    for (const day of report) {
      csv += `${day.date},${day.totalInvoices},${day.totalSales},${day.netSales},${day.totalGST},${day.gstBreakdown.cgst},${day.gstBreakdown.sgst},${day.paidAmount},${day.pendingAmount}\n`;
    }

    // Summary row
    const totals = report.reduce(
      (sum, day) => ({
        invoices: sum.invoices + day.totalInvoices,
        sales: sum.sales + day.totalSales,
        net: sum.net + day.netSales,
        gst: sum.gst + day.totalGST,
        paid: sum.paid + day.paidAmount,
        pending: sum.pending + day.pendingAmount,
      }),
      { invoices: 0, sales: 0, net: 0, gst: 0, paid: 0, pending: 0 },
    );

    csv += `\nTOTAL,${totals.invoices},${totals.sales},${totals.net},${totals.gst},,${totals.paid},${totals.pending}\n`;

    return csv;
  }

  /**
   * Get sales comparison: today vs yesterday
   * Used for quick performance tracking
   */
  async getSalesComparison(
    tenantId: string,
    shopId: string,
  ): Promise<{
    today: number;
    yesterday: number;
    percentageChange: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [todaySales, yesterdaySales] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId,
          createdAt: { gte: today, lt: tomorrow },
          status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PAID'] },
        },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId,
          createdAt: { gte: yesterday, lt: today },
          status: { in: ['UNPAID', 'PARTIALLY_PAID', 'PAID'] },
        },
        _sum: { totalAmount: true },
      }),
    ]);

    const todayTotal = todaySales._sum?.totalAmount || 0;
    const yesterdayTotal = yesterdaySales._sum?.totalAmount || 0;

    const percentageChange =
      yesterdayTotal > 0
        ? ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100
        : 100;

    return {
      today: todayTotal,
      yesterday: yesterdayTotal,
      percentageChange: parseFloat(percentageChange.toFixed(2)),
    };
  }
}
