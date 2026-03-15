import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HsnService {
  constructor(private prisma: PrismaService) {}

  async search(query: string) {
    if (!query) return [];

    return this.prisma.hSNCode.findMany({
      where: {
        isActive: true,
        OR: [
          { code: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        code: true,
        description: true,
        taxRate: true,
      },
      take: 20,
      orderBy: { code: 'asc' },
    });
  }
}
