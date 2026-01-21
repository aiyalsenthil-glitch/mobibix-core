import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { ShopService } from './shop.service';
import { CreateShopDto } from './dto/create-shop.dto';

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
}
