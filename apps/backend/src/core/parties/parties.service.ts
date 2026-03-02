import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartyType } from '@prisma/client';

@Injectable()
export class PartiesService {
  constructor(private prisma: PrismaService) {}

  async searchParties(
    tenantId: string,
    query: string,
    type?: PartyType,
    limit: number = 10,
  ) {
    return this.prisma.party.findMany({
      where: {
        tenantId,
        isActive: true,
        ...(type && {
          partyType: {
            in: type === 'CUSTOMER' ? ['CUSTOMER', 'BOTH'] : ['VENDOR', 'BOTH'],
          },
        }),
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { phone: { contains: query, mode: 'insensitive' } },
          { gstNumber: { contains: query, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  async findById(tenantId: string, id: string) {
    return this.prisma.party.findFirst({
      where: { id, tenantId },
    });
  }

  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.party.findFirst({
      where: { tenantId, phone },
    });
  }

  async upgradeRole(
    tenantId: string,
    id: string,
    newRole: 'CUSTOMER' | 'VENDOR',
  ) {
    const party = await this.prisma.party.findFirst({
      where: { id, tenantId },
    });

    if (!party || party.tenantId !== tenantId) {
      return null;
    }
    let updatedType = party.partyType;

    if (party.partyType === 'BOTH') {
      return party; // Already max role
    }

    if (party.partyType === 'CUSTOMER' && newRole === 'VENDOR') {
      updatedType = 'BOTH';
    } else if (party.partyType === 'VENDOR' && newRole === 'CUSTOMER') {
      updatedType = 'BOTH';
    } else if (newRole === 'CUSTOMER' && party.partyType !== 'CUSTOMER') {
      // logic to ensure we don't accidentally downgrade if something weird happens,
      // but strictly speaking:
      // If current is VENDOR and new is CUSTOMER -> BOTH
      // If current is CUSTOMER and new is CUSTOMER -> CUSTOMER (no change)
      // If current is BOTH -> BOTH
      updatedType = 'BOTH';
    }
    // Re-evaluating the logic to be super precise as per requirements:
    // If partyType = CUSTOMER and role = SUPPLIER (VENDOR) → set BOTH
    // If partyType = SUPPLIER (VENDOR) and role = CUSTOMER → set BOTH

    // Let's rewrite cleanly:
    if (party.partyType === 'CUSTOMER' && newRole === 'VENDOR') {
      updatedType = 'BOTH';
    } else if (party.partyType === 'VENDOR' && newRole === 'CUSTOMER') {
      updatedType = 'BOTH';
    }

    if (updatedType === party.partyType) {
      return party;
    }

    return this.prisma.party.update({
      where: { id },
      data: {
        partyType: updatedType,
        ...(updatedType === 'VENDOR' || updatedType === 'BOTH'
          ? {
              supplierProfile: {
                connectOrCreate: {
                  where: { partyId: id },
                  create: {
                    category: 'Standard',
                    paymentDueDays: 30,
                    preferredCurrency: 'INR',
                  },
                },
              },
            }
          : {}),
      },
      include: {
        supplierProfile: true,
      },
    });
  }

  async getBalance(tenantId: string, id: string) {
    // 1. Total Invoiced Amount (Debt)
    const invoices = await this.prisma.invoice.aggregate({
      where: {
        tenantId,
        customerId: id,
        status: { not: 'VOIDED' },
      },
      _sum: { totalAmount: true },
    });

    // 2. Total Received Amount (Credit) - From Receipts
    const receipts = await this.prisma.receipt.aggregate({
      where: {
        tenantId,
        customerId: id,
        status: 'ACTIVE',
        receiptType: 'CUSTOMER', // Only customer receipts
      },
      _sum: { amount: true },
    });

    // 3. Opening Balance?? (If we had it). For now, assume 0 or handle later.

    const totalDebt = invoices._sum.totalAmount || 0; // Paisa
    const totalPaid = receipts._sum.amount || 0; // Paisa (Receipt stores in Rupees? No, usually Paisa if consistent. Need to verify Receipt model map.)

    // Receipt model check: `amount Int`.
    // Invoice model: `totalAmount Int`.
    // Assuming consistency in Paisa across system (or Rupees if legacy).
    // Receipt usually matches Invoice currency.

    // We need to double check if Receipt amount is Paisa.
    // In `createReceipt`, we usually store what user enters?
    // Invoice `totalAmount` is definitely Paisa (based on `reports.service.ts` dividing by 100).
    // Receipt Amount? `receipts.service.ts` usually handles it.
    // Let's assume consistent Int = Paisa mostly, OR consistent Int = Rupees.
    // But `reports.service.ts` divided `paidSales` (from Receipt) by nothing?
    // In `getOwnerDashboard`: `paidSales._sum.amount`.
    // In `getSalesReport`: `inv.receipts.reduce...` -> `paid / 100`. So Receipt amount IS Paisa.

    return {
      balance: totalDebt - totalPaid, // Returning in Paisa
      currency: 'INR',
    };
  }
}
