import {
  PrismaClient,
  ModuleType,
  BillingCycle,
  PromoCodeType,
} from '@prisma/client';
import { runPermissionSeed } from '../src/core/permissions/permissions.seed-logic';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const HSN_DATA = [
  { code: '8517', description: 'Mobile phones and parts', taxRate: 18 },
  { code: '8523', description: 'Memory cards, Pen drives', taxRate: 18 },
  { code: '8504', description: 'Chargers, Adapters', taxRate: 18 },
  { code: '8518', description: 'Headphones, Earphones', taxRate: 18 },
  { code: '9987', description: 'Repair services', taxRate: 18 },
];

const FEATURES_GYM_STANDARD = ['STAFF', 'ATTENDANCE'];
const FEATURES_GYM_PRO = [
  'STAFF',
  'ATTENDANCE',
  'REPORTS',
  'WHATSAPP_UTILITY',
  'WHATSAPP_MARKETING',
  'WHATSAPP_ALERTS_AUTOMATION',
];
const FEATURES_MOBIBIX_PRO = [
  'STAFF',
  'REPORTS',
  'CUSTOM_PRINT_LAYOUT',
  'MULTI_SHOP',
  'WHATSAPP_UTILITY',
  'WHATSAPP_MARKETING',
  'WHATSAPP_ALERTS_AUTOMATION',
];
const FEATURES_WHATSAPP_GROWTH = [
  'WHATSAPP_UTILITY',
  'WHATSAPP_MARKETING',
  'WHATSAPP_ALERTS_AUTOMATION',
  'WHATSAPP_TEAM_INBOX',
  'WHATSAPP_WEBHOOKS',
];

// Official API (Authkey) addon plan features
// WEB mode (Baileys) is free in Pro. Official API requires these addon plans.
const FEATURES_WA_OFFICIAL_STARTER = [
  'WHATSAPP_UTILITY',
  'WHATSAPP_ALERTS_AUTOMATION',
  'WHATSAPP_OFFICIAL_API', // Gates AUTHKEY/META_CLOUD provider access
];
const FEATURES_WA_OFFICIAL_PRO = [
  'WHATSAPP_UTILITY',
  'WHATSAPP_MARKETING',
  'WHATSAPP_ALERTS_AUTOMATION',
  'WHATSAPP_OFFICIAL_API',
  'WHATSAPP_SMS',
  'WHATSAPP_TEAM_INBOX',
];
const FEATURES_WA_OFFICIAL_BUSINESS = [
  'WHATSAPP_UTILITY',
  'WHATSAPP_MARKETING',
  'WHATSAPP_ALERTS_AUTOMATION',
  'WHATSAPP_OFFICIAL_API',
  'WHATSAPP_SMS',
  'WHATSAPP_TEAM_INBOX',
  'WHATSAPP_WEBHOOKS',
  'WHATSAPP_API_ACCESS',
];

const ADDON_PACKS = [
  {
    code: 'WA_ADDON_500',
    name: 'WhatsApp Pack 500 (Utility)',
    level: 0,
    module: ModuleType.GYM,
    isAddon: true,
    meta: {
      quota: {
        utility: 500,
        marketing: 0,
      },
    },
    price: 19900,
  },
  {
    code: 'WA_ADDON_200',
    name: 'WhatsApp Pack 200 (Marketing)',
    level: 0,
    module: ModuleType.GYM,
    isAddon: true,
    meta: {
      quota: {
        utility: 0,
        marketing: 200,
      },
    },
    price: 19900,
  },
];

const V1_PLANS = [
  {
    code: 'TRIAL',
    name: 'TRIAL',
    level: 0,
    memberLimit: 50,
    features: FEATURES_GYM_PRO,
    isPublic: false,
    module: 'GYM',
    maxStaff: 3,
    maxMembers: 50,
    whatsappUtilityQuota: 10,
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
    features: FEATURES_GYM_STANDARD,
    isPublic: true,
    module: 'GYM',
    maxStaff: 3,
    maxMembers: 200,
    whatsappUtilityQuota: 0,
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
    features: FEATURES_GYM_PRO,
    isPublic: true,
    module: 'GYM',
    maxStaff: null,
    maxMembers: null,
    whatsappUtilityQuota: 500,
    whatsappMarketingQuota: 100,
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
    code: 'MOBIBIX_TRIAL',
    name: 'Mobibix Trial',
    level: 0,
    memberLimit: null,
    features: FEATURES_MOBIBIX_PRO,
    isPublic: false,
    module: 'MOBILE_SHOP',
    maxStaff: 3,
    maxMembers: null,
    whatsappUtilityQuota: 10,
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
    code: 'MOBIBIX_PRO',
    name: 'Mobibix Pro',
    level: 2,
    memberLimit: null,
    features: FEATURES_MOBIBIX_PRO,
    isPublic: true,
    module: 'MOBILE_SHOP',
    maxStaff: null,
    maxMembers: null,
    maxShops: null,
    whatsappUtilityQuota: 500,
    whatsappMarketingQuota: 100,
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
  {
    code: 'WHATSAPP_GROWTH',
    name: 'WhatsApp Growth',
    level: 11,
    memberLimit: 0,
    features: FEATURES_WHATSAPP_GROWTH,
    isPublic: true,
    isAddon: true,
    module: 'WHATSAPP_CRM',
    maxStaff: null,
    maxMembers: null,
    whatsappUtilityQuota: 5000,
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
  // ─────────────────────────────────────────────────────────────────────
  // OFFICIAL API ADDON PLANS (Authkey CPaaS)
  // Authkey wholesale rates: Utility ₹0.18 | Marketing ₹0.95 | Auth ₹0.18
  // Our rate: ~2.5× wholesale. Margin: 40-65%.
  // Web Mode (Baileys QR) is FREE in PRO plans — no addon required.
  // ─────────────────────────────────────────────────────────────────────
  {
    // Authkey wholesale cost at full utilization: 1000×0.18 = ₹180
    // Our revenue: ₹499 | Gross margin: ₹319 (64%)
    code: 'WA_OFFICIAL_STARTER',
    name: 'WhatsApp Official – Starter',
    level: 12,
    module: 'WHATSAPP_CRM' as ModuleType,
    isAddon: true,
    isPublic: true,
    features: FEATURES_WA_OFFICIAL_STARTER,
    maxStaff: null,
    maxMembers: null,
    whatsappUtilityQuota: 1000,
    whatsappMarketingQuota: 0,
    analyticsHistoryDays: 90,
    tagline: 'Official WhatsApp delivery for growing shops.',
    description:
      'Upgrade to the Authkey Official API. Send 1,000 utility messages/month with guaranteed delivery. No ban risk.',
    featuresJson: [
      '1,000 Utility Messages/mo',
      'Official API (No ban risk)',
      'Delivery Reports',
      'SMS Access Included',
      'Automations & Reminders',
    ],
  },
  {
    // Authkey cost: 3000×0.18 + 150×0.95 = ₹540+142 = ₹682
    // Revenue: ₹1,199 | Margin: ₹517 (43%)
    code: 'WA_OFFICIAL_PRO',
    name: 'WhatsApp Official – Pro',
    level: 13,
    module: 'WHATSAPP_CRM' as ModuleType,
    isAddon: true,
    isPublic: true,
    features: FEATURES_WA_OFFICIAL_PRO,
    maxStaff: null,
    maxMembers: null,
    whatsappUtilityQuota: 3000,
    whatsappMarketingQuota: 150,
    analyticsHistoryDays: 180,
    tagline: 'Marketing + support at scale.',
    description:
      'Full Official API access with marketing campaigns, SMS, and team inbox for growing businesses.',
    featuresJson: [
      '3,000 Utility + 150 Marketing Messages/mo',
      'SMS Sending (same number)',
      'Team Inbox (5 agents)',
      'Bulk Campaigns',
      'All Automations',
    ],
  },
  {
    // Authkey cost: 8000×0.18 + 400×0.95 = ₹1440+380 = ₹1820
    // Revenue: ₹2,499 | Margin: ₹679 (27%)
    code: 'WA_OFFICIAL_BUSINESS',
    name: 'WhatsApp Official – Business',
    level: 14,
    module: 'WHATSAPP_CRM' as ModuleType,
    isAddon: true,
    isPublic: true,
    features: FEATURES_WA_OFFICIAL_BUSINESS,
    maxStaff: null,
    maxMembers: null,
    whatsappUtilityQuota: 8000,
    whatsappMarketingQuota: 400,
    analyticsHistoryDays: 365,
    tagline: 'Enterprise-grade messaging for high-volume businesses.',
    description:
      'Full Official API with webhooks, API access, and priority support for chains and franchises.',
    featuresJson: [
      '8,000 Utility + 400 Marketing/mo',
      'Webhooks & API Access',
      'Unlimited Agents',
      'Priority Support',
      'Full Analytics',
    ],
  },
  // ─────────────────────────────────────────────────────────────────────
  // UTILITY TOP-UP PACKS (overage credit packs for Official API plans)
  // ─────────────────────────────────────────────────────────────────────
  {
    code: 'WA_UTIL_PACK_1000',
    name: 'WhatsApp Utility Pack – 1,000',
    level: 0,
    module: 'WHATSAPP_CRM' as ModuleType,
    isAddon: true,
    isPublic: true,
    whatsappUtilityQuota: 1000,
    whatsappMarketingQuota: 0,
    analyticsHistoryDays: 0,
    tagline: 'Top up your utility messages.',
    description: 'Add 1,000 utility messages to your current Official plan.',
    featuresJson: ['+1,000 Utility Messages', 'Compatible with Official plans'],
  },
  {
    code: 'WA_MKTG_PACK_100',
    name: 'WhatsApp Marketing Pack – 100',
    level: 0,
    module: 'WHATSAPP_CRM' as ModuleType,
    isAddon: true,
    isPublic: true,
    whatsappUtilityQuota: 0,
    whatsappMarketingQuota: 100,
    analyticsHistoryDays: 0,
    tagline: 'Top up your marketing campaigns.',
    description: 'Add 100 marketing conversations to your current Official plan.',
    featuresJson: ['+100 Marketing Conversations', 'Compatible with Official plans'],
  },
  // WA_ADDON_500 and WA_ADDON_200 are seeded by seedAddonPacks() via ADDON_PACKS — not duplicated here.
];

const V1_PRICING = {
  TRIAL: { MONTHLY: 0 },
  STANDARD: {
    MONTHLY: 19900,
    QUARTERLY: 49900,
    YEARLY: 179900,
  },
  PRO: {
    MONTHLY: 39900,
    QUARTERLY: 99900,
    YEARLY: 359900,
    // Razorpay IDs for testing
    RAZORPAY_MONTHLY: 'plan_SNs7ARvIv5n60i',
    RAZORPAY_YEARLY: 'plan_SNs5RkkKAzLBez',
  },
  MOBIBIX_TRIAL: { MONTHLY: 0 },
  MOBIBIX_PRO: {
    MONTHLY: 49900,
    QUARTERLY: 139900,
    YEARLY: 499900,
    // Razorpay IDs for testing
    RAZORPAY_MONTHLY: 'plan_SNs6EYiLAATMCh',
    RAZORPAY_YEARLY: 'plan_SNs6lPPrdFkp44',
  },
  WHATSAPP_GROWTH: {
    MONTHLY: 149900,
    QUARTERLY: 449700,
    YEARLY: 1499900,
  },
  // Official API (Authkey) addon plans
  // Authkey costs × 2.5 + infra/support buffer. 40-65% gross margins.
  WA_OFFICIAL_STARTER: {
    MONTHLY: 49900,    // ₹499/mo  | cost ₹180 | margin 64%
    QUARTERLY: 134900, // ₹1,349 (10% off)
    YEARLY: 479900,    // ₹4,799 (20% off)
  },
  WA_OFFICIAL_PRO: {
    MONTHLY: 119900,   // ₹1,199/mo | cost ₹682 | margin 43%
    QUARTERLY: 323900, // ₹3,239 (10% off)
    YEARLY: 1151900,   // ₹11,519 (20% off)
  },
  WA_OFFICIAL_BUSINESS: {
    MONTHLY: 249900,   // ₹2,499/mo | cost ₹1,820 | margin 27%
    QUARTERLY: 674900, // ₹6,749 (10% off)
    YEARLY: 2399900,   // ₹23,999 (20% off)
  },
  // Top-up packs (fixed monthly, no quarterly/yearly)
  WA_UTIL_PACK_1000: {
    MONTHLY: 39900,    // ₹399 for 1,000 utility msgs (₹0.40/msg vs ₹0.45 PAYG)
  },
  WA_MKTG_PACK_100: {
    MONTHLY: 29900,    // ₹299 for 100 marketing convs (₹2.99/conv vs ₹3.50 PAYG)
  },
};

const GYMPILOT_TEMPLATES = [
  {
    templateKey: 'new_member_welcome_v3',
    metaTemplateName: 'new_member_welcome_v3',
    category: 'UTILITY',
    feature: 'MEMBER_CREATED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    variables: ['member_name', 'gym_name', 'start_date', 'end_date'],
  },
  {
    templateKey: 'payment_due_notice_util_v1',
    metaTemplateName: 'payment_due_notice_util_v1',
    category: 'UTILITY',
    feature: 'PAYMENT_DUE',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    variables: ['amount', 'due_date'],
  },
  {
    templateKey: 'membership_expiry_reminder',
    metaTemplateName: 'membership_expiry_reminder',
    category: 'UTILITY',
    feature: 'MEMBERSHIP_EXPIRY',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    variables: ['member_name', 'expiry_date'],
  },
];

const MOBIBIX_TEMPLATES = [
  {
    templateKey: 'invoice_created_confirmation_v1',
    metaTemplateName: 'invoice_created_confirmation_v1',
    category: 'UTILITY',
    feature: 'INVOICE_CREATED',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    variables: ['customer_name', 'invoice_number', 'total_amount'],
  },
  {
    templateKey: 'payment_pending_reminder_v1',
    metaTemplateName: 'payment_pending_reminder_v1',
    category: 'UTILITY',
    feature: 'PAYMENT_PENDING',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    variables: ['customer_name', 'invoice_number', 'pending_amount'],
  },
  {
    templateKey: 'job_status_ready_v1',
    metaTemplateName: 'job_status_ready_v1',
    category: 'UTILITY',
    feature: 'JOB_READY',
    language: 'en',
    status: 'ACTIVE',
    isDefault: true,
    variables: ['customer_name', 'job_number', 'device_name'],
  },
];

async function ensureMaterializedViews() {
  console.log('📊 Ensuring Materialized Views...');
  try {
    await prisma.$executeRaw`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'admin_global_kpis') THEN
          CREATE MATERIALIZED VIEW admin_global_kpis AS
          WITH tenant_counts AS (
            SELECT COUNT(*)::integer as total_tenants
            FROM "Tenant"
            WHERE code NOT IN ('TEST_FREE', 'TEST_SUB_ACTIVE', 'TEST_EXPIRED')
          ),
          user_counts AS (
            SELECT COUNT(*)::integer as total_users
            FROM "User"
          ),
          active_subs AS (
            SELECT
              "priceSnapshot",
              "billingCycle"
            FROM "TenantSubscription" s
            JOIN "Tenant" t ON s."tenantId" = t.id
            WHERE s.status = 'ACTIVE'
              AND t.code NOT IN ('TEST_FREE', 'TEST_SUB_ACTIVE', 'TEST_EXPIRED')
          ),
          mrr_calc AS (
            SELECT
              COALESCE(SUM(
                CASE
                  WHEN "billingCycle" = 'MONTHLY' THEN "priceSnapshot"
                  WHEN "billingCycle" = 'QUARTERLY' THEN "priceSnapshot" / 3
                  WHEN "billingCycle" = 'YEARLY' THEN "priceSnapshot" / 12
                  ELSE 0
                END
              ), 0)::integer as mrr_paise
            FROM active_subs
          ),
          churn_calc AS (
            SELECT
              (SELECT COUNT(*) FROM "TenantSubscription" s JOIN "Tenant" t ON s."tenantId" = t.id WHERE s.status = 'ACTIVE' AND t.code NOT IN ('TEST_FREE', 'TEST_SUB_ACTIVE', 'TEST_EXPIRED')) as active_count,
              (SELECT COUNT(*) FROM "TenantSubscription" s JOIN "Tenant" t ON s."tenantId" = t.id WHERE s.status = 'CANCELLED' AND s."updatedAt" >= NOW() - INTERVAL '30 days' AND t.code NOT IN ('TEST_FREE', 'TEST_SUB_ACTIVE', 'TEST_EXPIRED')) as cancelled_recently
          )
          SELECT
            tc.total_tenants as "totalTenants",
            uc.total_users as "totalUsers",
            ROUND(mc.mrr_paise / 100.0) as "mrr",
            CASE
              WHEN (cc.active_count + cc.cancelled_recently) > 0
              THEN ROUND((cc.cancelled_recently::float / (cc.active_count + cc.cancelled_recently)) * 100)
              ELSE 0
            END as "churnRate"
          FROM tenant_counts tc, user_counts uc, mrr_calc mc, churn_calc cc;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_matviews WHERE matviewname = 'admin_revenue_monthly') THEN
          CREATE MATERIALIZED VIEW admin_revenue_monthly AS
          SELECT
            TO_CHAR(DATE_TRUNC('month', "createdAt"), 'YYYY-MM') as "month",
            SUM(amount)::integer as "totalRevenue",
            COUNT(*)::integer as "paymentCount"
          FROM "Payment"
          WHERE status = 'SUCCESS'
          GROUP BY 1
          ORDER BY 1 DESC;
        END IF;
      END $$;
    `;
    console.log('✅ Materialized views verified/created');
  } catch (err) {
    console.error('❌ Failed to create materialized views:', err);
  }
}

async function seedWhatsAppSettingsForTenant(tenantId: string) {
  const existing = await prisma.whatsAppSetting.findUnique({
    where: { tenantId },
  });

  if (!existing) {
    await prisma.whatsAppSetting.create({
      data: {
        tenantId,
        provider: 'META',
        enabled: true,
      },
    });
    return { settingsCreated: true };
  }
  return { settingsCreated: false };
}

async function seedWhatsAppTemplates(moduleType: string, templates: any[]) {
  let createdCount = 0;
  for (const t of templates) {
    await prisma.whatsAppTemplate.upsert({
      where: {
        moduleType_metaTemplateName: {
          moduleType,
          metaTemplateName: t.metaTemplateName,
        },
      },
      update: {
        templateKey: t.templateKey,
        category: t.category,
        feature: t.feature,
        language: t.language,
        status: t.status,
        isDefault: t.isDefault,
        variables: t.variables,
      },
      create: {
        moduleType,
        templateKey: t.templateKey,
        metaTemplateName: t.metaTemplateName,
        category: t.category,
        feature: t.feature,
        language: t.language,
        status: t.status,
        isDefault: t.isDefault,
        variables: t.variables,
      },
    });
    createdCount++;
  }
  return createdCount;
}

async function seedGlobalGymAutomations() {
  console.log('🌱 Seeding Global Gym Automations...');
  const WhatsAppTemplates = {
    WELCOME: 'new_member_welcome_v3',
    EXPIRY: 'membership_expiry_reminder',
    PAYMENT_DUE: 'payment_due_notice_util_v1',
  };

  const automations = [
    {
      eventType: 'MEMBER_CREATED',
      templateKey: WhatsAppTemplates.WELCOME,
      offsetDays: 0,
      conditions: null,
    },
    {
      eventType: 'MEMBERSHIP_EXPIRY',
      templateKey: WhatsAppTemplates.EXPIRY,
      offsetDays: -3,
      conditions: [{ field: 'expiryDate', operator: 'DAYS_BEFORE', value: 3 }],
    },
    {
      eventType: 'MEMBERSHIP_EXPIRED',
      templateKey: WhatsAppTemplates.PAYMENT_DUE,
      offsetDays: 1,
      conditions: [{ field: 'pendingAmount', operator: '>', value: 0 }],
    },
  ];

  for (const auto of automations) {
    await prisma.whatsAppAutomation.upsert({
      where: {
        moduleType_eventType: {
          moduleType: 'GYM',
          eventType: auto.eventType as any,
        },
      },
      update: {
        templateKey: auto.templateKey,
        offsetDays: auto.offsetDays,
        conditions: auto.conditions as any,
        enabled: true,
      },
      create: {
        moduleType: 'GYM',
        eventType: auto.eventType as any,
        templateKey: auto.templateKey,
        offsetDays: auto.offsetDays,
        conditions: auto.conditions as any,
        enabled: true,
      },
    });
  }
  console.log('✅ Global gym automations seeded');
}

async function seedAddonPacks() {
  console.log('🌱 Seeding V1 Add-on Packs...');

  for (const pack of ADDON_PACKS) {
    const plan = await prisma.plan.upsert({
      where: { code: pack.code },
      update: {
        name: pack.name,
        isAddon: true,
        meta: pack.meta as any,
      },
      create: {
        code: pack.code,
        name: pack.name,
        level: pack.level,
        module: pack.module,
        isActive: true,
        isPublic: true,
        isAddon: true,
        meta: pack.meta as any,
      },
    });

    console.log(`✅ Plan ensured: ${plan.code}`);

    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle_currency: {
          planId: plan.id,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'INR',
        },
      },
      update: {
        price: pack.price,
      },
      create: {
        planId: plan.id,
        billingCycle: BillingCycle.MONTHLY,
        currency: 'INR',
        price: pack.price,
      },
    });
    console.log(`   Price set: ₹${pack.price / 100}`);
  }

  console.log('✨ Add-on Seeding Complete.');
}

async function seedPromoCodes() {
  const codes = [
    {
      code: 'RG-MB-01',
      type: PromoCodeType.FREE_TRIAL,
      durationDays: 90,
      maxUses: 500,
      description: 'Repairguru Academy Promo: Pro Pack (90 Days)',
    },
  ];

  for (const c of codes) {
    await prisma.promoCode.upsert({
      where: { code: c.code },
      update: {
        type: c.type as any,
        durationDays: c.durationDays,
        maxUses: c.maxUses,
        description: c.description,
      },
      create: {
        code: c.code,
        type: c.type as any,
        durationDays: c.durationDays,
        maxUses: c.maxUses,
        description: c.description,
        isActive: true,
      },
    });
  }
}

async function seedModulePhoneNumbers() {
  console.log('🌱 Seeding Module Phone Numbers...');
  const DEFAULT_PHONE_NUMBER =
    process.env.WHATSAPP_PHONE_NUMBER || '++918667551566';
  const DEFAULT_PHONE_NUMBER_ID =
    process.env.WHATSAPP_PHONE_NUMBER_ID || '100609346426084';
  const DEFAULT_WABA_ID = process.env.WHATSAPP_WABA_ID || '105862215560119';

  const numbers = [
    { module: 'GYM', purpose: 'DEFAULT' },
    { module: 'MOBILE_SHOP', purpose: 'DEFAULT' },
  ];

  let created = 0;
  let skipped = 0;

  for (const n of numbers) {
    try {
      const existing = await prisma.whatsAppNumber.findFirst({
        where: { tenantId: null, moduleType: n.module as any },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.whatsAppNumber.create({
        data: {
          tenantId: null,
          moduleType: n.module as any,
          phoneNumber: DEFAULT_PHONE_NUMBER,
          phoneNumberId: DEFAULT_PHONE_NUMBER_ID,
          wabaId: DEFAULT_WABA_ID,
          isDefault: true,
          isEnabled: true,
        },
      });
      created++;
    } catch (err) {
      console.warn(
        `⚠️ Skipped seeding phone number for ${n.module}:`,
        (err as Error).message,
      );
    }
  }
  return { created, skipped };
}

async function main() {
  console.log('🚀 Starting Master Seed...');

  // 1. Materialized Views
  await ensureMaterializedViews();

  // 2. HSN Data
  console.log('🌱 Seeding HSN Data...');
  for (const hsn of HSN_DATA) {
    await prisma.hSNCode.upsert({
      where: { code: hsn.code },
      update: { description: hsn.description, taxRate: hsn.taxRate },
      create: {
        code: hsn.code,
        description: hsn.description,
        taxRate: hsn.taxRate,
      },
    });
  }

  // 3. Plans & Pricing
  console.log('🌱 Seeding V1 Plans & Pricing...');
  for (const p of V1_PLANS) {
    const plan = await prisma.plan.upsert({
      where: { code: p.code },
      update: {
        name: p.name,
        level: p.level,
        module: p.module as any,
        isPublic: p.isPublic ?? true,
        isAddon: (p as any).isAddon ?? false,
        maxStaff: (p as any).maxStaff,
        maxMembers: (p as any).maxMembers,
        maxShops: (p as any).maxShops,
        whatsappUtilityQuota: (p as any).whatsappUtilityQuota,
        whatsappMarketingQuota: (p as any).whatsappMarketingQuota,
        analyticsHistoryDays: (p as any).analyticsHistoryDays,
        tagline: (p as any).tagline,
        description: (p as any).description,
        featuresJson: (p as any).featuresJson,
        meta: (p as any).meta || {},
      },
      create: {
        code: p.code,
        name: p.name,
        level: p.level,
        module: p.module as any,
        isActive: true,
        isPublic: p.isPublic ?? true,
        isAddon: (p as any).isAddon ?? false,
        maxStaff: (p as any).maxStaff,
        maxMembers: (p as any).maxMembers,
        maxShops: (p as any).maxShops,
        whatsappUtilityQuota: (p as any).whatsappUtilityQuota,
        whatsappMarketingQuota: (p as any).whatsappMarketingQuota,
        analyticsHistoryDays: (p as any).analyticsHistoryDays,
        tagline: (p as any).tagline,
        description: (p as any).description,
        featuresJson: (p as any).featuresJson,
        meta: (p as any).meta || {},
      },
    });

    // Sync Features
    if (p.features) {
      await prisma.planFeature.deleteMany({ where: { planId: plan.id } });
      await prisma.planFeature.createMany({
        data: p.features.map((f) => ({ planId: plan.id, feature: f as any })),
      });
    }

    // Billing Cycles / Pricing
    const pricing = V1_PRICING[p.code];
    if (pricing) {
      const cycles = ['MONTHLY', 'QUARTERLY', 'YEARLY'];
      for (const cycle of cycles) {
        if (pricing[cycle] !== undefined) {
          let rzpId = null;
          if (cycle === 'MONTHLY' && pricing.RAZORPAY_MONTHLY)
            rzpId = pricing.RAZORPAY_MONTHLY;
          if (cycle === 'YEARLY' && pricing.RAZORPAY_YEARLY)
            rzpId = pricing.RAZORPAY_YEARLY;

          await prisma.planPrice.upsert({
            where: {
              planId_billingCycle_currency: {
                planId: plan.id,
                billingCycle: cycle as any,
                currency: 'INR',
              },
            },
            update: { price: pricing[cycle], REMOVED_PAYMENT_INFRAPlanId: rzpId },
            create: {
              planId: plan.id,
              billingCycle: cycle as any,
              currency: 'INR',
              price: pricing[cycle],
              REMOVED_PAYMENT_INFRAPlanId: rzpId,
            },
          });
        }
      }
    } else if ((p as any).price) {
      // For Addons that might have a single unit price
      await prisma.planPrice.upsert({
        where: {
          planId_billingCycle_currency: {
            planId: plan.id,
            billingCycle: BillingCycle.MONTHLY,
            currency: 'INR',
          },
        },
        update: { price: (p as any).price },
        create: {
          planId: plan.id,
          billingCycle: BillingCycle.MONTHLY,
          currency: 'INR',
          price: (p as any).price,
        },
      });
    }
  }

  // 4. WhatsApp Addon Packs
  await seedAddonPacks();

  // 5. Promo Codes
  await seedPromoCodes();

  // 5. WhatsApp Templates
  console.log('🌱 Seeding WhatsApp Templates...');
  await seedWhatsAppTemplates('GYM', GYMPILOT_TEMPLATES);
  await seedWhatsAppTemplates('MOBILE_SHOP', MOBIBIX_TEMPLATES);

  // 6. Global Gym Automations
  await seedGlobalGymAutomations();

  // 7. Module Phone Numbers
  await seedModulePhoneNumbers();

  // 8. Backfill existing tenants with WhatsApp Settings
  const tenants = await prisma.tenant.findMany({ select: { id: true } });
  for (const t of tenants) {
    await seedWhatsAppSettingsForTenant(t.id);
  }

  // 9. Permissions & Roles
  await runPermissionSeed(prisma);

  console.log('✨ Master Seed Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
