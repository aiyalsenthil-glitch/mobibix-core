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
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto, SupplierStatus } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { SupplierResponseDto } from './dto/supplier.response.dto';

@Controller('suppliers')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  /**
   * POST /api/suppliers
   * Create a new supplier
   */
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
  @Get(':id/outstanding-balance')
  async getOutstandingBalance(@Req() req: any, @Param('id') id: string) {
    const balance = await this.suppliersService.getOutstandingBalance(
      req.user.tenantId,
      id,
    );
    return { supplierId: id, outstandingBalance: balance };
  }
}
