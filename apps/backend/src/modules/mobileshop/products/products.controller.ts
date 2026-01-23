import {
  Controller,
  Get,
  Query,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('mobileshop/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  async list(@Req() req, @Query('shopId') shopId: string) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    // TEMP: tenantId from request (same pattern as jobcard)
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.listByShop(tenantId, shopId);
  }
}
