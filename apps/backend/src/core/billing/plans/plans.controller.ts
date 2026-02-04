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
import { ModuleType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(
    private readonly plansService: PlansService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  async listPlans() {
    return this.plansService.getActivePlans();
  }
  @UseGuards(JwtAuthGuard)
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
