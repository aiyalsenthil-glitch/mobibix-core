import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { GRNService } from './grn.service';
import { CreateGRNDto } from './dto/grn/create-grn.dto';
import { GRNResponseDto } from './dto/grn/grn.response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('grns')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('inventory')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class GRNController {
  constructor(private readonly grnService: GRNService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post()
  @HttpCode(201)
  async create(
    @Req() req: any,
    @Body() dto: CreateGRNDto,
  ): Promise<GRNResponseDto> {
    return this.grnService.create(req.user.tenantId, dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get()
  async findAll(@Req() req: any, @Query('shopId') shopId?: string) {
    return this.grnService.findAll(req.user.tenantId, shopId);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.VIEW)
  @Get(':id')
  async findOne(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<GRNResponseDto> {
    return this.grnService.findOne(req.user.tenantId, id);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.PURCHASE.CREATE)
  @Post(':id/confirm')
  @HttpCode(200)
  async confirm(
    @Req() req: any,
    @Param('id') id: string,
  ): Promise<GRNResponseDto> {
    return this.grnService.confirm(req.user.tenantId, id, {
      id: req.user.sub,
      role: req.user.role,
    });
  }
}
