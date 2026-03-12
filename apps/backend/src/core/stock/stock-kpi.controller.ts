import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { StockKpiService } from './stock-kpi.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('mobileshop/stock/kpi')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class StockKpiController {
  constructor(
    private readonly service: StockKpiService,
    @Inject(CACHE_MANAGER) private cache: Cache,
  ) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.VIEW)
  @Get('overview')
  async overview(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('period') period?: 'DAY' | 'WEEK' | 'MONTH',
    @Query('days') days?: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!shopId) {
      throw new BadRequestException('shopId required');
    }

    const cacheVersion = process.env.CACHE_VERSION || '1';
    const cacheKey = `v${cacheVersion}:kpi:${tenantId}:${shopId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const result = await this.service.overview(
      tenantId,
      shopId,
      period ?? 'MONTH',
      days ? Number(days) : 30,
    );

    await this.cache.set(cacheKey, result, 60);
    return result;
  }
}
