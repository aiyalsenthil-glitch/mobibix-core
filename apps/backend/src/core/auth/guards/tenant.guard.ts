import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

export class TenantRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }

    return true;
  }
}
