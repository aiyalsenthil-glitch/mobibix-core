import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { PrismaClient, ModuleType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { HSN_DATA } from './hsn-data';
import { WhatsAppConfigValidator } from '../src/modules/whatsapp/whatsapp.config-validator';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

async function seedWhatsAppSettingsForTenant(tenantId: string): Promise<{
  settingsCreated: boolean;
}> {
  let settingsCreated = false;

  const existingSetting = await prisma.whatsAppSetting.findUnique({
    where: { tenantId },
  });

  if (!existingSetting) {
    await prisma.whatsAppSetting.create({
      data: {
        tenantId,
        enabled: true,
        provider: 'META',
        defaultLanguage: 'en',
        dailyLimit: 100,
        testPhone: null,
        marketingOptInRequired: true,
      },
    });
    settingsCreated = true;
  }

  return { settingsCreated };
}

async function seedWhatsAppForModule(moduleType: string): Promise<{
  templatesCount: number;
  automationsCount: number;
}> {
  let templatesCount = 0;
  let automationsCount = 0;

  // Templates now seeded via dedicated scripts:
  // - GYM: seed-mobibix-whatsapp-templates.ts
  // - MOBILE_SHOP: seed-mobibix-whatsapp-templates.ts
  const templates: any[] = [];

  for (const template of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: {
        moduleType_metaTemplateName: {
          moduleType: moduleType,
          metaTemplateName: template.metaTemplateName,
        },
      },
      update: {
        category: template.category,
        feature: template.feature,
        language: template.language,
        status: template.status,
      },
      create: {
        moduleType: moduleType,
        ...template,
      },
    });
    templatesCount++;
  }

  return { templatesCount, automationsCount };
}

// Tenant-based phone numbers now seeded via seed-phone-numbers.ts
// Run: npx ts-node prisma/seed-phone-numbers.ts

async function seedModulePhoneNumbers(): Promise<{
  created: number;
  skipped: number;
}> {
  const DEFAULT_PHONE_NUMBER =
    process.env.WHATSAPP_PHONE_NUMBER || '+1234567890';
  const DEFAULT_PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID || 'YOUR_PHONE_NUMBER_ID';
  const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || 'YOUR_WABA_ID';

  const moduleTypes = ['GYM', 'MOBILE_SHOP'];
  let created = 0;
  let skipped = 0;

  for (const moduleType of moduleTypes) {
    const existing = await prisma.whatsAppNumber.findFirst({
      where: {
        tenantId: null,
        moduleType: moduleType as any,
        phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
      },
    });

    if (existing) {
      skipped++;
      continue;
    }

    await prisma.whatsAppNumber.create({
      data: {
        tenantId: null,
        moduleType: moduleType as any,
        phoneNumber: DEFAULT_PHONE_NUMBER,
        phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
        wabaId: DEFAULT_WABA_ID,
        purpose: 'DEFAULT',
        isDefault: true,
        isEnabled: true,
        isSystem: true,
        displayNumber: DEFAULT_PHONE_NUMBER,
      },
    });

    created++;
  }

  return { created, skipped };
}

async function seedEnterpriseRoles() {
  console.log('🌱 Seeding Enterprise Roles and Permissions...');

  // 1. Define Resources and Permissions
  const resources = [
    // --- CORE MULTI-MODULE ---
    {
      name: 'approval',
      moduleType: 'CORE' as any,
      description: 'System-wide approval actions',
      permissions: [
        { action: 'override', description: 'Can override and approve any pending request' }
      ]
    },
    {
      name: 'shop',
      moduleType: 'CORE' as any,
      description: 'Branch/Shop management',
      permissions: [
        { action: 'settings_modify', description: 'Can modify shop/branch settings' }
      ]
    },
    {
      name: 'staff',
      moduleType: 'CORE' as any,
      description: 'Staff management',
      permissions: [
        { action: 'invite', description: 'Can invite new staff members' },
        { action: 'view_all', description: 'Can view all staff members' },
        { action: 'edit_roles', description: 'Can edit staff roles' }
      ]
    },
    {
      name: 'report',
      moduleType: 'CORE' as any,
      description: 'Analytics and Reporting',
      permissions: [
        { action: 'export', description: 'Can export business reports' },
        { action: 'view_financials', description: 'Can view high-level financial reports' }
      ]
    },
    {
      name: 'expense',
      moduleType: 'CORE' as any,
      description: 'Expense Management',
      permissions: [
        { action: 'create', description: 'Can record expenses' },
        { action: 'view', description: 'Can view expenses' }
      ]
    },

    // --- MOBILE_SHOP MODULE ---
    {
      name: 'sale',
      moduleType: 'MOBILE_SHOP' as any,
      description: 'Sales and Billing',
      permissions: [
        { action: 'create', description: 'Can create sales invoices' },
        { action: 'view_all', description: 'Can view all sales' },
        { action: 'view_own', description: 'Can view only own sales' },
        { action: 'refund', description: 'Can process refunds', approvalPolicy: { "requiredPermission": "approval.override" } },
        { action: 'view_profit', description: 'Can view profit margins on sales' },
        { action: 'view_cost', description: 'Can view cost prices' }
      ]
    },
    {
      name: 'inventory',
      moduleType: 'MOBILE_SHOP' as any,
      description: 'Product Inventory',
      permissions: [
        { action: 'view', description: 'Can view inventory' },
        { action: 'add', description: 'Can add new products/stock' },
        { action: 'adjust', description: 'Can adjust existing stock' },
        { action: 'delete', description: 'Can delete products' }
      ]
    },
    {
      name: 'jobcard',
      moduleType: 'MOBILE_SHOP' as any,
      description: 'Mobile Repair Job Cards',
      permissions: [
        { action: 'create', description: 'Can create repair job cards' },
        { action: 'view_all', description: 'Can view all job cards' },
        { action: 'update_status', description: 'Can update job card status' },
        { action: 'assign', description: 'Can assign technicians' },
        { action: 'view_financials', description: 'Can view job card pricing/cost' }
      ]
    },

    // --- GYM MODULE ---
    {
      name: 'attendance',
      moduleType: 'GYM' as any,
      description: 'Gym Attendance Tracking',
      permissions: [
        { action: 'mark', description: 'Can mark attendance for members' },
        { action: 'view_all', description: 'Can view all attendance logs' }
      ]
    },
    {
      name: 'member',
      moduleType: 'GYM' as any,
      description: 'Gym Members',
      permissions: [
        { action: 'add', description: 'Can add new members' },
        { action: 'edit', description: 'Can edit member profiles' },
        { action: 'view_all', description: 'Can view all members' },
        { action: 'view_financials', description: 'Can view member payment history' }
      ]
    },
    {
      name: 'membership',
      moduleType: 'GYM' as any,
      description: 'Gym Memberships',
      permissions: [
        { action: 'assign', description: 'Can assign membership plans' },
        { action: 'renew', description: 'Can process membership renewals' },
        { action: 'cancel', description: 'Can cancel active memberships', approvalPolicy: { "requiredPermission": "approval.override" } }
      ]
    }
  ];

  // Map to store created permission IDs
  const permissionIds: Record<string, string> = {};

  // Upsert Resources and Permissions
  for (const res of resources) {
    const resource = await prisma.resource.upsert({
      where: {
        moduleType_name: {
          moduleType: res.moduleType,
          name: res.name
        }
      },
      update: { description: res.description },
      create: {
        moduleType: res.moduleType,
        name: res.name,
        description: res.description
      }
    });

    for (const perm of res.permissions) {
      const permission = await prisma.permission.upsert({
        where: {
          resourceId_action: {
            resourceId: resource.id,
            action: perm.action
          }
        },
        update: {
          description: perm.description,
          approvalPolicy: perm.approvalPolicy ? (perm.approvalPolicy as any) : undefined
        },
        create: {
          resourceId: resource.id,
          action: perm.action,
          description: perm.description,
          approvalPolicy: perm.approvalPolicy ? (perm.approvalPolicy as any) : undefined
        }
      });
      // Store reference like 'sale.create' -> id
      permissionIds[`${resource.name}.${permission.action}`] = permission.id;
    }
  }

  console.log(`✅ Seeded ${resources.length} Resources and their Permissions`);

  // 2. Define System Default Roles
  const systemRoles = [
    {
      name: 'OWNER',
      description: 'System Root Owner (Has total access, bypasses permissions)',
      isSystem: true,
      isRoot: true,
      permissions: [] // Root doesn't need explicit permissions mapped
    },
    {
      name: 'SHOP_MANAGER',
      description: 'Mobile Shop Manager with full operational control',
      isSystem: true,
      isRoot: false,
      permissions: [
        'sale.create', 'sale.view_all', 'sale.refund', 'sale.view_profit', 'sale.view_cost',
        'inventory.view', 'inventory.add', 'inventory.adjust',
        'jobcard.create', 'jobcard.view_all', 'jobcard.update_status', 'jobcard.assign', 'jobcard.view_financials',
        'staff.view_all', 'report.export', 'expense.create', 'expense.view'
      ]
    },
    {
      name: 'SHOP_STAFF',
      description: 'Standard Mobile Shop Sales/Tech Staff',
      isSystem: true,
      isRoot: false,
      permissions: [
        'sale.create', 'sale.view_own',
        'inventory.view',
        'jobcard.create', 'jobcard.update_status'
      ]
    },
    {
      name: 'GYM_MANAGER',
      description: 'Gym Branch Manager with full operational control',
      isSystem: true,
      isRoot: false,
      permissions: [
        'attendance.mark', 'attendance.view_all',
        'member.add', 'member.edit', 'member.view_all', 'member.view_financials',
        'membership.assign', 'membership.renew', 'membership.cancel',
        'staff.view_all', 'report.export', 'expense.create', 'expense.view'
      ]
    },
    {
      name: 'GYM_TRAINER',
      description: 'Standard Gym Trainer or Front Desk Staff',
      isSystem: true,
      isRoot: false,
      permissions: [
        'attendance.mark',
        'member.view_all'
      ]
    }
  ];

  // Safe Upsert for System Roles (tenantId is null)
  for (const sr of systemRoles) {
    let role = await prisma.role.findFirst({
      where: {
        name: sr.name,
        tenantId: null
      }
    });

    if (!role) {
      role = await prisma.role.create({
        data: {
          name: sr.name,
          description: sr.description,
          isSystem: sr.isSystem,
          isRoot: sr.isRoot,
          category: 'SYSTEM_TEMPLATE'
        }
      });
    } else {
      await prisma.role.update({
        where: { id: role.id },
        data: {
          description: sr.description,
          isSystem: sr.isSystem,
          isRoot: sr.isRoot
        }
      });
    }

    // Assign Permissions
    if (sr.permissions && sr.permissions.length > 0) {
      const rolePermsData = sr.permissions.map((p: string) => {
        const pId = permissionIds[p];
        if (!pId) throw new Error(`Permission ${p} not found during seeding.`);
        return {
          roleId: role!.id,
          permissionId: pId
        };
      });

      // Clear existing to avoid duplicates on reset
      await prisma.rolePermission.deleteMany({
        where: { roleId: role.id }
      });

      await prisma.rolePermission.createMany({
        data: rolePermsData,
        skipDuplicates: true
      });
    }
  }

  console.log(`✅ Seeded ${systemRoles.length} System Template Roles`);
}

async function main() {
  // ────────────────────────────────────────────────
  // VALIDATE ENV BEFORE SEEDING
  // ────────────────────────────────────────────────
  WhatsAppConfigValidator.validateOrExit();

  // ────────────────────────────────────────────────
  // SEED REQUIRED GLOBAL GYM WHATSAPP TEMPLATES
  // ────────────────────────────────────────────────
  const requiredGymTemplates = [
    {
      templateKey: 'new_member_welcome_v3',
      metaTemplateName: 'New Member Welcome',
      moduleType: 'GYM',
      category: 'UTILITY',
      feature: 'WELCOME',
      language: 'en',
      status: 'ACTIVE',
    },
    {
      templateKey: 'membership_expiry_reminder',
      metaTemplateName: 'Membership Expiry Reminder',
      moduleType: 'GYM',
      category: 'UTILITY',
      feature: 'EXPIRY',
      language: 'en',
      status: 'ACTIVE',
    },
    {
      templateKey: 'payment_due_notice_util_v1',
      metaTemplateName: 'Payment Due Notice',
      moduleType: 'GYM',
      category: 'UTILITY',
      feature: 'PAYMENT_DUE',
      language: 'en',
      status: 'ACTIVE',
    },
  ];
  for (const tpl of requiredGymTemplates) {
    await prisma.whatsAppTemplate.upsert({
      where: {
        moduleType_metaTemplateName: {
          moduleType: tpl.moduleType,
          metaTemplateName: tpl.metaTemplateName,
        },
      },
      update: {
        templateKey: tpl.templateKey,
        category: tpl.category,
        feature: tpl.feature,
        language: tpl.language,
        status: tpl.status,
      },
      create: tpl,
    });
  }
  // Plans
  // V1 CLEAN STRUCTURE - ALL FEATURES IN DATABASE

  // STANDARD plans: Only core features, no premium features
  const FEATURES_STANDARD = [
    'STAFF', // Staff management allowed
  ];

  // PRO plans: All premium features enabled
  const FEATURES_PRO = ['STAFF', 'REPORTS'];

  // GYM-specific features
  const FEATURES_GYM_STANDARD = [
    'STAFF',
    'ATTENDANCE', // GYM has attendance tracking
  ];

  const FEATURES_GYM_PRO = [
    'STAFF',
    'ATTENDANCE',
    'REPORTS',
    'WHATSAPP_UTILITY',
    'WHATSAPP_MARKETING',
    'WHATSAPP_ALERTS_AUTOMATION',
  ];

  // MOBIBIX-specific features
  const FEATURES_MOBIBIX_PRO = [
    'STAFF',
    'REPORTS',
    'CUSTOM_PRINT_LAYOUT',
    'MULTI_SHOP',
    'WHATSAPP_UTILITY',
    'WHATSAPP_MARKETING',
    'WHATSAPP_ALERTS_AUTOMATION',
  ];

  // WhatsApp CRM add-on features (Tiered)
  const FEATURES_WHATSAPP_STARTER = [
    'WHATSAPP_UTILITY',
    'WHATSAPP_ALERTS_AUTOMATION',
  ];

  const FEATURES_WHATSAPP_GROWTH = [
    'WHATSAPP_UTILITY',
    'WHATSAPP_MARKETING',
    'WHATSAPP_ALERTS_AUTOMATION', // Basic
    'WHATSAPP_TEAM_INBOX',
    'WHATSAPP_WEBHOOKS',
  ];

  const FEATURES_WHATSAPP_ADVANCED = [
    'WHATSAPP_UTILITY',
    'WHATSAPP_MARKETING',
    'WHATSAPP_ALERTS_AUTOMATION', // Advanced
    'WHATSAPP_TEAM_INBOX',
    'WHATSAPP_WEBHOOKS',
    'WHATSAPP_API_ACCESS',
  ];

  // V1 Plans (clean, no duplication)
  const v1Plans = [
    {
      code: 'TRIAL',
      name: 'TRIAL',
      level: 0,
      memberLimit: 50,
      features: FEATURES_GYM_PRO, // Trial gets all GYM features
      isPublic: false,
      module: 'GYM',
      // Plan limits
      maxStaff: 3,
      maxMembers: 50,
      whatsappUtilityQuota: 10, // 10/day
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 30,
      tagline: 'Experience the full power of GymPilot.',
      description: '14-day free trial with access to all premium features.',
      featuresJson: [
        'All Pro Features Included',
        'Up to 50 Members',
        '3 Staff Accounts',
        'WhatsApp Automations (Trial)',
      ],
    },
    {
      code: 'STANDARD',
      name: 'STANDARD',
      level: 1,
      memberLimit: 200,
      features: FEATURES_GYM_STANDARD, // GYM STANDARD features
      isPublic: true,
      module: 'GYM',
      // Plan limits
      maxStaff: 3,
      maxMembers: 200,
      whatsappUtilityQuota: 0, // Disabled for Standard
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 90,
      tagline: 'Essential management for single-location gyms.',
      description:
        'Manage your gym efficiently with attendance and basic staff roles.',
      featuresJson: [
        'Up to 200 Members',
        '3 Staff Accounts',
        'Attendance Tracking',
        'Basic Reports',
      ],
    },
    {
      code: 'PRO',
      name: 'PRO',
      level: 2,
      memberLimit: null,
      features: FEATURES_GYM_PRO, // GYM PRO features
      isPublic: true,
      module: 'GYM',
      // Plan limits
      maxStaff: null, // Unlimited
      maxMembers: null, // Unlimited
      whatsappUtilityQuota: 500, // 500/month
      whatsappMarketingQuota: 100, // 100/month
      analyticsHistoryDays: 365,
      tagline: 'Advanced growth tools for high-performance gyms.',
      description:
        'Everything in Standard plus premium WhatsApp automations and unlimited growth.',
      featuresJson: [
        'Unlimited Members',
        'Unlimited Staff',
        'WhatsApp Marketing (100/mo)',
        'Advanced Analytics',
      ],
    },
    {
      code: 'WHATSAPP_STARTER',
      name: 'WhatsApp Starter',
      level: 10,
      memberLimit: 0,
      features: FEATURES_WHATSAPP_STARTER,
      isPublic: true,
      isAddon: true, // Mark as addon
      module: 'WHATSAPP_CRM',
      maxStaff: null,
      maxMembers: null,
      whatsappUtilityQuota: 1000, // Message Quota
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 30,
      tagline: 'Essential alerts for growing businesses.',
      description:
        'Start engaging customers with automated alerts and basic notifications.',
      featuresJson: [
        '1,000 Messages/mo',
        'Automated Alerts',
        'Smart Routing',
        '5 Templates',
      ],
    },
    {
      code: 'WHATSAPP_GROWTH',
      name: 'WhatsApp Growth',
      level: 11,
      memberLimit: 0,
      features: FEATURES_WHATSAPP_GROWTH,
      isPublic: true,
      isAddon: true, // Mark as addon
      module: 'WHATSAPP_CRM',
      maxStaff: null,
      maxMembers: null,
      whatsappUtilityQuota: 5000, // Message Quota
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 90,
      tagline: 'Scale your marketing and support.',
      description: 'Unlock team inbox, marketing campaigns, and webhooks.',
      featuresJson: [
        '5,000 Messages/mo',
        'Marketing Campaigns',
        'Team Inbox (3 Users)',
        'Webhooks Integration',
      ],
    },
    {
      code: 'WHATSAPP_ADVANCED',
      name: 'WhatsApp Advanced',
      level: 12,
      memberLimit: 0,
      features: FEATURES_WHATSAPP_ADVANCED,
      isPublic: true,
      isAddon: true, // Mark as addon
      module: 'WHATSAPP_CRM',
      maxStaff: null,
      maxMembers: null,
      whatsappUtilityQuota: 1000000, // High/Unlimited
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 365,
      tagline: 'Full power for high-volume teams.',
      description:
        'Unlimited possibilities with full API access and advanced automation.',
      featuresJson: [
        'Unlimited Quota*',
        'Full API Access',
        'Unlimited Team Members',
        'Advanced Chatbots',
      ],
    },
    // MOBILE_SHOP module plans
    {
      code: 'MOBIBIX_TRIAL',
      name: 'Mobibix Trial',
      level: 0,
      memberLimit: null, // Mobibix never limits parties
      features: FEATURES_MOBIBIX_PRO, // Trial gets all Mobibix features
      isPublic: false,
      module: 'MOBILE_SHOP',
      // Plan limits (Mobibix doesn't limit Parties - only GYM limits Members)
      maxStaff: 3,
      maxMembers: null, // Unlimited parties for Mobibix
      whatsappUtilityQuota: 10, // 10/day
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 30,
      tagline: 'Experience the full power of Mobibix.',
      description:
        '14-day free trial with access to all premium retail features.',
      featuresJson: [
        'Inventory Management',
        'Sales & Billing',
        'WhatsApp Automations (Trial)',
        '3 Staff Accounts',
      ],
    },
    {
      code: 'MOBIBIX_STANDARD',
      name: 'Mobibix Standard',
      level: 1,
      memberLimit: null, // Mobibix never limits parties
      features: FEATURES_STANDARD, // Mobibix STANDARD features
      isPublic: true,
      module: 'MOBILE_SHOP',
      // Plan limits
      maxStaff: 3,
      maxMembers: null, // Unlimited parties for Mobibix
      maxShops: 1, // Single Shop
      whatsappUtilityQuota: 0, // Disabled for Standard
      whatsappMarketingQuota: 0,
      analyticsHistoryDays: 90,
      tagline: 'Professional inventory & sales management.',
      description:
        'Perfect for single-store retailers needing robust stock control.',
      featuresJson: [
        'Single Shop',
        'Unlimited Products',
        'Sales Invoicing',
        'Basic Inventory Tracking',
        '3 Staff Accounts',
      ],
    },
    {
      code: 'MOBIBIX_PRO',
      name: 'Mobibix Pro',
      level: 2,
      memberLimit: null,
      features: FEATURES_MOBIBIX_PRO, // Mobibix PRO features
      isPublic: true,
      module: 'MOBILE_SHOP',
      // Plan limits
      maxStaff: null, // Unlimited
      maxMembers: null, // Unlimited parties for Mobibix
      maxShops: null, // Unlimited Shops
      whatsappUtilityQuota: 500, // 500/month
      whatsappMarketingQuota: 100, // 100/month
      analyticsHistoryDays: 365,
      tagline: 'Scale your retail empire with multi-store power.',
      description:
        'The ultimate retail solution with multi-shop support and premium WhatsApp CRM.',
      featuresJson: [
        'Multi-Store Support',
        'Unlimited Staff',
        'WhatsApp Marketing',
        'Advanced Reporting',
      ],
    },
  ];

  // V1 Pricing (explicit, no calculation)
  const v1Pricing = {
    TRIAL: {
      MONTHLY: 0, // Free trial
    },
    STANDARD: {
      MONTHLY: 19900, // ₹199/month (in paise)
      QUARTERLY: 49900, // ₹499/quarter
      YEARLY: 179900, // ₹1799/year
    },
    PRO: {
      MONTHLY: 39900, // ₹399/month
      QUARTERLY: 99900, // ₹999/quarter
      YEARLY: 359900, // ₹3599/year
    },
    WHATSAPP_STARTER: {
      MONTHLY: 79900,
      QUARTERLY: 239700,
      YEARLY: 799900,
    },
    WHATSAPP_GROWTH: {
      MONTHLY: 149900,
      QUARTERLY: 449700,
      YEARLY: 1499900,
    },
    WHATSAPP_ADVANCED: {
      MONTHLY: 249900,
      QUARTERLY: 749700,
      YEARLY: 2499900,
    },
    MOBIBIX_TRIAL: {
      MONTHLY: 0, // Free trial
    },
    MOBIBIX_STANDARD: {
      MONTHLY: 29900, // ₹299/month
      QUARTERLY: 79900, // ₹799/quarter
      YEARLY: 299900, // ₹2,999/year
    },
    MOBIBIX_PRO: {
      MONTHLY: 49900, // ₹499/month
      QUARTERLY: 139900, // ₹1,399/quarter
      YEARLY: 499900, // ₹4,999/year
    },
  };

  for (const p of v1Plans) {
    // 1. Upsert Plan (duration-agnostic)
    const existingPlan = await prisma.plan.findFirst({
      where: { code: p.code },
    });

    let planId = existingPlan?.id;

    if (existingPlan) {
      await prisma.plan.update({
        where: { id: existingPlan.id },
        data: {
          name: p.name,
          level: p.level,
          isPublic: p.isPublic,
          isAddon: (p as any).isAddon || false,
          module: p.module as any,
          // Update limits
          maxStaff: p.maxStaff,
          maxMembers: p.maxMembers,
          whatsappUtilityQuota: p.whatsappUtilityQuota,
          whatsappMarketingQuota: p.whatsappMarketingQuota,
          analyticsHistoryDays: p.analyticsHistoryDays,
          tagline: p.tagline,
          description: p.description,
          featuresJson: p.featuresJson,
          meta: {}, // Clear legacy meta (e.g. reminderQuotaPerDay)
        },
      });
      console.log(`✅ Updated Plan: ${p.name}`);
    } else {
      const created = await prisma.plan.create({
        data: {
          code: p.code,
          name: p.name,
          level: p.level,
          isActive: true,
          isPublic: p.isPublic,
          isAddon: (p as any).isAddon || false,
          module: p.module as any,
          // Set limits
          maxStaff: p.maxStaff,
          maxMembers: p.maxMembers,
          whatsappUtilityQuota: p.whatsappUtilityQuota,
          whatsappMarketingQuota: p.whatsappMarketingQuota,
          analyticsHistoryDays: p.analyticsHistoryDays,
          tagline: p.tagline,
          description: p.description,
          featuresJson: p.featuresJson,
          meta: {}, // Clear legacy meta
        },
      });
      planId = created.id;
      console.log(`✅ Created Plan: ${p.name}`);
    }

    // 2. Create PlanPrice entries (Phase 1)
    if (planId && v1Pricing[p.code]) {
      const prices = v1Pricing[p.code];

      for (const [cycle, priceValue] of Object.entries(prices)) {
        await prisma.planPrice.upsert({
          where: {
            planId_billingCycle: {
              planId,
              billingCycle: cycle as any,
            },
          },
          update: {
            price: priceValue as number,
            isActive: true,
          },
          create: {
            planId,
            billingCycle: cycle as any,
            price: priceValue as number,
            isActive: true,
          },
        });
      }
      console.log(
        `   - Created ${Object.keys(prices).length} price points for ${p.name}`,
      );
    }

    // 3. Sync PlanFeature table
    if (planId) {
      await prisma.planFeature.deleteMany({
        where: { planId },
      });

      if (p.features.length > 0) {
        await prisma.planFeature.createMany({
          data: p.features.map((f) => ({
            planId: planId!,
            feature: f as any,
          })),
        });
        console.log(`   - Synced ${p.features.length} features for ${p.name}`);
      }
    }
  }

  console.log('✅ Plans seeded');

  // HSN DATA
  console.log('🌱 Seeding HSN Data...');
  for (const hsn of HSN_DATA) {
    await prisma.hSNCode.upsert({
      where: { code: hsn.code },
      update: {
        description: hsn.description,
        taxRate: hsn.taxRate,
        isActive: true,
      },
      create: {
        code: hsn.code,
        description: hsn.description,
        taxRate: hsn.taxRate,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${HSN_DATA.length} HSN codes`);

  // ENTERPRISE ROLES
  console.log('\n=========================================');
  await seedEnterpriseRoles();
  console.log('=========================================\n');

  // WHATSAPP INITIALIZATION
  console.log('\n🌱 Seeding WhatsApp configuration...');
  let tenants = await prisma.tenant.findMany({
    select: { id: true, name: true },
  });

  let totalSettings = 0;
  let totalTemplates = 0;
  let totalAutomations = 0;

  if (tenants.length > 0) {
    for (const tenant of tenants) {
      const result = await seedWhatsAppSettingsForTenant(tenant.id);
      if (result.settingsCreated) totalSettings++;
    }
  }

  const moduleTypes = ['GYM', 'MOBILE_SHOP'];
  for (const moduleType of moduleTypes) {
    const result = await seedWhatsAppForModule(moduleType);
    totalTemplates += result.templatesCount;
    totalAutomations += result.automationsCount;
  }

  // ────────────────────────────────────────────────
  // NOTE: Tenant-based WhatsApp phone numbers removed from main seed
  // Use dedicated script: npx ts-node prisma/seed-phone-numbers.ts
  // ────────────────────────────────────────────────

  // MODULE-LEVEL PHONE NUMBERS
  console.log('\n🌱 Seeding module-scoped WhatsApp phone numbers...');
  const modulePhoneResult = await seedModulePhoneNumbers();
  console.log(`✅ Module phone numbers configured`);
  console.log(`   Created: ${modulePhoneResult.created}`);
  console.log(`   Skipped: ${modulePhoneResult.skipped}`);

  // ────────────────────────────────────────────────
  // Seed module defaults into tenant-scoped rows (idempotent)
  // ────────────────────────────────────────────────
  async function seedModuleDefaultsToTenants(): Promise<{
    created: number;
    skipped: number;
  }> {
    const modules = await prisma.whatsAppNumber.findMany({
      where: { tenantId: null, isEnabled: true },
    });
    if (!modules.length) return { created: 0, skipped: 0 };

    const tenantsList = await prisma.tenant.findMany({
      select: { id: true, code: true },
    });
    let created = 0;
    let skipped = 0;

    for (const t of tenantsList) {
      const existing = await prisma.whatsAppNumber.findFirst({
        where: { tenantId: t.id },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const data = modules.map((m) => ({
        tenantId: t.id,
        moduleType: m.moduleType,
        phoneNumber: m.phoneNumber,
        phoneNumberId: m.phoneNumberId,
        wabaId: m.wabaId,
        purpose: m.purpose,
        qualityRating: m.qualityRating,
        isDefault: m.isDefault,
        isEnabled: m.isEnabled,
        displayNumber: m.displayNumber || m.phoneNumber,
      }));

      try {
        const res = await prisma.whatsAppNumber.createMany({
          data,
          skipDuplicates: true,
        });
        created += res.count ?? data.length;
        console.log(
          `Seeded ${res.count ?? data.length} numbers for tenant ${t.code} (${t.id})`,
        );
      } catch (err) {
        console.error(
          `Failed to seed tenant ${t.code} (${t.id}):`,
          (err as Error).message || err,
        );
      }
    }

    return { created, skipped };
  }

  console.log('\n🌱 Copying module defaults into tenants (if missing)...');
  const tenantSeedResult = await seedModuleDefaultsToTenants();
  console.log(`✅ Tenant phone numbers seeded from module defaults`);
  console.log(`   Created: ${tenantSeedResult.created}`);
  console.log(
    `   Tenants skipped (already had numbers): ${tenantSeedResult.skipped}`,
  );

  if (
    tenantSeedResult.created > 0 &&
    (process.env.WHATSAPP_PHONE_NUMBER_ID === 'YOUR_PHONE_NUMBER_ID' ||
      process.env.WHATSAPP_WABA_ID === 'YOUR_WABA_ID')
  ) {
    console.log(
      `\n⚠️  WARNING: Using placeholder credentials for phone numbers!`,
    );
    console.log(`   Update in database via Phone Numbers UI or set env vars:`);
    console.log(`   - WHATSAPP_PHONE_NUMBER_ID`);
    console.log(`   - WHATSAPP_WABA_ID`);
    console.log(`   - WHATSAPP_PHONE_NUMBER\n`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
