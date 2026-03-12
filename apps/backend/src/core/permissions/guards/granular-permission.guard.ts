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
  MODULE_PERMISSION_KEY,
  RequiredPermission,
} from '../decorators/require-permission.decorator';
import { PermissionService } from '../permissions.service';
import { ForbiddenException } from '@nestjs/common';
import { ModuleType } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../../../core/auth/decorators/public.decorator';

@Injectable()
export class GranularPermissionGuard implements CanActivate {
  private readonly logger = new Logger(GranularPermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(forwardRef(() => PermissionService))
    private readonly permissionService: PermissionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    let requiredPermission =
      this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

    // Fallback to ModulePermission defaults if no explicit RequirePermission
    if (!requiredPermission) {
      const moduleName = this.reflector.getAllAndOverride<string>(MODULE_PERMISSION_KEY, [
        context.getHandler(),
        context.getClass(),
      ]);

      if (moduleName) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        let action = 'view';
        if (method === 'POST') action = 'create';
        else if (method === 'PATCH' || method === 'PUT') action = 'update';
        else if (method === 'DELETE') action = 'delete';

        // We assume the moduleName provided in ModulePermission follows a convention
        // or we need a way to map it to ModuleType.
        // For simplicity, let's assume if it starts with 'mobile_' it's MOBILE_SHOP, etc.
        // BUT better to just use the ModuleType in ModulePermission decorator if possible.
        // The prompt said @ModulePermission('sales'), which is a resource name.
        
        // Let's refine the logic: ModulePermission specifies the resource, 
        // and we need the ModuleType. We can try to get ModuleScope.
        const moduleType = this.reflector.getAllAndOverride<ModuleType>('moduleScope', [
          context.getClass(),
          context.getHandler(),
        ]) || ModuleType.CORE;

        requiredPermission = {
          module: moduleType,
          resource: moduleName,
          action: action,
        };
      }
    }

    if (!requiredPermission) {
      throw new ForbiddenException(
        'Endpoint missing RBAC permission configuration',
      );
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
