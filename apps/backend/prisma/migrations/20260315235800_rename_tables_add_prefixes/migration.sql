-- Rename tables to match @@map() directives in schema.prisma.
-- Original migrations used PascalCase names; schema now uses mb_/gp_/lg_ prefixes.
-- Using IF EXISTS so this migration is idempotent and safe on both old and new DBs.

-- ─── MobiBix (mb_) ────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "Shop"                RENAME TO "mb_shop";
ALTER TABLE IF EXISTS "ShopDocumentSetting" RENAME TO "mb_shop_document_setting";
ALTER TABLE IF EXISTS "ShopProduct"         RENAME TO "mb_shop_product";
ALTER TABLE IF EXISTS "ShopStaff"           RENAME TO "mb_shop_staff";
ALTER TABLE IF EXISTS "Party"               RENAME TO "mb_party";
ALTER TABLE IF EXISTS "Invoice"             RENAME TO "mb_invoice";
ALTER TABLE IF EXISTS "InvoiceItem"         RENAME TO "mb_invoice_item";
ALTER TABLE IF EXISTS "JobCard"             RENAME TO "mb_job_card";
ALTER TABLE IF EXISTS "JobCardPart"         RENAME TO "mb_job_card_part";
ALTER TABLE IF EXISTS "Purchase"            RENAME TO "mb_purchase";
ALTER TABLE IF EXISTS "PurchaseItem"        RENAME TO "mb_purchase_item";
ALTER TABLE IF EXISTS "PurchaseOrder"       RENAME TO "mb_purchase_order";
ALTER TABLE IF EXISTS "PurchaseOrderItem"   RENAME TO "mb_purchase_order_item";
ALTER TABLE IF EXISTS "Quotation"           RENAME TO "mb_quotation";
ALTER TABLE IF EXISTS "QuotationItem"       RENAME TO "mb_quotation_item";
ALTER TABLE IF EXISTS "Receipt"             RENAME TO "mb_receipt";
ALTER TABLE IF EXISTS "PaymentVoucher"      RENAME TO "mb_payment_voucher";
ALTER TABLE IF EXISTS "ProductCategory"     RENAME TO "mb_product_category";
ALTER TABLE IF EXISTS "GlobalProduct"       RENAME TO "mb_global_product";
ALTER TABLE IF EXISTS "HSNCode"             RENAME TO "mb_h_s_n_code";
ALTER TABLE IF EXISTS "IMEI"                RENAME TO "mb_i_m_e_i";
ALTER TABLE IF EXISTS "StockLedger"         RENAME TO "mb_stock_ledger";
ALTER TABLE IF EXISTS "StockCorrection"     RENAME TO "mb_stock_correction";
ALTER TABLE IF EXISTS "AuditLog"            RENAME TO "mb_audit_log";
ALTER TABLE IF EXISTS "FinancialEntry"      RENAME TO "mb_financial_entry";
ALTER TABLE IF EXISTS "AdvanceApplication"  RENAME TO "mb_advance_application";
ALTER TABLE IF EXISTS "SupplierPayment"     RENAME TO "mb_supplier_payment";
ALTER TABLE IF EXISTS "CustomerAlert"       RENAME TO "mb_customer_alert";
ALTER TABLE IF EXISTS "CustomerFollowUp"    RENAME TO "mb_customer_follow_up";
ALTER TABLE IF EXISTS "CustomerReminder"    RENAME TO "mb_customer_reminder";
ALTER TABLE IF EXISTS "LoyaltyTransaction"  RENAME TO "mb_loyalty_transaction";
ALTER TABLE IF EXISTS "LoyaltyConfig"       RENAME TO "mb_loyalty_config";

-- ─── GymPilot (gp_) ───────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "GymAttendance"  RENAME TO "gp_gym_attendance";
ALTER TABLE IF EXISTS "GymMembership"  RENAME TO "gp_gym_membership";
ALTER TABLE IF EXISTS "Member"         RENAME TO "gp_member";
ALTER TABLE IF EXISTS "MemberPayment"  RENAME TO "gp_member_payment";

-- ─── Ledger (lg_) ─────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS "LedgerCustomer"   RENAME TO "lg_ledger_customer";
ALTER TABLE IF EXISTS "LedgerAccount"    RENAME TO "lg_ledger_account";
ALTER TABLE IF EXISTS "LedgerCollection" RENAME TO "lg_ledger_collection";
ALTER TABLE IF EXISTS "LedgerPayment"    RENAME TO "lg_ledger_payment";
