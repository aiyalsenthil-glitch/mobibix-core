
import { ModuleType } from '@prisma/client';

export interface Permission {
  module: ModuleType;
  resource: string;
  action: string;
}

export const PERMISSIONS = {
  CORE: {
    DASHBOARD: {
      VIEW: { module: ModuleType.CORE, resource: 'dashboard', action: 'view' } as Permission,
    },
    STAFF: {
      MANAGE: { module: ModuleType.CORE, resource: 'staff', action: 'manage' } as Permission,
      VIEW: { module: ModuleType.CORE, resource: 'staff', action: 'view' } as Permission,
      INVITE: { module: ModuleType.CORE, resource: 'staff', action: 'invite' } as Permission,
    },
    SETTINGS: {
      MANAGE: { module: ModuleType.CORE, resource: 'settings', action: 'manage' } as Permission,
      VIEW: { module: ModuleType.CORE, resource: 'settings', action: 'view' } as Permission,
    },
    REPORT: {
      VIEW: { module: ModuleType.CORE, resource: 'report', action: 'view' } as Permission,
      EXPORT: { module: ModuleType.CORE, resource: 'report', action: 'export' } as Permission,
      SALES_VIEW: { module: ModuleType.CORE, resource: 'report.sale', action: 'view' } as Permission,
      INVENTORY_VIEW: { module: ModuleType.CORE, resource: 'report.inventory', action: 'view' } as Permission,
      PROFIT_VIEW: { module: ModuleType.CORE, resource: 'report.profit', action: 'view' } as Permission,
    },
    EXPENSE: {
      CREATE: { module: ModuleType.CORE, resource: 'expense', action: 'create' } as Permission,
      VIEW: { module: ModuleType.CORE, resource: 'expense', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'expense', action: 'manage' } as Permission,
    },
    MONTHLY_REPORT: {
      VIEW: { module: ModuleType.CORE, resource: 'monthly_report', action: 'view' } as Permission,
    },
    SHRINKAGE: {
      VIEW: { module: ModuleType.CORE, resource: 'shrinkage', action: 'view' } as Permission,
    },
    SYSTEM: {
      VIEW: { module: ModuleType.CORE, resource: 'system', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'system', action: 'manage' } as Permission,
    },
    TENANT: {
      VIEW: { module: ModuleType.CORE, resource: 'tenant', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'tenant', action: 'manage' } as Permission,
    },
    PROFILE: {
      VIEW: { module: ModuleType.CORE, resource: 'profile', action: 'view' } as Permission,
      UPDATE: { module: ModuleType.CORE, resource: 'profile', action: 'update' } as Permission,
    },
    PARTNER: {
      APPLY: { module: ModuleType.CORE, resource: 'partner', action: 'apply' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'partner', action: 'manage' } as Permission,
      VIEW: { module: ModuleType.CORE, resource: 'partner', action: 'view' } as Permission,
    },
    AI: {
      USE: { module: ModuleType.CORE, resource: 'ai', action: 'use' } as Permission,
    },
    AUDIT: {
      VIEW: { module: ModuleType.CORE, resource: 'audit', action: 'view' } as Permission,
    },
    BILLING: {
      VIEW: { module: ModuleType.CORE, resource: 'billing', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'billing', action: 'manage' } as Permission,
    },
    CUSTOMER: {
      VIEW: { module: ModuleType.CORE, resource: 'customer', action: 'view' } as Permission,
      CREATE: { module: ModuleType.CORE, resource: 'customer', action: 'create' } as Permission,
      UPDATE: { module: ModuleType.CORE, resource: 'customer', action: 'update' } as Permission,
      DELETE: { module: ModuleType.CORE, resource: 'customer', action: 'delete' } as Permission,
    },
    APPROVAL: {
      VIEW: { module: ModuleType.CORE, resource: 'approval', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'approval', action: 'manage' } as Permission,
    },
    PARTY: {
      VIEW: { module: ModuleType.CORE, resource: 'party', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'party', action: 'manage' } as Permission,
    },
    NOTIFICATION: {
      VIEW: { module: ModuleType.CORE, resource: 'notification', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'notification', action: 'manage' } as Permission,
    },
    DAILY_CLOSING: {
      VIEW: { module: ModuleType.CORE, resource: 'daily_closing', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'daily_closing', action: 'manage' } as Permission,
    },
    STOCK_VERIFICATION: {
      VIEW: { module: ModuleType.CORE, resource: 'stock_verification', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.CORE, resource: 'stock_verification', action: 'manage' } as Permission,
    },
  },
  MOBILE_SHOP: {
    SALE: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'sale', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'sale', action: 'view' } as Permission,
      VIEW_ALL: { module: ModuleType.MOBILE_SHOP, resource: 'sale', action: 'view_all' } as Permission,
      VIEW_FINANCIAL: { module: ModuleType.MOBILE_SHOP, resource: 'sale', action: 'view_financial' } as Permission,
      EDIT: { module: ModuleType.MOBILE_SHOP, resource: 'sale', action: 'edit' } as Permission,
      REFUND: { module: ModuleType.MOBILE_SHOP, resource: 'sale', action: 'refund' } as Permission,
    },
    INVENTORY: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'inventory', action: 'view' } as Permission,
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'inventory', action: 'create' } as Permission,
      UPDATE: { module: ModuleType.MOBILE_SHOP, resource: 'inventory', action: 'update' } as Permission,
      ADJUST: { module: ModuleType.MOBILE_SHOP, resource: 'inventory', action: 'adjust' } as Permission,
    },
    JOBCARD: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'view' } as Permission,
      VIEW_ALL: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'view_all' } as Permission,
      UPDATE_STATUS: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'update_status' } as Permission,
      ASSIGN: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'assign' } as Permission,
      DELETE: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'delete' } as Permission,
      UPDATE: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'update' } as Permission,
      ADD_PART: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'add_part' } as Permission,
      REMOVE_PART: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'remove_part' } as Permission,
      CANCEL: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'cancel' } as Permission,
      UPDATE_CHARGE: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'update_charge' } as Permission,
      MANAGE_ADVANCE: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'manage_advance' } as Permission,
      REOPEN: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'reopen' } as Permission,
      CREATE_WARRANTY: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'create_warranty' } as Permission,
      RECORD_CONSENT: { module: ModuleType.MOBILE_SHOP, resource: 'jobcard', action: 'record_consent' } as Permission,
    },
    PURCHASE: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'purchase', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'purchase', action: 'view' } as Permission,
    },
    CREDIT_NOTE: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'credit_note', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'credit_note', action: 'view' } as Permission,
      ISSUE: { module: ModuleType.MOBILE_SHOP, resource: 'credit_note', action: 'issue' } as Permission,
      APPLY: { module: ModuleType.MOBILE_SHOP, resource: 'credit_note', action: 'apply' } as Permission,
      REFUND: { module: ModuleType.MOBILE_SHOP, resource: 'credit_note', action: 'refund' } as Permission,
      VOID: { module: ModuleType.MOBILE_SHOP, resource: 'credit_note', action: 'void' } as Permission,
    },
    SUPPLIER: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'supplier', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'supplier', action: 'view' } as Permission,
    },
    CUSTOMER: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'customer', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'customer', action: 'view' } as Permission,
    },
    LEDGER: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'ledger', action: 'view' } as Permission,
      COLLECT: { module: ModuleType.MOBILE_SHOP, resource: 'ledger', action: 'collect' } as Permission,
      MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'ledger', action: 'manage' } as Permission,
    },
    WHATSAPP: {
      SEND: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'send' } as Permission,
      TEMPLATE_MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'template_manage' } as Permission,
      AUTOMATION_MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'automation_manage' } as Permission,
      VIEW_DASHBOARD: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'view_dashboard' } as Permission,
      VIEW_NUMBERS: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'view_numbers' } as Permission,
      VIEW_LOGS: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'view_logs' } as Permission,
      MANAGE_CAMPAIGNS: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'manage_campaigns' } as Permission,
      ONBOARD_SYNC: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'onboard_sync' } as Permission,
      ONBOARD_CONNECT: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'onboard_connect' } as Permission,
      DISCONNECT: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'disconnect' } as Permission,
      MANAGE_NUMBERS: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'manage_numbers' } as Permission,
      SETTINGS_VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'settings_view' } as Permission,
      SETTINGS_MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'whatsapp', action: 'settings_manage' } as Permission,
    },
    B2B: {
      ONBOARD: { module: ModuleType.MOBILE_SHOP, resource: 'b2b', action: 'onboard' } as Permission,
      VIEW_CATALOG: { module: ModuleType.MOBILE_SHOP, resource: 'b2b', action: 'view_catalog' } as Permission,
      LINK_DISTRIBUTOR: { module: ModuleType.MOBILE_SHOP, resource: 'b2b', action: 'link' } as Permission,
      PLACE_ORDER: { module: ModuleType.MOBILE_SHOP, resource: 'b2b', action: 'place_order' } as Permission,
    },
    QUOTATION: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'quotation', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'quotation', action: 'view' } as Permission,
      UPDATE: { module: ModuleType.MOBILE_SHOP, resource: 'quotation', action: 'update' } as Permission,
      DELETE: { module: ModuleType.MOBILE_SHOP, resource: 'quotation', action: 'delete' } as Permission,
      CONVERT: { module: ModuleType.MOBILE_SHOP, resource: 'quotation', action: 'convert' } as Permission,
    },
    COMPATIBILITY: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'compatibility', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'compatibility', action: 'manage' } as Permission,
      AUTOCOMPLETE: { module: ModuleType.MOBILE_SHOP, resource: 'compatibility', action: 'autocomplete' } as Permission,
    },
    RECEIPT: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'receipt', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'receipt', action: 'view' } as Permission,
      CANCEL: { module: ModuleType.MOBILE_SHOP, resource: 'receipt', action: 'cancel' } as Permission,
    },
    VOUCHER: {
      CREATE: { module: ModuleType.MOBILE_SHOP, resource: 'voucher', action: 'create' } as Permission,
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'voucher', action: 'view' } as Permission,
      CANCEL: { module: ModuleType.MOBILE_SHOP, resource: 'voucher', action: 'cancel' } as Permission,
    },
    CRM: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'crm', action: 'view' } as Permission,
      MANAGE_FOLLOWUP: { module: ModuleType.MOBILE_SHOP, resource: 'crm', action: 'manage_followup' } as Permission,
      VIEW_TIMELINE: { module: ModuleType.MOBILE_SHOP, resource: 'crm', action: 'view_timeline' } as Permission,
      SEND_WHATSAPP: { module: ModuleType.MOBILE_SHOP, resource: 'crm', action: 'send_whatsapp' } as Permission,
    },
    REPAIR: {
       STOCK_OUT: { module: ModuleType.MOBILE_SHOP, resource: 'repair', action: 'stock_out' } as Permission,
       BILL: { module: ModuleType.MOBILE_SHOP, resource: 'repair', action: 'bill' } as Permission,
    },
    REPAIR_KNOWLEDGE: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'repair_knowledge', action: 'view' } as Permission,
      CONTRIBUTE: { module: ModuleType.MOBILE_SHOP, resource: 'repair_knowledge', action: 'contribute' } as Permission,
      MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'repair_knowledge', action: 'manage' } as Permission,
    },
    LOYALTY: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'loyalty', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'loyalty', action: 'manage' } as Permission,
    },
    SHOP: {
      VIEW: { module: ModuleType.MOBILE_SHOP, resource: 'shop', action: 'view' } as Permission,
      MANAGE: { module: ModuleType.MOBILE_SHOP, resource: 'shop', action: 'manage' } as Permission,
    },
    PIPELINE: {
      VIEW_MONITOR: { module: ModuleType.MOBILE_SHOP, resource: 'pipeline', action: 'view_monitor' } as Permission,
      MANAGE_QC: { module: ModuleType.MOBILE_SHOP, resource: 'pipeline', action: 'manage_qc' } as Permission,
      VIEW_QC: { module: ModuleType.MOBILE_SHOP, resource: 'pipeline', action: 'view_qc' } as Permission,
      SUGGEST: { module: ModuleType.MOBILE_SHOP, resource: 'pipeline', action: 'suggest' } as Permission,
      VIEW_QUEUE: { module: ModuleType.MOBILE_SHOP, resource: 'pipeline', action: 'view_queue' } as Permission,
    },
  },
  GYM: {
    MEMBER: {
      CREATE: { module: ModuleType.GYM, resource: 'member', action: 'create' } as Permission,
      VIEW: { module: ModuleType.GYM, resource: 'member', action: 'view' } as Permission,
      EDIT: { module: ModuleType.GYM, resource: 'member', action: 'edit' } as Permission,
    },
    ATTENDANCE: {
      MARK: { module: ModuleType.GYM, resource: 'attendance', action: 'mark' } as Permission,
      VIEW: { module: ModuleType.GYM, resource: 'attendance', action: 'view' } as Permission,
    },
    PAYMENT: {
      COLLECT: { module: ModuleType.GYM, resource: 'payment', action: 'collect' } as Permission,
      VIEW: { module: ModuleType.GYM, resource: 'payment', action: 'view' } as Permission,
    },
    MEMBERSHIP: {
      CREATE: { module: ModuleType.GYM, resource: 'membership', action: 'create' } as Permission,
      RENEW: { module: ModuleType.GYM, resource: 'membership', action: 'renew' } as Permission,
      VIEW: { module: ModuleType.GYM, resource: 'membership', action: 'view' } as Permission,
    }
  }
};
