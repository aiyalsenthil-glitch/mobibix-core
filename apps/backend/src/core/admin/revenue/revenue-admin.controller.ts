import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { AdminCacheService } from '../cache/admin-cache.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';

@Controller('admin/revenue')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, AdminRolesGuard, GranularPermissionGuard)
@AdminRoles(AdminRole.SUPER_ADMIN, AdminRole.FINANCE_ADMIN)
export class RevenueAdminController {
  constructor(
    private readonly cache: AdminCacheService,
    private readonly prisma: PrismaService,
  ) {}

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
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

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
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
