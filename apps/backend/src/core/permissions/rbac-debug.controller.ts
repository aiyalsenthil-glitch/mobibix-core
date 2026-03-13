import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { PermissionService } from '../permissions/permissions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { ModuleType, UserRole } from '@prisma/client';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Security Diagnostics')
@Controller('core/rbac/debug')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, RolesGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class RbacDebugController {
  constructor(private readonly permissionService: PermissionService) {}

  @ApiOperation({ summary: 'Evaluate current user access to a resource' })
  @Get('evaluate')
  @RequirePermission(PERMISSIONS.CORE.SYSTEM.VIEW)
  async evaluate(
    @Req() req: any,
    @Query('module') module: ModuleType,
    @Query('resource') resource: string,
    @Query('action') action: string,
    @Query('shopId') shopId?: string,
  ) {
    return this.permissionService.evaluateAccess(
      req.user.userId,
      req.user.tenantId,
      module,
      resource,
      action,
      shopId,
    );
  }

  @ApiOperation({ summary: 'List all actual permissions for current user' })
  @Get('my-permissions')
  @RequirePermission(PERMISSIONS.CORE.PROFILE.VIEW)
  async getMyPermissions(@Req() req: any, @Query('shopId') shopId?: string) {
    const perms = await this.permissionService.getConsolidatedPermissions(
      req.user.userId,
      req.user.tenantId,
      shopId,
    );
    return {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      shopId: shopId || 'global',
      permissions: perms,
    };
  }
}
