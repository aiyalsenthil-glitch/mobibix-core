import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CashLeakageAnalysisDto, CashLeakageResponse, Severity } from './dto/cash-analysis.dto';
import { PaymentMode, VoucherType, FinanceRefType } from '@prisma/client';

@Injectable()
export class CashAnalysisService {
  private readonly logger = new Logger(CashAnalysisService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getLeakageAnalysis(tenantId: string, dto: CashLeakageAnalysisDto): Promise<CashLeakageResponse> {
    const { shopId, date } = dto;
    const dayDate = new Date(date);
    dayDate.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const dailyClosing = await this.prisma.dailyClosing.findUnique({
      where: { tenantId_shopId_date: { tenantId, shopId, date: dayDate } },
    });

    if (!dailyClosing || dailyClosing.cashDifference === 0) {
      return {
        difference: dailyClosing?.cashDifference ?? 0,
        severity: 'NONE',
        suggestions: [],
      };
    }

    const difference = dailyClosing.cashDifference;
    const absDiff = Math.abs(difference);

    // Intensity/Severity Rules
    let severity: Severity = 'LOW';
    if (absDiff > 2000) severity = 'HIGH';
    else if (absDiff > 200) severity = 'MEDIUM';

    const suggestions: string[] = [];

    // Rule 1 — Small Expense Missing
    if (difference < 0 && absDiff <= 200) {
      suggestions.push("Possible small expense not recorded (tea, courier, parking). Check today's expense entries.");
    }

    // Rule 2 — Expense Entry Missing
    const [expenseAgg, salesAgg] = await Promise.all([
      this.prisma.paymentVoucher.aggregate({
        where: {
          tenantId,
          shopId,
          date: { gte: dayDate, lte: dayEnd },
          voucherType: VoucherType.EXPENSE,
          paymentMethod: PaymentMode.CASH,
          status: 'ACTIVE'
        },
        _sum: { amount: true }
      }),
      this.prisma.invoice.aggregate({
        where: {
          tenantId,
          shopId,
          invoiceDate: { gte: dayDate, lte: dayEnd },
          status: { not: 'VOIDED' }
        },
        _sum: { cashAmount: true }
      })
    ]);

    const totalCashExpenses = expenseAgg._sum.amount ?? 0;
    const totalCashSales = salesAgg._sum.cashAmount ?? 0;

    if (difference < 0 && totalCashSales > 5000 && totalCashExpenses === 0) {
      suggestions.push("Check if daily cash expenses (cleaning, snacks, petty cash) were entered.");
    }

    // Rule 3 — Supplier Payment Missing
    const [purchaseAgg, supplierPaymentAgg] = await Promise.all([
      this.prisma.purchase.aggregate({
        where: {
          tenantId,
          shopId,
          invoiceDate: { gte: dayDate, lte: dayEnd },
          status: { not: 'CANCELLED' }
        },
        _count: { _all: true }
      }),
      this.prisma.supplierPayment.aggregate({
        where: {
          tenantId,
          shopId,
          paymentDate: { gte: dayDate, lte: dayEnd },
          paymentMethod: PaymentMode.CASH
        },
        _sum: { amount: true }
      })
    ]);

    if (difference < 0 && purchaseAgg._count._all > 0 && (supplierPaymentAgg._sum.amount ?? 0) === 0) {
      suggestions.push("Purchases were recorded today but no cash payments to suppliers were found. Check for missing supplier payment entries.");
    }

    // Rule 4 — Payment Mode Mismatch
    const invoiceModeAgg = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        shopId,
        invoiceDate: { gte: dayDate, lte: dayEnd },
        status: { not: 'VOIDED' }
      },
      _sum: {
        cashAmount: true,
        upiAmount: true
      }
    });

    const upiTotal = invoiceModeAgg._sum.upiAmount ?? 0;
    const cashTotal = invoiceModeAgg._sum.cashAmount ?? 0;

    if (difference < 0 && upiTotal > cashTotal && upiTotal > 2000) {
      suggestions.push("Significant UPI sales detected. Possible payment mode mismatch—verify if any scan payments were mistakenly recorded as Cash.");
    }

    // Rule 5 — Bank Deposit Missing
    const bankDepositAgg = await this.prisma.financialEntry.aggregate({
      where: {
        tenantId,
        shopId,
        createdAt: { gte: dayDate, lte: dayEnd },
        mode: PaymentMode.BANK,
        type: 'OUT'
      },
      _sum: { amount: true }
    });

    if (difference < 0 && absDiff >= 1000 && (bankDepositAgg._sum.amount ?? 0) === 0) {
      suggestions.push("Large cash shortage and no bank deposits recorded. Verify if cash was deposited to the bank but the entry was missed.");
    }

    // Generic fallback if no specific rule matched
    if (suggestions.length === 0 && difference < 0) {
      suggestions.push("Check for any missed outlays or double-counted sales receipts.");
    } else if (suggestions.length === 0 && difference > 0) {
      suggestions.push("Excess cash found. Possibly a sale or customer advance was received but not entered in the system.");
    }

    return {
      difference,
      severity,
      suggestions: [...new Set(suggestions)], // Deduplicate
    };
  }
}
