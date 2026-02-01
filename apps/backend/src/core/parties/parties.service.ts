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
}
