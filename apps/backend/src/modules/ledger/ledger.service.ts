import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { addDays, addWeeks, addMonths } from 'date-fns';

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
      note?: string;
    },
  ) {
    const { ledgerId, amount } = data;

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

      // 3️⃣ Apply amount to collections
      for (const col of unpaid) {
        if (remaining <= 0) break;

        if (remaining >= col.amount) {
          // full payment
          await tx.ledgerCollection.update({
            where: { id: col.id },
            data: {
              paid: true,
              paidAt: new Date(),
            },
          });

          remaining -= col.amount;
        } else {
          // partial payment → reduce amount
          await tx.ledgerCollection.update({
            where: { id: col.id },
            data: {
              amount: col.amount - remaining,
            },
          });

          remaining = 0;
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
      health: 'GOOD' | 'WARNING' | 'CRITICAL' | 'CLOSED';
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

      const collectedAmount = paid.reduce((sum, c) => sum + c.amount, 0);

      totalCollected += collectedAmount;

      // 🔥 Loan health logic
      let health: 'GOOD' | 'WARNING' | 'CRITICAL' | 'CLOSED';

      if (ledger.status !== 'ACTIVE') {
        health = 'CLOSED';
      } else if (unpaid.length === 0) {
        health = 'GOOD';
      } else if (unpaid.length <= 2) {
        health = 'WARNING';
      } else {
        health = 'CRITICAL';
      }

      detailedLedgers.push({
        ledgerId: ledger.id,
        status: ledger.status,
        installmentType: ledger.installmentType,
        principalAmount: ledger.principalAmount,
        expectedTotal: ledger.expectedTotal,
        collectedAmount,
        pendingPeriods: unpaid.length,
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
}
