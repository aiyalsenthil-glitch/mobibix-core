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
        }
      ],
    },
    {
      module: 'MOBILE_SHOP',
      resources: [
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
        'sale.*', 'inventory.*', 'jobcard.*', 'purchase.*', 'supplier.*', 'customer.*',
        'report.*', 'staff.*', 'approval.override', 'settings.manage'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'SHOP_MANAGER',
      jobDescription: 'Manage daily shop operations, supervise sales and inventory. Cannot change system plans.',
      defaultPermissions: [
        'sale.create', 'sale.edit', 'sale.refund', 'sale.view_all',
        'inventory.view', 'inventory.adjust',
        'jobcard.view_all', 'jobcard.assign', 'jobcard.update_status',
        'report.view', 'customer.view', 'supplier.view'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'SALES_EXECUTIVE',
      jobDescription: 'Handle billing and customer sales, create invoices.',
      defaultPermissions: [
        'sale.create', 'sale.view', 'customer.create', 'customer.view', 'inventory.view'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'TECHNICIAN',
      jobDescription: 'Handle repair workflow and update repair status.',
      defaultPermissions: [
        'jobcard.create', 'jobcard.update_status', 'jobcard.view_assigned', 'inventory.view'
      ]
    },
    {
      module: 'MOBILE_SHOP',
      roleName: 'SHOP_ACCOUNTANT',
      jobDescription: 'Manage shop finances, track payments/expenses, and export tax reports.',
      defaultPermissions: [
        'report.view', 'report.export', 'sale.view_financial', 'expense.create', 'expense.view', 'ledger.view'
      ]
    },

    // --- GymPilot Roles ---
    {
      module: 'GYM',
      roleName: 'GYM_OWNER',
      jobDescription: 'Full control of gym operations, revenue analytics, membership plans, and staff.',
      defaultPermissions: [
        'member.*', 'attendance.*', 'membership.*', 'payment.*',
        'report.*', 'staff.*', 'approval.override', 'settings.manage'
      ]
    },
    {
      module: 'GYM',
      roleName: 'GYM_MANAGER',
      jobDescription: 'Manage gym members, trainers, attendance and renewals.',
      defaultPermissions: [
        'member.create', 'member.edit', 'member.view',
        'attendance.view', 'attendance.mark',
        'membership.create', 'membership.renew',
        'report.view'
      ]
    },
    {
      module: 'GYM',
      roleName: 'RECEPTIONIST',
      jobDescription: 'Register new members, collect payments and renew memberships.',
      defaultPermissions: [
        'member.create', 'member.view', 'membership.create', 'membership.renew', 'payment.collect', 'attendance.view'
      ]
    },
    {
      module: 'GYM',
      roleName: 'TRAINER',
      jobDescription: 'Manage assigned members, track workouts and attendance.',
      defaultPermissions: [
        'member.view_assigned', 'attendance.mark', 'workout.update'
      ]
    },
    {
      module: 'GYM',
      roleName: 'GYM_ACCOUNTANT',
      jobDescription: 'Handle gym finances, generate reports and track payments.',
      defaultPermissions: [
        'payment.view', 'report.view', 'report.export', 'expense.create'
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

    if (permissionIds.size > 0) {
      await prisma.rolePermission.createMany({
        data: Array.from(permissionIds).map(pid => ({
          roleId: dbRole.id,
          permissionId: pid
        })),
        skipDuplicates: true
      });
    }
  }

  // Optional: Cleanup old legacy templates
  await prisma.role.updateMany({
    where: { name: { in: ['Manager', 'Staff'] }, tenantId: null, isSystem: true },
    data: { deletedAt: new Date() }
  });

  return { success: true };
}
