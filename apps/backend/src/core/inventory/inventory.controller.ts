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
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { CreateProductDto } from './dto/create-product.dto';
import { StockInDto } from './dto/stock-in.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StockService } from '../stock/stock.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';

type ReqWithUser = { user?: { tenantId?: string } };

@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('mobileshop/inventory')
export class InventoryController {
  constructor(
    private readonly service: InventoryService,
    private readonly stockService: StockService,
  ) {}

  @Post('product')
  async createProduct(@Req() req: ReqWithUser, @Body() dto: CreateProductDto) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');
    return await this.service.createProduct(tenantId, dto);
  }

  @Patch('product/:id')
  async updateProduct(
    @Req() req: ReqWithUser,
    @Param('id') id: string,
    @Body() dto: CreateProductDto,
  ) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');
    return await this.service.updateProduct(tenantId, id, dto);
  }

  @Post('stock-in')
  async stockIn(@Req() req: ReqWithUser, @Body() dto: StockInDto) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');
    return await this.stockService.stockInSingleProduct(tenantId, dto);
  }

  @Get('low-stock')
  async getLowStock(
    @Req() req: ReqWithUser,
    @Query('threshold') threshold?: string,
  ) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');
    const parsed = threshold ? Number(threshold) : 5;
    return await this.service.getLowStock(tenantId, parsed);
  }

  @Get('stock-levels')
  async getStockLevels(
    @Req() req: ReqWithUser,
    @Query('shopId') shopId: string,
  ) {
    const tenantId: string | undefined = req.user?.tenantId;
    if (!tenantId) throw new BadRequestException('Invalid tenant');
    if (!shopId) throw new BadRequestException('shopId is required');
    return await this.service.getStockLevels(tenantId, shopId);
  }
}
