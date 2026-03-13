import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '@prisma/client';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // ✅ Allow public routes immediately
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles specified, allow
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      throw new ForbiddenException('User role not found');
    }

    // 📊 ROLE HIERARCHY
    // Define power levels: higher numbers = more authority
    const ROLE_LEVELS: Record<string, number> = {
      [UserRole.USER]: 10,
      [UserRole.STAFF]: 50,
      [UserRole.TECHNICIAN]: 50, // Technician is a specialized staff
      [UserRole.ACCOUNTANT]: 60, // Accountant > standard staff
      [UserRole.MANAGER]: 70,    // Manager > Accountant/Staff
      [UserRole.OWNER]: 80,      // Owner > Manager
      [UserRole.ADMIN]: 90,      // System Admin
      [UserRole.SUPER_ADMIN]: 100, // Root Admin
    };

    const userRole = user.role as string;
    const userLevel = ROLE_LEVELS[userRole] || 0;

    // Check if user has exact role OR a higher level role than ANY required role
    const hasRole = requiredRoles.some((role) => {
      const roleStr = typeof role === 'string' ? role : (role as string);
      
      // Exact match always wins
      if (userRole === roleStr) return true;

      // Hierarchy match: if a route requires 'STAFF', any Level >= 50 (MANAGER/OWNER) should pass
      const requiredLevel = ROLE_LEVELS[roleStr] || 999; // Default to extremely high if role not in hierarchy
      return userLevel >= requiredLevel;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient role. Required level for: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
