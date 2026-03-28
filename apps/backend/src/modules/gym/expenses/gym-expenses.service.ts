import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { GymExpenseCategory } from '@prisma/client';

export class CreateGymExpenseDto {
  category: GymExpenseCategory;
  amount: number; // paise
  date: string;  // ISO date string
  note?: string;
}

@Injectable()
export class GymExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async listExpenses(tenantId: string, month?: string) {
    const where: any = { tenantId };

    if (month) {
      // month format: "2026-03"
      const start = new Date(`${month}-01T00:00:00.000Z`);
      const end = new Date(start);
      end.setMonth(end.getMonth() + 1);
      where.date = { gte: start, lt: end };
    }

    const [expenses, total] = await Promise.all([
      this.prisma.gymExpense.findMany({
        where,
        orderBy: { date: 'desc' },
      }),
      this.prisma.gymExpense.aggregate({
        where,
        _sum: { amount: true },
      }),
    ]);

    return {
      expenses,
      totalAmount: total._sum.amount ?? 0,
    };
  }

  async createExpense(tenantId: string, dto: CreateGymExpenseDto, createdBy?: string) {
    return this.prisma.gymExpense.create({
      data: {
        tenantId,
        category: dto.category,
        amount: dto.amount,
        date: new Date(dto.date),
        note: dto.note,
        createdBy,
      },
    });
  }

  async deleteExpense(tenantId: string, expenseId: string) {
    const expense = await this.prisma.gymExpense.findFirst({
      where: { id: expenseId, tenantId },
    });
    if (!expense) throw new NotFoundException('Expense not found');
    await this.prisma.gymExpense.delete({ where: { id: expenseId } });
    return { success: true };
  }

  async getMonthlySummary(tenantId: string, month: string) {
    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 1);

    const byCategory = await this.prisma.gymExpense.groupBy({
      by: ['category'],
      where: { tenantId, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });

    // Monthly revenue (from MemberPayments)
    const revenue = await this.prisma.memberPayment.aggregate({
      where: {
        tenantId,
        createdAt: { gte: start, lt: end },
        status: { in: ['PAID', 'PARTIAL'] },
      },
      _sum: { amount: true },
    });

    const totalExpenses = byCategory.reduce(
      (sum, c) => sum + (c._sum.amount ?? 0), 0,
    );
    const totalRevenue = revenue._sum.amount ?? 0;

    return {
      month,
      revenue: totalRevenue,
      expenses: totalExpenses,
      profit: totalRevenue - totalExpenses,
      breakdown: byCategory.map((c) => ({
        category: c.category,
        amount: c._sum.amount ?? 0,
      })),
    };
  }
}
