import { Controller, Get, Patch, Req, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../security/permission-registry';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SkipTenant } from '../auth/decorators/skip-tenant.decorator';

@Controller('users')
@ModuleScope(ModuleType.CORE)
@ModulePermission('profile')
@SkipTenant()
@UseGuards(JwtAuthGuard, RolesGuard, GranularPermissionGuard)
export class UsersMeController {
  constructor(private readonly usersService: UsersService) {}

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF, UserRole.USER)
  @RequirePermission(PERMISSIONS.CORE.PROFILE.VIEW)
  @Get('me')
  async getMe(@Req() req: any) {
    return this.usersService.getMeWithTenant(req.user.sub);
  }

  @Roles(UserRole.ADMIN, UserRole.OWNER, UserRole.STAFF, UserRole.USER)
  @RequirePermission(PERMISSIONS.CORE.PROFILE.UPDATE)
  @Patch('me')
  updateMe(
    @Req() req: any,
    @Body() body: { fullName?: string; avatar?: string; phone?: string },
  ) {
    return this.usersService.updateProfile(req.user.sub, body);
  }
}
