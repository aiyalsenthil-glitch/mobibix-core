import { ForbiddenException } from '@nestjs/common';

export abstract class TenantScopedController {
  protected getTenantId(req: { user?: { tenantId?: string } }): string {
    const tenantId = req.user?.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('TENANT_REQUIRED');
    }
    return tenantId;
  }
}
