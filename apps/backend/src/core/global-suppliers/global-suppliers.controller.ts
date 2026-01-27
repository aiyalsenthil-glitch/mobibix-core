import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { GlobalSuppliersService } from './global-suppliers.service';
import { CreateGlobalSupplierDto } from './dto/create-global-supplier.dto';
import { LinkGlobalSupplierDto } from './dto/link-global-supplier.dto';
import { SearchGlobalSuppliersDto } from './dto/search-global-suppliers.dto';

@Controller('global-suppliers')
export class GlobalSuppliersController {
  constructor(
    private readonly globalSuppliersService: GlobalSuppliersService,
  ) {}

  /**
   * POST /api/global-suppliers
   * Create a new global supplier (admin only)
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Req() req: any, @Body() dto: CreateGlobalSupplierDto) {
    return await this.globalSuppliersService.create(dto, req.user?.id);
  }

  /**
   * GET /api/global-suppliers
   * List all global suppliers with search
   */
  @Get()
  async findAll(@Query() query: SearchGlobalSuppliersDto) {
    return await this.globalSuppliersService.findAll(query);
  }

  /**
   * GET /api/global-suppliers/:id
   * Get global supplier details
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return await this.globalSuppliersService.findOne(id);
  }

  /**
   * PATCH /api/global-suppliers/:id
   * Update global supplier (admin only)
   */
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateGlobalSupplierDto>,
  ) {
    return await this.globalSuppliersService.update(id, dto, req.user?.id);
  }

  /**
   * DELETE /api/global-suppliers/:id
   * Delete global supplier (admin only)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id') id: string) {
    return await this.globalSuppliersService.delete(id);
  }

  /**
   * POST /api/global-suppliers/:id/link
   * Link a global supplier to tenant
   */
  @Post(':id/link')
  @UseGuards(JwtAuthGuard, TenantRequiredGuard)
  @HttpCode(HttpStatus.CREATED)
  async linkToTenant(
    @Req() req: any,
    @Param('id') globalSupplierId: string,
    @Body() dto: LinkGlobalSupplierDto,
  ) {
    return await this.globalSuppliersService.linkToTenant(
      req.user.tenantId,
      globalSupplierId,
      dto,
      req.user.id,
    );
  }

  /**
   * GET /api/global-suppliers/tenant/:tenantId
   * Get suppliers linked to tenant
   */
  @Get('tenant/:tenantId')
  @UseGuards(JwtAuthGuard, TenantRequiredGuard)
  async getLinkedSuppliers(
    @Param('tenantId') tenantId: string,
    @Query() query: { skip?: string; take?: string },
  ) {
    const skip = query.skip ? parseInt(query.skip) : 0;
    const take = query.take ? Math.min(parseInt(query.take), 100) : 50;

    return await this.globalSuppliersService.getLinkedSuppliers(
      tenantId,
      skip,
      take,
    );
  }

  /**
   * DELETE /api/global-suppliers/:id/unlink/:tenantId
   * Unlink global supplier from tenant
   */
  @Delete(':id/unlink/:tenantId')
  @UseGuards(JwtAuthGuard, TenantRequiredGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async unlinkFromTenant(
    @Param('id') globalSupplierId: string,
    @Param('tenantId') tenantId: string,
  ) {
    return await this.globalSuppliersService.unlinkFromTenant(
      tenantId,
      globalSupplierId,
    );
  }
}
