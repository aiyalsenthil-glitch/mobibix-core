
import { ModuleType } from '@prisma/client';

export interface BasePermission {
  module: ModuleType;
  resource: string;
  action: string;
}

// Base permissions are the simplified set that users manage in the UI
export const BASE_PERMISSIONS: Record<string, string[]> = {
  'mobile_shop.sale.manage': ['MOBILE_SHOP'],
  'mobile_shop.sale.view': ['MOBILE_SHOP', 'CORE'],
  'mobile_shop.inventory.manage': ['MOBILE_SHOP'],
  'mobile_shop.inventory.view': ['MOBILE_SHOP'],
  'mobile_shop.jobcard.manage': ['MOBILE_SHOP'],
  'mobile_shop.jobcard.view': ['MOBILE_SHOP'],
  'mobile_shop.purchase.manage': ['MOBILE_SHOP'],
  'mobile_shop.purchase.view': ['MOBILE_SHOP'],
  'mobile_shop.supplier.manage': ['MOBILE_SHOP'],
  'mobile_shop.supplier.view': ['MOBILE_SHOP'],
  'mobile_shop.customer.manage': ['MOBILE_SHOP', 'CORE'],
  'mobile_shop.customer.view': ['MOBILE_SHOP', 'CORE'],
  'core.report.view': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'core.staff.manage': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'core.staff.view': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'core.settings.manage': ['MOBILE_SHOP', 'CORE', 'GYM'],
  'gym.membership_base.manage': ['GYM'],
  'gym.membership_base.view': ['GYM'],
  'gym.membership.manage': ['GYM'],
  'gym.membership.view': ['GYM'],
  'gym.member.manage': ['GYM'],
  'gym.member.view': ['GYM'],
  'gym.attendance.manage': ['GYM'],
  'gym.attendance.view': ['GYM'],
  'gym.payment.manage': ['GYM'],
  'gym.payment.view': ['GYM'],
  'mobile_shop.crm.manage': ['MOBILE_SHOP'],
  'mobile_shop.whatsapp.manage': ['MOBILE_SHOP'],
  'core.ai.use': ['CORE'],
  'core.audit.view': ['CORE'],
  'core.system.manage': ['CORE'],
  'core.system.view': ['CORE'],
  'core.admin.manage': ['CORE'],
  'core.dashboard.view': ['CORE', 'MOBILE_SHOP', 'GYM'],
  'core.profile.view': ['CORE', 'MOBILE_SHOP', 'GYM'],
  'core.notification.view': ['CORE', 'MOBILE_SHOP', 'GYM'],
  'core.billing.manage': ['CORE'],
  'core.billing.view': ['CORE'],
  'mobile_shop.shop.manage': ['MOBILE_SHOP'],
  'mobile_shop.shop.view': ['MOBILE_SHOP'],
  'mobile_shop.ledger.manage': ['MOBILE_SHOP'],
  'mobile_shop.receipt.manage': ['MOBILE_SHOP'],
  'mobile_shop.receipt.view': ['MOBILE_SHOP'],
  'mobile_shop.voucher.manage': ['MOBILE_SHOP', 'CORE'],
  'mobile_shop.voucher.view': ['MOBILE_SHOP', 'CORE'],
  'mobile_shop.compatibility.manage': ['MOBILE_SHOP'],
  'mobile_shop.compatibility.view': ['MOBILE_SHOP'],
};

// Permission expansion rules
// Map a "base.action" to multiple "resource.action" pairs
export const PERMISSION_INHERITANCE: Record<string, string[]> = {
  'mobile_shop.sale.manage': [
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
    'receipt.create',
    'receipt.view',
    'receipt.cancel',
  ],
  'mobile_shop.sale.view': [
    'sale.view',
    'quotation.view',
  ],
  'mobile_shop.inventory.manage': [
    'inventory.create',
    'inventory.update',
    'inventory.delete',
    'inventory.adjust',
    'inventory.view',
  ],
  'mobile_shop.inventory.view': [
    'inventory.view',
  ],
  'mobile_shop.jobcard.manage': [
    'jobcard.create',
    'jobcard.update',
    'jobcard.delete',
    'jobcard.update_status',
    'jobcard.assign',
    'jobcard.view',
    'jobcard.view_all',
    'jobcard.add_part',
    'jobcard.remove_part',
    'repair.bill',
    'repair.stock_out',
  ],
  'mobile_shop.jobcard.view': [
    'jobcard.view',
    'jobcard.view_assigned',
  ],
  'mobile_shop.purchase.manage': [
    'purchase.create',
    'purchase.update',
    'purchase.delete',
    'purchase.view',
  ],
  'mobile_shop.purchase.view': [
    'purchase.view',
  ],
  'mobile_shop.supplier.manage': [
    'supplier.create',
    'supplier.update',
    'supplier.delete',
    'supplier.view',
  ],
  'mobile_shop.supplier.view': [
    'supplier.view',
  ],
  'mobile_shop.customer.manage': [
    'customer.create',
    'customer.update',
    'customer.delete',
    'customer.view',
  ],
  'mobile_shop.customer.view': [
    'customer.view',
  ],
  'core.report.view': [
    'core.report.view',
    'core.report.sale.view',
    'core.report.inventory.view',
    'core.report.profit.view',
  ],
  'core.staff.manage': [
    'staff.manage',
    'staff.invite',
    'staff.view',
  ],
  'core.staff.view': [
    'staff.view',
    'dashboard.view',
    'notification.view',
    'profile.view',
  ],
  'core.dashboard.view': [
    'dashboard.view',
  ],
  'core.profile.view': [
    'profile.view',
  ],
  'core.notification.view': [
    'notification.view',
  ],
  'core.settings.manage': [
    'settings.manage',
    'settings.view',
  ],
  'gym.membership_base.manage': [
    'membership.create',
    'membership.renew',
    'membership.view',
    'member.create',
    'member.edit',
    'member.delete',
  ],
  'gym.membership_base.view': [
    'membership.view',
    'member.view',
    'member.view_assigned',
  ],
  'gym.membership.manage': [
    'membership.create',
    'membership.renew',
    'membership.view',
  ],
  'gym.member.manage': [
    'member.create',
    'member.edit',
    'member.delete',
    'member.view',
  ],
  'gym.attendance.manage': [
    'attendance.mark',
    'attendance.view',
  ],
  'gym.attendance.view': [
    'attendance.view',
  ],
  'gym.payment.manage': [
    'payment.collect',
    'payment.view',
  ],
  'gym.payment.view': [
    'payment.view',
  ],
  'mobile_shop.crm.manage': [
    'crm.manage',
    'crm.view',
    'crm.manage_followup',
    'crm.view_timeline',
  ],
  'mobile_shop.receipt.manage': [
    'receipt.create',
    'receipt.view',
    'receipt.cancel',
  ],
  'mobile_shop.receipt.view': [
    'receipt.view',
  ],
  'mobile_shop.voucher.manage': [
    'voucher.create',
    'voucher.view',
    'voucher.cancel',
  ],
  'mobile_shop.voucher.view': [
    'voucher.view',
  ],
  'mobile_shop.whatsapp.manage': [
    'whatsapp.template_manage',
    'whatsapp.automation_manage',
    'whatsapp.settings_manage',
    'whatsapp.view_dashboard',
    'whatsapp.send',
  ],
  'core.system.manage': [
    'system.manage',
    'system.view',
    'tenant.manage',
    'tenant.view',
  ],
  'core.system.view': [
    'system.view',
    'tenant.view',
  ],
  'core.admin.manage': [
     'system.view',
     'system.manage',
     'settings.manage',
     'staff.manage',
     'report.view'
  ],
  'core.billing.manage': [
    'billing.manage',
    'billing.view',
  ],
  'core.billing.view': [
    'billing.view',
  ],
  'mobile_shop.shop.manage': [
    'shop.manage',
    'shop.view',
  ],
  'mobile_shop.shop.view': [
    'shop.view',
  ],
  'mobile_shop.ledger.manage': [
    'ledger.view',
    'ledger.collect',
    'ledger.manage',
    'voucher.create',
    'voucher.view',
    'voucher.cancel',
  ],
  'mobile_shop.compatibility.manage': [
    'compatibility.view',
    'compatibility.manage',
    'compatibility.autocomplete',
  ],
  'mobile_shop.compatibility.view': [
    'compatibility.view',
    'compatibility.autocomplete',
  ],
};
