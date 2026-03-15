import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { StockCorrectionService } from './stock-correction.service';
import { StockCorrectionDto } from './dto/stock-correction.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

type ReqWithUser = { user: { tenantId: string; sub?: string } };

@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@Controller('mobileshop/stock')
export class StockCorrectionController {
  constructor(private readonly service: StockCorrectionService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.INVENTORY.ADJUST)
  @Post('correct')
  async correct(@Req() req: ReqWithUser, @Body() dto: StockCorrectionDto) {
    return this.service.correctStock(req.user.tenantId, req.user?.sub, dto);
  }
}
