import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { Permission } from '../permissions.enum';
import { UserRole } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../permissions.map';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions required → allow
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.role) {
      throw new ForbiddenException('No user role found');
    }

    // 🔥 OWNER ALWAYS ALLOWED
    if (user.role === UserRole.OWNER) {
      return true;
    }

    // ✅ GET PERMISSIONS FROM ROLE MAP
    const roleKey = user.role?.toUpperCase?.() as UserRole;
    const rolePermissions = ROLE_PERMISSIONS[roleKey] ?? [];

    const hasPermission = requiredPermissions.every((permission) =>
      rolePermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to perform this action',
      );
    }

    return true;
  }
}
