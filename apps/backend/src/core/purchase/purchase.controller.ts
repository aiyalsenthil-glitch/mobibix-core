import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { PurchaseService } from './purchase.service';
import { PurchaseStockInDto } from './dto/purchase-stock-in.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('mobileshop/purchase')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class PurchaseController {
  constructor(private readonly service: PurchaseService) {}

  @Post('stock-in')
  async stockIn(@Req() req: any, @Body() dto: PurchaseStockInDto) {
    // ✅ USE TENANT FROM REQUEST CONTEXT (set by TenantRequiredGuard)
    const tenantId = req.user.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context missing');
    }
    return this.service.stockIn(tenantId, dto);
  }
}
