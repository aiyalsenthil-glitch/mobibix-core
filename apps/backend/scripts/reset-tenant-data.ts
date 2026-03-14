import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting ULTRASONIC Data Cleanup (Raw SQL Reset)...');

  // 1. Identify users to keep (ADMIN and SUPER_ADMIN)
  const usersToKeep = await prisma.user.findMany({
    where: {
      role: {
        in: [UserRole.ADMIN, UserRole.SUPER_ADMIN],
      },
    },
    select: { id: true },
  });
  const keepUserIds = usersToKeep.map((u) => u.id);

  console.log(`ℹ️ Preserving ${keepUserIds.length} Platform Admin users.`);

  // 2. Define tables to TRUNCATE (User/Tenant specific)
  // These are the ones where we want to wipe everything instantly.
  const tablesToTruncate = [
    // Shop & Sales
    'mb_invoice_item',
    'mb_invoice',
    'mb_job_card_part',
    'mb_job_card',
    'mb_quotation_item',
    'mb_quotation',
    'mb_credit_note_item',
    'mb_credit_note_application',
    'mb_credit_note',
    
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
    'mb_product_category', // Shop specific categories (usually)
    
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

    // Logs & Comms
    'WhatsAppLog',
    'WhatsAppDailyUsage',
    'WhatsAppCampaign',
    'WhatsAppTemplate',
    'WhatsAppAutomation',
    'mb_notification_log',
    'EmailLog',
    'mb_audit_log',
    'PlatformAuditLog',
    'UsageSnapshot',
    'BillingEventLog',
    'AiUsageLog',
    'WebhookLog',
    'WebhookEvent',
    'promo_usages',
    
    // Infrastructure
    'RefreshToken',
    'UserTenant',
    'StaffInvite',
    'ApprovalRequest',
    'mb_shop_staff',
    'mb_shop_document_setting',
    'mb_shop',
    'TenantSubscription',
    'SubscriptionInvoice',
    'SubscriptionAddon',
    'PaymentRetry',
    'Payment',
    'DeletionRequest',
    'DistributorTenantLink',
    'mb_b2_b_purchase_order',
    'mb_b2_b_order_item'
  ];

  // 3. Execution
  try {
    console.log('⚡ Truncating Tables...');
    // We use CASCADE to handle foreign key dependencies automatically
    for (const table of tablesToTruncate) {
        try {
            await prisma.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
        } catch (err: any) {
            console.warn(`⚠️ Skipped table ${table}: ${err.message}`);
        }
    }

    console.log('👤 Cleaning up Users & Roles...');
    // Delete roles that are not system templates
    await prisma.$executeRawUnsafe(`DELETE FROM "RolePermission" WHERE "roleId" IN (SELECT id FROM "Role" WHERE "isSystem" = false);`);
    await prisma.$executeRawUnsafe(`DELETE FROM "Role" WHERE "isSystem" = false;`);

    // Delete users except admins
    const keepIdsList = keepUserIds.map(id => `'${id}'`).join(',');
    if (keepIdsList) {
        await prisma.$executeRawUnsafe(`DELETE FROM "User" WHERE id NOT IN (${keepIdsList});`);
    } else {
        await prisma.$executeRawUnsafe(`DELETE FROM "User";`);
    }

    // Final Tenant wipe
    console.log('🏢 Wiping Tenants...');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "Tenant" CASCADE;`);

    console.log('✨ DATABASE RESET COMPLETE.');
    console.log('ℹ️ Preserved: Admins, Plans, GlobalMasterData, Systems Roles.');

  } catch (error: any) {
    console.error('❌ FATAL: Reset Failed!', error.message);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ FATAL: Reset Failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
