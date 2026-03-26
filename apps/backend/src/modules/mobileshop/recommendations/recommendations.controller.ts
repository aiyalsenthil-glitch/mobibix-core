import { Controller, Get, Post, Body, Query, Param, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { ModuleType } from '@prisma/client';

@ApiTags('Recommendations Engine')
@Controller('recommendations')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('sales')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Get('upsell')
  @ApiOperation({ summary: 'Search for compatible inventory items for a phone model (POS Upsell)' })
  @ApiQuery({ name: 'model', description: 'Name of the phone model (e.g., Samsung S24)' })
  @ApiQuery({ name: 'shopId', description: 'Working shop ID' })
  @ApiQuery({ name: 'type', description: 'Optional product type filter (GOODS, SPARE, SERVICE)', required: false })
  async getUpsellRecommendations(
    @Query('model') model: string, 
    @Query('shopId') shopId: string,
    @Query('type') type?: string
  ) {
    return this.recommendationsService.getUpsellRecommendations(shopId, model, type);
  }
}
