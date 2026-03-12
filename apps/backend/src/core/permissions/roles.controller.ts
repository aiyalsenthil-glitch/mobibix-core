import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { PermissionService } from './permissions.service';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from './decorators/require-permission.decorator';
import { GranularPermissionGuard } from './guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('permissions/roles')
@ModuleScope(ModuleType.CORE)
@ModulePermission('system')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER)
export class RolesController {
  constructor(private readonly permissionService: PermissionService) {}
  
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('templates')
  async listTemplates() {
    return this.permissionService.listRoleTemplates();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('modules')
  async listModules() {
    return this.permissionService.listModules();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get('matrix')
  async getMatrix() {
    return this.permissionService.getPermissionMatrix();
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get()
  async list(@Req() req: any) {
    return this.permissionService.listRoles(req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  @Get(':id')
  async get(@Req() req: any, @Param('id') id: string) {
    const role = await this.permissionService.getRoleById(
      id,
      req.user.tenantId,
    );
    const permissions = await this.permissionService.getRolePermissions(id);
    return { ...role, permissions };
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Post()
  async create(
    @Req() req: any,
    @Body() data: { name: string; description: string; permissions: string[] },
  ) {
    return this.permissionService.createRole(
      req.user.tenantId,
      data.name,
      data.description,
      data.permissions,
    );
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Patch(':id')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    data: { name?: string; description?: string; permissions?: string[] },
  ) {
    return this.permissionService.updateRole(id, req.user.tenantId, data);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Delete(':id')
  async delete(@Req() req: any, @Param('id') id: string) {
    return this.permissionService.deleteRole(id, req.user.tenantId);
  }

  @RequirePermission(PERMISSIONS.CORE.SYSTEM.MANAGE)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('seed')
  async seed() {
    return this.permissionService.seedPermissions();
  }
}
