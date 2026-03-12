import { PrismaClient, ModuleType, Prisma, RoleCategory } from '@prisma/client';

export async function runPermissionSeed(prisma: PrismaClient) {
  // 1. Define Dictionary (The "What" can be done)
  const dictionary = [
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
           ]
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
        }
      ],
    },
    {
      module: 'MOBILE_SHOP',
      resources: [
        {
          name: 'sales', // Base permission resource
          actions: [
            { id: 'manage', ui: 'Manage Sales (Base)' },
            { id: 'view', ui: 'View Sales (Base)' },
          ],
        },
        {
          name: 'inventory_base', // Prevent name clash if inventory already exists
          actions: [
            { id: 'manage', ui: 'Manage Inventory (Base)' },
            { id: 'view', ui: 'View Inventory (Base)' },
          ],
        },
        {
          name: 'jobcard_base',
          actions: [
            { id: 'manage', ui: 'Manage Job Cards (Base)' },
            { id: 'view', ui: 'View Job Cards (Base)' },
          ],
        },
        {
          name: 'sale',
          actions: [
            { id: 'create', ui: 'Create Invoice' },
            { id: 'view', ui: 'View Invoices' },
            { id: 'view_all', ui: 'View All Sales' },
            { id: 'view_financial', ui: 'View Financial Details' },
            { id: 'edit', ui: 'Edit Invoice', sensitive: true },
            { id: 'refund', ui: 'Process Refund', sensitive: true },
          ],
        },
        {
          name: 'inventory',
          actions: [
            { id: 'view', ui: 'View Inventory' },
            { id: 'create', ui: 'Add Products' },
            { id: 'adjust', ui: 'Adjust Stock', sensitive: true },
          ],
        },
        {
          name: 'jobcard',
          actions: [
            { id: 'create', ui: 'Create Job Card' },
            { id: 'view', ui: 'View Job Card' },
            { id: 'view_all', ui: 'View All Job Cards' },
            { id: 'view_assigned', ui: 'View Assigned Jobs' },
            { id: 'update_status', ui: 'Update Repair Status' },
            { id: 'assign', ui: 'Assign Technician' },
          ],
        },
        {
          name: 'purchase',
          actions: [
            { id: 'create', ui: 'Create Purchase Order' },
            { id: 'view', ui: 'View Purchases' },
          ],
        },
        {
          name: 'supplier',
          actions: [
            { id: 'create', ui: 'Add Supplier' },
            { id: 'view', ui: 'View Suppliers' },
          ],
        },
        {
          name: 'customer',
          actions: [
            { id: 'create', ui: 'Add Customer' },
            { id: 'view', ui: 'View Customers' },
          ],
        },
        {
          name: 'quotation',
          actions: [
            { id: 'create', ui: 'Generate Quote' },
            { id: 'view', ui: 'View Quotes' },
          ],
        },
        {
           name: 'ledger',
           actions: [
             { id: 'view', ui: 'View Ledger' }
           ]
        }
      ],
    },
    {
      module: 'GYM',
      resources: [
        {
          name: 'membership_base',
          actions: [
            { id: 'manage', ui: 'Manage Membership (Base)' },
            { id: 'view', ui: 'View Membership (Base)' },
          ],
        },
        {
          name: 'member',
          actions: [
            { id: 'create', ui: 'Register Member' },
            { id: 'view', ui: 'View Members' },
            { id: 'view_assigned', ui: 'View Assigned Members' },
            { id: 'edit', ui: 'Edit Member profile' },
          ],
        },
        {
          name: 'attendance',
          actions: [
            { id: 'mark', ui: 'Mark Attendance' },
            { id: 'view', ui: 'View Attendance Logs' },
          ],
        },
        {
          name: 'membership',
          actions: [
            { id: 'create', ui: 'Assign Plan' },
            { id: 'renew', ui: 'Renew Membership' },
            { id: 'view', ui: 'View Membership Status' },
          ],
        },
        {
          name: 'payment',
          actions: [
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

  console.log('🌱 Seeding Permissions Dictionary...');
  for (const mod of dictionary) {
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

  // 2. Define System Templates
  const roleTemplates = [
    // --- MobiBix Roles ---
    {
      module: 'MOBILE_SHOP',
      roleName: 'SHOP_OWNER',
      jobDescription: 'Full system access. Manage business settings, view reports, and approve sensitive operations.',
      defaultPermissions: [
        'sales.manage', 'inventory_base.manage', 'jobcard_base.manage', 'purchase.create', 'purchase.view',
        'supplier.create', 'supplier.view', 'customer.create', 'customer.view',
        'report.view', 'staff.manage', 'approval.override', 'settings.manage'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'SHOP_MANAGER',
      jobDescription: 'Manage daily shop operations, supervise sales and inventory. Cannot change system plans.',
      defaultPermissions: [
        'dashboard.view',
        'sales.manage',
        'inventory_base.manage',
        'jobcard_base.manage',
        'report.view', 'customer.view', 'customer.create', 'supplier.view', 'supplier.create',
        'expense.view', 'expense.create',
        'purchase.view', 'purchase.create'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'SALES_EXECUTIVE',
      jobDescription: 'Handle billing and customer sales, create invoices.',
      defaultPermissions: [
        'dashboard.view', 'sales.manage', 'customer.view', 'customer.create', 'inventory_base.view'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'TECHNICIAN',
      jobDescription: 'Handle repair workflow and update repair status.',
      defaultPermissions: [
        'dashboard.view', 'jobcard_base.manage', 'inventory_base.view'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'SHOP_ACCOUNTANT',
      jobDescription: 'Manage shop finances, track payments/expenses, and export tax reports.',
      defaultPermissions: [
        'dashboard.view', 'report.view', 'report.export', 'sales.view', 'expense.create', 'expense.view', 'ledger.view',
        'purchase.view'
      ]
    },

    // --- GymPilot Roles ---
    {
      module: 'GYM',
      roleName: 'GYM_OWNER',
      jobDescription: 'Full control of gym operations, revenue analytics, membership plans, and staff.',
      defaultPermissions: [
        'membership_base.manage', 'attendance.mark', 'attendance.view', 'payment.collect', 'payment.view',
        'report.view', 'staff.manage', 'approval.override', 'settings.manage'
      ]
    },
    {
      module: 'GYM',
      roleName: 'GYM_MANAGER',
      jobDescription: 'Manage gym members, trainers, attendance and renewals.',
      defaultPermissions: [
        'dashboard.view', 'membership_base.manage',
        'attendance.view', 'attendance.mark',
        'report.view'
      ]
    },
    {
      module: 'GYM',
      roleName: 'RECEPTIONIST',
      jobDescription: 'Register new members, collect payments and renew memberships.',
      defaultPermissions: [
        'dashboard.view', 'membership_base.manage', 'payment.collect', 'attendance.view'
      ]
    },
    {
      module: 'GYM',
      roleName: 'TRAINER',
      jobDescription: 'Manage assigned members, track workouts and attendance.',
      defaultPermissions: [
        'dashboard.view', 'membership_base.view', 'attendance.mark', 'workout.update'
      ]
    },
    {
      module: 'GYM',
      roleName: 'GYM_ACCOUNTANT',
      jobDescription: 'Handle gym finances, generate reports and track payments.',
      defaultPermissions: [
        'dashboard.view', 'payment.view', 'report.view', 'report.export', 'expense.create', 'expense.view'
      ]
    }
  ];

  console.log('🌱 Syncing System Role Templates...');
  for (const t of roleTemplates) {
    let dbRole = await prisma.role.findFirst({
      where: { name: t.roleName, tenantId: null, isSystem: true }
    });

    if (dbRole) {
      dbRole = await prisma.role.update({
        where: { id: dbRole.id },
        data: { description: t.jobDescription, category: RoleCategory.SYSTEM_TEMPLATE }
      });
    } else {
      console.log(`✨ Creating System Template: ${t.roleName}`);
      dbRole = await prisma.role.create({
        data: {
          name: t.roleName,
          description: t.jobDescription,
          isSystem: true,
          tenantId: null,
          category: RoleCategory.SYSTEM_TEMPLATE
        }
      });
    }

    await prisma.rolePermission.deleteMany({ where: { roleId: dbRole.id } });

    const permissionIds = new Set<string>();
    for (const pStr of t.defaultPermissions) {
      const [resName, actName] = pStr.split('.');
      const modulesToSearch = [t.module, 'CORE'];
      
      const where: Prisma.PermissionWhereInput = {
        resource: {
          name: resName,
          moduleType: { in: modulesToSearch as ModuleType[] }
        }
      };

      if (actName !== '*') {
        where.action = actName;
      }

      const dbPerms = await prisma.permission.findMany({ where });
      dbPerms.forEach(p => permissionIds.add(p.id));
    }

      const perms = Array.from(permissionIds).map(pid => ({
        roleId: dbRole.id,
        permissionId: pid
      }));
      
      await prisma.rolePermission.createMany({
        data: perms,
        skipDuplicates: true
      });
  }

  // Cleanup old legacy templates or duplicates
  const legacyNames = ['Manager', 'Staff', 'OWNER', 'SHOP_STAFF', 'GYM_TRAINER', 'SUPERVISOR', 'ACCOUNTANT'];
  await prisma.role.updateMany({
    where: { 
      name: { in: legacyNames }, 
      tenantId: null, 
      isSystem: true 
    },
    data: { deletedAt: new Date() }
  });
  
  // Also ensure if we have 'TRAINER' and 'Trainer' it's cleaned up (if applicable)
  // For now the seed uses 'TRAINER'.

  return { success: true };
}
