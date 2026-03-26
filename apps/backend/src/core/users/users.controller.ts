import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { ModulePermission, RequirePermission } from '../permissions/decorators/require-permission.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { PERMISSIONS } from '../../security/permission-registry';

@Controller('users')
@ModuleScope(ModuleType.CORE)
@ModulePermission('core')
@UseGuards(JwtAuthGuard, TenantRequiredGuard, GranularPermissionGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🔒 SECURITY FIX: Restricted to OWNER only via STAFF_MANAGE permission.
  // STAFF do NOT have STAFF_MANAGE in permissions.map.ts, so they are blocked.
  // Prevents a STAFF member from enumerating OWNER contact details.
  @RequirePermission(PERMISSIONS.CORE.STAFF.VIEW)
  @Get()
  async list(@Req() req: any) {
    return this.usersService.findByTenant(req.user.tenantId);
  }

  /**
   * Register / update FCM push notification token for the authenticated user.
   * Called by the Android app on every login when a pending FCM token is stored.
   */
  @Post('fcm-token')
  async registerFcmToken(@Req() req: any, @Body() body: { token: string }) {
    await this.usersService.saveFcmToken(req.user.userId, body.token);
    return { success: true };
  }
}
