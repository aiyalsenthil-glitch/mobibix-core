import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { BusinessCategoryService } from './business-category.service';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('platform/business-categories')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
export class BusinessCategoryController {
  constructor(
    private readonly businessCategoryService: BusinessCategoryService,
  ) {}

  // Public to authenticated users (used during onboarding)
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  async listActive() {
    return this.businessCategoryService.listActive();
  }

  // Admin APIs
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Get('all')
  async listAll() {
    return this.businessCategoryService.listAll();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Post()
  async create(
    @Body()
    data: {
      name: string;
      description?: string;
      isComingSoon?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.businessCategoryService.create(data);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body()
    data: {
      name?: string;
      description?: string;
      isComingSoon?: boolean;
      isActive?: boolean;
      sortOrder?: number;
    },
  ) {
    return this.businessCategoryService.update(id, data);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.businessCategoryService.delete(id);
  }
}
