import { Controller, Get, Param, Req, Post, Body, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { DistributorScopeGuard } from '../guards/distributor-scope.guard';
import { CreateCreditEntryDto } from './dto/credit.dto';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';

@SkipSubscriptionCheck()
@Controller('distributor/analytics')
@UseGuards(DistributorScopeGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /** GET /api/distributor/analytics/overview */
  @Get('overview')
  getOverview(@Req() req: any) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.getOverview(distributorId);
  }

  /** GET /api/distributor/analytics/retailers — list all linked retailers with stats */
  @Get('retailers')
  getRetailers(@Req() req: any) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.getRetailers(distributorId);
  }

  /** GET /api/distributor/analytics/retailers/:retailerId — deep retailer breakdown */
  @Get('retailers/:retailerId')
  getRetailerBreakdown(@Req() req: any, @Param('retailerId') retailerId: string) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.getRetailerBreakdown(distributorId, retailerId);
  }

  /** GET /api/distributor/analytics/products/:itemId — product monthly performance */
  @Get('products/:itemId')
  getProductPerformance(@Req() req: any, @Param('itemId') itemId: string) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.getProductPerformance(distributorId, itemId);
  }

  // ─── Credit & Finance ──────────────────────────────────────────────────

  /** POST /api/distributor/analytics/credit — record credit or payment */
  @Post('credit')
  recordCredit(@Req() req: any, @Body() dto: CreateCreditEntryDto) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.recordCreditEntry(distributorId, dto);
  }

  /** GET /api/distributor/analytics/retailers/:retailerId/credit — fetch credit history */
  @Get('retailers/:retailerId/credit')
  getCreditHistory(@Req() req: any, @Param('retailerId') retailerId: string) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.getCreditHistory(distributorId, retailerId);
  }

  /** GET /api/distributor/analytics/retailers/:retailerId/balance — fetch current credit balance */
  @Get('retailers/:retailerId/balance')
  getRetailerBalance(@Req() req: any, @Param('retailerId') retailerId: string) {
    const { distributorId } = req.distributorContext;
    return this.analyticsService.getRetailerBalance(distributorId, retailerId);
  }
}
