import { Injectable, BadRequestException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { DailyClosingStatus, ShiftClosingStatus, CashClosingMode, PaymentMode, VoucherType, DailyClosingMode, FinanceType, FinanceRefType } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { DailyCloseDto, ShiftOpenDto, ShiftCloseDto } from './dto/cash-management.dto';

@Injectable()
export class CashService {
  private readonly logger = new Logger(CashService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── DAILY SUMMARY ────────────────────────────────────────────────────────

  async getDailySummary(tenantId: string, shopId: string, date: string) {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const [
      shop, 
      previousClosing, 
      financialEntries, 
      invoices, 
      vouchers, 
      supplierPayments, 
      receipts, 
      currentShifts
    ] = await Promise.all([
      this.prisma.shop.findUnique({ where: { id: shopId } }),
      this.prisma.dailyClosing.findFirst({
        where: { tenantId, shopId, date: { lt: dayStart }, status: DailyClosingStatus.SUBMITTED },
        orderBy: { date: 'desc' },
      }),
      this.prisma.financialEntry.findMany({
        where: { tenantId, shopId, createdAt: { gte: dayStart, lte: dayEnd } }
      }),
      this.prisma.invoice.findMany({
        where: { tenantId, shopId, invoiceDate: { gte: dayStart, lte: dayEnd }, status: { not: 'VOIDED' } }
      }),
      this.prisma.paymentVoucher.findMany({
        where: { tenantId, shopId, date: { gte: dayStart, lte: dayEnd }, status: 'ACTIVE' }
      }),
      this.prisma.supplierPayment.findMany({
        where: { tenantId, shopId, paymentDate: { gte: dayStart, lte: dayEnd } }
      }),
      this.prisma.receipt.findMany({
        where: { tenantId, shopId, createdAt: { gte: dayStart, lte: dayEnd }, status: 'ACTIVE' }
      }),
      this.prisma.shiftClosing.findMany({
        where: { tenantId, shopId, date: dayStart },
      }),
    ]);

    if (!shop) throw new NotFoundException('Shop not found');

    const openingCash = previousClosing?.reportedClosingCash ?? 0;

    let salesCash = 0, salesUpi = 0, salesCard = 0, salesBank = 0;
    let supplierPaymentsCash = 0, expenseCash = 0;
    let otherCashIn = 0, otherCashOut = 0;
    let cashWithdrawFromBank = 0, cashDepositToBank = 0;

    // Set of IDs covered by FinancialEntry to avoid double counting
    const coveredRefIds = new Set<string>();
    
    // 1. Process Financial Entries (Primary source for modern/manual data)
    for (const fe of financialEntries) {
      if (fe.referenceId) coveredRefIds.add(fe.referenceId);
      
      const isCash = fe.mode === PaymentMode.CASH;
      const amount = fe.amount;

      if (fe.referenceType === FinanceRefType.INVOICE || 
          (fe.referenceType === FinanceRefType.RECEIPT && fe.type === FinanceType.IN) ||
          fe.referenceType === FinanceRefType.JOBCARD ||
          fe.referenceType === FinanceRefType.JOB) {
        if (isCash) salesCash += amount;
        else if (fe.mode === PaymentMode.UPI) salesUpi += amount;
        else if (fe.mode === PaymentMode.CARD) salesCard += amount;
        else if (fe.mode === PaymentMode.BANK) salesBank += amount;
      } 
      else if (fe.referenceType === FinanceRefType.EXPENSE || fe.referenceType === FinanceRefType.SALARY) {
        if (isCash) expenseCash += amount;
      } 
      else if (fe.referenceType === FinanceRefType.PURCHASE || (fe.referenceType === FinanceRefType.RECEIPT && fe.type === FinanceType.OUT)) {
        if (isCash) supplierPaymentsCash += amount;
      } 
      else {
        const note = (fe.note || '').toLowerCase();
        if (isCash) {
          if (fe.type === FinanceType.IN) {
            if (note.includes('withdraw') || note.includes('bank to cash')) cashWithdrawFromBank += amount;
            else otherCashIn += amount;
          } else {
            if (note.includes('deposit') || note.includes('cash to bank')) cashDepositToBank += amount;
            else otherCashOut += amount;
          }
        }
      }
    }

    // 2. Process Invoices (Fallback for legacy/missing FE data)
    for (const inv of invoices) {
      if (coveredRefIds.has(inv.id)) continue;
      
      // If invoice has directly recorded cash/upi/etc.
      if (inv.cashAmount) salesCash += inv.cashAmount;
      if (inv.upiAmount) salesUpi += inv.upiAmount;
      if (inv.cardAmount) salesCard += inv.cardAmount;
    }

    // 3. Process Receipts (Specific fallback for July data where FE and invoice cash are missing)
    for (const rec of receipts) {
      if (coveredRefIds.has(rec.id)) continue;
      
      const amt = rec.amount;
      if (rec.paymentMethod === PaymentMode.CASH) salesCash += amt;
      else if (rec.paymentMethod === PaymentMode.UPI) salesUpi += amt;
      else if (rec.paymentMethod === PaymentMode.CARD) salesCard += amt;
      else if (rec.paymentMethod === PaymentMode.BANK) salesBank += amt;
    }

    // 4. Process Vouchers (Fallback)
    for (const v of vouchers) {
      if (coveredRefIds.has(v.id)) continue;
      
      if (v.paymentMethod === PaymentMode.CASH) {
        if (v.voucherType === VoucherType.EXPENSE || v.voucherType === VoucherType.SALARY) expenseCash += v.amount;
        else if (v.voucherType === VoucherType.SUPPLIER) supplierPaymentsCash += v.amount;
      }
    }

    // 5. Process Supplier Payments (Fallback)
    for (const sp of supplierPayments) {
      if (coveredRefIds.has(sp.id)) continue;
      if (sp.paymentMethod === PaymentMode.CASH) supplierPaymentsCash += sp.amount;
    }

    const totalIn = salesCash + cashWithdrawFromBank + otherCashIn;
    const totalOut = cashDepositToBank + supplierPaymentsCash + expenseCash + otherCashOut;
    const expectedClosingCash = openingCash + totalIn - totalOut;

    const existingClosing = await this.prisma.dailyClosing.findUnique({
      where: { tenantId_shopId_date: { tenantId, shopId, date: dayStart } },
    });

    return {
      date,
      shopId,
      status: existingClosing?.status ?? 'DRAFT',
      openingCash,
      salesCash,
      salesUpi,
      salesCard,
      salesBank,
      cashWithdrawFromBank,
      cashDepositToBank,
      supplierPaymentsCash,
      expenseCash,
      otherCashIn,
      otherCashOut,
      totalIn,
      totalOut,
      expectedClosingCash,
      reportedClosingCash: existingClosing?.reportedClosingCash ?? 0,
      cashDifference: existingClosing?.cashDifference ?? 0,
      varianceReason: existingClosing?.varianceReason,
      varianceNote: existingClosing?.varianceNote,
      shiftInfo: shop.cashClosingMode === CashClosingMode.SHIFT_AND_DAILY ? {
        totalShifts: currentShifts.length,
        closedShifts: currentShifts.filter(s => s.status === ShiftClosingStatus.CLOSED).length,
        shifts: currentShifts,
      } : null,
    };
  }

  // ─── DAILY CLOSE ──────────────────────────────────────────────────────────

  async dailyClose(tenantId: string, userId: string, dto: DailyCloseDto) {
    const dayDate = new Date(dto.date);
    dayDate.setHours(0, 0, 0, 0);

    const existing = await this.prisma.dailyClosing.findUnique({
      where: { tenantId_shopId_date: { tenantId, shopId: dto.shopId, date: dayDate } },
    });

    if (existing?.status === DailyClosingStatus.SUBMITTED) {
      throw new ConflictException(`Day ${dto.date} is already submitted and locked.`);
    }

    const summary = await this.getDailySummary(tenantId, dto.shopId, dto.date);
    const isManual = dto.mode === DailyClosingMode.MANUAL;

    const sc = (isManual && dto.manualEntries?.salesCash !== undefined) ? dto.manualEntries.salesCash : summary.salesCash;
    const su = (isManual && dto.manualEntries?.salesUpi !== undefined) ? dto.manualEntries.salesUpi : summary.salesUpi;
    const sCard = (isManual && dto.manualEntries?.salesCard !== undefined) ? dto.manualEntries.salesCard : summary.salesCard;
    const sb = (isManual && dto.manualEntries?.salesBank !== undefined) ? dto.manualEntries.salesBank : summary.salesBank;
    const cw = (isManual && dto.manualEntries?.cashWithdrawFromBank !== undefined) ? dto.manualEntries.cashWithdrawFromBank : summary.cashWithdrawFromBank;
    const cd = (isManual && dto.manualEntries?.cashDepositToBank !== undefined) ? dto.manualEntries.cashDepositToBank : summary.cashDepositToBank;
    const sp = (isManual && dto.manualEntries?.supplierPaymentsCash !== undefined) ? dto.manualEntries.supplierPaymentsCash : summary.supplierPaymentsCash;
    const ec = (isManual && dto.manualEntries?.expenseCash !== undefined) ? dto.manualEntries.expenseCash : summary.expenseCash;
    const oi = (isManual && dto.manualEntries?.otherCashIn !== undefined) ? dto.manualEntries.otherCashIn : summary.otherCashIn;
    const oo = (isManual && dto.manualEntries?.otherCashOut !== undefined) ? dto.manualEntries.otherCashOut : summary.otherCashOut;

    let expectedClosingCash = summary.expectedClosingCash;
    if (isManual) {
      expectedClosingCash = summary.openingCash + sc + cw + oi - ec - sp - oo - cd;
    }

    const reportedClosingCash = dto.reportedClosingCash;
    const cashDifference = reportedClosingCash - expectedClosingCash;

    const snapshot = {
      tenantId,
      shopId: dto.shopId,
      date: dayDate,
      mode: dto.mode as DailyClosingMode,
      openingCash: summary.openingCash,
      salesCash: sc,
      salesUpi: su,
      salesCard: sCard,
      salesBank: sb,
      cashWithdrawFromBank: cw,
      cashDepositToBank: cd,
      supplierPaymentsCash: sp,
      expenseCash: ec,
      otherCashIn: oi,
      otherCashOut: oo,
      expectedClosingCash,
      reportedClosingCash,
      cashDifference,
      denominations: dto.denominations,
      varianceReason: dto.varianceReason,
      varianceNote: dto.varianceNote || dto.notes,
      status: DailyClosingStatus.SUBMITTED,
      closedBy: userId,
      closedAt: new Date(),
    };

    return this.prisma.dailyClosing.upsert({
      where: { tenantId_shopId_date: { tenantId, shopId: dto.shopId, date: dayDate } },
      create: snapshot,
      update: snapshot,
    });
  }

  // ─── SHIFT MANAGEMENT ──────────────────────────────────────────────────────

  async openShift(tenantId: string, userId: string, dto: ShiftOpenDto) {
    const shop = await this.prisma.shop.findUnique({ where: { id: dto.shopId } });
    if (!shop) throw new NotFoundException('Shop not found');
    if (shop.cashClosingMode !== CashClosingMode.SHIFT_AND_DAILY) {
      throw new BadRequestException('Shift closing is not enabled for this shop.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const openShift = await this.prisma.shiftClosing.findFirst({
      where: { tenantId, shopId: dto.shopId, status: ShiftClosingStatus.OPEN },
    });
    if (openShift) throw new ConflictException('A shift is already open for this shop.');

    const lastShift = await this.prisma.shiftClosing.findFirst({
      where: { tenantId, shopId: dto.shopId, status: ShiftClosingStatus.CLOSED },
      orderBy: { createdAt: 'desc' },
    });

    const openingCash = lastShift?.reportedClosingCash ?? 0;

    return this.prisma.shiftClosing.create({
      data: {
        tenantId,
        shopId: dto.shopId,
        date: today,
        shiftName: dto.shiftName,
        openingCash,
        status: ShiftClosingStatus.OPEN,
        openedBy: userId,
      },
    });
  }

  async closeShift(tenantId: string, userId: string, dto: ShiftCloseDto) {
    const openShift = await this.prisma.shiftClosing.findFirst({
      where: { tenantId, shopId: dto.shopId, status: ShiftClosingStatus.OPEN },
    });
    if (!openShift) throw new NotFoundException('No open shift found for this shop.');

    const expectedClosingCash = openShift.openingCash; 

    return this.prisma.shiftClosing.update({
      where: { id: openShift.id },
      data: {
        reportedClosingCash: dto.reportedClosingCash,
        cashDifference: dto.reportedClosingCash - expectedClosingCash,
        status: ShiftClosingStatus.CLOSED,
        closedBy: userId,
        closedAt: new Date(),
      },
    });
  }

  async getCurrentShift(tenantId: string, shopId: string) {
    return this.prisma.shiftClosing.findFirst({
      where: { tenantId, shopId, status: ShiftClosingStatus.OPEN },
    });
  }

  async getDailyHistory(tenantId: string, shopId: string) {
    return this.prisma.dailyClosing.findMany({
      where: { tenantId, shopId },
      orderBy: { date: 'desc' },
      take: 30,
    });
  }

  // ─── MONTHLY PROFIT ────────────────────────────────────────────────────────

  async getMonthlyProfit(tenantId: string, shopId: string, year: number, month: number) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59, 999);

    const [sales, cogs, expenses, refunds, inventoryLoss] = await Promise.all([
      this.prisma.invoice.aggregate({
        where: { tenantId, shopId, invoiceDate: { gte: start, lte: end }, status: 'PAID' },
        _sum: { totalAmount: true },
      }),
      this.prisma.stockLedger.findMany({
        where: { tenantId, shopId, type: 'OUT', referenceType: 'SALE', createdAt: { gte: start, lte: end } },
      }),
      this.prisma.paymentVoucher.aggregate({
        where: { tenantId, shopId, date: { gte: start, lte: end }, voucherType: VoucherType.EXPENSE, status: 'ACTIVE' },
        _sum: { amount: true },
      }),
      this.prisma.creditNote.aggregate({
        where: { tenantId, shopId, date: { gte: start, lte: end }, status: 'REFUNDED' },
        _sum: { refundedAmount: true },
      }),
      this.prisma.dailyMetrics.aggregate({
        where: { tenantId, shopId, date: { gte: start, lte: end } },
        _sum: { inventoryLoss: true },
      })
    ]);

    const totalSales = (sales._sum.totalAmount ?? 0) / 100;
    const totalCogs = cogs.reduce((acc, entry) => acc + (entry.quantity * (entry.costPerUnit ?? 0)), 0) / 100;
    const totalExpenses = (expenses._sum.amount ?? 0) / 100;
    const totalRefunds = (refunds._sum.refundedAmount ?? 0) / 100;
    const totalInvLoss = (inventoryLoss._sum.inventoryLoss ?? 0) / 100;

    const netProfit = totalSales - totalCogs - totalExpenses - totalRefunds - totalInvLoss;

    return { totalSales, totalCogs, totalExpenses, totalRefunds, totalInvLoss, netProfit };
  }
}
