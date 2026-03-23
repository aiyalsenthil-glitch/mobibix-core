import { Controller, Get, Post, Patch, Body, Param, Req, UseGuards } from '@nestjs/common';
import { StockService } from './stock.service';
import { DistributorScopeGuard } from '../guards/distributor-scope.guard';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';
import { SkipTenant } from '../../../core/auth/decorators/skip-tenant.decorator';

// ── Distributor-facing ────────────────────────────────────────────────────────
@SkipTenant()
@SkipSubscriptionCheck()
@Controller('distributor/stock')
@UseGuards(DistributorScopeGuard)
export class DistributorStockController {
  constructor(private readonly stockService: StockService) {}

  /** GET /api/distributor/stock/retailers/:retailerId — view allowed stock */
  @Get('retailers/:retailerId')
  getRetailerStock(@Req() req: any, @Param('retailerId') retailerId: string) {
    const { distributorId } = req.distributorContext;
    return this.stockService.getRetailerStock(distributorId, retailerId);
  }

  /** POST /api/distributor/stock/retailers/:retailerId/refill — suggest restocking */
  @Post('retailers/:retailerId/refill')
  createRefillRequest(
    @Req() req: any,
    @Param('retailerId') retailerId: string,
    @Body() body: { items: { catalogItemId: string; suggestedQty: number }[]; notes?: string },
  ) {
    const { distributorId } = req.distributorContext;
    return this.stockService.createRefillRequest(distributorId, retailerId, body);
  }

  /** GET /api/distributor/stock/retailers/:retailerId/refills — all refill requests for a retailer */
  @Get('retailers/:retailerId/refills')
  listRefills(@Req() req: any, @Param('retailerId') retailerId: string) {
    const { distributorId } = req.distributorContext;
    return this.stockService.listRefillRequestsForDistributor(distributorId, retailerId);
  }
}

// ── ERP-facing ────────────────────────────────────────────────────────────────
@SkipSubscriptionCheck()
@Controller('retailer/stock')
export class RetailerStockController {
  constructor(private readonly stockService: StockService) {}

  /** GET /api/retailer/stock/meta — distinct brands + categories in tenant inventory */
  @Get('meta')
  getProductMeta(@Req() req: any) {
    return this.stockService.getProductMeta(req.user.tenantId);
  }

  /** GET /api/retailer/stock/visibility/:distributorId — get visibility settings */
  @Get('visibility/:distributorId')
  getVisibility(@Req() req: any, @Param('distributorId') distributorId: string) {
    return this.stockService.getVisibilitySettings(req.user.tenantId, distributorId);
  }

  /** PATCH /api/retailer/stock/visibility/:distributorId — update visibility settings */
  @Patch('visibility/:distributorId')
  updateVisibility(
    @Req() req: any,
    @Param('distributorId') distributorId: string,
    @Body() body: { stockVisibilityEnabled: boolean; allowAllProducts?: boolean; allowedCategories?: string[]; allowedBrands?: string[] },
  ) {
    return this.stockService.updateVisibilitySettings(req.user.tenantId, distributorId, body);
  }

  /** GET /api/retailer/stock/refills — list all incoming refill requests */
  @Get('refills')
  listRefills(@Req() req: any) {
    return this.stockService.listRefillRequests(req.user.tenantId);
  }

  /** POST /api/retailer/stock/refills/:id/respond — accept or reject refill request */
  @Post('refills/:id/respond')
  respondToRefill(
    @Req() req: any,
    @Param('id') requestId: string,
    @Body() body: { accept: boolean; adjustedItems?: { itemId: string; acceptedQty: number }[] },
  ) {
    return this.stockService.respondToRefillRequest(req.user.tenantId, requestId, body);
  }
}
