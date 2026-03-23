import {
  Controller, Get, Post, Put, Delete,
  Body, Param, Req, UseGuards,
} from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto, UpdateCatalogItemDto, UpdateStockDto } from './dto/catalog.dto';
import { DistributorScopeGuard } from '../guards/distributor-scope.guard';
import { SkipSubscriptionCheck } from '../../../core/auth/decorators/skip-subscription-check.decorator';
import { SkipTenant } from '../../../core/auth/decorators/skip-tenant.decorator';

@SkipTenant()
@SkipSubscriptionCheck()
@Controller('distributor/catalog')
@UseGuards(DistributorScopeGuard)
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get()
  list(@Req() req: any) {
    const { distributorId } = req.distributorContext;
    return this.catalogService.list(distributorId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateCatalogItemDto) {
    const { distributorId } = req.distributorContext;
    return this.catalogService.create(distributorId, dto);
  }

  @Put(':itemId')
  update(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: UpdateCatalogItemDto) {
    const { distributorId } = req.distributorContext;
    return this.catalogService.update(distributorId, itemId, dto);
  }

  @Delete(':itemId')
  deactivate(@Req() req: any, @Param('itemId') itemId: string) {
    const { distributorId } = req.distributorContext;
    return this.catalogService.deactivate(distributorId, itemId);
  }

  @Put(':itemId/stock')
  adjustStock(@Req() req: any, @Param('itemId') itemId: string, @Body() dto: UpdateStockDto) {
    const { distributorId } = req.distributorContext;
    return this.catalogService.adjustStock(distributorId, itemId, dto);
  }
}
