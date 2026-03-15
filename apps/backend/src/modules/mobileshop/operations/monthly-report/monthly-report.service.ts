import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';

@Injectable()
export class MonthlyReportService {
  constructor(private readonly prisma: PrismaService) {}

  async getMonthlySummary(
    tenantId: string,
    shopId: string,
    month: number, // 1-12
    year: number,
  ) {
    const { start, end } = this.monthRange(year, month);

    const [
      salesAgg,
      purchasesAgg,
      expensesAgg,
      salaryAgg,
      creditNoteAgg,
      invoiceItemsAgg,
      stockLossAgg,
      jobCardAgg,
    ] = await Promise.all([
      // Total Sales (PAID invoices)
      this.prisma.invoice.aggregate({
        where: { tenantId, shopId, status: 'PAID', invoiceDate: { gte: start, lte: end } },
        _sum: { totalAmount: true, paidAmount: true },
        _count: { id: true },
      }),

      // Total Purchases (confirmed GRNs → financial cost)
      this.prisma.purchase.aggregate({
        where: { tenantId, shopId, invoiceDate: { gte: start, lte: end }, status: { not: 'CANCELLED' } },
        _sum: { grandTotal: true },
        _count: { id: true },
      }),

      // Total Expenses
      this.prisma.paymentVoucher.aggregate({
        where: { tenantId, shopId, voucherType: 'EXPENSE', status: 'ACTIVE', date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { id: true },
      }),

      // Salary payments
      this.prisma.paymentVoucher.aggregate({
        where: { tenantId, shopId, voucherType: 'SALARY', status: 'ACTIVE', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),

      // Refunds via credit notes
      this.prisma.creditNote.aggregate({
        where: { tenantId, shopId, type: 'CUSTOMER', status: 'REFUNDED', date: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      }),

      // COGS — sum of (qty * costPerUnit) for SALE entries in StockLedger
      this.prisma.stockLedger.aggregate({
        where: {
          tenantId,
          shopId,
          type: 'OUT',
          referenceType: 'SALE',
          createdAt: { gte: start, lte: end },
        },
        _sum: { quantity: true },
      }),

      // Inventory loss — stock OUT due to ADJUSTMENT
      this.prisma.stockLedger.findMany({
        where: {
          tenantId,
          shopId,
          type: 'OUT',
          referenceType: 'ADJUSTMENT',
          createdAt: { gte: start, lte: end },
        },
        select: { quantity: true, costPerUnit: true },
      }),

      // Job cards delivered/completed
      this.prisma.jobCard.count({
        where: {
          tenantId,
          shopId,
          updatedAt: { gte: start, lte: end },
          status: 'DELIVERED',
        },
      }),
    ]);

    const totalSales      = salesAgg._sum.totalAmount    ?? 0;
    const totalPurchases  = purchasesAgg._sum.grandTotal  ?? 0;
    const totalExpenses   = expensesAgg._sum.amount       ?? 0;
    const totalSalary     = salaryAgg._sum.amount         ?? 0;
    const totalRefunds    = creditNoteAgg._sum.totalAmount ?? 0;
    const inventoryLoss   = stockLossAgg.reduce(
      (sum, e) => sum + e.quantity * (e.costPerUnit ?? 0),
      0,
    );

    // Gross profit = Sales Revenue - Purchase Cost (COGS via stock WAC is complex,
    // use purchase cost as approximation until WAC tracking is per sale-line)
    const netProfit =
      totalSales - totalPurchases - totalExpenses - totalSalary - totalRefunds - inventoryLoss;

    return {
      period:            { month, year, startDate: start, endDate: end },
      sales: {
        totalAmount:     this.fromPaisa(totalSales),
        totalInvoices:   salesAgg._count.id,
      },
      purchases: {
        totalAmount:     this.fromPaisa(totalPurchases),
        totalPurchases:  purchasesAgg._count.id,
      },
      expenses: {
        totalAmount:     this.fromPaisa(totalExpenses),
        totalVouchers:   expensesAgg._count.id,
      },
      salary: {
        totalAmount:     this.fromPaisa(totalSalary),
      },
      refunds: {
        totalAmount:     this.fromPaisa(totalRefunds),
      },
      inventoryLoss:     this.fromPaisa(inventoryLoss),
      jobCards: {
        completed: jobCardAgg as number,
      },
      profitSummary: {
        grossRevenue:    this.fromPaisa(totalSales),
        totalCosts:      this.fromPaisa(totalPurchases + totalExpenses + totalSalary + totalRefunds + inventoryLoss),
        netProfit:       this.fromPaisa(netProfit),
        profitMarginPct: totalSales > 0 ? +((netProfit / totalSales) * 100).toFixed(2) : 0,
      },
    };
  }

  /** Last N months trend — useful for charts */
  async getMonthlyTrend(
    tenantId: string,
    shopId: string,
    months: number = 6,
  ) {
    const results: Awaited<ReturnType<typeof this.getMonthlySummary>>[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const summary = await this.getMonthlySummary(
        tenantId,
        shopId,
        d.getMonth() + 1,
        d.getFullYear(),
      );
      results.push(summary);
    }

    return results;
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private monthRange(year: number, month: number) {
    const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const end   = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
    return { start, end };
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }
}
