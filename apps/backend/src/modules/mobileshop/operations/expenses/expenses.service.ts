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
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      select: { expenseCategory: true, amount: true },
    });

    const breakdown: Record<string, number> = {};
    for (const v of vouchers) {
      const cat = v.expenseCategory ?? 'Uncategorized';
      breakdown[cat] = (breakdown[cat] ?? 0) + v.amount;
    }

    return Object.entries(breakdown)
      .map(([category, totalPaisa]) => ({
        category,
        total: totalPaisa / 100,
      }))
      .sort((a, b) => b.total - a.total);
  }
}
