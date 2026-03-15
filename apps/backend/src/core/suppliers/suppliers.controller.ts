import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, SupplierStatus } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier.response.dto';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('suppliers')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * POST /api/suppliers
   * Create a new supplier
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.CREATE)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Req() req: any,
    @Body() dto: CreateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.create(req.user.tenantId, dto);
  }

  /**
   * GET /api/suppliers
   * List all suppliers with pagination and search
   * Query params:
   * - skip?: number (default 0)
   * - take?: number (default 50, max 100)
   * - search?: string (search in name, email, phone, gstin)
   * - status?: ACTIVE | INACTIVE | BLACKLISTED
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.VIEW)
  @Get()
  async findAll(
    @Req() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('search') search?: string,
    @Query('status') status?: SupplierStatus,
  ) {
    const skipNum = skip ? Math.max(0, parseInt(skip, 10)) : 0;
    const takeNum = take ? Math.min(100, parseInt(take, 10)) : 50;

    return this.suppliersService.findAll(req.user.tenantId, {
      skip: skipNum,
      take: takeNum,
      search,
      status,
    });
  }

  /**
   * GET /api/suppliers/:id
   * Get supplier details by ID
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.VIEW)
  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.findOne(req.user.tenantId, id);
  }

  /**
   * PATCH /api/suppliers/:id
   * Update supplier details
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.CREATE)
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSupplierDto,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.update(req.user.tenantId, id, dto);
  }

  /**
   * DELETE /api/suppliers/:id
   * Soft delete supplier (mark as INACTIVE)
   * Fails if supplier has active purchases
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.CREATE) // Supplier deletion/deactivation is a manage action
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<SupplierResponseDto> {
    return this.suppliersService.remove(req.user.tenantId, id);
  }

  /**
   * GET /api/suppliers/:id/outstanding-balance
   * Get supplier's outstanding payment amount
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.VIEW)
  @Get(':id/outstanding-balance')
  async getOutstandingBalance(@Req() req: any, @Param('id') id: string) {
    const balance = await this.suppliersService.getOutstandingBalance(
      req.user.tenantId,
      id,
    );
    return { supplierId: id, outstandingBalance: balance };
  }

  /**
   * GET /api/suppliers/check-gstin
   * Check if GSTIN is duplicate
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.VIEW)
  @Get('check-gstin')
  async checkGstin(
    @Req() req: any,
    @Query('gstin') gstin: string,
    @Query('excludeId') excludeId?: string,
  ) {
    const isDuplicate = await this.suppliersService.checkGstinDuplicate(
      req.user.tenantId,
      gstin,
      excludeId,
    );
    return { gstin, isDuplicate };
  }

  /**
   * GET /api/suppliers/:id/transactions
   * Get recent transactions for a supplier
   */
  @RequirePermission(PERMISSIONS.MOBILE_SHOP.SUPPLIER.VIEW)
  @Get(':id/transactions')
  async getTransactions(@Req() req: any, @Param('id') id: string) {
    return this.suppliersService.getTransactions(req.user.tenantId, id);
  }
}
