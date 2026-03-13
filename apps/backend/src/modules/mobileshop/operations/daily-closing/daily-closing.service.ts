import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { DailyClosingStatus } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { CloseDayDto, ReopenDayDto, ApproveCashVarianceDto } from './dto/close-day.dto';

@Injectable()
export class DailyClosingService {
  private readonly logger = new Logger(DailyClosingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── DAILY SUMMARY ────────────────────────────────────────────────────────

  /**
   * Aggregate today's figures from FinancialEntry — read-only, no write.
   * Used to show staff what the expected closing would be before they confirm.
   */
  async getDailySummary(tenantId: string, shopId: string, date: string) {
    const { start, end } = this.dayRange(date);

    const [previousClosing, financialEntries, creditNoteRefunds] =
      await Promise.all([
        // Opening balance = last confirmed closing
        this.prisma.dailyClosing.findFirst({
          where: {
            tenantId,
            shopId,
            status: DailyClosingStatus.SUBMITTED,
            date: { lt: new Date(date) },
          },
          orderBy: { date: 'desc' },
        }),
        // All cash flow entries for the day
        this.prisma.financialEntry.findMany({
          where: { tenantId, shopId, createdAt: { gte: start, lte: end } },
        }),
        // Refunds issued today
        this.prisma.creditNote.aggregate({
          where: {
            tenantId,
            shopId,
            type: 'CUSTOMER',
            status: { in: ['REFUNDED'] },
            date: { gte: start, lte: end },
          },
          _sum: { refundedAmount: true },
        }),
      ]);

    const openingCash = previousClosing?.reportedClosingCash ?? 0;

    // Tally IN by mode
    let salesCash = 0, salesUpi = 0, salesCard = 0, salesBank = 0, otherIncome = 0;
    // Tally OUT by reference
    let expensesCash = 0, purchasePayments = 0, salaryPayments = 0, otherDeductions = 0;

    for (const entry of financialEntries) {
      if (entry.type === 'IN') {
        switch (entry.mode) {
          case 'CASH': salesCash += entry.amount; break;
          case 'UPI':  salesUpi  += entry.amount; break;
          case 'CARD': salesCard += entry.amount; break;
          case 'BANK': salesBank += entry.amount; break;
          default:     otherIncome += entry.amount;
        }
      } else {
        switch (entry.referenceType) {
          case 'EXPENSE':  expensesCash    += entry.amount; break;
          case 'PURCHASE': purchasePayments += entry.amount; break;
          case 'SALARY':   salaryPayments  += entry.amount; break;
          default:         otherDeductions += entry.amount;
        }
      }
    }

    const refunds = creditNoteRefunds._sum.refundedAmount ?? 0;

    const totalIn  = salesCash + salesUpi + salesCard + salesBank + otherIncome;
    const totalOut = expensesCash + purchasePayments + salaryPayments + otherDeductions + refunds;
    const expectedClosingCash = openingCash + totalIn - totalOut;

    // Check if already closed today
    const existingClosing = await this.prisma.dailyClosing.findFirst({
      where: { tenantId, shopId, date: new Date(date) },
    });

    return {
      date,
      shopId,
      status: existingClosing?.status ?? 'OPEN',
      openingCash:         this.fromPaisa(openingCash),
      salesCash:              this.fromPaisa(salesCash),
      salesUpi:               this.fromPaisa(salesUpi),
      salesCard:              this.fromPaisa(salesCard),
      salesBank:              this.fromPaisa(salesBank),
      otherIncome:            this.fromPaisa(otherIncome),
      totalIn:                this.fromPaisa(totalIn),
      expensesCash:           this.fromPaisa(expensesCash),
      purchasePayments:       this.fromPaisa(purchasePayments),
      salaryPayments:         this.fromPaisa(salaryPayments),
      otherDeductions:        this.fromPaisa(otherDeductions),
      refunds:                this.fromPaisa(refunds),
      totalOut:               this.fromPaisa(totalOut),
      expectedClosingCash: this.fromPaisa(expectedClosingCash),
    };
  }

  // ─── CLOSE DAY ─────────────────────────────────────────────────────────────

  async closeDay(tenantId: string, userId: string, dto: CloseDayDto) {
    const businessDate = new Date(dto.date);

    // Block if already SUBMITTED (not DRAFT / REOPENED)
    const existing = await this.prisma.dailyClosing.findFirst({
      where: { tenantId, shopId: dto.shopId, date: businessDate },
    });

    if (existing?.status === DailyClosingStatus.SUBMITTED) {
      throw new ConflictException(
        `Day ${dto.date} is already submitted. Use reopen first.`,
      );
    }

    // Build the summary figures
    const summary = await this.getDailySummary(tenantId, dto.shopId, dto.date);

    const expectedClosingCash = this.toPaisa(summary.expectedClosingCash);
    const reportedClosingCash    = this.toPaisa(dto.physicalCashCounted);
    const cashDifference         = reportedClosingCash - expectedClosingCash;

    return this.prisma.$transaction(async (tx) => {
      let closing;

      if (existing) {
        // Update existing DRAFT or REOPENED record
        closing = await tx.dailyClosing.update({
          where: { id: existing.id },
          data: {
            openingCash:         this.toPaisa(summary.openingCash),
            salesCash:              this.toPaisa(summary.salesCash),
            salesUpi:               this.toPaisa(summary.salesUpi),
            salesCard:              this.toPaisa(summary.salesCard),
            salesBank:              this.toPaisa(summary.salesBank),
            otherCashIn:            this.toPaisa(summary.otherIncome),
            expenseCash:           this.toPaisa(summary.expensesCash),
            supplierPaymentsCash:       this.toPaisa(summary.purchasePayments),
            otherCashOut:        this.toPaisa(summary.otherDeductions + summary.salaryPayments + summary.refunds),
            expectedClosingCash,
            reportedClosingCash,
            cashDifference,
            status:                 DailyClosingStatus.SUBMITTED,
            closedBy:               userId,
            closedAt:               new Date(),
          },
        });
      } else {
        closing = await tx.dailyClosing.create({
          data: {
            tenantId,
            shopId:                 dto.shopId,
            date:                   businessDate,
            openingCash:         this.toPaisa(summary.openingCash),
            salesCash:              this.toPaisa(summary.salesCash),
            salesUpi:               this.toPaisa(summary.salesUpi),
            salesCard:              this.toPaisa(summary.salesCard),
            salesBank:              this.toPaisa(summary.salesBank),
            otherCashIn:            this.toPaisa(summary.otherIncome),
            expenseCash:           this.toPaisa(summary.expensesCash),
            supplierPaymentsCash:       this.toPaisa(summary.purchasePayments),
            otherCashOut:        this.toPaisa(summary.otherDeductions + summary.salaryPayments + summary.refunds),
            expectedClosingCash,
            reportedClosingCash,
            cashDifference,
            status:                 DailyClosingStatus.SUBMITTED,
            closedBy:               userId,
            closedAt:               new Date(),
          },
        });
      }

      // Auto-create CashVariance if there is a discrepancy > 0
      if (cashDifference !== 0) {
        await tx.cashVariance.create({
          data: {
            tenantId,
            shopId:        dto.shopId,
            dailyClosingId: closing.id,
            expectedCash:  expectedClosingCash,
            physicalCash:  reportedClosingCash,
            difference:    cashDifference,
            reason:        'Pending owner review',
            reportedBy:    userId,
            status:        'PENDING',
          },
        });

        this.logger.warn(
          `Cash variance of ${this.fromPaisa(cashDifference)} for shop=${dto.shopId} date=${dto.date}`,
        );
      }

      this.logger.log(`Day closed: shop=${dto.shopId} date=${dto.date} by userId=${userId}`);

      return this.toRupees(closing);
    });
  }

  // ─── REOPEN DAY ────────────────────────────────────────────────────────────

  async reopenDay(tenantId: string, userId: string, dto: ReopenDayDto) {
    const closing = await this.prisma.dailyClosing.findFirst({
      where: { tenantId, shopId: dto.shopId, date: new Date(dto.date) },
    });

    if (!closing) {
      throw new NotFoundException(`No closing found for date ${dto.date}`);
    }
    if (closing.status !== DailyClosingStatus.SUBMITTED) {
      throw new BadRequestException('Only SUBMITTED closings can be reopened.');
    }

    const updated = await this.prisma.dailyClosing.update({
      where: { id: closing.id },
      data: {
        status:         DailyClosingStatus.REOPENED,
      },
    });

    this.logger.warn(
      `Day reopened: shop=${dto.shopId} date=${dto.date} reason="${dto.reason}" by userId=${userId}`,
    );

    return this.toRupees(updated);
  }

  // ─── CASH VARIANCE ─────────────────────────────────────────────────────────

  async getCashVariances(
    tenantId: string,
    shopId: string,
    filters?: { startDate?: string; endDate?: string; status?: string },
  ) {
    const where: any = { tenantId, shopId };
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate);
    }

    const variances = await this.prisma.cashVariance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { dailyClosing: { select: { date: true } } },
    });

    return variances.map((v) => ({
      ...v,
      expectedCash: this.fromPaisa(v.expectedCash),
      physicalCash: this.fromPaisa(v.physicalCash),
      difference:   this.fromPaisa(v.difference),
    }));
  }

  async approveCashVariance(
    tenantId: string,
    userId: string,
    dto: ApproveCashVarianceDto,
  ) {
    const variance = await this.prisma.cashVariance.findFirst({
      where: { id: dto.varianceId, tenantId, shopId: dto.shopId },
    });

    if (!variance) throw new NotFoundException('Cash variance not found.');
    if (variance.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING variances can be approved.');
    }

    return this.prisma.cashVariance.update({
      where: { id: variance.id },
      data: {
        status:     'APPROVED',
        approvedBy: userId,
        approvedAt: new Date(),
        notes:      dto.notes,
      },
    });
  }

  // ─── LIST CLOSINGS ─────────────────────────────────────────────────────────

  async getClosings(
    tenantId: string,
    shopId: string,
    filters?: { startDate?: string; endDate?: string },
  ) {
    const where: any = { tenantId, shopId };
    if (filters?.startDate || filters?.endDate) {
      where.date = {};
      if (filters.startDate) where.date.gte = new Date(filters.startDate);
      if (filters.endDate)   where.date.lte = new Date(filters.endDate);
    }

    const closings = await this.prisma.dailyClosing.findMany({
      where,
      orderBy: { date: 'desc' },
      take: 90, // max 3 months
    });

    return closings.map((c) => this.toRupees(c));
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private dayRange(date: string) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return { start, end };
  }

  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }

  private toRupees(closing: any) {
    const moneyFields = [
      'openingBalance', 'salesCash', 'salesUpi', 'salesCard', 'salesBank',
      'otherIncome', 'expensesCash', 'purchasePayments', 'salaryPayments',
      'otherDeductions', 'refunds', 'expectedClosingBalance',
      'physicalCashCounted', 'cashDifference',
    ];
    const result = { ...closing };
    for (const field of moneyFields) {
      if (result[field] != null) result[field] = this.fromPaisa(result[field]);
    }
    return result;
  }
}
