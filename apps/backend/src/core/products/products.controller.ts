import {
  Controller,
  Get,
  Query,
  Req,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('mobileshop/products')
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  async list(
    @Req() req,
    @Query('shopId') shopId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }

    // TEMP: tenantId from request (same pattern as jobcard)
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }

    return this.service.listByShop(tenantId, shopId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  async getOne(
    @Req() req,
    @Param('id') id: string,
    @Query('shopId') shopId: string,
  ) {
    if (!shopId) {
      throw new BadRequestException('shopId is required');
    }
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new BadRequestException('Invalid tenant');
    }
    return this.service.findOne(tenantId, shopId, id);
  }
}
