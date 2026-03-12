import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { PermissionService } from '../permissions.service';

@Injectable()
export class GranularPermissionGuard implements CanActivate {
  private readonly logger = new Logger(GranularPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const shadowMode = false; // Phase 6: STRICT MODE ON
    const requiredPermission =
      this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      return true; // Let other guards handle base auth
    }

    // Resolve shopId
    const shopId =
      request.params?.shopId ||
      request.query?.shopId ||
      request.body?.shopId ||
      null;

    try {
      const hasPermission = await this.permissionService.hasPermission(
        user.id,
        user.tenantId,
        shopId,
        requiredPermission.module,
        requiredPermission.resource,
        requiredPermission.action,
      );

      if (!hasPermission) {
        this.logger.warn(
          `[ACCESS DENIED] User ${user.id} denied: ${requiredPermission.module}.${requiredPermission.resource}.${requiredPermission.action} at shop ${shopId || 'global'}`,
        );
        return false;
      }
    } catch (error) {
      this.logger.error(`Error in GranularPermissionGuard: ${error.message}`);
      return false;
    }

    return true;
  }
}
