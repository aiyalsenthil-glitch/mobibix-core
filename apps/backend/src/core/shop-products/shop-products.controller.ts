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
import { Roles } from '../auth/decorators/roles.decorator';
import { ShopProductsService } from './shop-products.service';
import { ShopProductLinkDto } from './dto/shop-product-link.dto';
import { UserRole } from '@prisma/client';

@Controller('shop-products')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
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
  async catalog(
    @Req() req: any,
    @Query('shopId') shopId: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
  ) {
    return await this.service.listCatalog(req.user.tenantId, shopId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      search,
    });
  }
}
