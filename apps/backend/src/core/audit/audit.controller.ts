import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { AuditService } from './audit.service';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { RequirePermission, ModulePermission } from '../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';

@Controller('audit')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, RolesGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @RequirePermission(PERMISSIONS.CORE.AUDIT.VIEW)
  @Get()
  async getTenantAuditLogs(@Req() req: any, @Query('limit') limitStr?: string) {
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    return this.auditService.getTenantLogs(req.user.tenantId, limit);
  }
}
