# 🚀 TIER-2 IMPLEMENTATION EXECUTION PLAN

**Total Tasks**: 40 structured items

---

## SCHEMA CONSOLIDATION & MIGRATION

### Task Group 1A: Core Schema Changes

**Tasks**: #1, #2, #3, #4, #5, #6

```prisma
// File: apps/backend/prisma/schema.prisma

model Purchase {
  // TIER2 additions
  supplierGstin    String?           @db.VarChar(15)
  cgst             Int?              @default(0)
  sgst             Int?              @default(0)
  igst             Int?              @default(0)

  // Hardening #1: Legacy GST flag
  isLegacyGstApproximation Boolean  @default(false)
  gstApproximationReason   String?
  verifiedByUserId         String?
  verifiedAt               DateTime?

  // Hardening #4: Advance tracking
  supplierAdvances AdvanceApplication[]
}

model Invoice {
  // TIER2 additions
  paidAmount       Int               @default(0)

  // Enum change: UNPAID|PARTIALLY_PAID|PAID|VOIDED
  status           InvoiceStatus     @default(UNPAID)
}

enum InvoiceStatus {
  UNPAID
  PARTIALLY_PAID
  PAID
  VOIDED
}

// Hardening #4: Supplier advances
enum VoucherSubType {
  ADVANCE
  SETTLEMENT
}

model PaymentVoucher {
  voucherSubType   VoucherSubType?   @default(null)
  advanceApplications AdvanceApplication[]
}

model AdvanceApplication {
  id                String          @id @default(cuid())
  tenantId          String
  advanceVoucherId  String
  purchaseId        String
  amount            Int
  appliedAt         DateTime        @default(now())
}

// Hardening #5: Item-level tax rates
model InvoiceItem {
  cgstRate         Decimal           @default(9.0)
  sgstRate         Decimal           @default(9.0)
  igstRate         Decimal           @default(0.0)
  cgstAmount       Int
  sgstAmount       Int
  igstAmount       Int
  taxAmount        Int
}

model PurchaseItem {
  cgstRate         Decimal           @default(9.0)
  sgstRate         Decimal           @default(9.0)
  igstRate         Decimal           @default(0.0)
  cgstAmount       Int
  sgstAmount       Int
  igstAmount       Int
  taxAmount        Int
}
```

**Migration File** (run: `npx prisma migrate dev --name "tier2_hardening_complete"`):

```sql
-- TIER2: Purchase additions
ALTER TABLE "Purchase"
ADD COLUMN "supplierGstin" VARCHAR(15),
ADD COLUMN "cgst" INT DEFAULT 0,
ADD COLUMN "sgst" INT DEFAULT 0,
ADD COLUMN "igst" INT DEFAULT 0;

-- Hardening #1: Legacy GST tracking
ALTER TABLE "Purchase"
ADD COLUMN "isLegacyGstApproximation" BOOLEAN DEFAULT false,
ADD COLUMN "gstApproximationReason" TEXT,
ADD COLUMN "verifiedByUserId" VARCHAR(255),
ADD COLUMN "verifiedAt" TIMESTAMP;

-- TIER2: Invoice updates
ALTER TABLE "Invoice"
ADD COLUMN "paidAmount" INT DEFAULT 0;

-- Update status enum
ALTER TABLE "Invoice"
MODIFY COLUMN "status" ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOIDED') DEFAULT 'UNPAID';

-- Backfill Invoice.paidAmount from Receipt sum
UPDATE "Invoice" i
SET "paidAmount" = COALESCE((
  SELECT SUM(r."amount")
  FROM "Receipt" r
  WHERE r."linkedInvoiceId" = i."id" AND r."status" = 'ACTIVE'
), 0)
WHERE i."status" != 'VOIDED';

-- Update Invoice.status based on payment state
UPDATE "Invoice" i
SET "status" = CASE
  WHEN "paidAmount" >= "totalAmount" THEN 'PAID'
  WHEN "paidAmount" > 0 THEN 'PARTIALLY_PAID'
  ELSE 'UNPAID'
END
WHERE "status" != 'VOIDED';

-- Mark backfilled Purchase CGST/SGST as legacy
UPDATE "Purchase"
SET "isLegacyGstApproximation" = true,
    "gstApproximationReason" = 'Backfilled from totalGst during Tier-2 migration',
    "cgst" = FLOOR("totalGst" / 2),
    "sgst" = "totalGst" - FLOOR("totalGst" / 2)
WHERE "invoiceDate" < CURRENT_DATE - INTERVAL 30 DAY
  AND "cgst" IS NULL;

-- Hardening #4: Voucher subtype
ALTER TABLE "PaymentVoucher"
ADD COLUMN "voucherSubType" VARCHAR(20);

-- Create AdvanceApplication table
CREATE TABLE "AdvanceApplication" (
  "id" VARCHAR(191) NOT NULL PRIMARY KEY,
  "tenantId" VARCHAR(191) NOT NULL,
  "advanceVoucherId" VARCHAR(191) NOT NULL,
  "purchaseId" VARCHAR(191) NOT NULL,
  "amount" INT NOT NULL,
  "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("advanceVoucherId") REFERENCES "PaymentVoucher"("id"),
  FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id")
);

-- Hardening #5: Item tax rates
ALTER TABLE "InvoiceItem"
ADD COLUMN "cgstRate" DECIMAL(5,2) DEFAULT 9.0,
ADD COLUMN "sgstRate" DECIMAL(5,2) DEFAULT 9.0,
ADD COLUMN "igstRate" DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN "cgstAmount" INT,
ADD COLUMN "sgstAmount" INT,
ADD COLUMN "igstAmount" INT;

ALTER TABLE "PurchaseItem"
ADD COLUMN "cgstRate" DECIMAL(5,2) DEFAULT 9.0,
ADD COLUMN "sgstRate" DECIMAL(5,2) DEFAULT 9.0,
ADD COLUMN "igstRate" DECIMAL(5,2) DEFAULT 0.0,
ADD COLUMN "cgstAmount" INT,
ADD COLUMN "sgstAmount" INT,
ADD COLUMN "igstAmount" INT;

-- Backfill item rates from invoice/purchase GST split
-- (Split existing taxAmount equally between CGST/SGST if intra-state)
-- This is conservative; CA will verify and correct
UPDATE "InvoiceItem" ii
SET "cgstAmount" = FLOOR(ii."gstAmount" / 2),
    "sgstAmount" = ii."gstAmount" - FLOOR(ii."gstAmount" / 2)
WHERE ii."gstAmount" > 0;

UPDATE "PurchaseItem" pi
SET "cgstAmount" = FLOOR(pi."taxAmount" / 2),
    "sgstAmount" = pi."taxAmount" - FLOOR(pi."taxAmount" / 2)
WHERE pi."taxAmount" > 0;
```

---

## BACKEND SERVICES

### Task Group 2A: TIER2 Core Services

**Tasks**: #7, #8, #9

Create files:

- `apps/backend/src/core/purchases/purchases.service.ts` (enhance)
- `apps/backend/src/modules/mobileshop/receipts/receipts.service.ts` (enhance)
- `apps/backend/src/modules/mobileshop/vouchers/vouchers.service.ts` (enhance)

### Task Group 2B: Hardening Services

**Tasks**: #10, #11, #12, #13, #14, #15, #16, #17, #18, #19

Create files:

- `apps/backend/src/core/purchases/gst-verification.service.ts`
- `apps/backend/src/core/purchases/purchase-audit.service.ts`
- `apps/backend/src/modules/mobileshop/receipts/receipts-integrity.service.ts`
- `apps/backend/src/modules/mobileshop/vouchers/advance-application.service.ts`
- `apps/backend/src/modules/mobileshop/reports/gstr1.service.ts`
- `apps/backend/src/modules/mobileshop/reports/gstr2.service.ts`
- `apps/backend/src/modules/mobileshop/reports/aging.service.ts`
- `apps/backend/src/modules/mobileshop/invoices/invoice-validation.service.ts`
- `apps/backend/src/modules/mobileshop/invoices/item-tax.service.ts`

---

## API CONTROLLERS

### Task Group 3A: TIER2 & Hardening Controllers

**Tasks**: #20, #21, #22, #23

Enhance/create files:

- `apps/backend/src/modules/mobileshop/reports/reports.controller.ts`
- `apps/backend/src/core/purchases/purchases.controller.ts`

---

## FRONTEND TYPES & PAGES

### Task Group 4A: Type Definitions

**Tasks**: #24, #25

Update:

- `apps/mobibix-web/src/types/accounting.ts`

### Task Group 4B: Existing Page Updates

**Tasks**: #26, #27, #28, #29

Update pages:

- Invoice list
- Purchase form
- Receipt form
- Voucher form

### Task Group 4C: New Report Pages

**Tasks**: #30, #31, #32

Create pages:

- GSTR-1 report
- Receivables aging
- Payables aging

---

## TESTING

### Task Group 5A: Unit & Integration Tests

**Tasks**: #33, #34

Create test files:

- `tests/purchases.validation.spec.ts`
- `tests/tier2-accounting.e2e.spec.ts`

### Task Group 5B: Database & API Testing

**Tasks**: #35, #36

---

## CA REVIEW & DEPLOYMENT

### Task Group 6A: CA Sign-off

**Tasks**: #37, #38

### Task Group 6B: Documentation & Rollout

**Tasks**: #39, #40

---

## QUICK REFERENCE: CODE TEMPLATES

### 1️⃣ Purchase Submission (Atomic + Idempotent)

```typescript
async submitPurchase(tenantId: string, purchaseId: string): Promise<Purchase> {
  // 1. Pre-transaction validation (status check OUTSIDE)
  const purchase = await this.prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true }
  });

  if (purchase.status !== 'DRAFT') {
    this.logger.warn(`Duplicate submission attempt: ${purchase.invoiceNumber}`);
    throw new BadRequestException(`Already submitted (status: ${purchase.status})`);
  }

  // 2. GSTIN validation if GST
  if (purchase.totalGst > 0 && !purchase.supplierGstin) {
    throw new BadRequestException('Supplier GSTIN mandatory for GST');
  }

  // 3. Atomic transaction with Serializable isolation
  return await this.prisma.$transaction(
    async (tx) => {
      // Re-check status INSIDE transaction (prevent race)
      const txPurchase = await tx.purchase.findUnique({ where: { id: purchaseId } });
      if (txPurchase.status !== 'DRAFT') {
        throw new BadRequestException('Status changed during submission');
      }

      // Update status
      await tx.purchase.update({ where: { id: purchaseId }, data: { status: 'SUBMITTED' } });

      // Check for duplicate stock entries
      const existingStock = await tx.stockLedger.findMany({
        where: { referenceId: purchaseId, referenceType: 'PURCHASE', type: 'IN' }
      });
      if (existingStock.length > 0) {
        throw new BadRequestException('Stock already created');
      }

      // Create stock entries
      await tx.stockLedger.createMany({
        data: purchase.items.map(item => ({
          id: cuid(),
          tenantId,
          shopId: purchase.shopId,
          shopProductId: item.shopProductId,
          type: 'IN',
          quantity: item.quantity,
          costPerUnit: item.purchasePrice,
          referenceType: 'PURCHASE',
          referenceId: purchase.id
        }))
      });

      // Audit log
      await this.auditService.logSubmissionAttempt(tenantId, purchaseId, 'SUCCESS');

      return tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
    },
    { timeout: 30000, isolationLevel: 'Serializable' }
  );
}
```

### 2️⃣ Receipt Creation (Prevent Over-Collection)

```typescript
async createReceipt(tenantId: string, shopId: string, dto: CreateReceiptRequest, userId: string) {
  if (dto.paymentMethod === 'CREDIT') {
    throw new BadRequestException('CREDIT not allowed');
  }

  let invoice: Invoice | null = null;
  if (dto.linkedInvoiceId) {
    invoice = await this.prisma.invoice.findUnique({ where: { id: dto.linkedInvoiceId } });
    const totalReceived = invoice.paidAmount + dto.amount;
    if (totalReceived > invoice.totalAmount) {
      throw new BadRequestException(
        `Cannot receive ₹${dto.amount}. Outstanding: ₹${invoice.totalAmount - invoice.paidAmount}`
      );
    }
  }

  // Atomic: Receipt + Invoice update
  return await this.prisma.$transaction(async (tx) => {
    const receipt = await tx.receipt.create({ data: { /* ... */ } });

    if (invoice) {
      const newPaidAmount = invoice.paidAmount + receipt.amount;
      const newStatus =
        newPaidAmount >= invoice.totalAmount ? 'PAID' :
        newPaidAmount > 0 ? 'PARTIALLY_PAID' : 'UNPAID';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { paidAmount: newPaidAmount, status: newStatus }
      });
    }

    return receipt;
  });
}
```

### 3️⃣ GSTR-1 (Per-Item HSN)

```typescript
async generateSalesRegister(tenantId: string, startDate: Date, endDate: Date) {
  const invoices = await this.prisma.invoice.findMany({
    where: { tenantId, status: { not: 'VOIDED' }, invoiceDate: { gte: startDate, lte: endDate } },
    include: { items: true }
  });

  // ✅ Build B2B lines PER ITEM (not per invoice)
  const b2bLines = [];
  for (const invoice of invoices.filter(i => i.customerGstin)) {
    for (const item of invoice.items) {
      b2bLines.push({
        invoiceNo: invoice.invoiceNumber,
        customerGstin: invoice.customerGstin,
        hsnCode: item.hsnCode,  // ✅ Use ITEM's HSN
        taxableValue: item.lineTotal - (item.cgstAmount + item.sgstAmount + item.igstAmount),
        cgstAmount: item.cgstAmount,
        sgstAmount: item.sgstAmount
      });
    }
  }

  return { b2b: { lines: b2bLines }, ... };
}
```

### 4️⃣ Legacy GST Verification

```typescript
async verifyLegacyGST(tenantId: string, purchaseId: string, cgst: number, sgst: number, igst: number, verifiedBy: string) {
  const verifiedTotal = cgst + sgst + igst;
  const purchase = await this.prisma.purchase.findUnique({ where: { id: purchaseId } });

  if (verifiedTotal !== purchase.totalGst) {
    throw new BadRequestException('Verified GST total mismatch');
  }

  return await this.prisma.purchase.update({
    where: { id: purchaseId },
    data: {
      cgst, sgst, igst,
      isLegacyGstApproximation: false,
      verifiedByUserId: verifiedBy,
      verifiedAt: new Date()
    }
  });
}
```

### 5️⃣ Advance Voucher (Not Auto-Payment)

```typescript
async createAdvanceVoucher(tenantId: string, shopId: string, dto: CreateVoucherDto, userId: string) {
  return await this.prisma.$transaction(async (tx) => {
    const voucher = await tx.paymentVoucher.create({
      data: {
        voucherSubType: 'ADVANCE',  // ✅ Prepayment, not linked
        amount: dto.amount,
        status: 'ACTIVE'
      }
    });

    // ✅ Create FinancialEntry OUT
    await tx.financialEntry.create({
      data: {
        type: 'OUT',
        amount: voucher.amount,
        referenceType: 'VOUCHER_ADVANCE',
        referenceId: voucher.id
      }
    });

    // ✅ Does NOT update Purchase.paidAmount
    // AdvanceApplicationService applies it later per purchase

    return voucher;
  });
}
```

---

## EXECUTION CHECKLIST

**Pre-Implementation**:

- [ ] Backup production database
- [ ] Create staging environment
- [ ] Review all 3 specification documents

**During Implementation**:

- [ ] Run migrations on staging
- [ ] Run unit tests after each phase
- [ ] Run E2E tests
- [ ] CA review GSTR-1/2 formats

**Post-Implementation**:

- [ ] All 40 tasks completed
- [ ] Zero broken tests
- [ ] CA approval signed
- [ ] Documentation finalized
- [ ] Rollback plan tested
- [ ] Production deployment scheduled

---

**Next Step**: Execute Phase 1 (Schema migrations) on staging database
