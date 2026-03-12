import { SetMetadata } from '@nestjs/common';
import { ModuleType } from '@prisma/client';

export interface RequiredPermission {
  module: ModuleType;
  resource: string;
  action: string;
}

export const PERMISSION_KEY = 'permissions';
export const MODULE_PERMISSION_KEY = 'module_permission';

/**
 * Decorator to require a granular permission.
 * Can be used with a Permission object from the registry or with individual components.
 */
export function RequirePermission(permission: { module: ModuleType; resource: string; action: string }): any;
export function RequirePermission(module: ModuleType, resource: string, action: string): any;
export function RequirePermission(
  moduleOrPermission: ModuleType | { module: ModuleType; resource: string; action: string },
  resource?: string,
  action?: string,
) {
  if (typeof moduleOrPermission === 'object') {
    return SetMetadata(PERMISSION_KEY, moduleOrPermission);
  }
  return SetMetadata(PERMISSION_KEY, { module: moduleOrPermission, resource, action });
}

/**
 * Decorator to specify a module-level permission for a controller.
 */
export const ModulePermission = (moduleName: string) => SetMetadata(MODULE_PERMISSION_KEY, moduleName);
