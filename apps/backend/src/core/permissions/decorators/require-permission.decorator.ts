import { SetMetadata } from '@nestjs/common';
import { ModuleType } from '@prisma/client';

export interface RequiredPermission {
  module: ModuleType;
  resource: string;
  action: string;
}

export const PERMISSION_KEY = 'permissions';
export const RequirePermission = (module: ModuleType, resource: string, action: string) =>
  SetMetadata(PERMISSION_KEY, { module, resource, action });
