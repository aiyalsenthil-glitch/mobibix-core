import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';

@Injectable()
export class VirtualTenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user ?? {};
    const role = (user.role as UserRole | undefined) ?? UserRole.USER;

    if (user.tenantId) {
      return true;
    }

    const moduleType =
      req.params?.moduleType ?? req.params?.tenantId ?? req.query?.module;

    if (
      moduleType &&
      (role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN)
    ) {
      req.user = { ...user, tenantId: String(moduleType) };
      return true;
    }

    throw new ForbiddenException('TENANT_REQUIRED');
  }
}
