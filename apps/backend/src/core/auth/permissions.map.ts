import { Permission } from './permissions.enum';
import { UserRole } from '@prisma/client';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    Permission.MEMBER_VIEW,
    Permission.MEMBER_EDIT,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_MARK,
    Permission.TENANT_MANAGE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_MANAGE,
    Permission.SALES_VIEW,
    Permission.SALES_CREATE,
    Permission.REPAIR_MANAGE,
    Permission.SHOP_MANAGE,
  ],
  OWNER: [
    Permission.MEMBER_VIEW,
    Permission.MEMBER_EDIT,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_MARK,
    Permission.TENANT_MANAGE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_MANAGE,
    Permission.SALES_VIEW,
    Permission.SALES_CREATE,
    Permission.REPAIR_MANAGE,
    Permission.SHOP_MANAGE,
  ],

  STAFF: [
    Permission.ATTENDANCE_MARK,
    Permission.ATTENDANCE_VIEW,
    Permission.MEMBER_CREATE, // ✅ ADD
    Permission.MEMBER_VIEW,
    Permission.MEMBER_EDIT,
    Permission.INVENTORY_VIEW,
    Permission.SALES_CREATE,
    Permission.SALES_VIEW,
    Permission.REPAIR_MANAGE,
    Permission.DASHBOARD_VIEW,
  ],

  ADMIN: [
    // 🔒 choose one:
    // Option 1: full access (like OWNER)
    Permission.MEMBER_VIEW,
    Permission.MEMBER_EDIT,
    Permission.ATTENDANCE_VIEW,
    Permission.ATTENDANCE_MARK,
    Permission.TENANT_MANAGE,
    Permission.INVENTORY_VIEW,
    Permission.INVENTORY_MANAGE,
    Permission.SALES_VIEW,
    Permission.SALES_CREATE,
    Permission.REPAIR_MANAGE,
    Permission.SHOP_MANAGE,

    // OR Option 2: leave empty if not used yet
    // (recommended only if ADMIN not active)
  ],
  USER: [],
  MANAGER: [],

  TECHNICIAN: [
    Permission.REPAIR_MANAGE,
    Permission.INVENTORY_VIEW,
  ],

  ACCOUNTANT: [
    Permission.SALES_VIEW,
    Permission.INVENTORY_VIEW,
  ],

  SUPERVISOR: [
    Permission.STAFF_VIEW,
    Permission.REPAIR_MANAGE,
    Permission.SALES_VIEW,
    Permission.INVENTORY_VIEW,
    Permission.SHOP_MANAGE,
  ],
};
