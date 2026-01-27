import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ShopProductsService } from './shop-products.service';
import { ShopProductLinkDto } from './dto/shop-product-link.dto';

@Controller('shop-products')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ShopProductsController {
  constructor(private readonly service: ShopProductsService) {}

  @Post('link')
  @HttpCode(HttpStatus.CREATED)
  async link(@Req() req: any, @Body() dto: ShopProductLinkDto) {
    return await this.service.linkProductToShop(
      req.user.tenantId,
      req.user.role,
      dto,
    );
  }

  @Get('catalog')
  async catalog(@Req() req: any, @Query('shopId') shopId: string) {
    return await this.service.listCatalog(req.user.tenantId, shopId);
  }
}
