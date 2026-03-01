import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole } from '@prisma/client';
import { AdminCacheService } from '../cache/admin-cache.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/revenue')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN)
export class RevenueAdminController {
  constructor(
    private readonly cache: AdminCacheService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('monthly')
  async getMonthlyRevenue() {
    let revenueData = await this.cache.get('admin:revenue:monthly');

    if (!revenueData) {
      const data = await this.prisma
        .$queryRaw`SELECT * FROM admin_revenue_monthly ORDER BY month DESC`;
      revenueData = data;
      await this.cache.set('admin:revenue:monthly', revenueData, 300);
    }

    return { data: revenueData };
  }

  @Get('recent-payments')
  async getRecentPayments() {
    return this.prisma.payment.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        tenant: { select: { name: true, tenantType: true } },
      },
    });
  }
}
