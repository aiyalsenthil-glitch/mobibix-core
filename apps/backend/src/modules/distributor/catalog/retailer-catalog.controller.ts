import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { CatalogService } from './catalog.service';

/**
 * /retailer/supplier/catalog — retailer-facing distributor discovery
 * This allows a retailer to see products from their LINKED distributor.
 */
@Controller('retailer/supplier/catalog')
export class RetailerCatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get(':distributorId')
  browse(@Req() req: any, @Param('distributorId') distributorId: string) {
    // Note: The retailerId is req.user.tenantId.
    // In terms of security, any retailer can browse any distributor's public catalog,
    // but placing an order requires an active link (checked in OrdersService).
    return this.catalogService.browseForRetailer(distributorId);
  }
}
