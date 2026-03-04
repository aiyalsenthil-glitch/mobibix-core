import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../auth/guards/tenant.guard';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permission } from '../auth/permissions.enum';
import { UserRole } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
@Roles(UserRole.OWNER, UserRole.STAFF)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 🔒 SECURITY FIX: Restricted to OWNER only via STAFF_MANAGE permission.
  // STAFF do NOT have STAFF_MANAGE in permissions.map.ts, so they are blocked.
  // Prevents a STAFF member from enumerating OWNER contact details.
  @UseGuards(PermissionsGuard)
  @Permissions(Permission.STAFF_MANAGE)
  @Get()
  async list(@Req() req: any) {
    return this.usersService.findByTenant(req.user.tenantId);
  }
}
