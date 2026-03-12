import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { StockInDto } from './dto/stock-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockService } from '../stock/stock.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';

type ReqWithUser = { user: { tenantId: string } };

@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@ModuleScope(ModuleType.MOBILE_SHOP)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('mobileshop/inventory')
export class InventoryController {
  constructor(
    private readonly service: InventoryService,
    private readonly stockService: StockService,
  ) {}

  @Post('product')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'inventory', 'create')
  async createProduct(@Req() req: ReqWithUser, @Body() dto: CreateProductDto) {
    const tenantId = req.user.tenantId;
    return await this.service.createProduct(tenantId, dto);
  }

  @Patch('product/:id')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'inventory', 'edit')
  async updateProduct(
    @Req() req: ReqWithUser,
    @Param('id') id: string,
    @Body() dto: CreateProductDto,
  ) {
    const tenantId = req.user.tenantId;
    return await this.service.updateProduct(tenantId, id, dto);
  }

  @Post('stock-in')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'inventory', 'adjust')
  async stockIn(@Req() req: ReqWithUser, @Body() dto: StockInDto) {
    const tenantId = req.user.tenantId;
    return await this.stockService.stockInSingleProduct(tenantId, dto);
  }

  @Get('low-stock')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'inventory', 'view')
  async getLowStock(
    @Req() req: ReqWithUser,
    @Query('threshold') threshold?: string,
  ) {
    const tenantId = req.user.tenantId;
    const parsed = threshold ? Number(threshold) : 5;
    return await this.service.getLowStock(tenantId, parsed);
  }

  @Get('stock-levels')
  @RequirePermission(ModuleType.MOBILE_SHOP, 'inventory', 'view')
  async getStockLevels(
    @Req() req: ReqWithUser,
    @Query('shopId') shopId: string,
  ) {
    const tenantId = req.user.tenantId;
    if (!shopId) throw new BadRequestException('shopId is required');
    return await this.service.getStockLevels(tenantId, shopId);
  }
}
