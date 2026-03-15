import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType, QuotationStatus } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { QuotationsService } from './quotations.service';
import { CreateQuotationDto } from './dto/create-quotation.dto';
import { UpdateQuotationDto } from './dto/update-quotation.dto';
import { ConvertQuotationDto } from './dto/convert-quotation.dto';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@Controller('mobileshop/shops/:shopId/quotations')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('quotation')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class QuotationsController {
  constructor(private readonly quotationsService: QuotationsService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.VIEW)
  @Get()
  async list(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Query() query: any,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.listQuotations(tenantId, shopId, query);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.VIEW)
  @Get(':id')
  async getOne(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.getQuotation(tenantId, shopId, id);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.CREATE)
  @Post()
  async create(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Body() dto: CreateQuotationDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.createQuotation(tenantId, shopId, dto, req.user);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.UPDATE)
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.updateQuotation(tenantId, shopId, id, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.UPDATE)
  @Post(':id/status')
  async updateStatus(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body('status') status: QuotationStatus,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.updateStatus(tenantId, shopId, id, status);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.CONVERT)
  @Post(':id/convert')
  async convert(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
    @Body() dto: ConvertQuotationDto,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.convertQuotation(tenantId, shopId, id, dto, req.user);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.QUOTATION.DELETE)
  @Delete(':id')
  async delete(
    @Req() req: any,
    @Param('shopId') shopId: string,
    @Param('id') id: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.quotationsService.deleteQuotation(tenantId, shopId, id);
  }
}
