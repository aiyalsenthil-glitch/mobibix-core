import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
  Param,
  Patch,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';
import { UpdateShopDto } from './dto/update-shop.dto';

@Controller('mobileshop/shops')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  list(@Req() req: any) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.shopService.listShops(req.user.tenantId);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateShopDto) {
    return this.shopService.createShop(req.user.tenantId, req.user.role, dto);
  }
  @Get(':shopId')
  getOne(@Req() req: any, @Param('shopId') shopId: string) {
    if (!req.user.tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }

    return this.shopService.getShopById(req.user.tenantId, shopId);
  }
  @Patch(':shopId')
  update(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Body() dto: UpdateShopDto,
  ) {
    return this.shopService.updateShop(
      req.user.tenantId,
      req.user.role,
      shopId,
      dto,
    );
  }
}
