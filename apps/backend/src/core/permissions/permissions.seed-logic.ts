import { PrismaClient, ModuleType, Prisma, RoleCategory } from '@prisma/client';
import { PERMISSION_INHERITANCE } from '../../security/permission-inheritance';

export const RESOURCE_DICTIONARY = [
  {
    module: 'CORE',
    resources: [
      {
        name: 'staff',
        actions: [
          { id: 'manage', ui: 'Manage Staff' },
          { id: 'view', ui: 'View Staff' },
          { id: 'invite', ui: 'Invite Staff' },
        ],
      },
      {
        name: 'approval',
        actions: [
          { id: 'override', ui: 'Manager Override', sensitive: true },
          { id: 'view', ui: 'View Approval History' },
        ],
      },
      {
        name: 'settings',
        actions: [
          { id: 'manage', ui: 'Manage Business Settings' },
          { id: 'view', ui: 'View Settings' },
        ],
      },
      {
        name: 'report',
        actions: [
          { id: 'view', ui: 'View Reports' },
          { id: 'export', ui: 'Export Data', sensitive: true },
        ],
      },
      {
        name: 'report.sale',
        actions: [{ id: 'view', ui: 'View Sales Reports' }],
      },
      {
        name: 'report.inventory',
        actions: [{ id: 'view', ui: 'View Inventory Reports' }],
      },
      {
        name: 'report.profit',
        actions: [{ id: 'view', ui: 'View Profit Reports' }],
      },
      {
        name: 'dashboard',
        actions: [
          { id: 'view', ui: 'View Dashboard' },
        ],
      },
      {
         name: 'expense',
         actions: [
           { id: 'create', ui: 'Log Expenses' },
           { id: 'view', ui: 'View Expenses' },
           { id: 'manage', ui: 'Manage Expenses' },
         ]
      },
      {
        name: 'monthly_report',
        actions: [
          { id: 'view', ui: 'View Monthly Reports' },
        ],
      },
      {
        name: 'shrinkage',
        actions: [
          { id: 'view', ui: 'View Shrinkage Intelligence' },
        ],
      },
      {
        name: 'system',
        actions: [
          { id: 'manage', ui: 'System Manage' },
          { id: 'view', ui: 'System View' },
        ]
      },
      {
        name: 'ai',
        actions: [
          { id: 'use', ui: 'Use AI Features' },
        ]
      },
      {
        name: 'audit',
        actions: [
          { id: 'view', ui: 'View Audit Logs' },
        ]
      },
      {
        name: 'notification',
        actions: [
          { id: 'view', ui: 'View Notifications' },
          { id: 'manage', ui: 'Manage Notifications' },
        ]
      },
      {
        name: 'profile',
        actions: [
          { id: 'view', ui: 'View Profile' },
          { id: 'update', ui: 'Update Profile' },
        ]
      },
      {
        name: 'billing',
        actions: [
          { id: 'view', ui: 'View Billing' },
          { id: 'manage', ui: 'Manage Billing' },
        ]
      },
      {
        name: 'daily_closing',
        actions: [
          { id: 'view', ui: 'View Daily Closings' },
          { id: 'manage', ui: 'Manage Daily Closings' },
        ],
      },
      {
        name: 'stock_verification',
        actions: [
          { id: 'view', ui: 'View Stock Verification' },
          { id: 'manage', ui: 'Manage Stock Verification' },
        ],
      },
    ],
  },
  {
    module: 'MOBILE_SHOP',
    resources: [
      {
        name: 'sale',
        actions: [
          { id: 'manage', ui: 'Manage Sales (Base)' },
          { id: 'view_base', ui: 'View Sales (Base)' },
          { id: 'create', ui: 'Create Invoice' },
          { id: 'view', ui: 'View Invoices' },
          { id: 'view_all', ui: 'View All Sales' },
          { id: 'view_financial', ui: 'View Financial Details' },
          { id: 'update', ui: 'Update Invoice' },
          { id: 'edit', ui: 'Edit Invoice (Legacy)', sensitive: true },
          { id: 'refund', ui: 'Process Refund', sensitive: true },
          { id: 'cancel', ui: 'Cancel Sale', sensitive: true },
          { id: 'record_payment', ui: 'Record Payment' },
          { id: 'add_item', ui: 'Add Item to Sale' },
        ],
      },
      {
        name: 'inventory',
        actions: [
          { id: 'manage', ui: 'Manage Inventory (Base)' },
          { id: 'view_base', ui: 'View Inventory (Base)' },
          { id: 'view', ui: 'View Inventory' },
          { id: 'create', ui: 'Add Products' },
          { id: 'update', ui: 'Update Products' },
          { id: 'delete', ui: 'Delete Products', sensitive: true },
          { id: 'adjust', ui: 'Adjust Stock', sensitive: true },
        ],
      },
      {
        name: 'jobcard',
        actions: [
          { id: 'manage', ui: 'Manage Job Cards (Base)' },
          { id: 'view_base', ui: 'View Job Cards (Base)' },
          { id: 'create', ui: 'Create Job Card' },
          { id: 'view', ui: 'View Job Card' },
          { id: 'view_all', ui: 'View All Job Cards' },
          { id: 'view_assigned', ui: 'View Assigned Jobs' },
          { id: 'update_status', ui: 'Update Repair Status' },
          { id: 'assign', ui: 'Assign Technician' },
          { id: 'update', ui: 'Update Job Card' },
          { id: 'delete', ui: 'Delete Job Card', sensitive: true },
          { id: 'add_part', ui: 'Add Part to Job' },
          { id: 'remove_part', ui: 'Remove Part from Job' },
          { id: 'cancel', ui: 'Cancel Job Card', sensitive: true },
          { id: 'update_charge', ui: 'Update Service Charge' },
          { id: 'manage_advance', ui: 'Manage Advance Payments' },
          { id: 'reopen', ui: 'Reopen Cancelled Job' },
          { id: 'create_warranty', ui: 'Create Warranty Job' },
          { id: 'record_consent', ui: 'Record Customer Consent' },
        ],
      },
      {
        name: 'purchase',
        actions: [
          { id: 'manage', ui: 'Manage Purchases (Base)' },
          { id: 'create', ui: 'Create Purchase Order' },
          { id: 'view', ui: 'View Purchases' },
          { id: 'update', ui: 'Update Purchase' },
          { id: 'delete', ui: 'Delete Purchase', sensitive: true },
        ],
      },
      {
        name: 'supplier',
        actions: [
          { id: 'manage', ui: 'Manage Suppliers (Base)' },
          { id: 'create', ui: 'Add Supplier' },
          { id: 'view', ui: 'View Suppliers' },
          { id: 'update', ui: 'Update Supplier' },
          { id: 'delete', ui: 'Delete Supplier', sensitive: true },
        ],
      },
      {
        name: 'customer',
        actions: [
          { id: 'manage', ui: 'Manage Customers (Base)' },
          { id: 'create', ui: 'Add Customer' },
          { id: 'view', ui: 'View Customers' },
          { id: 'update', ui: 'Update Customer' },
          { id: 'delete', ui: 'Delete Customer', sensitive: true },
        ],
      },
      {
        name: 'quotation',
        actions: [
          { id: 'create', ui: 'Generate Quote' },
          { id: 'view', ui: 'View Quotes' },
          { id: 'update', ui: 'Update Quote' },
          { id: 'delete', ui: 'Delete Quote', sensitive: true },
          { id: 'convert', ui: 'Convert Quote to Sale' },
        ],
      },
      {
         name: 'ledger',
         actions: [
           { id: 'view', ui: 'View Ledger' },
           { id: 'collect', ui: 'Collect Payment' },
           { id: 'manage', ui: 'Manage Ledger' },
         ]
      },
      {
        name: 'receipt',
        actions: [
          { id: 'create', ui: 'Create Receipt' },
          { id: 'view', ui: 'View Receipts' },
          { id: 'cancel', ui: 'Cancel Receipt' },
        ],
      },
      {
        name: 'voucher',
        actions: [
          { id: 'create', ui: 'Create Voucher' },
          { id: 'view', ui: 'View Vouchers' },
          { id: 'cancel', ui: 'Cancel Voucher' },
        ],
      },
      {
        name: 'repair',
        actions: [
          { id: 'bill', ui: 'Generate Repair Bill' },
          { id: 'stock_out', ui: 'Stock Out for Repair' },
        ],
      },
        {
          name: 'whatsapp',
          actions: [
            { id: 'manage', ui: 'Manage WhatsApp' },
            { id: 'view', ui: 'View WhatsApp' },
            { id: 'send', ui: 'Send Messages' },
            { id: 'template_manage', ui: 'Manage Templates' },
            { id: 'automation_manage', ui: 'Manage Automations' },
            { id: 'view_dashboard', ui: 'View WhatsApp Dashboard' },
            { id: 'view_numbers', ui: 'View WhatsApp Numbers' },
            { id: 'view_logs', ui: 'View Message Logs' },
            { id: 'manage_campaigns', ui: 'Manage Campaigns' },
            { id: 'onboard_sync', ui: 'Sync Onboarding State' },
            { id: 'onboard_connect', ui: 'Connect WhatsApp Number' },
            { id: 'disconnect', ui: 'Disconnect WhatsApp' },
            { id: 'manage_numbers', ui: 'Manage Phone Numbers' },
            { id: 'settings_view', ui: 'View WhatsApp Settings' },
            { id: 'settings_manage', ui: 'Manage WhatsApp Settings' },
          ]
        },
        {
          name: 'crm',
          actions: [
            { id: 'manage', ui: 'Manage CRM (Base)' },
            { id: 'view', ui: 'View CRM (Base)' },
            { id: 'manage_followup', ui: 'Manage Followups' },
            { id: 'view_timeline', ui: 'View Timeline' },
          ]
        },
      {
        name: 'shop',
        actions: [
          { id: 'manage', ui: 'Manage Shop' },
          { id: 'view', ui: 'View Shop' },
        ]
      },
      {
        name: 'compatibility',
        actions: [
          { id: 'view', ui: 'View Compatibility' },
          { id: 'manage', ui: 'Manage Compatibility' },
          { id: 'autocomplete', ui: 'Compatibility Search' },
        ],
      },
      {
        name: 'credit_note',
        actions: [
          { id: 'create', ui: 'Create Credit Note' },
          { id: 'view', ui: 'View Credit Notes' },
          { id: 'issue', ui: 'Issue Credit Note' },
          { id: 'apply', ui: 'Apply Credit Note' },
          { id: 'refund', ui: 'Process Refund to Credit Note' },
          { id: 'void', ui: 'Void Credit Note' },
        ],
      },
      {
        name: 'loyalty',
        actions: [
          { id: 'view', ui: 'View Loyalty Status' },
          { id: 'manage', ui: 'Manage Loyalty Rules' },
        ],
      },
      {
        name: 'b2b',
        actions: [
          { id: 'onboard', ui: 'Onboard to B2B' },
          { id: 'view_catalog', ui: 'View B2B Catalog' },
          { id: 'link', ui: 'Link Distributor' },
          { id: 'place_order', ui: 'Place B2B Order' },
        ],
      },
      {
        name: 'repair_knowledge',
        actions: [
          { id: 'view', ui: 'View Repair Knowledge' },
          { id: 'contribute', ui: 'Contribute Repair Notes' },
          { id: 'manage', ui: 'Manage Repair Knowledge' },
        ],
      },
    ],
  },
  {
    module: 'GYM',
    resources: [
      {
        name: 'member',
        actions: [
          { id: 'manage', ui: 'Manage Members (Base)' },
          { id: 'create', ui: 'Register Member' },
          { id: 'view', ui: 'View Members' },
          { id: 'view_assigned', ui: 'View Assigned Members' },
          { id: 'edit', ui: 'Edit Member profile' },
          { id: 'delete', ui: 'Delete Member', sensitive: true },
        ],
      },
      {
        name: 'attendance',
        actions: [
          { id: 'manage', ui: 'Manage Attendance (Base)' },
          { id: 'mark', ui: 'Mark Attendance' },
          { id: 'view', ui: 'View Attendance Logs' },
        ],
      },
      {
        name: 'membership',
        actions: [
          { id: 'manage', ui: 'Manage Membership (Base)' },
          { id: 'view_base', ui: 'View Membership (Base)' },
          { id: 'create', ui: 'Assign Plan' },
          { id: 'renew', ui: 'Renew Membership' },
          { id: 'view', ui: 'View Membership Status' },
        ],
      },
      {
        name: 'payment',
        actions: [
          { id: 'manage', ui: 'Manage Payments (Base)' },
          { id: 'collect', ui: 'Collect Payment' },
          { id: 'view', ui: 'View Payments' },
        ],
      },
      {
        name: 'workout',
        actions: [
          { id: 'update', ui: 'Update Workout plans' },
        ],
      },
    ],
  },
];

export const roleTemplates = [
  // --- MobiBix Roles ---
  {
    module: 'MOBILE_SHOP',
    roleName: 'SHOP_OWNER',
    jobDescription:
      'Full administrative control over all shop resources and staff.',
    defaultPermissions: [
      'mobile_shop.sale.manage',
      'mobile_shop.inventory.manage',
      'mobile_shop.jobcard.manage',
      'mobile_shop.purchase.manage',
      'mobile_shop.supplier.manage',
      'mobile_shop.customer.manage',
      'core.report.view',
      'core.staff.manage',
      'core.settings.manage',
      'core.dashboard.view',
      'core.profile.view',
      'mobile_shop.whatsapp.manage',
      'mobile_shop.crm.manage',
      'mobile_shop.ledger.manage',
      'mobile_shop.b2b.onboard',
      'mobile_shop.loyalty.manage',
      'mobile_shop.compatibility.manage',
      'mobile_shop.shop.manage',
      'mobile_shop.shop.view',
      'mobile_shop.repair_knowledge.manage',
      'core.staff.manage',
      'core.settings.manage',
      'core.dashboard.view',
      'core.profile.view',
      'core.billing.view',
      'core.billing.manage',
      'core.notification.view',
      'core.ai.use',
      'core.daily_closing.manage',
      'core.stock_verification.manage',
      'core.expense.manage',
      'core.monthly_report.view',
      'core.shrinkage.view',
    ],
  },
  {
    module: 'MOBILE_SHOP',
    roleName: 'SHOP_MANAGER',
    jobDescription:
      'Manage shop operations, staff assignments, inventory control, and customer relations.',
    defaultPermissions: [
      'mobile_shop.sale.manage',
      'mobile_shop.inventory.manage',
      'mobile_shop.jobcard.manage',
      'mobile_shop.crm.manage',
      'mobile_shop.customer.manage',
      'mobile_shop.supplier.manage',
      'mobile_shop.purchase.manage',
      'mobile_shop.ledger.manage',
      'mobile_shop.loyalty.manage',
      'mobile_shop.whatsapp.manage',
      'mobile_shop.receipt.manage',
      'mobile_shop.voucher.manage',
      'mobile_shop.compatibility.manage',
      'mobile_shop.repair_knowledge.manage',
      'core.report.view',
      'core.staff.manage',
      'core.settings.manage',
      'core.dashboard.view',
      'mobile_shop.shop.view',
      'core.profile.view',
      'core.notification.view',
      'core.billing.view',
      'core.ai.use',
      'core.daily_closing.manage',
      'core.stock_verification.manage',
      'core.expense.manage',
      'core.monthly_report.view',
      'core.shrinkage.view',
    ],
  },
  {
    module: 'MOBILE_SHOP',
    roleName: 'SALES_EXECUTIVE',
    jobDescription: 'Handle sales, generate invoices, and manage customers.',
    defaultPermissions: [
      'mobile_shop.sale.view',
      'mobile_shop.sale.manage',
      'mobile_shop.customer.manage',
      'mobile_shop.inventory.view',
      'mobile_shop.compatibility.view',
      'mobile_shop.loyalty.view',
      'mobile_shop.whatsapp.view',
      'mobile_shop.crm.manage',
      'mobile_shop.receipt.view',
      'core.dashboard.view',
      'mobile_shop.shop.view',
      'core.profile.view',
      'core.notification.view',
      'core.billing.view',
    ],
  },
  {
    module: 'MOBILE_SHOP',
    roleName: 'TECHNICIAN',
    jobDescription: 'Repairs management, parts consumption, and technical tools.',
    defaultPermissions: [
      'mobile_shop.jobcard.manage',
      'mobile_shop.inventory.view',
      'mobile_shop.compatibility.view',
      'mobile_shop.loyalty.view',
      'mobile_shop.whatsapp.view',
      'mobile_shop.repair_knowledge.view',
      'mobile_shop.repair_knowledge.contribute',
      'mobile_shop.crm.manage',
      'core.dashboard.view',
      'mobile_shop.shop.view',
      'core.profile.view',
      'core.notification.view',
      'core.billing.view',
    ],
  },
  {
    module: 'MOBILE_SHOP',
    roleName: 'SHOP_ACCOUNTANT',
    jobDescription: 'Manage business finances, ledger, and accounting reports.',
    defaultPermissions: [
      'mobile_shop.ledger.manage',
      'mobile_shop.receipt.manage',
      'mobile_shop.voucher.manage',
      'mobile_shop.sale.view',
      'mobile_shop.inventory.view',
      'mobile_shop.purchase.view',
      'mobile_shop.supplier.view',
      'mobile_shop.customer.view',
      'mobile_shop.loyalty.view',
      'mobile_shop.whatsapp.view',
      'mobile_shop.crm.view',
      'core.report.view',
      'core.dashboard.view',
      'mobile_shop.shop.view',
      'core.profile.view',
      'core.notification.view',
      'core.billing.view',
      'core.daily_closing.manage',
      'core.stock_verification.manage',
      'core.expense.manage',
      'core.monthly_report.view',
      'core.shrinkage.view',
    ],
  },

  // --- Gym Roles ---
  {
    module: 'GYM',
    roleName: 'GYM_OWNER',
    jobDescription: 'Full control over the gym.',
    defaultPermissions: [
      'membership.manage', 'member.manage', 'attendance.manage', 'payment.manage', 'report.view', 'staff.manage', 'settings.manage', 'dashboard.view', 'profile.view'
    ]
  },
  {
    module: 'GYM',
    roleName: 'GYM_MANAGER',
    jobDescription: 'Manage gym floor operations.',
    defaultPermissions: [
      'membership.view', 'member.manage', 'attendance.view', 'payment.view', 'dashboard.view'
    ]
  },
  {
    module: 'GYM',
    roleName: 'TRAINER',
    jobDescription: 'Deliver training sessions.',
    defaultPermissions: [
      'attendance.mark', 'member.view_assigned'
    ]
  }
];

export async function runPermissionSeed(prisma: PrismaClient) {
  console.log('🌱 Seeding Permissions Dictionary...');
  for (const mod of RESOURCE_DICTIONARY) {
    for (const res of mod.resources) {
      const dbResource = await prisma.resource.upsert({
        where: {
          moduleType_name: {
            moduleType: mod.module as ModuleType,
            name: res.name,
          },
        },
        update: {},
        create: {
          moduleType: mod.module as ModuleType,
          name: res.name,
        },
      });

      for (const act of res.actions) {
        await prisma.permission.upsert({
          where: {
            resourceId_action: {
              resourceId: dbResource.id,
              action: act.id,
            },
          },
          update: {
            approvalPolicy: (act as any).sensitive ? { requiresApproval: true } : Prisma.DbNull,
            description: act.ui
          },
          create: {
            resourceId: dbResource.id,
            action: act.id,
            approvalPolicy: (act as any).sensitive ? { requiresApproval: true } : Prisma.DbNull,
            description: act.ui
          },
        });
      }
    }
  }

  console.log('🚀 Seeding Role Templates...');
  for (const template of roleTemplates) {
    // Find global system role
    let role = await prisma.role.findFirst({
      where: {
        tenantId: null,
        name: template.roleName,
        isSystem: true,
      },
    });

    if (role) {
      role = await prisma.role.update({
        where: { id: role.id },
        data: {
          description: template.jobDescription,
          category: RoleCategory.SYSTEM_TEMPLATE,
        },
      });
    } else {
      role = await prisma.role.create({
        data: {
          name: template.roleName,
          isSystem: true,
          tenantId: null as any,
          description: template.jobDescription,
          category: RoleCategory.SYSTEM_TEMPLATE,
        },
      });
    }

    // Sync permissions for this role
    const validPermissionIds: string[] = [];
    
    // Expand permissions
    const expandedPerms = new Set<string>();
    for (const p of template.defaultPermissions) {
      // Prefix search (e.g. mobile_shop.sales.manage)
      const prefix = template.module === 'MOBILE_SHOP' ? 'mobile_shop.' : 'gym.';
      const hasPrefix = p.startsWith('mobile_shop.') || p.startsWith('gym.') || p.startsWith('core.');
      const fullKey = hasPrefix ? p : `${prefix}${p}`;
      
      const children = PERMISSION_INHERITANCE[fullKey] || PERMISSION_INHERITANCE[p];
      if (children) {
        children.forEach(c => expandedPerms.add(c));
      } else {
        expandedPerms.add(p);
      }
    }

    console.log(`  Processing role: ${template.roleName} (Module: ${template.module})`);
    for (const permName of expandedPerms) {
      const parts = permName.split('.');
      let modSearch: ModuleType | undefined;
      let resSearch: string;
      let actSearch: string;

      const validModules = Object.values(ModuleType) as string[];
      if (parts.length >= 3 && validModules.includes(parts[0].toUpperCase())) {
        // Handle core.report.sale.view -> mod: core, res: report.sale, act: view
        modSearch = parts[0].toUpperCase() as ModuleType;
        actSearch = parts[parts.length - 1];
        resSearch = parts.slice(1, parts.length - 1).join('.');
      } else if (parts.length >= 2) {
        // Handle sale.create or report.sale.view
        resSearch = parts.slice(0, parts.length - 1).join('.');
        actSearch = parts[parts.length - 1];
        modSearch = undefined;
      } else {
        continue;
      }

      // Simple sequential lookup
      const searchModules: ModuleType[] = modSearch 
        ? [modSearch] 
        : [template.module as ModuleType, ModuleType.CORE];

      let dbResource: any = null;
      for (const m of searchModules) {
        if (!m) continue;
        try {
          dbResource = await prisma.resource.findFirst({
            where: {
              name: resSearch,
              moduleType: m,
            },
          });
          if (dbResource) break;
        } catch (err) {
          console.error(`  Prisma Error searching ${resSearch} in module ${m}:`, err.message);
          continue;
        }
      }

      if (!dbResource) continue;

      const dbPerm = await prisma.permission.findUnique({
        where: {
          resourceId_action: {
            resourceId: dbResource.id,
            action: actSearch
          }
        }
      });

      if (dbPerm) {
        validPermissionIds.push(dbPerm.id);
      }
    }

    // Wipe and replace permissions
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    if (validPermissionIds.length > 0) {
      await prisma.rolePermission.createMany({
        data: validPermissionIds.map((pid) => ({
          roleId: role.id,
          permissionId: pid,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  Synced ${validPermissionIds.length} permissions for ${template.roleName}`);
  }
}
