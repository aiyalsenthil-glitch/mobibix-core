import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { addDays, addWeeks, addMonths, differenceInDays } from 'date-fns';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(tenantId: string, data: any) {
    if (!data.name || !data.phone) {
      throw new BadRequestException('Name and phone required');
    }

    return this.prisma.ledgerCustomer.create({
      data: {
        tenantId,
        name: data.name,
        phone: data.phone,
        address: data.address,
      },
    });
  }

  async createAccount(tenantId: string, data: any) {
    const {
      customerId,
      principalAmount,
      expectedTotal,
      installmentType,
      installmentAmount,
      totalPeriods,
      startDate,
    } = data;

    if (
      !customerId ||
      !installmentType ||
      !installmentAmount ||
      !totalPeriods ||
      !startDate
    ) {
      throw new BadRequestException('Invalid ledger data');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Create ledger account
      const ledger = await tx.ledgerAccount.create({
        data: {
          tenantId,
          customerId,
          principalAmount,
          expectedTotal,
          installmentType,
          installmentAmount,
          totalPeriods,
          startDate: new Date(startDate),
        },
      });

      // 2️⃣ Generate collections
      const collections: {
        tenantId: string;
        ledgerId: string;
        periodNo: number;
        dueDate: Date;
        amount: number;
      }[] = [];

      for (let i = 1; i <= totalPeriods; i++) {
        let dueDate: Date;

        switch (installmentType) {
          case 'DAILY':
            dueDate = addDays(new Date(startDate), i - 1);
            break;
          case 'WEEKLY':
            dueDate = addWeeks(new Date(startDate), i - 1);
            break;
          case 'MONTHLY':
            dueDate = addMonths(new Date(startDate), i - 1);
            break;
          default:
            throw new BadRequestException('Invalid installment type');
        }

        collections.push({
          tenantId,
          ledgerId: ledger.id,
          periodNo: i,
          dueDate,
          amount: installmentAmount,
        });
      }

      await tx.ledgerCollection.createMany({
        data: collections,
      });

      return ledger;
    });
  }
  async searchCustomers(tenantId: string, q: string) {
    if (!q || q.trim().length < 2) {
      return [];
    }

    const customers = await this.prisma.ledgerCustomer.findMany({
      where: {
        tenantId,
        OR: [
          {
            name: {
              contains: q,
              mode: 'insensitive',
            },
          },
          {
            phone: {
              contains: q,
            },
          },
        ],
      },
      take: 20,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // attach active loan count (collector-friendly)
    const result = await Promise.all(
      customers.map(async (c) => {
        const activeLoans = await this.prisma.ledgerAccount.count({
          where: {
            tenantId,
            customerId: c.id,
            status: 'ACTIVE',
          },
        });

        return {
          id: c.id,
          name: c.name,
          phone: c.phone,
          activeLoans,
        };
      }),
    );

    return result;
  }
  async getCollectScreen(tenantId: string, ledgerId: string) {
    // 1️⃣ Fetch ledger (tenant-safe)
    const ledger = await this.prisma.ledgerAccount.findFirst({
      where: {
        id: ledgerId,
        tenantId,
        status: 'ACTIVE',
      },
    });

    if (!ledger) {
      throw new BadRequestException('Active ledger not found');
    }

    // 2️⃣ Fetch collections ordered
    const collections = await this.prisma.ledgerCollection.findMany({
      where: {
        ledgerId,
        tenantId,
      },
      orderBy: {
        periodNo: 'asc',
      },
    });

    if (collections.length === 0) {
      return {
        ledgerId,
        message: 'No collections generated yet',
      };
    }

    // 3️⃣ Find unpaid collections
    const unpaid = collections.filter((c) => !c.paid);

    if (unpaid.length === 0) {
      return {
        ledgerId,
        status: 'COMPLETED',
        message: 'All collections completed',
      };
    }

    const current = unpaid[0];

    const pending = unpaid.filter((c) => c.periodNo < current.periodNo);

    const pendingAmount = pending.reduce((sum, c) => sum + c.amount, 0);

    return {
      ledgerId,
      installmentType: ledger.installmentType,

      currentPeriod: current.periodNo,
      currentAmount: current.amount,

      pendingPeriods: pending.map((p) => p.periodNo),
      pendingAmount,

      totalToCollect: pendingAmount + current.amount,
    };
  }
  async collectAmount(
    tenantId: string,
    data: {
      ledgerId: string;
      amount: number;
      collectedBy: string;
      method?: 'CASH' | 'UPI' | 'BANK';
      note?: string;
    },
  ) {
    const { ledgerId, amount, collectedBy, method = 'CASH', note } = data;

    if (!ledgerId || !amount || amount <= 0) {
      throw new BadRequestException('Invalid collection data');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1️⃣ Validate ledger
      const ledger = await tx.ledgerAccount.findFirst({
        where: {
          id: ledgerId,
          tenantId,
          status: 'ACTIVE',
        },
      });

      if (!ledger) {
        throw new BadRequestException('Active ledger not found');
      }

      // 2️⃣ Fetch unpaid collections (oldest first)
      const unpaid = await tx.ledgerCollection.findMany({
        where: {
          tenantId,
          ledgerId,
          paid: false,
        },
        orderBy: {
          periodNo: 'asc',
        },
      });

      if (unpaid.length === 0) {
        throw new BadRequestException('Nothing to collect');
      }

      let remaining = amount;
      const createdPayments: any[] = [];

      // 3️⃣ Apply amount to collections & create payment records
      for (const col of unpaid) {
        if (remaining <= 0) break;

        const amountForThisCollection = Math.min(
          remaining,
          col.amount - col.paidAmount,
        );

        if (amountForThisCollection > 0) {
          const newPaidAmount = col.paidAmount + amountForThisCollection;
          const isFullyPaid = newPaidAmount === col.amount;

          // Update collection
          await tx.ledgerCollection.update({
            where: { id: col.id },
            data: {
              paidAmount: newPaidAmount,
              paid: isFullyPaid,
              paidAt: isFullyPaid ? new Date() : col.paidAt,
            },
          });

          // Create payment record
          const payment = await tx.ledgerPayment.create({
            data: {
              tenantId,
              ledgerId,
              customerId: ledger.customerId,
              collectionId: col.id,
              collectedBy,
              amount: amountForThisCollection,
              method,
              note: note || null,
            },
          });

          createdPayments.push(payment);
          remaining -= amountForThisCollection;
        }
      }

      // 4️⃣ Check if all collections are paid
      const stillUnpaid = await tx.ledgerCollection.count({
        where: {
          tenantId,
          ledgerId,
          paid: false,
        },
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
        paymentRecords: createdPayments.length,
        remainingUnpaidPeriods: stillUnpaid,
        status: stillUnpaid === 0 ? 'COMPLETED' : 'ACTIVE',
      };
    });
  }
  async getCustomerProfile(tenantId: string, customerId: string) {
    // 1️⃣ Validate customer
    const customer = await this.prisma.ledgerCustomer.findFirst({
      where: { id: customerId, tenantId },
    });

    if (!customer) {
      throw new BadRequestException('Customer not found');
    }

    // 2️⃣ Fetch all ledgers
    const ledgers = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    let totalLended = 0;
    let totalExpected = 0;
    let totalCollected = 0;

    const detailedLedgers: {
      ledgerId: string;
      status: 'ACTIVE' | 'COMPLETED' | 'CLOSED';
      installmentType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
      principalAmount: number;
      expectedTotal: number;
      collectedAmount: number;
      pendingPeriods: number;
      overduePeriods?: number;
      health: 'OK' | 'DUE' | 'OVERDUE' | 'CRITICAL' | 'CLOSED';
    }[] = [];

    for (const ledger of ledgers) {
      totalLended += ledger.principalAmount;
      totalExpected += ledger.expectedTotal;

      const collections = await this.prisma.ledgerCollection.findMany({
        where: {
          tenantId,
          ledgerId: ledger.id,
        },
      });

      const paid = collections.filter((c) => c.paid);
      const unpaid = collections.filter((c) => !c.paid);

      const collectedAmount = paid.reduce((sum, c) => sum + c.paidAmount, 0);

      totalCollected += collectedAmount;

      // 🔥 Improved loan health logic (with overdue awareness)
      let health: 'OK' | 'DUE' | 'OVERDUE' | 'CRITICAL' | 'CLOSED';
      let overduePeriods = 0;

      if (ledger.status !== 'ACTIVE') {
        health = 'CLOSED';
      } else if (unpaid.length === 0) {
        health = 'OK';
      } else {
        // Check for overdue status
        const now = new Date();
        const overdueCollections = unpaid.filter((c) => c.dueDate < now);

        if (overdueCollections.length === 0) {
          // All unpaid are not yet due
          health = 'DUE';
        } else {
          overduePeriods = overdueCollections.length;
          // Calculate max overdue days
          const maxOverdueDays = Math.max(
            ...overdueCollections.map((c) => differenceInDays(now, c.dueDate)),
          );

          if (maxOverdueDays >= 30) {
            health = 'CRITICAL';
          } else {
            health = 'OVERDUE';
          }
        }
      }

      detailedLedgers.push({
        ledgerId: ledger.id,
        status: ledger.status,
        installmentType: ledger.installmentType,
        principalAmount: ledger.principalAmount,
        expectedTotal: ledger.expectedTotal,
        collectedAmount,
        pendingPeriods: unpaid.length,
        overduePeriods: overduePeriods > 0 ? overduePeriods : undefined,
        health,
      });
    }

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
      },

      stats: {
        totalLended,
        totalExpected,
        totalCollected,
        profit: totalCollected - totalLended,
      },

      activeLoans: detailedLedgers.filter((l) => l.status === 'ACTIVE'),
      closedLoans: detailedLedgers.filter((l) => l.status !== 'ACTIVE'),
    };
  }

  // ─── LIST ENDPOINTS (FROZEN CONTRACT) ────────────────────────────────────

  async listCustomers(tenantId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [total, customers] = await Promise.all([
      this.prisma.ledgerCustomer.count({ where: { tenantId, isActive: true } }),
      this.prisma.ledgerCustomer.findMany({
        where: { tenantId, isActive: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    if (customers.length === 0) {
      return { customers: [], total, page, limit };
    }

    const customerIds = customers.map((c) => c.id);

    // Batch: active loan counts per customer
    const activeLoansData = await this.prisma.ledgerAccount.groupBy({
      by: ['customerId'],
      where: { tenantId, customerId: { in: customerIds }, status: 'ACTIVE' },
      _count: { id: true },
    });

    // Batch: outstanding amounts — get active ledger IDs first, then aggregate
    const activeLedgers = await this.prisma.ledgerAccount.findMany({
      where: { tenantId, customerId: { in: customerIds }, status: 'ACTIVE' },
      select: { id: true, customerId: true },
    });

    const ledgerToCustomer: Record<string, string> = {};
    for (const l of activeLedgers) {
      ledgerToCustomer[l.id] = l.customerId;
    }

    const activeLedgerIds = activeLedgers.map((l) => l.id);
    const outstandingByLedger =
      activeLedgerIds.length > 0
        ? await this.prisma.ledgerCollection.groupBy({
            by: ['ledgerId'],
            where: {
              tenantId,
              ledgerId: { in: activeLedgerIds },
              paid: false,
            },
            _sum: { amount: true, paidAmount: true },
          })
        : [];

    const outstandingByCustomer: Record<string, number> = {};
    for (const row of outstandingByLedger) {
      const cId = ledgerToCustomer[row.ledgerId];
      const remaining =
        (row._sum.amount ?? 0) - (row._sum.paidAmount ?? 0);
      outstandingByCustomer[cId] =
        (outstandingByCustomer[cId] ?? 0) + remaining;
    }

    const activeLoansMap: Record<string, number> = {};
    for (const row of activeLoansData) {
      activeLoansMap[row.customerId] = row._count.id;
    }

    return {
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address ?? null,
        activeLoans: activeLoansMap[c.id] ?? 0,
        totalOutstanding: outstandingByCustomer[c.id] ?? 0,
        createdAt: c.createdAt,
      })),
      total,
      page,
      limit,
    };
  }

  async listAccounts(
    tenantId: string,
    page: number,
    limit: number,
    status?: string,
    customerId?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: Record<string, any> = { tenantId };
    if (status) where.status = status;
    if (customerId) where.customerId = customerId;

    const [total, accounts] = await Promise.all([
      this.prisma.ledgerAccount.count({ where }),
      this.prisma.ledgerAccount.findMany({
        where,
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    if (accounts.length === 0) {
      return { accounts: [], total, page, limit };
    }

    const accountIds = accounts.map((a) => a.id);
    const now = new Date();

    const [paidStats, unpaidStats, overdueStats] = await Promise.all([
      this.prisma.ledgerCollection.groupBy({
        by: ['ledgerId'],
        where: { tenantId, ledgerId: { in: accountIds }, paid: true },
        _count: { id: true },
        _sum: { paidAmount: true },
      }),
      this.prisma.ledgerCollection.groupBy({
        by: ['ledgerId'],
        where: { tenantId, ledgerId: { in: accountIds }, paid: false },
        _count: { id: true },
      }),
      this.prisma.ledgerCollection.groupBy({
        by: ['ledgerId'],
        where: {
          tenantId,
          ledgerId: { in: accountIds },
          paid: false,
          dueDate: { lt: now },
        },
        _count: { id: true },
        _min: { dueDate: true },
      }),
    ]);

    const paidMap = Object.fromEntries(
      paidStats.map((r) => [
        r.ledgerId,
        { count: r._count.id, sum: r._sum.paidAmount ?? 0 },
      ]),
    );
    const unpaidMap = Object.fromEntries(
      unpaidStats.map((r) => [r.ledgerId, r._count.id]),
    );
    const overdueMap = Object.fromEntries(
      overdueStats.map((r) => [
        r.ledgerId,
        { count: r._count.id, oldest: r._min.dueDate },
      ]),
    );

    return {
      accounts: accounts.map((a) => {
        const paidPeriods = paidMap[a.id]?.count ?? 0;
        const collectedAmount = paidMap[a.id]?.sum ?? 0;
        const unpaidCount = unpaidMap[a.id] ?? 0;
        const overdueInfo = overdueMap[a.id];

        let health: 'OK' | 'DUE' | 'OVERDUE' | 'CRITICAL' | 'CLOSED';
        if (a.status !== 'ACTIVE') {
          health = 'CLOSED';
        } else if (unpaidCount === 0) {
          health = 'OK';
        } else if (!overdueInfo || overdueInfo.count === 0) {
          health = 'DUE';
        } else {
          const maxOverdueDays = differenceInDays(now, overdueInfo.oldest!);
          health = maxOverdueDays >= 30 ? 'CRITICAL' : 'OVERDUE';
        }

        return {
          id: a.id,
          customerId: a.customerId,
          customerName: a.customer.name,
          customerPhone: a.customer.phone,
          principalAmount: a.principalAmount,
          expectedTotal: a.expectedTotal,
          installmentType: a.installmentType,
          installmentAmount: a.installmentAmount,
          totalPeriods: a.totalPeriods,
          paidPeriods,
          collectedAmount,
          startDate: a.startDate,
          status: a.status,
          health,
          createdAt: a.createdAt,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async getAccountDetail(tenantId: string, accountId: string) {
    const account = await this.prisma.ledgerAccount.findFirst({
      where: { id: accountId, tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        collections: { orderBy: { periodNo: 'asc' } },
        payments: {
          orderBy: { collectedAt: 'desc' },
          take: 20,
          include: {
            collectedByUser: { select: { id: true, fullName: true } },
            collection: { select: { periodNo: true } },
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const now = new Date();
    const paidPeriods = account.collections.filter((c) => c.paid).length;
    const collectedAmount = account.collections.reduce(
      (sum, c) => sum + c.paidAmount,
      0,
    );
    const unpaid = account.collections.filter((c) => !c.paid);
    const overdue = unpaid.filter((c) => c.dueDate < now);

    let health: 'OK' | 'DUE' | 'OVERDUE' | 'CRITICAL' | 'CLOSED';
    if (account.status !== 'ACTIVE') {
      health = 'CLOSED';
    } else if (unpaid.length === 0) {
      health = 'OK';
    } else if (overdue.length === 0) {
      health = 'DUE';
    } else {
      const maxOverdueDays = Math.max(
        ...overdue.map((c) => differenceInDays(now, c.dueDate)),
      );
      health = maxOverdueDays >= 30 ? 'CRITICAL' : 'OVERDUE';
    }

    return {
      id: account.id,
      customerId: account.customerId,
      customerName: account.customer.name,
      customerPhone: account.customer.phone,
      principalAmount: account.principalAmount,
      expectedTotal: account.expectedTotal,
      installmentType: account.installmentType,
      installmentAmount: account.installmentAmount,
      totalPeriods: account.totalPeriods,
      paidPeriods,
      collectedAmount,
      startDate: account.startDate,
      status: account.status,
      health,
      createdAt: account.createdAt,
      collections: account.collections.map((c) => ({
        id: c.id,
        periodNo: c.periodNo,
        dueDate: c.dueDate,
        amount: c.amount,
        paidAmount: c.paidAmount,
        paid: c.paid,
        paidAt: c.paidAt ?? null,
      })),
      recentPayments: account.payments.map((p) => ({
        id: p.id,
        collectionId: p.collectionId,
        periodNo: p.collection.periodNo,
        amount: p.amount,
        method: p.method,
        collectedBy: p.collectedBy,
        collectedByName: p.collectedByUser.fullName ?? null,
        note: p.note ?? null,
        collectedAt: p.collectedAt,
      })),
    };
  }
}
