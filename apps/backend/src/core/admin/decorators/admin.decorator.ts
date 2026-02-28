import { SetMetadata } from '@nestjs/common';
import { AdminRole, ModuleType } from '@prisma/client';

export const ADMIN_ROLES_KEY = 'adminRoles';
export const AdminRoles = (...roles: AdminRole[]) => SetMetadata(ADMIN_ROLES_KEY, roles);

export const ADMIN_PRODUCT_KEY = 'adminProduct';
export const AdminProduct = (module: ModuleType) => SetMetadata(ADMIN_PRODUCT_KEY, module);
