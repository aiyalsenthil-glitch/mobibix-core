import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PartyType } from '@prisma/client';

@Injectable()
export class PartiesService {
  constructor(private prisma: PrismaService) {}

  async searchParties(tenantId: string, query: string, type?: PartyType, limit: number = 10) {
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

  async upgradeRole(tenantId: string, id: string, newRole: 'CUSTOMER' | 'VENDOR') {
    const party = await this.prisma.party.findUnique({
      where: { id },
    });

    if (!party || party.tenantId !== tenantId) {
      return null;
    }

    // Role Promotion Logic
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
      data: { partyType: updatedType },
    });
  }
}
