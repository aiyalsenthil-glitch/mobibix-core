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

@Controller('plans')
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

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
  async listPlans() {
    return this.plansService.getActivePlans();
  }

  @Get('available')
  @UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
  @Roles(UserRole.OWNER, UserRole.STAFF)
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
