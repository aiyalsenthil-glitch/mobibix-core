import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { addDays, addWeeks, addMonths, differenceInDays, startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private calcInterest(
    principalAmount: number,
    interestRate: number,
    interestRateType: 'RUPEES' | 'PERCENTAGE' | 'PER_100' | 'UPFRONT_DEDUCTION',
    totalPeriods: number,
  ): { interestAmount: number; installmentAmount: number; expectedTotal: number } {
    if (interestRateType === 'UPFRONT_DEDUCTION') {
      // Interest cut at disbursement — borrower receives (principal - deduction), repays principal
      // e.g. deduction ₹1,000 on ₹10,000: disburse ₹9,000, collect ₹10,000 in installments
      const interestAmount = interestRate;
      const expectedTotal = principalAmount; // collect face value only
      const installmentAmount = Math.round(principalAmount / totalPeriods);
      return { interestAmount, installmentAmount, expectedTotal };
    }
    let interestAmount: number;
    if (interestRateType === 'PERCENTAGE') {
      // Flat % of principal — e.g. 2% of ₹10,000 = ₹200 total
      interestAmount = Math.round((principalAmount * interestRate) / 100);
    } else if (interestRateType === 'PER_100') {
      // ₹X per ₹100 per period — e.g. ₹2 per ₹100/week × 10 weeks × ₹10,000 = ₹2,000
      interestAmount = Math.round((principalAmount / 100) * interestRate * totalPeriods);
    } else {
      // RUPEES: fixed total interest amount
      interestAmount = interestRate;
    }
    const expectedTotal = principalAmount + interestAmount;
    const installmentAmount = Math.round(expectedTotal / totalPeriods);
    return { interestAmount, installmentAmount, expectedTotal };
  }

  private calcHealth(
    status: string,
    unpaid: { dueDate: Date }[],
  ): 'OK' | 'DUE' | 'OVERDUE' | 'CRITICAL' | 'CLOSED' {
    if (status !== 'ACTIVE') return 'CLOSED';
    if (unpaid.length === 0) return 'OK';
    const now = new Date();
    const overdue = unpaid.filter((c) => c.dueDate < now);
    if (overdue.length === 0) return 'DUE';
    const maxDays = Math.max(...overdue.map((c) => differenceInDays(now, c.dueDate)));
    return maxDays >= 30 ? 'CRITICAL' : 'OVERDUE';
  }

  // ─── Customers ─────────────────────────────────────────────────────────────

  async createCustomer(tenantId: string, data: any) {
    try {
      return await this.prisma.ledgerCustomer.create({
        data: {
          tenantId,
          name: data.name,
          phone: data.phone,
          address: data.address ?? null,
          email: data.email ?? null,
          notes: data.notes ?? null,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          `A customer with phone ${data.phone} already exists`,
        );
      }
      throw e;
    }
  }

  async listCustomers(tenantId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [customers, total] = await Promise.all([
      this.prisma.ledgerCustomer.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.ledgerCustomer.count({ where: { tenantId } }),
    ]);

    const result = await Promise.all(
      customers.map(async (c) => {
        const activeLoans = await this.prisma.ledgerAccount.count({
          where: { tenantId, customerId: c.id, status: 'ACTIVE' },
        });
        return { id: c.id, name: c.name, phone: c.phone, address: c.address, activeLoans };
      }),
    );

    return { data: result, total, page, limit };
  }

  async searchCustomers(tenantId: string, q: string) {
    if (!q || q.trim().length < 2) return [];
    const customers = await this.prisma.ledgerCustomer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return Promise.all(
      customers.map(async (c) => {
        const activeLoans = await this.prisma.ledgerAccount.count({
          where: { tenantId, customerId: c.id, status: 'ACTIVE' },
        });
        return { id: c.id, name: c.name, phone: c.phone, activeLoans };
      }),
    );
  }

  async getCustomerProfile(tenantId: string, customerId: string) {
    const customer = await this.prisma.ledgerCustomer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const ledgers = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    let totalLended = 0;
    let totalExpected = 0;
    let totalCollected = 0;
    const detailedLedgers: any[] = [];

    for (const ledger of ledgers) {
      totalLended += ledger.principalAmount;
      totalExpected += ledger.expectedTotal;

      const collections = await this.prisma.ledgerCollection.findMany({
        where: { tenantId, ledgerId: ledger.id },
      });

      const paid = collections.filter((c) => c.paid);
      const unpaid = collections.filter((c) => !c.paid);
      const collectedAmount = paid.reduce((s, c) => s + c.paidAmount, 0);
      totalCollected += collectedAmount;

      const health = this.calcHealth(ledger.status, unpaid);
      const overduePeriods = unpaid.filter((c) => c.dueDate < new Date()).length;

      detailedLedgers.push({
        ledgerId: ledger.id,
        status: ledger.status,
        installmentType: ledger.installmentType,
        principalAmount: ledger.principalAmount,
        expectedTotal: ledger.expectedTotal,
        installmentAmount: ledger.installmentAmount,
        collectedAmount,
        pendingPeriods: unpaid.length,
        overduePeriods: overduePeriods > 0 ? overduePeriods : undefined,
        health,
        startDate: ledger.startDate,
        createdAt: ledger.createdAt,
      });
    }

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        email: customer.email,
        notes: customer.notes,
        createdAt: customer.createdAt,
      },
      stats: {
        totalLended,
        totalExpected,
        totalCollected,
        profit: totalCollected - totalLended,
        outstanding: totalExpected - totalCollected,
      },
      activeLoans: detailedLedgers.filter((l) => l.status === 'ACTIVE'),
      closedLoans: detailedLedgers.filter((l) => l.status !== 'ACTIVE'),
    };
  }

  // ─── Accounts (Loans) ──────────────────────────────────────────────────────

  async createAccount(tenantId: string, data: any) {
    const {
      customerId,
      principalAmount,
      installmentType,
      interestRate = 0,
      interestRateType = 'RUPEES',
      totalPeriods,
      startDate,
    } = data;

    if (!customerId || !principalAmount || !installmentType || !totalPeriods || !startDate) {
      throw new BadRequestException('Missing required loan fields');
    }

    const customer = await this.prisma.ledgerCustomer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const { interestAmount, installmentAmount, expectedTotal } = this.calcInterest(
      principalAmount,
      interestRate,
      interestRateType,
      totalPeriods,
    );

    return this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerAccount.create({
        data: {
          tenantId,
          customerId,
          principalAmount,
          expectedTotal,
          installmentType,
          installmentAmount,
          totalPeriods,
          interestRate,
          interestRateType,
          interestAmount,
          startDate: new Date(startDate),
        },
      });

      const collections: any[] = [];
      for (let i = 1; i <= totalPeriods; i++) {
        let dueDate: Date;
        const base = new Date(startDate);
        switch (installmentType) {
          case 'DAILY':   dueDate = addDays(base, i);   break;
          case 'WEEKLY':  dueDate = addWeeks(base, i);  break;
          case 'MONTHLY': dueDate = addMonths(base, i); break;
          default: throw new BadRequestException('Invalid installment type');
        }
        collections.push({ tenantId, ledgerId: ledger.id, periodNo: i, dueDate, amount: installmentAmount });
      }

      await tx.ledgerCollection.createMany({ data: collections });

      return {
        ...ledger,
        customer: { name: customer.name, phone: customer.phone },
        interestSummary: { interestRate, interestRateType, interestAmount, installmentAmount, expectedTotal },
      };
    });
  }

  async listAccounts(tenantId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };
    if (status) where.status = status;

    const [accounts, total] = await Promise.all([
      this.prisma.ledgerAccount.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { customer: { select: { name: true, phone: true } } },
      }),
      this.prisma.ledgerAccount.count({ where }),
    ]);

    return { data: accounts, total, page, limit };
  }

  // ─── Collections ───────────────────────────────────────────────────────────

  async getCollectScreen(tenantId: string, ledgerId: string) {
    const ledger = await this.prisma.ledgerAccount.findFirst({
      where: { id: ledgerId, tenantId, status: 'ACTIVE' },
      include: { customer: { select: { name: true, phone: true } } },
    });
    if (!ledger) throw new NotFoundException('Active ledger not found');

    const collections = await this.prisma.ledgerCollection.findMany({
      where: { ledgerId, tenantId },
      orderBy: { periodNo: 'asc' },
    });

    if (collections.length === 0) {
      return { ledgerId, message: 'No collections generated' };
    }

    const unpaid = collections.filter((c) => !c.paid);
    if (unpaid.length === 0) {
      return { ledgerId, status: 'COMPLETED', message: 'All collections completed' };
    }

    const now = new Date();
    const overdue = unpaid.filter((c) => c.dueDate < now);
    const current = unpaid[0];
    const pendingAmount = overdue.reduce((s, c) => s + (c.amount - c.paidAmount), 0);

    // Calculate per-period interest based on rate type
    let interestPerPeriod: number;
    const rateType = ledger.interestRateType as string;
    if (rateType === 'PER_100') {
      interestPerPeriod = Math.round((ledger.principalAmount / 100) * ledger.interestRate);
    } else if (rateType === 'PERCENTAGE') {
      interestPerPeriod = Math.round((ledger.principalAmount * ledger.interestRate) / 100 / ledger.totalPeriods);
    } else {
      // RUPEES: fixed total / periods; UPFRONT_DEDUCTION: no separate interest
      interestPerPeriod = rateType === 'UPFRONT_DEDUCTION' ? 0 : Math.round(ledger.interestAmount / ledger.totalPeriods);
    }

    // Suggest amounts for each payment type
    const suggestions = {
      FULL: pendingAmount + (current.amount - current.paidAmount),
      PARTIAL: Math.round((current.amount - current.paidAmount) / 2),
      INTEREST_ONLY: interestPerPeriod,
    };

    return {
      ledgerId,
      customer: ledger.customer,
      installmentType: ledger.installmentType,
      installmentAmount: ledger.installmentAmount,
      interestRate: ledger.interestRate,
      interestRateType: ledger.interestRateType,
      totalPeriods: ledger.totalPeriods,
      completedPeriods: collections.length - unpaid.length,
      currentPeriod: current.periodNo,
      currentAmount: current.amount - current.paidAmount,
      overduePeriods: overdue.length,
      overdueAmount: pendingAmount,
      totalToCollectFull: suggestions.FULL,
      suggestions,
      health: this.calcHealth(ledger.status, unpaid),
    };
  }

  async collectAmount(
    tenantId: string,
    data: {
      ledgerId: string;
      amount: number;
      collectedBy: string;
      method?: 'CASH' | 'UPI' | 'BANK';
      paymentType?: 'FULL' | 'PARTIAL' | 'INTEREST_ONLY' | 'CUSTOM';
      note?: string;
    },
  ) {
    const { ledgerId, amount, collectedBy, method = 'CASH', paymentType = 'PARTIAL', note } = data;

    if (!ledgerId || !amount || amount <= 0) {
      throw new BadRequestException('Invalid collection data');
    }

    return this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerAccount.findFirst({
        where: { id: ledgerId, tenantId, status: 'ACTIVE' },
      });
      if (!ledger) throw new NotFoundException('Active ledger not found');

      // Interest-only: record payment without marking any collection as paid
      if (paymentType === 'INTEREST_ONLY') {
        const payment = await tx.ledgerPayment.create({
          data: {
            tenantId,
            ledgerId,
            customerId: ledger.customerId,
            collectionId: null,
            collectedBy,
            amount,
            method,
            paymentType,
            note: note ?? null,
          },
        });
        return { ledgerId, collected: amount, paymentType, paymentId: payment.id };
      }

      const unpaid = await tx.ledgerCollection.findMany({
        where: { tenantId, ledgerId, paid: false },
        orderBy: { periodNo: 'asc' },
      });
      if (unpaid.length === 0) throw new BadRequestException('Nothing to collect');

      let remaining = amount;
      const createdPayments: any[] = [];

      for (const col of unpaid) {
        if (remaining <= 0) break;
        const toApply = Math.min(remaining, col.amount - col.paidAmount);
        if (toApply <= 0) continue;

        const newPaid = col.paidAmount + toApply;
        const isFullyPaid = newPaid >= col.amount;

        await tx.ledgerCollection.update({
          where: { id: col.id },
          data: {
            paidAmount: newPaid,
            paid: isFullyPaid,
            paidAt: isFullyPaid ? new Date() : col.paidAt,
            collectionNote: note ?? null,
          },
        });

        const payment = await tx.ledgerPayment.create({
          data: {
            tenantId,
            ledgerId,
            customerId: ledger.customerId,
            collectionId: col.id,
            collectedBy,
            amount: toApply,
            method,
            paymentType,
            note: note ?? null,
          },
        });

        createdPayments.push(payment);
        remaining -= toApply;
      }

      const stillUnpaid = await tx.ledgerCollection.count({
        where: { tenantId, ledgerId, paid: false },
      });

      if (stillUnpaid === 0) {
        await tx.ledgerAccount.update({
          where: { id: ledgerId },
          data: { status: 'COMPLETED' },
        });
      }

      return {
        ledgerId,
        collected: amount,
        paymentType,
        paymentRecords: createdPayments.length,
        remainingUnpaidPeriods: stillUnpaid,
        status: stillUnpaid === 0 ? 'COMPLETED' : 'ACTIVE',
      };
    });
  }

  async searchAccounts(tenantId: string, q: string) {
    if (!q || q.trim().length < 2) return [];
    const customers = await this.prisma.ledgerCustomer.findMany({
      where: {
        tenantId,
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q } },
        ],
      },
      take: 10,
    });
    if (customers.length === 0) return [];

    const accounts = await this.prisma.ledgerAccount.findMany({
      where: {
        tenantId,
        customerId: { in: customers.map((c) => c.id) },
        status: 'ACTIVE',
      },
      include: { 
        customer: { select: { name: true, phone: true } },
        collections: {
          where: { paid: false, dueDate: { lt: new Date() } },
          select: { id: true, amount: true, paidAmount: true },
        }
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return accounts.map(acc => ({
      ...acc,
      overdueCount: acc.collections.length,
      overdueAmount: acc.collections.reduce((sum, col) => sum + (col.amount - col.paidAmount), 0),
      collections: undefined, // remove raw collections from response
    }));
  }

  async forecloseAccount(
    tenantId: string,
    ledgerId: string,
    data: { settlementAmount?: number; collectedBy: string; note?: string },
  ) {
    return this.prisma.$transaction(async (tx) => {
      const ledger = await tx.ledgerAccount.findFirst({
        where: { id: ledgerId, tenantId, status: 'ACTIVE' },
      });
      if (!ledger) throw new NotFoundException('Active ledger not found');

      if (data.settlementAmount && data.settlementAmount > 0) {
        const unpaid = await tx.ledgerCollection.findMany({
          where: { tenantId, ledgerId, paid: false },
          orderBy: { periodNo: 'asc' },
        });
        let remaining = data.settlementAmount;
        for (const col of unpaid) {
          if (remaining <= 0) break;
          const toApply = Math.min(remaining, col.amount - col.paidAmount);
          if (toApply <= 0) continue;
          const newPaid = col.paidAmount + toApply;
          await tx.ledgerCollection.update({
            where: { id: col.id },
            data: { paidAmount: newPaid, paid: newPaid >= col.amount, paidAt: newPaid >= col.amount ? new Date() : null },
          });
          await tx.ledgerPayment.create({
            data: {
              tenantId,
              ledgerId,
              customerId: ledger.customerId,
              collectionId: col.id,
              collectedBy: data.collectedBy,
              amount: toApply,
              method: 'CASH',
              paymentType: 'FULL',
              note: data.note ?? 'Foreclosure settlement',
            },
          });
          remaining -= toApply;
        }
      }

      await tx.ledgerAccount.update({
        where: { id: ledgerId },
        data: { status: 'CLOSED' },
      });

      return { ledgerId, status: 'CLOSED' };
    });
  }

  // ─── Dashboard ─────────────────────────────────────────────────────────────

  async getDashboardStats(tenantId: string) {
    const today = startOfDay(new Date());

    const [totalCustomers, activeLoans, todayPayments, activeAccounts] = await Promise.all([
      this.prisma.ledgerCustomer.count({ where: { tenantId } }),
      this.prisma.ledgerAccount.count({ where: { tenantId, status: 'ACTIVE' } }),
      this.prisma.ledgerPayment.aggregate({
        where: { tenantId, createdAt: { gte: today } },
        _sum: { amount: true },
      }),
      this.prisma.ledgerAccount.findMany({
        where: { tenantId, status: 'ACTIVE' },
        select: { id: true, expectedTotal: true },
      }),
    ]);

    const collectedByAccount = await this.prisma.ledgerCollection.groupBy({
      by: ['ledgerId'],
      where: { tenantId, paid: true, ledgerId: { in: activeAccounts.map((a) => a.id) } },
      _sum: { paidAmount: true },
    });

    const collectedMap = new Map(
      collectedByAccount.map((r) => [r.ledgerId, r._sum.paidAmount ?? 0]),
    );
    const totalOutstanding = activeAccounts.reduce((sum, acc) => {
      return sum + Math.max(0, acc.expectedTotal - (collectedMap.get(acc.id) ?? 0));
    }, 0);

    return {
      totalCustomers,
      activeLoans,
      totalOutstanding,
      todayCollections: todayPayments._sum.amount ?? 0,
    };
  }

  // ─── Reports ───────────────────────────────────────────────────────────────

  async getPortfolioReport(tenantId: string) {
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId },
      include: { customer: { select: { name: true, phone: true } } },
    });

    let totalPrincipal = 0;
    let totalExpected = 0;
    let totalCollected = 0;
    let activeCount = 0;
    let completedCount = 0;
    let criticalCount = 0;

    const portfolioItems: any[] = [];

    for (const acc of accounts) {
      totalPrincipal += acc.principalAmount;
      totalExpected += acc.expectedTotal;

      const collections = await this.prisma.ledgerCollection.findMany({
        where: { tenantId, ledgerId: acc.id },
      });
      const paid = collections.filter((c) => c.paid);
      const unpaid = collections.filter((c) => !c.paid);
      const collected = paid.reduce((s, c) => s + c.paidAmount, 0);
      totalCollected += collected;

      if (acc.status === 'ACTIVE') activeCount++;
      else completedCount++;

      const health = this.calcHealth(acc.status, unpaid);
      if (health === 'CRITICAL') criticalCount++;

      portfolioItems.push({
        ledgerId: acc.id,
        customer: acc.customer,
        status: acc.status,
        health,
        principalAmount: acc.principalAmount,
        expectedTotal: acc.expectedTotal,
        collected,
        outstanding: Math.max(0, acc.expectedTotal - collected),
        completedPeriods: paid.length,
        totalPeriods: acc.totalPeriods,
        installmentType: acc.installmentType,
        startDate: acc.startDate,
      });
    }

    return {
      summary: {
        totalPrincipal,
        totalExpected,
        totalCollected,
        totalOutstanding: totalExpected - totalCollected,
        totalInterestExpected: totalExpected - totalPrincipal,
        totalInterestCollected: Math.max(0, totalCollected - totalPrincipal),
        activeCount,
        completedCount,
        criticalCount,
        recoveryRate: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
      },
      accounts: portfolioItems,
    };
  }

  async getProfitLossReport(tenantId: string, fromDate?: string, toDate?: string) {
    const where: any = { tenantId };
    if (fromDate || toDate) {
      where.createdAt = {};
      if (fromDate) where.createdAt.gte = startOfDay(new Date(fromDate));
      if (toDate) where.createdAt.lte = endOfDay(new Date(toDate));
    }

    const payments = await this.prisma.ledgerPayment.findMany({ where });
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { tenantId },
      select: { principalAmount: true, interestAmount: true, status: true, createdAt: true },
    });

    const totalDisbursal = accounts.reduce((s, a) => s + a.principalAmount, 0);
    const totalExpectedInterest = accounts.reduce((s, a) => s + a.interestAmount, 0);
    const totalCollected = payments.reduce((s, p) => s + p.amount, 0);

    // Approximate interest collected = total collected - principal portion
    const principalCollected = Math.min(totalCollected, totalDisbursal);
    const interestCollected = Math.max(0, totalCollected - principalCollected);

    const byMethod = payments.reduce<Record<string, number>>((acc, p) => {
      acc[p.method] = (acc[p.method] ?? 0) + p.amount;
      return acc;
    }, {});

    const byPaymentType = payments.reduce<Record<string, number>>((acc, p) => {
      const pt = p.paymentType ?? 'FULL';
      acc[pt] = (acc[pt] ?? 0) + p.amount;
      return acc;
    }, {});

    // Monthly breakdown
    const monthlyMap = new Map<string, number>();
    for (const p of payments) {
      const key = p.createdAt.toISOString().slice(0, 7);
      monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + p.amount);
    }
    const monthly = Array.from(monthlyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, collected]) => ({ month, collected }));

    return {
      totalDisbursal,
      totalExpectedInterest,
      totalCollected,
      interestCollected,
      pendingInterest: Math.max(0, totalExpectedInterest - interestCollected),
      profitMargin: totalCollected > 0
        ? Math.round((interestCollected / totalCollected) * 100)
        : 0,
      byMethod,
      byPaymentType,
      monthly,
      period: { from: fromDate ?? 'all-time', to: toDate ?? 'now' },
    };
  }

  async getTodayCollectionSheet(tenantId: string) {
    const today = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const dueToday = await this.prisma.ledgerCollection.findMany({
      where: {
        tenantId,
        dueDate: { gte: today, lte: todayEnd },
        paid: false,
      },
      include: {
        ledger: {
          select: {
            id: true,
            installmentType: true,
            installmentAmount: true,
            status: true,
            customer: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { periodNo: 'asc' },
    });

    const collectedToday = await this.prisma.ledgerPayment.aggregate({
      where: { tenantId, createdAt: { gte: today } },
      _sum: { amount: true },
    });

    const totalDue = dueToday.reduce((s, c) => s + (c.amount - c.paidAmount), 0);

    return {
      date: today.toISOString().slice(0, 10),
      totalDueCount: dueToday.length,
      totalDueAmount: totalDue,
      collectedToday: collectedToday._sum.amount ?? 0,
      pendingCollection: Math.max(0, totalDue - (collectedToday._sum.amount ?? 0)),
      items: dueToday.map((c) => ({
        collectionId: c.id,
        ledgerId: c.ledger.id,
        customer: c.ledger.customer,
        periodNo: c.periodNo,
        amount: c.amount,
        paidAmount: c.paidAmount,
        balance: c.amount - c.paidAmount,
        installmentType: c.ledger.installmentType,
      })),
    };
  }

  async getIntelligenceAlerts(tenantId: string) {
    const now = new Date();
    const thirtyDaysAgo = addDays(now, -30);
    const sevenDaysAgo = addDays(now, -7);

    const overdueCollections = await this.prisma.ledgerCollection.findMany({
      where: {
        tenantId,
        paid: false,
        dueDate: { lt: now },
        ledger: { status: 'ACTIVE' },
      },
      include: {
        ledger: {
          select: {
            id: true,
            customerId: true,
            installmentType: true,
            customer: { select: { name: true, phone: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Group by ledger
    const byLedger = new Map<string, typeof overdueCollections>();
    for (const col of overdueCollections) {
      const arr = byLedger.get(col.ledgerId) ?? [];
      arr.push(col);
      byLedger.set(col.ledgerId, arr);
    }

    const criticalAccounts: any[] = [];
    const atRiskAccounts: any[] = [];

    for (const [ledgerId, cols] of byLedger.entries()) {
      const oldest = cols[0];
      const daysPastDue = differenceInDays(now, oldest.dueDate);
      const totalOverdueAmt = cols.reduce((s, c) => s + (c.amount - c.paidAmount), 0);

      const entry = {
        ledgerId,
        customer: oldest.ledger.customer,
        overduePeriods: cols.length,
        daysPastDue,
        overdueAmount: totalOverdueAmt,
        installmentType: oldest.ledger.installmentType,
      };

      if (daysPastDue >= 30) criticalAccounts.push(entry);
      else atRiskAccounts.push(entry);
    }

    // Customers with no payment in 7+ days but active loans
    const recentPayers = await this.prisma.ledgerPayment.findMany({
      where: { tenantId, createdAt: { gte: sevenDaysAgo } },
      select: { customerId: true },
      distinct: ['customerId'],
    });
    const recentPayerIds = new Set(recentPayers.map((p) => p.customerId));

    const activeCustomers = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, status: 'ACTIVE' },
      select: { customerId: true, customer: { select: { name: true, phone: true } } },
      distinct: ['customerId'],
    });

    const inactiveCustomers = activeCustomers
      .filter((a) => !recentPayerIds.has(a.customerId))
      .map((a) => ({ customerId: a.customerId, customer: a.customer }));

    return {
      critical: criticalAccounts,
      atRisk: atRiskAccounts,
      inactiveCustomers,
      summary: {
        criticalCount: criticalAccounts.length,
        atRiskCount: atRiskAccounts.length,
        inactiveCount: inactiveCustomers.length,
        totalOverdueAmount: [...criticalAccounts, ...atRiskAccounts].reduce(
          (s, a) => s + a.overdueAmount,
          0,
        ),
      },
    };
  }

  async getCustomerPerformance(tenantId: string, customerId: string) {
    const customer = await this.prisma.ledgerCustomer.findFirst({
      where: { id: customerId, tenantId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const payments = await this.prisma.ledgerPayment.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'asc' },
    });

    const collections = await this.prisma.ledgerCollection.findMany({
      where: { tenantId, ledger: { customerId } },
    });

    const paidOnTime = collections.filter(
      (c) => c.paid && c.paidAt && c.paidAt <= c.dueDate,
    ).length;
    const paidLate = collections.filter(
      (c) => c.paid && c.paidAt && c.paidAt > c.dueDate,
    ).length;
    const unpaid = collections.filter((c) => !c.paid).length;

    const onTimeRate =
      collections.length > 0
        ? Math.round(((paidOnTime) / collections.length) * 100)
        : 0;

    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

    // Monthly payment trend
    const monthlyTrend = payments.reduce<Record<string, number>>((acc, p) => {
      const key = p.createdAt.toISOString().slice(0, 7);
      acc[key] = (acc[key] ?? 0) + p.amount;
      return acc;
    }, {});

    const score =
      onTimeRate >= 90 ? 'EXCELLENT' :
      onTimeRate >= 70 ? 'GOOD' :
      onTimeRate >= 50 ? 'AVERAGE' : 'POOR';

    return {
      customer: { id: customer.id, name: customer.name, phone: customer.phone },
      performance: {
        totalPayments: payments.length,
        totalPaid,
        paidOnTime,
        paidLate,
        unpaidPeriods: unpaid,
        onTimeRate,
        score,
      },
      monthlyTrend: Object.entries(monthlyTrend)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount })),
    };
  }
}
