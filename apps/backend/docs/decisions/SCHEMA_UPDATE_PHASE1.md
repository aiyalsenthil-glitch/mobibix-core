# 📋 PRISMA SCHEMA UPDATES - PHASE 1

**Target**: Consolidated schema changes for TIER2 + Hardening fixes  
**Method**: Single Prisma migration (safer than manual SQL)  
**Location**: `apps/backend/prisma/schema.prisma`

---

## STEP 1: UPDATE PRISMA MODELS

Add these to your existing `apps/backend/prisma/schema.prisma`:

### Model: Purchase (Add 11 fields)

```prisma
model Purchase {
  // Existing fields...
  id               String            @id @default(cuid())
  tenantId         String
  shopId           String
  invoiceNumber    String            @unique
  globalSupplierId String?
  supplierName     String

  // ✅ TIER2 Addition: ITC tracking
  supplierGstin    String?           @db.VarChar(15)

  // ✅ TIER2 Addition: GST breakdown (pre-calculated for reports)
  subTotal         Int
  totalGst         Int
  cgst             Int?              @default(0)
  sgst             Int?              @default(0)
  igst             Int?              @default(0)

  // ✅ Hardening #1: Legacy GST tracking
  isLegacyGstApproximation Boolean  @default(false)  // TRUE = backfilled, NOT verified
  gstApproximationReason   String?  // Why it's approximated
  verifiedByUserId         String?  // CA user who verified
  verifiedAt               DateTime? // When verified

  // Existing fields...
  invoiceDate      DateTime          @default(now())
  dueDate          DateTime?
  paidAmount       Int               @default(0)
  status           PurchaseStatus    @default(DRAFT)

  // Relations
  items            PurchaseItem[]
  // ... rest of relations

  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}
```

### Model: Invoice (Add 2 fields + update enum)

```prisma
model Invoice {
  id               String            @id @default(cuid())
  tenantId         String
  shopId           String
  invoiceNumber    String            @unique
  customerId       String?
  customerName     String?
  customerGstin    String?           // For B2B identification

  totalAmount      Int
  subTotal         Int?

  // ✅ TIER2: Payment tracking
  paidAmount       Int               @default(0)     // Sum of receipts

  // ✅ TIER2: Enhanced status enum
  status           InvoiceStatus     @default(UNPAID) // WAS: @default(PAID)

  // Relations
  items            InvoiceItem[]
  receipts         Receipt[]         // invoices can have many receipts

  createdAt        DateTime          @default(now())
  updatedAt        DateTime          @updatedAt
}

// ✅ Update this enum
enum InvoiceStatus {
  UNPAID           // No payment received
  PARTIALLY_PAID   // Some payment received
  PAID             // Fully settled
  VOIDED           // Cancelled
}
```

### Model: InvoiceItem (Add tax rate + amount fields)

```prisma
model InvoiceItem {
  id               String            @id @default(cuid())
  invoiceId        String
  invoice          Invoice           @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  shopProductId    String?
  description      String
  hsnCode          String?
  quantity         Int
  unitPrice        Int               // paisa
  lineTotal        Int               // quantity * unitPrice (before tax)

  // ✅ Hardening #6: Store actual tax rates (no hardcoded values)
  cgstRate         Decimal           @default(9.0)   // percentage
  sgstRate         Decimal           @default(9.0)
  igstRate         Decimal           @default(0.0)

  // Tax amounts (calculated from rates)
  cgstAmount       Int?              // paisa
  sgstAmount       Int?              // paisa
  igstAmount       Int?              // paisa
  gstAmount        Int?              // Old field: total tax
  taxAmount        Int?              // Alias for gstAmount

  createdAt        DateTime          @default(now())
}
```

### Model: PurchaseItem (Add tax rate + amount fields)

```prisma
model PurchaseItem {
  id               String            @id @default(cuid())
  purchaseId       String
  purchase         Purchase          @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  shopProductId    String?
  description      String
  hsnSac           String?           // HSN or SAC code
  quantity         Int
  purchasePrice    Int               // paisa, cost per unit
  lineTotal        Int               // quantity * purchasePrice (before tax)

  // ✅ Hardening #6: Store actual tax rates
  cgstRate         Decimal           @default(9.0)
  sgstRate         Decimal           @default(9.0)
  igstRate         Decimal           @default(0.0)

  // Tax amounts
  cgstAmount       Int?              // paisa
  sgstAmount       Int?              // paisa
  igstAmount       Int?              // paisa
  taxAmount        Int?              // total tax

  createdAt        DateTime          @default(now())
}
```

### Model: PaymentVoucher (Add subType + relation)

```prisma
model PaymentVoucher {
  id               String            @id @default(cuid())
  tenantId         String
  shopId           String
  voucherId        String            @unique

  voucherType      VoucherType       // SUPPLIER | EXPENSE | SALARY | ADJUSTMENT

  // ✅ Hardening #4: Track voucher purpose
  voucherSubType   VoucherSubType?   @default(null) // ADVANCE or SETTLEMENT for SUPPLIER type

  date             DateTime          @default(now())
  amount           Int               // paisa
  paymentMethod    PaymentMethod     // CASH | UPI | CARD | BANK (NOT CREDIT)
  transactionRef   String?
  narration        String?

  globalSupplierId String?
  expenseCategory  String?
  linkedPurchaseId String?           // For SETTLEMENT vouchers

  // ✅ Hardening #4: Track advance applications
  advanceApplications AdvanceApplication[]

  status           String            @default("ACTIVE")
  createdBy        String
  createdAt        DateTime          @default(now())
}

// ✅ Add this new enum
enum VoucherSubType {
  ADVANCE      // Prepayment to supplier (not against specific purchase)
  SETTLEMENT   // Payment against purchase
}
```

### Model: AdvanceApplication (NEW - for tracking advance applications)

```prisma
// ✅ NEW MODEL for Hardening #4
model AdvanceApplication {
  id                String          @id @default(cuid())
  tenantId          String

  advanceVoucherId  String
  advanceVoucher    PaymentVoucher  @relation(fields: [advanceVoucherId], references: [id], onDelete: Cascade)

  purchaseId        String
  purchase          Purchase        @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  amount            Int             // paisa, how much of advance applied
  appliedAt         DateTime        @default(now())

  @@unique([advanceVoucherId, purchaseId]) // One application per advance per purchase
}
```

---

## STEP 2: GENERATE MIGRATION

Run this command in the backend directory:

```bash
cd apps/backend

# This generates the migration file based on schema.prisma changes
npx prisma migrate dev --name "tier2_hardening_complete"
```

This will:

1. Create migration file: `prisma/migrations/[timestamp]_tier2_hardening_complete/migration.sql`
2. Apply it to development database
3. Regenerate Prisma Client types

---

## STEP 3: VERIFY MIGRATION FILE (REVIEW BEFORE PRODUCTION)

Check the generated file at:

```
apps/backend/prisma/migrations/[timestamp]_tier2_hardening_complete/migration.sql
```

It should contain (in order):

1. ALTER TABLE Purchase: ADD supplierGstin, cgst, sgst, igst
2. ALTER TABLE Purchase: ADD isLegacyGstApproximation, gstApproximationReason, verifiedByUserId, verifiedAt
3. ALTER TABLE Invoice: ADD paidAmount
4. ALTER TABLE Invoice: MODIFY status ENUM add new values
5. UPDATE Invoice: SET status = CASE...END (backfill logic)
6. UPDATE Invoice: SET paidAmount = SUM(receipts) (backfill logic)
7. UPDATE Purchase: SET cgst/sgst (backfill legacy data)
8. ALTER TABLE PaymentVoucher: ADD voucherSubType
9. CREATE TABLE AdvanceApplication (new table)
10. ALTER TABLE InvoiceItem: ADD cgstRate, sgstRate, igstRate, cgstAmount, sgstAmount, igstAmount
11. ALTER TABLE PurchaseItem: ADD cgstRate, sgstRate, igstRate, cgstAmount, sgstAmount, igstAmount
12. UPDATE InvoiceItem/PurchaseItem: SET cgstAmount/sgstAmount (backfill)

---

## STEP 4: DATA BACKFILL VERIFICATION

After migration runs, verify data integrity:

```sql
-- Check legacy GST flag set correctly
SELECT COUNT(*) as legacy_purchases
FROM "Purchase"
WHERE "isLegacyGstApproximation" = true;
-- Expected: >0 (purchases > 30 days old)

-- Check Invoice.paidAmount backfilled
SELECT COUNT(*) as invoices_with_paid
FROM "Invoice"
WHERE "paidAmount" > 0;
-- Expected: >0 (invoices with receipts)

-- Check status enum updated
SELECT DISTINCT status FROM "Invoice" LIMIT 5;
-- Expected: mix of UNPAID, PARTIALLY_PAID, PAID, VOIDED

-- Verify: Sum of paidAmount = Sum of active receipts
SELECT
  SUM(i."paidAmount") as total_invoice_paid,
  (SELECT SUM(r."amount") FROM "Receipt" r WHERE r."status" = 'ACTIVE') as total_receipts
FROM "Invoice" i;
-- Expected: Should be equal (or differ by <100 due to rounding)
```

---

## STEP 5: ENUM UPDATES IN CODE

After migration, ensure TypeScript enums are updated:

```typescript
// apps/backend/src/core/enums.ts (or wherever enums are defined)

export enum InvoiceStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  VOIDED = 'VOIDED',
}

export enum VoucherSubType {
  ADVANCE = 'ADVANCE',
  SETTLEMENT = 'SETTLEMENT',
}
```

---

## ROLLBACK PLAN (If Issues Found)

If migration fails on staging:

```bash
# Rollback last migration
npx prisma migrate resolve --rolled-back [timestamp]_tier2_hardening_complete

# Revert schema.prisma to previous version (from git)
git checkout HEAD -- prisma/schema.prisma

# Regenerate
npx prisma generate
```
