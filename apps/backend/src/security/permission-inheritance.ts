
import { ModuleType } from '@prisma/client';

export interface BasePermission {
  module: ModuleType;
  resource: string;
  action: string;
}

// Base permissions are the simplified set that users manage in the UI
export const BASE_PERMISSIONS: Record<string, string[]> = {
  'sales.manage': ['MOBILE_SHOP'],
  'sales.view': ['MOBILE_SHOP', 'CORE'],
  'inventory_base.manage': ['MOBILE_SHOP'],
  'inventory_base.view': ['MOBILE_SHOP'],
  'jobcard_base.manage': ['MOBILE_SHOP'],
  'jobcard_base.view': ['MOBILE_SHOP'],
  'purchase.manage': ['MOBILE_SHOP'],
  'purchase.view': ['MOBILE_SHOP'],
  'supplier.manage': ['MOBILE_SHOP'],
  'supplier.view': ['MOBILE_SHOP'],
  'customer.manage': ['MOBILE_SHOP', 'CORE'],
  'customer.view': ['MOBILE_SHOP', 'CORE'],
  'report.view': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'staff.manage': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'staff.view': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'settings.manage': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'membership_base.manage': ['GYM'],
  'membership_base.view': ['GYM'],
  'membership.manage': ['GYM'],
  'membership.view': ['GYM'],
  'member.manage': ['GYM'],
  'member.view': ['GYM'],
  'attendance.manage': ['GYM'],
  'attendance.view': ['GYM'],
  'payment.manage': ['GYM'],
  'payment.view': ['GYM'],
  'crm.manage': ['MOBILE_SHOP'],
  'whatsapp.manage': ['MOBILE_SHOP'],
  'ai.use': ['CORE'],
  'audit.view': ['CORE'],
  'system.manage': ['CORE'],
  'system.view': ['CORE'],
};

// Permission expansion rules
// Map a "base.action" to multiple "resource.action" pairs
export const PERMISSION_INHERITANCE: Record<string, string[]> = {
  'sales.manage': [
    'sale.create',
    'sale.update',
    'sale.delete',
    'sale.edit',
    'sale.refund',
    'sale.view',
    'sale.view_all',
    'sale.view_financial',
    'quotation.create',
    'quotation.update',
    'quotation.delete',
  ],
  'sales.view': [
    'sale.view',
    'quotation.view',
  ],
  'inventory_base.manage': [
    'inventory.create',
    'inventory.update',
    'inventory.delete',
    'inventory.adjust',
    'inventory.view',
  ],
  'inventory_base.view': [
    'inventory.view',
  ],
  'jobcard_base.manage': [
    'jobcard.create',
    'jobcard.update',
    'jobcard.delete',
    'jobcard.update_status',
    'jobcard.assign',
    'jobcard.view',
    'jobcard.view_all',
    'jobcard.add_part',
    'jobcard.remove_part',
  ],
  'jobcard_base.view': [
    'jobcard.view',
    'jobcard.view_assigned',
  ],
  'purchase.manage': [
    'purchase.create',
    'purchase.update',
    'purchase.delete',
    'purchase.view',
  ],
  'purchase.view': [
    'purchase.view',
  ],
  'supplier.manage': [
    'supplier.create',
    'supplier.update',
    'supplier.delete',
    'supplier.view',
  ],
  'supplier.view': [
    'supplier.view',
  ],
  'customer.manage': [
    'customer.create',
    'customer.update',
    'customer.delete',
    'customer.view',
  ],
  'customer.view': [
    'customer.view',
  ],
  'report.view': [
    'report.view',
    'report.sales_view',
    'report.inventory_view',
    'report.profit_view',
  ],
  'staff.manage': [
    'staff.manage',
    'staff.invite',
    'staff.view',
  ],
  'staff.view': [
    'staff.view',
  ],
  'settings.manage': [
    'settings.manage',
    'settings.view',
  ],
  'membership_base.manage': [
    'membership.create',
    'membership.renew',
    'membership.view',
    'member.create',
    'member.edit',
    'member.delete',
  ],
  'membership_base.view': [
    'membership.view',
    'member.view',
    'member.view_assigned',
  ],
  'membership.manage': [
    'membership.create',
    'membership.renew',
    'membership.view',
  ],
  'member.manage': [
    'member.create',
    'member.edit',
    'member.delete',
    'member.view',
  ],
  'attendance.manage': [
    'attendance.mark',
    'attendance.view',
  ],
  'attendance.view': [
    'attendance.view',
  ],
  'payment.manage': [
    'payment.collect',
    'payment.view',
  ],
  'payment.view': [
    'payment.view',
  ],
  'crm.manage': [
    'crm.manage_followup',
    'crm.view',
    'crm.view_timeline',
  ],
  'whatsapp.manage': [
    'whatsapp.template_manage',
    'whatsapp.automation_manage',
    'whatsapp.settings_manage',
    'whatsapp.view_dashboard',
    'whatsapp.send',
  ],
  'system.manage': [
    'system.manage',
    'system.view',
    'tenant.manage',
    'tenant.view',
  ],
  'system.view': [
    'system.view',
    'tenant.view',
  ],
};
