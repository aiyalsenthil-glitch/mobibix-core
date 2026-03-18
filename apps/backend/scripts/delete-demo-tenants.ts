import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_CODES = ['DEMO_QFM', 'DEMO_IRS', 'DEMO_PHZ', 'DEMO_FLG', 'DEMO_IHB', 'DEMO_FLS'];
const EXCLUDE_EMAILS = ['test@gmail.com', 'senthilsfour@gmail.com'];

async function main() {
  console.log('🔍 Finding demo tenants...');

  // Find tenants by code
  const tenants = await prisma.tenant.findMany({
    where: { code: { in: DEMO_CODES } },
    select: { id: true, code: true, name: true },
  });

  if (tenants.length === 0) {
    console.log('ℹ️ No demo tenants found. Nothing to delete.');
    return;
  }

  const tenantIds = tenants.map((t) => t.id);

  // Find which tenants are owned by excluded emails
  const excludedUserTenants = await prisma.userTenant.findMany({
    where: {
      tenantId: { in: tenantIds },
      user: { email: { in: EXCLUDE_EMAILS } },
    },
    select: { tenantId: true, user: { select: { email: true } } },
  });

  const excludedTenantIds = new Set(excludedUserTenants.map((ut) => ut.tenantId));

  const toDelete = tenants.filter((t) => !excludedTenantIds.has(t.id));
  const skipped = tenants.filter((t) => excludedTenantIds.has(t.id));

  if (skipped.length > 0) {
    console.log(`⏭️  Skipping ${skipped.length} tenant(s) (owned by excluded users):`);
    skipped.forEach((t) => console.log(`   - ${t.name} (${t.code})`));
  }

  if (toDelete.length === 0) {
    console.log('ℹ️ All demo tenants are owned by excluded users. Nothing deleted.');
    return;
  }

  console.log(`\n🗑️  Deleting ${toDelete.length} demo tenant(s):`);
  toDelete.forEach((t) => console.log(`   - ${t.name} (${t.code}) [id: ${t.id}]`));

  const deleteIds = toDelete.map((t) => t.id);
  const idList = deleteIds.map((id) => `'${id}'`).join(',');

  // Delete using CASCADE — each table where tenantId is a FK
  const tables = [
    // Sales & Invoicing
    'mb_invoice_item',
    'mb_invoice',
    'mb_job_card_part',
    'mb_job_card',
    'mb_quotation_item',
    'mb_quotation',
    'mb_credit_note_item',
    'mb_credit_note_application',
    'mb_credit_note',
    'mb_eway_bill',

    // Inventory
    'mb_i_m_e_i',
    'mb_stock_ledger',
    'mb_stock_correction',
    'mb_stock_verification_item',
    'mb_stock_verification',
    'mb_grn_item',
    'mb_grn',
    'mb_purchase_order_item',
    'mb_purchase_order',
    'mb_purchase_item',
    'mb_purchase',
    'mb_shop_product',
    'mb_product_category',

    // CRM
    'mb_customer_follow_up',
    'mb_customer_reminder',
    'mb_customer_note',
    'mb_customer_alert',
    'mb_loyalty_transaction',
    'mb_loyalty_adjustment',
    'mb_loyalty_config',
    'gp_member_payment',
    'gp_gym_attendance',
    'gp_gym_membership',
    'gp_member',
    'mb_party',
    'mb_contact',
    'mb_supplier_profile',

    // Finance
    'lg_ledger_collection',
    'lg_ledger_payment',
    'lg_ledger_customer',
    'lg_ledger_account',
    'mb_supplier_payment',
    'mb_receipt',
    'mb_payment_voucher',
    'mb_advance_application',
    'mb_financial_entry',
    'mb_daily_closing',
    'mb_shift_closing',
    'mb_cash_variance',
    'mb_daily_metrics',

    // WhatsApp / Comms
    'WhatsAppMessageLog',
    'WhatsAppConversationState',
    'WhatsAppDailyUsage',
    'WhatsAppCampaign',
    'WhatsAppAutomation',
    'WhatsAppTemplate',
    'WhatsAppPhoneNumber',
    'mb_notification_log',
    'EmailLog',
    'mb_audit_log',
    'AiUsageLog',
    'UsageSnapshot',
    'BillingEventLog',

    // Infrastructure
    'mb_b2_b_purchase_order',
    'mb_b2_b_order_item',
    'DistributorTenantLink',
    'DeletionRequest',
    'ApprovalRequest',
    'mb_shop_staff',
    'mb_shop_document_setting',
    'mb_shop',
    'StaffInvite',
    'UserTenant',
    'SubscriptionAddon',
    'SubscriptionInvoice',
    'PaymentRetry',
    'Payment',
    'TenantSubscription',
    'TenantHealthScore',

    // Roles
    'RolePermission',
    'UserRole',
    'Role',
  ];

  console.log('\n⚡ Deleting child records...');
  for (const table of tables) {
    try {
      const result = await prisma.$executeRawUnsafe(
        `DELETE FROM "${table}" WHERE "tenantId" IN (${idList})`,
      );
      if (result > 0) console.log(`   ✓ ${table}: ${result} rows`);
    } catch (err: any) {
      // Table may not have tenantId column or doesn't exist — skip
      if (!err.message.includes('does not exist') && !err.message.includes('column')) {
        console.warn(`   ⚠️  ${table}: ${err.message}`);
      }
    }
  }

  // Also delete users who ONLY belong to these tenants (no other tenants)
  console.log('\n👤 Cleaning up users exclusive to deleted tenants...');
  await prisma.$executeRawUnsafe(`
    DELETE FROM "User"
    WHERE id IN (
      SELECT u.id FROM "User" u
      WHERE u."tenantId" IN (${idList})
        AND u.email NOT IN (${EXCLUDE_EMAILS.map((e) => `'${e}'`).join(',')})
        AND NOT EXISTS (
          SELECT 1 FROM "UserTenant" ut
          WHERE ut."userId" = u.id AND ut."tenantId" NOT IN (${idList})
        )
    )
  `);

  // Delete feature flags for these tenants
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "FeatureFlag" WHERE "tenantId" IN (${idList})`);
  } catch (e: any) {
    console.warn(`   ⚠️  FeatureFlag: ${e.message}`);
  }

  // Delete promoUsages
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM "promo_usages" WHERE "tenantId" IN (${idList})`);
  } catch (e: any) { /* skip */ }

  // Finally delete the tenants
  console.log('\n🏢 Deleting tenant records...');
  const deleted = await prisma.$executeRawUnsafe(
    `DELETE FROM "Tenant" WHERE id IN (${idList})`,
  );
  console.log(`   ✓ Deleted ${deleted} tenant(s)`);

  console.log('\n✅ Done. Demo tenants removed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ FATAL:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
