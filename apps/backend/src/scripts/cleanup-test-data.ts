import { PrismaClient } from '@prisma/client';

/**
 * 🚨 CRITICAL: CLEANUP TEST DATA SCRIPT
 * 
 * Purpose: Remove all user-generated data from the database while preserving
 * system configuration (Plans, Templates, Categories, etc.).
 * 
 * Run with: npx ts-node src/scripts/cleanup-test-data.ts
 */

const prisma = new PrismaClient();

async function main() {


  try {
    // 1. Transactional delete for referential integrity
    // Order: Children -> Parents
    await prisma.$transaction([
      // --- MOBILE SHOP & INVENTORY CHILDREN ---
      prisma.jobCardPart.deleteMany(),
      prisma.purchaseOrderItem.deleteMany(),
      prisma.purchaseItem.deleteMany(),
      prisma.quotationItem.deleteMany(),
      prisma.stockLedger.deleteMany(),
      prisma.iMEI.deleteMany(),

      // --- MOBILE SHOP & INVENTORY PARENTS ---
      prisma.jobCard.deleteMany(),
      prisma.stockCorrection.deleteMany(),
      prisma.purchaseOrder.deleteMany(),
      prisma.purchase.deleteMany(),
      prisma.quotation.deleteMany(),
      prisma.supplierPayment.deleteMany(),
      prisma.ledgerPayment.deleteMany(),
      prisma.shopProduct.deleteMany(),

      // --- GYM MODULE ---
      prisma.memberPayment.deleteMany(),
      prisma.member.deleteMany(),

      // --- BILLING CHILDREN ---
      prisma.subscriptionInvoice.deleteMany(),
      prisma.paymentRetry.deleteMany(),
      prisma.billingEventLog.deleteMany(),
      prisma.subscriptionAddon.deleteMany(),

      // --- BILLING PARENTS ---
      prisma.invoice.deleteMany(),
      prisma.receipt.deleteMany(),
      prisma.financialEntry.deleteMany(),
      prisma.payment.deleteMany(),
      prisma.tenantSubscription.deleteMany(),

      // --- LEDGER & CUSTOMERS ---
      prisma.ledgerCustomer.deleteMany(),
      prisma.ledgerAccount.deleteMany(),

      // --- CRM & WHATSAPP ---
      prisma.whatsAppLog.deleteMany(),
      prisma.whatsAppCampaign.deleteMany(),
      prisma.whatsAppDailyUsage.deleteMany(),
      prisma.customerReminder.deleteMany(),
      prisma.customerFollowUp.deleteMany(),
      prisma.customerAlert.deleteMany(),
      prisma.notificationLog.deleteMany(),
      prisma.emailLog.deleteMany(),

      // --- SYSTEM & AUDIT ---
      prisma.auditLog.deleteMany(),
      prisma.platformAuditLog.deleteMany(),
      prisma.aiUsageLog.deleteMany(),
      prisma.promoUsage.deleteMany(),
      prisma.usageSnapshot.deleteMany(),
      prisma.loyaltyTransaction.deleteMany(),
      prisma.loyaltyAdjustment.deleteMany(),
    ]);



  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
