import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CompatibilityService } from './compatibility.service';
import { CreatePhoneModelDto, SmartLinkModelsDto } from './dto/compatibility.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
// Note: We use the business level guards if available, but for now we follow the user's request for Admin Master tool.
// In actual prod, we would use AdminRolesGuard.

import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { ModuleType } from '@prisma/client';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@ApiTags('Compatibility Admin')
@ApiBearerAuth()
@Controller('admin/compatibility')
@ModuleScope(ModuleType.MOBILE_SHOP)
@ModulePermission('compatibility')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
export class CompatibilityAdminController {
  constructor(private readonly compatibilityService: CompatibilityService) {}

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.VIEW)
  @Get('stats')
  @ApiOperation({ summary: 'Get global compatibility engine stats' })
  async getStats() {
    return this.compatibilityService.getAdminStats();
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.MANAGE)
  @Post('models')
  @ApiOperation({ summary: 'Create a new phone model' })
  async createModel(@Body() dto: CreatePhoneModelDto) {
    return this.compatibilityService.createPhoneModel(dto);
  }

  @RequirePermission(PERMISSIONS.MOBILE_SHOP.COMPATIBILITY.MANAGE)
  @Post('link-smart')
  @ApiOperation({ summary: 'Link two models across multiple part categories (Smart Linker)' })
  async smartLink(@Body() dto: SmartLinkModelsDto) {
    return this.compatibilityService.smartLinkModels(dto);
  }
}
