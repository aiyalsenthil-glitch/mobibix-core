import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ModuleType } from '@prisma/client';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Get()
  async listPlans() {
    return this.plansService.getActivePlans();
  }
  @UseGuards(JwtAuthGuard)
  @Get('available')
  async getAvailablePlans(
    @Req() req: any,
    @Query('module') module: ModuleType = 'MOBILE_SHOP',
  ) {
    return this.plansService.getPlansWithUpgradeInfo(req.user.tenantId, module);
  }
}
