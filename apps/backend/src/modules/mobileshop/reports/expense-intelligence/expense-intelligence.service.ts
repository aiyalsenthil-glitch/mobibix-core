import { Injectable } from '@nestjs/common';
import { VoucherType, PaymentMode } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { ExpenseIntelligenceQueryDto } from './dto/expense-intelligence-query.dto';

@Injectable()
export class ExpenseIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getIntelligence(tenantId: string, query: ExpenseIntelligenceQueryDto) {
    const { shopId } = query;
    const startDate = query.startDate ? new Date(query.startDate) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const endDate = query.endDate ? new Date(query.endDate) : new Date();
    
    // Set hours for inclusive range
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const vouchers = await this.prisma.paymentVoucher.findMany({
      where: {
        tenantId,
        shopId,
        voucherType: VoucherType.EXPENSE,
        status: 'ACTIVE',
        isDeleted: false,
        date: {
          gte: startDate,
          lte: endDate,
        },
      } as any,
      select: {
        id: true,
        amount: true,
        date: true,
        expenseCategory: true,
        paymentMethod: true,
      },
    });

    const overview = this.calculateOverview(vouchers, startDate, endDate);
    const categoryBreakdown = this.calculateCategoryBreakdown(vouchers);
    const monthlyTrend = await this.calculateMonthlyTrend(tenantId, shopId, 6);
    const paymentMethods = this.calculatePaymentMethods(vouchers);
    const insights = await this.generateInsights(tenantId, shopId, vouchers, overview);

    return {
      overview,
      categoryBreakdown,
      monthlyTrend,
      paymentMethods,
      insights,
    };
  }

  private calculateOverview(vouchers: any[], start: Date, end: Date) {
    const totalExpense = vouchers.reduce((sum, v) => sum + v.amount, 0);
    
    // Calculate days in period
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const averageDailyExpense = Math.round(totalExpense / diffDays);

    // Peak day
    const dayMap: Record<string, number> = {};
    vouchers.forEach(v => {
      const d = v.date.toISOString().split('T')[0];
      dayMap[d] = (dayMap[d] || 0) + v.amount;
    });

    let highestExpenseDay = { date: '', amount: 0 };
    Object.entries(dayMap).forEach(([date, amount]) => {
      if (amount > highestExpenseDay.amount) {
        highestExpenseDay = { date, amount };
      }
    });

    return {
      totalExpense,
      averageDailyExpense,
      highestExpenseDay,
    };
  }

  private calculateCategoryBreakdown(vouchers: any[]) {
    const catMap: Record<string, number> = {};
    vouchers.forEach(v => {
      const cat = v.expenseCategory || 'Other';
      catMap[cat] = (catMap[cat] || 0) + v.amount;
    });

    return Object.entries(catMap).map(([category, amount]) => ({
      category,
      amount,
    })).sort((a, b) => b.amount - a.amount);
  }

  private async calculateMonthlyTrend(tenantId: string, shopId: string, monthCount: number) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - monthCount + 1);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const trendVouchers = await this.prisma.paymentVoucher.findMany({
      where: {
        tenantId,
        shopId,
        voucherType: VoucherType.EXPENSE,
        status: 'ACTIVE',
        isDeleted: false,
        date: { gte: sixMonthsAgo },
      } as any,
      select: { amount: true, date: true },
    });

    const monthMap: Record<string, number> = {};
    trendVouchers.forEach(v => {
      const m = v.date.toISOString().slice(0, 7); // YYYY-MM
      monthMap[m] = (monthMap[m] || 0) + v.amount;
    });

    // Fill gaps
    const result: any[] = [];
    for (let i = 0; i < monthCount; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() - (monthCount - 1 - i));
        const m = d.toISOString().slice(0, 7);
        result.push({
            month: m,
            amount: monthMap[m] || 0
        });
    }

    return result;
  }

  private calculatePaymentMethods(vouchers: any[]) {
    const methodMap: Record<string, number> = {};
    vouchers.forEach(v => {
      const m = v.paymentMethod || 'CASH';
      methodMap[m] = (methodMap[m] || 0) + v.amount;
    });

    return Object.entries(methodMap).map(([method, amount]) => ({
      method,
      amount,
    }));
  }

  private async generateInsights(tenantId: string, shopId: string, currentVouchers: any[], overview: any) {
    const insights: string[] = [];

    // 1. Month-over-Month comparison
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const lastMonthVouchers = await this.prisma.paymentVoucher.findMany({
      where: {
        tenantId,
        shopId,
        voucherType: VoucherType.EXPENSE,
        status: 'ACTIVE',
        isDeleted: false,
        date: { gte: lastMonthStart, lte: lastMonthEnd },
      } as any,
      select: { amount: true, expenseCategory: true },
    });

    const currentMonthMap: Record<string, number> = {};
    currentVouchers.forEach(v => {
        if (v.date >= currentMonthStart) {
            const cat = v.expenseCategory || 'Other';
            currentMonthMap[cat] = (currentMonthMap[cat] || 0) + v.amount;
        }
    });

    const lastMonthMap: Record<string, number> = {};
    lastMonthVouchers.forEach(v => {
        const cat = v.expenseCategory || 'Other';
        lastMonthMap[cat] = (lastMonthMap[cat] || 0) + v.amount;
    });

    Object.keys(currentMonthMap).forEach(cat => {
        const curr = currentMonthMap[cat];
        const prev = lastMonthMap[cat] || 0;
        if (prev > 0) {
            const increase = ((curr - prev) / prev) * 100;
            if (increase > 30) {
                insights.push(`${cat} expenses increased significantly this month.`);
            }
        }
    });

    // 2. Detect Unusual Spikes
    const avg = overview.averageDailyExpense;
    if (avg > 0) {
        const dayMap: Record<string, number> = {};
        currentVouchers.forEach(v => {
          const d = v.date.toISOString().split('T')[0];
          dayMap[d] = (dayMap[d] || 0) + v.amount;
        });

        Object.entries(dayMap).forEach(([date, amount]) => {
            if (amount > 2 * avg) {
                insights.push(`Unusual expense spike detected on ${date}.`);
            }
        });
    }

    // 3. Payment method imbalance
    const total = overview.totalExpense;
    const cashTotal = currentVouchers
        .filter(v => v.paymentMethod === 'CASH')
        .reduce((sum, v) => sum + v.amount, 0);

    if (total > 0 && (cashTotal / total) > 0.7) {
        insights.push("Most expenses are paid in cash. Consider tracking digital payments.");
    }

    return { insights };
  }
}
