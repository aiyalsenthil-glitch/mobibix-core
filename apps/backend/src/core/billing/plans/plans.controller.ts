import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModuleType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { TenantRequiredGuard } from '../../auth/guards/tenant.guard';
import { Public } from '../../auth/decorators/public.decorator';
import { ModuleScope } from '../../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('plans')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(GranularPermissionGuard)
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * PUBLIC ENDPOINT - No authentication required
   * Returns pricing for public display on pricing pages
   */
  @Public()
  @Get('public/pricing')
  async getPublicPricing(@Query('module') module?: string) {
    return this.plansService.getPublicPricing(module as ModuleType);
  }

  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get()
  async listPlans() {
    return this.plansService.getActivePlans();
  }

  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('wa-addons')
  async getWaAddonPlans() {
    return this.plansService.getWaAddonPlans();
  }

  @RequirePermission(PERMISSIONS.CORE.BILLING.VIEW)
  @UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  @Get('available')
  async getAvailablePlans(
    @Req() req: any,
    @Query('module') module?: ModuleType,
  ) {
    let finalModule = module;

    if (!finalModule) {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: req.user.tenantId },
        select: { tenantType: true },
      });

      if (!tenant?.tenantType) {
        throw new BadRequestException('Tenant type not found');
      }

      const normalizedTenantType = tenant.tenantType
        .toUpperCase()
        .replace(/[\s_-]/g, '');

      finalModule =
        normalizedTenantType === 'MOBILESHOP'
          ? ModuleType.MOBILE_SHOP
          : normalizedTenantType === 'GYM'
            ? ModuleType.GYM
            : undefined;

      if (!finalModule) {
        throw new BadRequestException('Unsupported tenant module');
      }
    }

    return this.plansService.getPlansWithUpgradeInfo(
      req.user.tenantId,
      finalModule,
    );
  }
}
