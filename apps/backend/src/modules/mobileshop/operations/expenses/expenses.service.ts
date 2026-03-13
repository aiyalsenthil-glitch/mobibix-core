import { Injectable } from '@nestjs/common';
import { VoucherType } from '@prisma/client';
import { VouchersService } from '../../vouchers/vouchers.service';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly vouchersService: VouchersService,
    private readonly prisma: PrismaService,
  ) {}

  async createExpense(tenantId: string, userId: string, dto: CreateExpenseDto) {
    // Delegate to VouchersService — this ensures FinancialEntry is created
    return this.vouchersService.createVoucher(
      tenantId,
      dto.shopId,
      {
        voucherType:     VoucherType.EXPENSE,
        amount:          dto.amount,
        paymentMethod:   dto.paymentMethod,
        expenseCategoryId: dto.categoryId,
        expenseCategory: dto.category,
        narration:       dto.note,
      },
      userId,
    );
  }

  async updateExpense(tenantId: string, shopId: string, id: string, dto: any, userId: string) {
    return this.vouchersService.updateVoucher(tenantId, shopId, id, {
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      expenseCategoryId: dto.categoryId,
      narration: dto.note,
    }, userId);
  }

  async deleteExpense(tenantId: string, shopId: string, id: string, userId: string) {
    return this.vouchersService.softDeleteVoucher(tenantId, shopId, id, userId);
  }


  async getExpenses(
    tenantId: string,
    shopId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      category?: string;
      skip?: number;
      take?: number;
    },
  ) {
    return this.vouchersService.getVouchers(tenantId, shopId, {
      startDate:   filters?.startDate ? new Date(filters.startDate) : undefined,
      endDate:     filters?.endDate   ? new Date(filters.endDate)   : undefined,
      voucherType: VoucherType.EXPENSE,
      skip:        filters?.skip,
      take:        filters?.take,
    });
  }

  async getExpenseSummary(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    return this.vouchersService.getVoucherSummary(
      tenantId,
      shopId,
      new Date(startDate),
      new Date(endDate),
    );
  }

  /** Category breakdown — how much spent per category in a date range */
  async getCategoryBreakdown(
    tenantId: string,
    shopId: string,
    startDate: string,
    endDate: string,
  ) {
    const vouchers = await this.prisma.paymentVoucher.findMany({
      where: {
        tenantId,
        shopId,
        voucherType: VoucherType.EXPENSE,
        status: 'ACTIVE',
        isDeleted: false,
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      select: { 
        expenseCategoryId: true, 
        expenseCategory: true,
        categoryRel: { select: { name: true } },
        amount: true 
      },
    } as any);

    const breakdown: Record<string, number> = {};
    for (const v of vouchers) {
      const catName = (v as any).categoryRel?.name || (v as any).expenseCategory || 'Uncategorized';
      breakdown[catName] = (breakdown[catName] ?? 0) + v.amount;
    }

    return Object.entries(breakdown)
      .map(([category, totalPaisa]) => ({
        category,
        total: totalPaisa / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }

  // ─── CATEGORY MANAGEMENT ───────────────────────────────────────────────

  async createCategory(tenantId: string, name: string, shopId?: string) {
    return (this.prisma as any).expenseCategory.create({
      data: { tenantId, name, shopId, isDefault: false },
    });
  }

  async getCategories(tenantId: string, shopId?: string) {
    return (this.prisma as any).expenseCategory.findMany({
      where: {
        tenantId,
        OR: [{ shopId: null }, { shopId }],
      },
      orderBy: { name: 'asc' },
    });
  }

  async seedDefaultCategories(tenantId: string) {
    const defaults = ['Tea', 'Courier', 'Transport', 'Electricity', 'Internet', 'Salary Advance', 'Shop Maintenance', 'Misc'];
    const existing = await (this.prisma as any).expenseCategory.findMany({
      where: { tenantId, isDefault: true },
    });

    if (existing.length === 0) {
      await (this.prisma as any).expenseCategory.createMany({
        data: defaults.map(name => ({
          tenantId,
          name,
          isDefault: true,
        })),
      });
    }
  }
}
