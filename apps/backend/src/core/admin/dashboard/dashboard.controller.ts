import {
  Controller,
  Get,
  UseGuards,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminRolesGuard } from '../guards/admin-roles.guard';
import { AdminRoles } from '../decorators/admin.decorator';
import { AdminRole, ModuleType } from '@prisma/client';
import { AdminCacheService } from '../cache/admin-cache.service';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard, AdminRolesGuard)
@AdminRoles(
  AdminRole.SUPER_ADMIN,
  AdminRole.PRODUCT_ADMIN,
  AdminRole.FINANCE_ADMIN,
)
export class DashboardController {
  constructor(
    private readonly cache: AdminCacheService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('analytics/global')
  async getGlobalAnalytics() {
    let kpis = await this.cache.get('admin:global:kpis');

    // Fallback if cache is empty (e.g. initial run)
    if (!kpis) {
      const data = await this.prisma.$queryRaw`SELECT * FROM admin_global_kpis`;
      kpis = data;
      await this.cache.set('admin:global:kpis', kpis, 300); // 5 minutes TTL
    }

    return { data: kpis };
  }
}
