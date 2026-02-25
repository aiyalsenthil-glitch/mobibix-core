import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

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

    // ✅ ROOT/SYSTEM OWNER BYPASS (If marked in JWT or user object)
    if (user.isSystemOwner) {
      return true;
    }

    const hasRole = requiredRoles.some((role) => {
      const roleStr = typeof role === 'string' ? role : (role as string);
      return user.role === roleStr;
    });

    if (!hasRole) {
      throw new ForbiddenException(
        `Insufficient role. Required one of: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
