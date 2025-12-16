// apps/backend/src/auth/guards/jwt-auth.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from '../auth.service';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();

    const authHeader =
      req.headers.authorization ??
      (req.headers.Authorization as string | undefined);

    // If the route does not require roles (public route), allow requests without auth header.
    const requiredRoles = this.reflector.getAllAndOverride<
      string[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (requiredRoles && requiredRoles.length > 0) {
        new Logger('JwtAuthGuard').debug(
          'Missing Authorization header for role-protected route',
        );
        return false;
      }
      return true;
    }

    const token = authHeader.substring(7);
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        tenantId?: string;
        role?: string;
      }>(token);
      new Logger('JwtAuthGuard').debug(
        `Decoded payload: ${JSON.stringify(payload)}`,
      );
      const user = await this.authService.validateJwtPayload(payload);
      new Logger('JwtAuthGuard').debug(
        `Loaded user from payload.sub: ${user ? JSON.stringify({ id: user.id, role: user.role, tenantId: user.tenantId }) : 'null'}`,
      );
      if (!user) {
        if (requiredRoles && requiredRoles.length > 0) {
          new Logger('JwtAuthGuard').debug(
            'Payload valid but user not found; denying access',
          );
          return false;
        }
        return true;
      }
      (req as Request & { user: unknown }).user = user;
      return true;
    } catch {
      new Logger('JwtAuthGuard').debug('Token verification failed');
      if (requiredRoles && requiredRoles.length > 0) return false;
      return true;
    }
  }
}
