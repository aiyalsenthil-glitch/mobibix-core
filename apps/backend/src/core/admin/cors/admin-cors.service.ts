import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCorsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns all active origins as plain strings — used by main.ts at boot */
  async getEnabledOrigins(): Promise<string[]> {
    const rows = await this.prisma.corsAllowedOrigin.findMany({
      where: { isEnabled: true },
      select: { origin: true },
    });
    return rows.map((r) => r.origin);
  }

  /** Returns everything for the admin UI */
  async findAll() {
    return this.prisma.corsAllowedOrigin.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(origin: string, label?: string) {
    return this.prisma.corsAllowedOrigin.create({
      data: { origin: origin.trim().toLowerCase(), label },
    });
  }

  async update(id: string, data: { label?: string; isEnabled?: boolean }) {
    return this.prisma.corsAllowedOrigin.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.corsAllowedOrigin.delete({ where: { id } });
  }
}
