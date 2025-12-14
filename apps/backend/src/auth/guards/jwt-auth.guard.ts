// apps/backend/src/auth/guards/jwt-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();

    const authHeader =
      req.headers.authorization ??
      (req.headers.Authorization as string | undefined);
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    const token = authHeader.substring(7);
    try {
      const payload = this.jwtService.verify<{
        sub: string;
        tenantId?: string;
        role?: string;
      }>(token);
      const user = await this.authService.validateJwtPayload(payload);
      if (!user) return false;
      (req as Request & { user: unknown }).user = user;
      return true;
    } catch {
      return false;
    }
  }
}
