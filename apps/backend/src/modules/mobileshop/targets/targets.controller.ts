import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';
import { TargetsService } from './targets.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@Controller('mobileshop/targets')
@UseGuards(JwtAuthGuard)
export class TargetsController {
  constructor(private readonly service: TargetsService) {}

  @Get('shop')
  async getShopTargets(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('year') year: string
  ) {
    return this.service.getShopTargets(
      req.user.tenantId,
      shopId,
      parseInt(year) || new Date().getFullYear()
    );
  }

  @Post('shop')
  async setShopTarget(@Req() req, @Body() body: any) {
    return this.service.setShopTarget(
      req.user.tenantId,
      body.shopId,
      body.year,
      body.month,
      body.revenueTarget,
      body.repairTarget,
      body.salesTarget
    );
  }

  @Get('staff')
  async getStaffTargets(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('year') year: string
  ) {
    return this.service.getStaffTargets(
      req.user.tenantId,
      shopId,
      parseInt(year) || new Date().getFullYear()
    );
  }

  @Post('staff')
  async setStaffTarget(@Req() req, @Body() body: any) {
    return this.service.setStaffTarget(
      req.user.tenantId,
      body.shopId,
      body.staffId,
      body.year,
      body.month,
      body.revenueTarget,
      body.repairTarget,
      body.salesTarget
    );
  }

  @Get('leaderboard')
  getLeaderboard(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('month') month: string,
    @Query('year') year: string,
  ) {
    const now = new Date();
    return this.service.getLeaderboard(
      req.user.tenantId,
      shopId,
      parseInt(month) || now.getMonth() + 1,
      parseInt(year) || now.getFullYear(),
    );
  }
}
