# 🔧 TIER-2 ACCOUNTING SPINE HARDENING - IMPLEMENTATION SPECIFICATION

**Target**: Full GST compliance + Audit-safe + Self-sufficient  
**Scope**: 8 mandatory fixes without full double-entry journals  
**Effort**: ~4-5 weeks (1 CA architect + 2 backend engineers)

---

## PART 1: SCHEMA CHANGES (MINIMAL)

### 1.1 Purchase Model Addition

```prisma
// In: apps/backend/prisma/schema.prisma
// BEFORE:
model Purchase {
  id               String            @id @default(cuid())
  tenantId         String
  shopId           String
  invoiceNumber    String
  globalSupplierId String?
  supplierName     String            // ← Supplier name only
  // ... rest of fields
}

// AFTER:
model Purchase {
  id               String            @id @default(cuid())
  tenantId         String
  shopId           String
  invoiceNumber    String
  globalSupplierId String?
  supplierName     String
  supplierGstin    String?           // ← NEW: Supplier's GSTIN (15 chars)
  subTotal         Int
  totalGst         Int
  cgst             Int?              // ← NEW: CGST amount (derived but stored for reports)
  sgst             Int?              // ← NEW: SGST amount
  igst             Int?              // ← NEW: IGST amount (for inter-state)
  invoiceDate      DateTime          @default(now())
  // ... rest unchanged
}

// Rationale:
// - supplierGstin: MANDATORY for ITC eligibility (CGST Act Sec 16)
// - CGST/SGST/IGST: Pre-calculated for GSTR-2 report performance
//   (Otherwise report must recalculate per item GST - complex)
```

**Migration**:

```sql
ALTER TABLE "Purchase"
ADD COLUMN "supplierGstin" VARCHAR(15),
ADD COLUMN "cgst" INT DEFAULT 0,
ADD COLUMN "sgst" INT DEFAULT 0,
ADD COLUMN "igst" INT DEFAULT 0;

-- Backfill existing: Split totalGst equally (conservative estimate)
UPDATE "Purchase"
SET cgst = FLOOR("totalGst" / 2),
    sgst = "totalGst" - FLOOR("totalGst" / 2)
WHERE "invoiceDate" >= DATE(NOW()) - INTERVAL 180 DAY;  -- Recent purchases
```

### 1.2 Invoice Model Updates

```prisma
// BEFORE:
model Invoice {
  id            String        @id @default(cuid())
  // ... fields
  totalAmount   Int
  status        InvoiceStatus @default(PAID)  // ← Only PAID or VOIDED
  // NO paidAmount tracking
}

// AFTER:
model Invoice {
  id            String        @id @default(cuid())
  tenantId      String
  shopId        String
  customerId    String?
  invoiceNumber String
  totalAmount   Int
  paidAmount    Int           @default(0)     // ← NEW: Track settlement
  status        InvoiceStatus @default(UNPAID) // ← NEW: UNPAID|PARTIALLY_PAID|PAID|VOIDED
  // ... rest unchanged
}

// Enum change:
enum InvoiceStatus {
  UNPAID           // Draft or submitted, no payment yet
  PARTIALLY_PAID   // Some payment received
  PAID             // Fully settled
  VOIDED           // Cancelled
}
```

**Migration**:

```sql
ALTER TABLE "Invoice"
ADD COLUMN "paidAmount" INT DEFAULT 0,
MODIFY COLUMN "status" ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'VOIDED') DEFAULT 'UNPAID';

-- Backfill paidAmount from existing Receipts
UPDATE "Invoice" i
SET "paidAmount" = COALESCE((
  SELECT SUM(r."amount")
  FROM "Receipt" r
  WHERE r."linkedInvoiceId" = i."id"
    AND r."status" = 'ACTIVE'
), 0)
WHERE i."status" != 'VOIDED';

-- Update status based on payment state
UPDATE "Invoice" i
SET "status" = CASE
  WHEN "paidAmount" >= "totalAmount" THEN 'PAID'
  WHEN "paidAmount" > 0 THEN 'PARTIALLY_PAID'
  ELSE 'UNPAID'
END
WHERE "status" != 'VOIDED';
```

### 1.3 StockLedger Clarification (No Change)

Current model is correct; just clarify semantics:

```prisma
model StockLedger {
  // type='IN' with referenceType='PURCHASE' records purchase stock
  // costPerUnit MUST be populated from PurchaseItem.purchasePrice
  // If NULL, profit reports will fail → validation error on create
}
```

---

## PART 2: VALIDATION RULES

### 2.1 Purchase Submission Validation

```typescript
// File: apps/backend/src/core/purchases/purchases.service.ts

async submitPurchase(tenantId: string, purchaseId: string): Promise<void> {
  const purchase = await this.prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true }
  });

  if (!purchase) throw new NotFoundException('Purchase not found');
  if (purchase.status !== 'DRAFT') throw new BadRequestException('Only DRAFT purchases can be submitted');

  // ✅ VALIDATION 1: GSTIN required if GST applied
  if (purchase.totalGst > 0 && !purchase.supplierGstin) {
    throw new BadRequestException(
      'Supplier GSTIN is mandatory for GST purchases (ITC eligibility). ' +
      'Provide GSTIN or set GST rate to 0%.'
    );
  }

  // ✅ VALIDATION 2: GSTIN format (15-character Indian GSTIN)
  if (purchase.supplierGstin) {
    const gstnRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstnRegex.test(purchase.supplierGstin)) {
      throw new BadRequestException(
        `Invalid GSTIN format: "${purchase.supplierGstin}". ` +
        'Expected 15-character format: 27AABCU9603R1Z5'
      );
    }
  }

  // ✅ VALIDATION 3: Invoice date not in future
  if (purchase.invoiceDate > new Date()) {
    throw new BadRequestException('Invoice date cannot be in future');
  }

  // ✅ VALIDATION 4: Invoice date within ITC claim window (180 days)
  const daysSinceInvoice = Math.floor((Date.now() - purchase.invoiceDate.getTime()) / (1000 * 86400));
  if (daysSinceInvoice > 180) {
    this.logger.warn(
      `Purchase ${purchase.invoiceNumber}: ITC claim window expired ` +
      `(${daysSinceInvoice} days old). ITC ineligible unless valid reason.`
    );
    // Don't block, just warn (may have valid reasons)
  }

  // ✅ VALIDATION 5: All items have costPerUnit
  for (const item of purchase.items) {
    if (!item.purchasePrice || item.purchasePrice === 0) {
      throw new BadRequestException(
        `Item "${item.description}" has invalid purchase price. ` +
        'All items must have non-zero cost.'
      );
    }
  }

  // ✅ VALIDATION 6: CGST + SGST = totalGst OR IGST = totalGst
  // (Handled by service, assume correct from create)

  // ✅ NOW: Atomic transaction
  //   1. Update Purchase.status = SUBMITTED
  //   2. Create StockLedger entries
  //   3. (Optional: Create FinancialEntry on submission if ITC needs ledger visibility)

  await this.atomicPurchaseSubmit(tenantId, purchase);
}

private async atomicPurchaseSubmit(tenantId: string, purchase: Purchase & { items: PurchaseItem[] }) {
  await this.prisma.$transaction(async (tx) => {
    // 1. Update Purchase status
    await tx.purchase.update({
      where: { id: purchase.id },
      data: { status: 'SUBMITTED' }
    });

    // 2. Create StockLedger IN entries
    const stockEntries = purchase.items
      .filter(item => item.shopProductId) // Only if product linked
      .map(item => ({
        id: cuid(),
        tenantId,
        shopId: purchase.shopId,
        shopProductId: item.shopProductId!,
        type: 'IN' as StockEntryType,
        quantity: item.quantity,
        costPerUnit: item.purchasePrice, // ← PAISA
        referenceType: 'PURCHASE' as StockRefType,
        referenceId: purchase.id,
        note: `Stock IN from Purchase #${purchase.invoiceNumber}`,
        createdAt: new Date()
      }));

    if (stockEntries.length > 0) {
      await tx.stockLedger.createMany({ data: stockEntries });
    }

    // 3. Update ShopProduct.avgCost (Weighted Average Cost)
    for (const item of purchase.items) {
      if (item.shopProductId) {
        await this.updateProductWAC(tx, item.shopProductId, item.quantity, item.purchasePrice, tenantId);
      }
    }

    this.logger.log(`Purchase ${purchase.invoiceNumber} submitted with stock entries created`);
  });
}

private async updateProductWAC(
  tx: Prisma.TransactionClient,
  shopProductId: string,
  newQty: number,
  newCost: number, // paisa
  tenantId: string
) {
  // Weighted Average Cost = (Existing Qty × Existing Cost + New Qty × New Cost) / (Existing Qty + New Qty)
  const product = await tx.shopProduct.findUnique({ where: { id: shopProductId } });
  if (!product) return;

  const existingQty = await this.getCurrentStock(tx, shopProductId);
  const existingCost = product.avgCost || 0; // paisa

  const newWAC = existingQty > 0
    ? Math.round((existingQty * existingCost + newQty * newCost) / (existingQty + newQty))
    : newCost;

  await tx.shopProduct.update({
    where: { id: shopProductId },
    data: { avgCost: newWAC }
  });
}

private async getCurrentStock(tx: Prisma.TransactionClient, shopProductId: string): Promise<number> {
  const result = await tx.$queryRaw<{ balance: bigint }[]>`
    SELECT SUM(CASE WHEN "type" = 'IN' THEN "quantity" ELSE -"quantity" END) as "balance"
    FROM "StockLedger"
    WHERE "shopProductId" = ${shopProductId}
      AND "type" IN ('IN', 'OUT')
  `;
  return result[0] ? Number(result[0].balance || 0) : 0;
}
```

### 2.2 Receipt Creation Validation & Invoice Update

```typescript
// File: apps/backend/src/modules/mobileshop/receipts/receipts.service.ts

async createReceipt(
  tenantId: string,
  shopId: string,
  dto: CreateReceiptRequest,
  userId: string
): Promise<Receipt> {
  // ✅ VALIDATION 1: CREDIT rejected
  if (dto.paymentMethod === 'CREDIT') {
    throw new BadRequestException(
      'CREDIT is a promise, not a payment. Record receipt only when cash/UPI/CARD/BANK received.'
    );
  }

  // ✅ VALIDATION 2: Amount positive
  if (dto.amount <= 0) {
    throw new BadRequestException('Receipt amount must be > 0');
  }

  // ✅ VALIDATION 3: If linked to invoice, check over-collection
  let invoice: Invoice | null = null;
  if (dto.linkedInvoiceId) {
    invoice = await this.prisma.invoice.findUnique({
      where: { id: dto.linkedInvoiceId }
    });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const totalReceived = invoice.paidAmount + dto.amount;
    if (totalReceived > invoice.totalAmount) {
      throw new BadRequestException(
        `Cannot receive ₹${dto.amount}. Invoice total is ₹${invoice.totalAmount / 100}, ` +
        `already received ₹${invoice.paidAmount / 100}. ` +
        `Outstanding: ₹${(invoice.totalAmount - invoice.paidAmount) / 100}`
      );
    }
  }

  // ✅ NOW: Atomic transaction
  const receipt = await this.prisma.$transaction(async (tx) => {
    // 1. Create Receipt
    const newReceipt = await tx.receipt.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        receiptId: this.generateReceiptId(),
        printNumber: await this.getNextPrintNumber(tx, shopId),
        receiptType: dto.receiptType,
        amount: this.toPaisa(dto.amount),
        paymentMethod: dto.paymentMethod,
        transactionRef: dto.transactionRef,
        customerId: dto.customerId,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        linkedInvoiceId: dto.linkedInvoiceId,
        linkedJobId: dto.linkedJobId,
        narration: dto.narration,
        status: 'ACTIVE',
        createdBy: userId,
        createdAt: new Date()
      }
    });

    // 2. Update Invoice.paidAmount and status (if linked)
    if (invoice) {
      const newPaidAmount = invoice.paidAmount + newReceipt.amount;
      const newStatus =
        newPaidAmount >= invoice.totalAmount ? 'PAID' :
        newPaidAmount > 0 ? 'PARTIALLY_PAID' :
        'UNPAID';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      });

      this.logger.log(
        `Invoice ${invoice.invoiceNumber} updated: ` +
        `paidAmount=${newPaidAmount}, status=${newStatus}`
      );
    }

    // 3. Create FinancialEntry (money IN)
    await tx.financialEntry.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        type: 'IN',
        amount: newReceipt.amount,
        mode: dto.paymentMethod,
        referenceType: 'RECEIPT',
        referenceId: newReceipt.id,
        note: `Receipt from ${dto.customerName}`,
        createdAt: new Date()
      }
    });

    return newReceipt;
  });

  return receipt;
}

async cancelReceipt(tenantId: string, receiptId: string, reason: string): Promise<Receipt> {
  const receipt = await this.prisma.receipt.findUnique({
    where: { id: receiptId }
  });
  if (!receipt) throw new NotFoundException('Receipt not found');
  if (receipt.status === 'CANCELLED') throw new BadRequestException('Receipt already cancelled');

  // Reverse the Receipt impact on Invoice
  await this.prisma.$transaction(async (tx) => {
    // 1. Cancel Receipt
    await tx.receipt.update({
      where: { id: receipt.id },
      data: {
        status: 'CANCELLED',
        narration: `${receipt.narration || ''} [CANCELLED: ${reason}]`
      }
    });

    // 2. Revert Invoice.paidAmount and status
    if (receipt.linkedInvoiceId) {
      const invoice = await tx.invoice.findUnique({
        where: { id: receipt.linkedInvoiceId }
      });
      if (invoice) {
        const newPaidAmount = Math.max(0, invoice.paidAmount - receipt.amount);
        const newStatus =
          newPaidAmount >= invoice.totalAmount ? 'PAID' :
          newPaidAmount > 0 ? 'PARTIALLY_PAID' :
          'UNPAID';

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        });
      }
    }

    // 3. Create FinancialEntry reversal (money OUT)
    await tx.financialEntry.create({
      data: {
        id: cuid(),
        tenantId,
        shopId: receipt.shopId,
        type: 'OUT', // Reversal as OUT
        amount: receipt.amount,
        mode: receipt.paymentMethod,
        referenceType: 'RECEIPT_CANCELLATION',
        referenceId: receipt.id,
        note: `Receipt cancellation: ${reason}`,
        createdAt: new Date()
      }
    });
  });

  return receipt;
}
```

### 2.3 Payment Voucher Validation (Enhanced)

```typescript
// File: apps/backend/src/modules/mobileshop/vouchers/vouchers.service.ts

async createVoucher(
  tenantId: string,
  shopId: string,
  createVoucherDto: CreateVoucherDto,
  userId: string
): Promise<PaymentVoucher> {
  // ✅ VALIDATION 1: CREDIT rejected (EXISTING - KEEP)
  if (createVoucherDto.paymentMethod === 'CREDIT') {
    throw new BadRequestException(
      'CREDIT payments do NOT create vouchers. Record voucher only when cash/UPI/card/bank payment is made.'
    );
  }

  // ✅ VALIDATION 2: Amount positive
  if (createVoucherDto.amount <= 0) {
    throw new BadRequestException('Voucher amount must be positive');
  }

  // ✅ VALIDATION 3: If linked to Purchase, check over-payment
  if (createVoucherDto.linkedPurchaseId) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: createVoucherDto.linkedPurchaseId }
    });
    if (!purchase) {
      throw new NotFoundException('Linked purchase not found');
    }

    const outstanding = purchase.grandTotal - purchase.paidAmount;
    if (createVoucherDto.amount > outstanding) {
      throw new BadRequestException(
        `Cannot pay ₹${createVoucherDto.amount}. Purchase outstanding is only ₹${outstanding / 100}. ` +
        `Total: ₹${purchase.grandTotal / 100}, Already paid: ₹${purchase.paidAmount / 100}`
      );
    }
  }

  // ✅ VALIDATION 4: Supplier required for SUPPLIER type
  if (createVoucherDto.voucherType === 'SUPPLIER' && !createVoucherDto.globalSupplierId) {
    throw new BadRequestException(
      'Supplier is required for SUPPLIER type vouchers'
    );
  }

  // ✅ VALIDATION 5: Expense category required for EXPENSE type
  if (createVoucherDto.voucherType === 'EXPENSE' && !createVoucherDto.expenseCategory) {
    throw new BadRequestException(
      'Expense category is required for EXPENSE type vouchers'
    );
  }

  // ✅ NOW: Atomic transaction
  return await this.prisma.$transaction(async (tx) => {
    const voucher = await tx.paymentVoucher.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        voucherId: this.generateVoucherId(),
        voucherType: createVoucherDto.voucherType,
        date: new Date(),
        amount: this.toPaisa(createVoucherDto.amount),
        paymentMethod: createVoucherDto.paymentMethod,
        transactionRef: createVoucherDto.transactionRef,
        narration: createVoucherDto.narration,
        globalSupplierId: createVoucherDto.globalSupplierId,
        expenseCategory: createVoucherDto.expenseCategory,
        linkedPurchaseId: createVoucherDto.linkedPurchaseId,
        status: 'ACTIVE',
        createdBy: userId
      }
    });

    // Update Purchase.paidAmount if linked
    if (createVoucherDto.linkedPurchaseId) {
      const purchase = await tx.purchase.findUnique({
        where: { id: createVoucherDto.linkedPurchaseId }
      });
      if (purchase) {
        const newPaidAmount = purchase.paidAmount + voucher.amount;
        const newStatus =
          newPaidAmount >= purchase.grandTotal ? 'PAID' :
          newPaidAmount > 0 ? 'PARTIALLY_PAID' :
          'DRAFT';

        await tx.purchase.update({
          where: { id: purchase.id },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus
          }
        });
      }
    }

    // Create FinancialEntry (money OUT)
    await tx.financialEntry.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        type: 'OUT',
        amount: voucher.amount,
        mode: voucher.paymentMethod,
        referenceType: 'VOUCHER',
        referenceId: voucher.id,
        note: `${voucher.voucherType} voucher`,
        createdAt: new Date()
      }
    });

    return voucher;
  });
}
```

---

## PART 3: REPORT IMPLEMENTATIONS

### 3.1 GSTR-1 Sales Register

```typescript
// File: apps/backend/src/modules/mobileshop/reports/gstr1.service.ts

@Injectable()
export class GSTR1Service {
  constructor(private prisma: PrismaService) {}

  /**
   * GSTR-1 Sales Register
   * Includes B2B (with GSTIN) and B2C (without GSTIN) segregated
   * HSN-wise summary
   */
  async generateSalesRegister(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<GSTR1Report> {
    const shopFilter = shopId
      ? Prisma.sql`AND i."shopId" = ${shopId}`
      : Prisma.empty;

    // Fetch all invoices in period (excluding VOIDED)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'VOIDED' },
        invoiceDate: { gte: startDate, lte: endDate },
        ...(shopId && { shopId }),
      },
      include: {
        items: true,
        customer: true,
        shop: true,
      },
    });

    // Segregate B2B vs B2C
    const b2bInvoices = invoices.filter((i) => i.customerGstin);
    const b2cInvoices = invoices.filter((i) => !i.customerGstin);

    // Build B2B lines
    const b2bLines = b2bInvoices.map((inv) => ({
      invoiceNo: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate,
      customerGstin: inv.customerGstin,
      customerName: inv.customerName || 'N/A',
      hsnCode: inv.items[0]?.hsnCode || '',
      totalValue: inv.totalAmount, // paisa
      taxableValue: inv.subTotal, // paisa
      cgstRate: 9,
      cgstAmount: inv.cgst || 0, // paisa
      sgstRate: 9,
      sgstAmount: inv.sgst || 0,
      igstRate: inv.igst ? 18 : 0,
      igstAmount: inv.igst || 0,
      cessAmount: 0,
    }));

    // Build B2C summary (consolidated)
    const b2cTotal = {
      totalInvoices: b2cInvoices.length,
      totalValue: b2cInvoices.reduce((s, i) => s + i.totalAmount, 0),
      totalTaxable: b2cInvoices.reduce((s, i) => s + i.subTotal, 0),
      totalCgst: b2cInvoices.reduce((s, i) => s + (i.cgst || 0), 0),
      totalSgst: b2cInvoices.reduce((s, i) => s + (i.sgst || 0), 0),
      totalIgst: b2cInvoices.reduce((s, i) => s + (i.igst || 0), 0),
    };

    // HSN-wise summary (all invoices)
    const hsnSummary = await this.getHSNSummary(
      tenantId,
      startDate,
      endDate,
      shopId,
    );

    return {
      period: { startDate, endDate },
      b2b: {
        lines: b2bLines,
        totalLines: b2bLines.length,
        totalTaxableValue: b2bLines.reduce((s, l) => s + l.taxableValue, 0),
        totalCgst: b2bLines.reduce((s, l) => s + l.cgstAmount, 0),
        totalSgst: b2bLines.reduce((s, l) => s + l.sgstAmount, 0),
        totalIgst: b2bLines.reduce((s, l) => s + l.igstAmount, 0),
      },
      b2c: b2cTotal,
      hsnSummary,
      generatedAt: new Date(),
    };
  }

  private async getHSNSummary(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<HSNSummaryLine[]> {
    const shopFilter = shopId
      ? Prisma.sql`AND i."shopId" = ${shopId}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<HSNSummaryLine[]>`
      SELECT 
        ii."hsnCode" as "hsnCode",
        COUNT(DISTINCT i.id) as "totalInvoices",
        SUM(ii."quantity") as "totalQty",
        SUM(ii."lineTotal") as "totalValue",
        SUM(ii."lineTotal" - ii."gstAmount") as "taxableValue",
        SUM(ii."gstAmount") as "totalGst"
      FROM "InvoiceItem" ii
      JOIN "Invoice" i ON ii."invoiceId" = i."id"
      WHERE i."tenantId" = ${tenantId}
        AND i."status" != 'VOIDED'
        AND i."invoiceDate" >= ${startDate}
        AND i."invoiceDate" <= ${endDate}
        ${shopFilter}
      GROUP BY ii."hsnCode"
      ORDER BY ii."hsnCode"
    `;

    return result.map((r) => ({
      hsnCode: r.hsnCode || 'UNSPECIFIED',
      totalInvoices: Number(r.totalInvoices),
      totalQty: Number(r.totalQty),
      totalValue: Number(r.totalValue),
      taxableValue: Number(r.taxableValue),
      totalGst: Number(r.totalGst),
    }));
  }
}

// Types
interface GSTR1Report {
  period: { startDate: Date; endDate: Date };
  b2b: {
    lines: Array<{
      invoiceNo: string;
      invoiceDate: Date;
      customerGstin: string;
      customerName: string;
      hsnCode: string;
      totalValue: number;
      taxableValue: number;
      cgstRate: number;
      cgstAmount: number;
      sgstRate: number;
      sgstAmount: number;
      igstRate: number;
      igstAmount: number;
      cessAmount: number;
    }>;
    totalLines: number;
    totalTaxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
  };
  b2c: {
    totalInvoices: number;
    totalValue: number;
    totalTaxable: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
  };
  hsnSummary: HSNSummaryLine[];
  generatedAt: Date;
}

interface HSNSummaryLine {
  hsnCode: string;
  totalInvoices: number;
  totalQty: number;
  totalValue: number;
  taxableValue: number;
  totalGst: number;
}
```

### 3.2 GSTR-2 Purchase Register

```typescript
// File: apps/backend/src/modules/mobileshop/reports/gstr2.service.ts

@Injectable()
export class GSTR2Service {
  constructor(private prisma: PrismaService) {}

  /**
   * GSTR-2 Purchase Register
   * Only shows GST purchases with supplier GSTIN
   * Non-GST purchases excluded
   * HSN-wise ITC summary
   */
  async generatePurchaseRegister(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<GSTR2Report> {
    // Fetch purchases in period (status != DRAFT, CANCELLED)
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        invoiceDate: { gte: startDate, lte: endDate },
        ...(shopId && { shopId }),
      },
      include: {
        items: true,
        party: true,
        shop: true,
      },
    });

    // Filter: Only GST purchases with supplier GSTIN
    const validPurchases = purchases.filter(
      (p) => p.totalGst > 0 && p.supplierGstin,
    );

    // Build lines
    const lines = validPurchases.map((p) => ({
      invoiceNo: p.invoiceNumber,
      invoiceDate: p.invoiceDate,
      supplierGstin: p.supplierGstin!,
      supplierName: p.supplierName,
      hsnCode: p.items[0]?.hsnSac || '',
      totalValue: p.grandTotal,
      taxableValue: p.subTotal,
      cgstRate: 9,
      cgstITC: p.cgst || 0,
      sgstRate: 9,
      sgstITC: p.sgst || 0,
      igstRate: p.igst ? 18 : 0,
      igstITC: p.igst || 0,
      cess: 0,
    }));

    // HSN-wise summary
    const hsnSummary = await this.getITCSummaryByHSN(
      tenantId,
      startDate,
      endDate,
      shopId,
    );

    // Non-GST purchases (informational only - NOT claimed for ITC)
    const nonGSTCount = purchases.filter((p) => p.totalGst === 0).length;

    return {
      period: { startDate, endDate },
      lines,
      totalLines: lines.length,
      totalTaxableValue: lines.reduce((s, l) => s + l.taxableValue, 0),
      totalCgstITC: lines.reduce((s, l) => s + l.cgstITC, 0),
      totalSgstITC: lines.reduce((s, l) => s + l.sgstITC, 0),
      totalIgstITC: lines.reduce((s, l) => s + l.igstITC, 0),
      hsnSummary,
      nonGSTPurchaseCount: nonGSTCount,
      generatedAt: new Date(),
    };
  }

  private async getITCSummaryByHSN(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<ITCSummaryLine[]> {
    const shopFilter = shopId
      ? Prisma.sql`AND p."shopId" = ${shopId}`
      : Prisma.empty;

    const result = await this.prisma.$queryRaw<ITCSummaryLine[]>`
      SELECT 
        pi."hsnSac" as "hsnCode",
        COUNT(DISTINCT p.id) as "totalPurchases",
        SUM(pi."quantity") as "totalQty",
        SUM(pi."totalAmount") as "totalValue",
        SUM(pi."totalAmount" - pi."taxAmount") as "taxableValue",
        SUM(pi."taxAmount") as "totalTax",
        -- ITC split (simplified: equal CGST/SGST unless inter-state)
        FLOOR(SUM(pi."taxAmount") / 2) as "cgstITC",
        SUM(pi."taxAmount") - FLOOR(SUM(pi."taxAmount") / 2) as "sgstITC"
      FROM "PurchaseItem" pi
      JOIN "Purchase" p ON pi."purchaseId" = p."id"
      WHERE p."tenantId" = ${tenantId}
        AND p."status" NOT IN ('DRAFT', 'CANCELLED')
        AND p."invoiceDate" >= ${startDate}
        AND p."invoiceDate" <= ${endDate}
        AND p."supplierGstin" IS NOT NULL
        AND p."totalGst" > 0
        ${shopFilter}
      GROUP BY pi."hsnSac"
      ORDER BY pi."hsnSac"
    `;

    return result.map((r) => ({
      hsnCode: r.hsnCode || 'UNSPECIFIED',
      totalPurchases: Number(r.totalPurchases),
      totalQty: Number(r.totalQty),
      totalValue: Number(r.totalValue),
      taxableValue: Number(r.taxableValue),
      totalTax: Number(r.totalTax),
      cgstITC: Number(r.cgstITC),
      sgstITC: Number(r.sgstITC),
    }));
  }
}

// Types
interface GSTR2Report {
  period: { startDate: Date; endDate: Date };
  lines: Array<{
    invoiceNo: string;
    invoiceDate: Date;
    supplierGstin: string;
    supplierName: string;
    hsnCode: string;
    totalValue: number;
    taxableValue: number;
    cgstRate: number;
    cgstITC: number;
    sgstRate: number;
    sgstITC: number;
    igstRate: number;
    igstITC: number;
    cess: number;
  }>;
  totalLines: number;
  totalTaxableValue: number;
  totalCgstITC: number;
  totalSgstITC: number;
  totalIgstITC: number;
  hsnSummary: ITCSummaryLine[];
  nonGSTPurchaseCount: number;
  generatedAt: Date;
}

interface ITCSummaryLine {
  hsnCode: string;
  totalPurchases: number;
  totalQty: number;
  totalValue: number;
  taxableValue: number;
  totalTax: number;
  cgstITC: number;
  sgstITC: number;
}
```

### 3.3 Outstanding Aging Reports

```typescript
// File: apps/backend/src/modules/mobileshop/reports/aging.service.ts

@Injectable()
export class AgingReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Receivables Aging Report
   * Shows customer dues bucketed by days overdue
   */
  async getReceivablesAging(
    tenantId: string,
    asOfDate: Date,
    shopId?: string,
  ): Promise<ReceivablesAgingReport> {
    const today = asOfDate || new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { notIn: ['VOIDED'] },
        ...(shopId && { shopId }),
      },
      include: {
        customer: true,
      },
    });

    // Calculate aging buckets
    const receivables: ReceivableAging[] = [];
    let total = 0;

    for (const invoice of invoices) {
      const outstanding = Math.max(0, invoice.totalAmount - invoice.paidAmount);
      if (outstanding === 0) continue; // Paid invoices

      const daysDue = Math.floor(
        (today.getTime() - invoice.invoiceDate.getTime()) / (1000 * 86400),
      );

      const bucket =
        daysDue <= 30
          ? 'CURRENT'
          : daysDue <= 60
            ? 'D31_60'
            : daysDue <= 90
              ? 'D61_90'
              : 'D90PLUS';

      receivables.push({
        customerName: invoice.customerName,
        invoiceNo: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        outstanding,
        daysDue,
        bucket,
      });

      total += outstanding;
    }

    // Aggregate by bucket
    const summary = {
      current: receivables
        .filter((r) => r.bucket === 'CURRENT')
        .reduce((s, r) => s + r.outstanding, 0),
      d31_60: receivables
        .filter((r) => r.bucket === 'D31_60')
        .reduce((s, r) => s + r.outstanding, 0),
      d61_90: receivables
        .filter((r) => r.bucket === 'D61_90')
        .reduce((s, r) => s + r.outstanding, 0),
      d90Plus: receivables
        .filter((r) => r.bucket === 'D90PLUS')
        .reduce((s, r) => s + r.outstanding, 0),
      total,
    };

    return {
      asOfDate: today,
      lines: receivables.sort((a, b) => b.daysDue - a.daysDue),
      summary,
    };
  }

  /**
   * Payables Aging Report
   * Shows supplier payment dues bucketed by days due
   */
  async getPayablesAging(
    tenantId: string,
    asOfDate: Date,
    shopId?: string,
  ): Promise<PayablesAgingReport> {
    const today = asOfDate || new Date();

    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        ...(shopId && { shopId }),
      },
      include: {
        party: true,
      },
    });

    const payables: PayableAging[] = [];
    let total = 0;

    for (const purchase of purchases) {
      const outstanding = Math.max(
        0,
        purchase.grandTotal - purchase.paidAmount,
      );
      if (outstanding === 0) continue; // Paid purchases

      const daysDue = Math.floor(
        (today.getTime() - purchase.invoiceDate.getTime()) / (1000 * 86400),
      );

      // If dueDate exists, use that; otherwise assume net 30
      const effectiveDueDate =
        purchase.dueDate ||
        new Date(purchase.invoiceDate.getTime() + 30 * 86400000);
      const daysOverdue = Math.floor(
        (today.getTime() - effectiveDueDate.getTime()) / (1000 * 86400),
      );

      const bucket =
        daysOverdue < 0
          ? 'NOT_DUE'
          : daysOverdue <= 30
            ? 'CURRENT'
            : daysOverdue <= 60
              ? 'D31_60'
              : daysOverdue <= 90
                ? 'D61_90'
                : 'D90PLUS';

      payables.push({
        supplierName: purchase.supplierName,
        invoiceNo: purchase.invoiceNumber,
        invoiceDate: purchase.invoiceDate,
        dueDate: effectiveDueDate,
        totalAmount: purchase.grandTotal,
        paidAmount: purchase.paidAmount,
        outstanding,
        daysOverdue,
        bucket,
      });

      total += outstanding;
    }

    // Aggregate
    const summary = {
      notDue: payables
        .filter((p) => p.bucket === 'NOT_DUE')
        .reduce((s, p) => s + p.outstanding, 0),
      current: payables
        .filter((p) => p.bucket === 'CURRENT')
        .reduce((s, p) => s + p.outstanding, 0),
      d31_60: payables
        .filter((p) => p.bucket === 'D31_60')
        .reduce((s, p) => s + p.outstanding, 0),
      d61_90: payables
        .filter((p) => p.bucket === 'D61_90')
        .reduce((s, p) => s + p.outstanding, 0),
      d90Plus: payables
        .filter((p) => p.bucket === 'D90PLUS')
        .reduce((s, p) => s + p.outstanding, 0),
      total,
    };

    return {
      asOfDate: today,
      lines: payables.sort((a, b) => b.daysOverdue - a.daysOverdue),
      summary,
    };
  }
}

interface ReceivableAging {
  customerName: string;
  invoiceNo: string;
  invoiceDate: Date;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysDue: number;
  bucket: 'CURRENT' | 'D31_60' | 'D61_90' | 'D90PLUS';
}

interface ReceivablesAgingReport {
  asOfDate: Date;
  lines: ReceivableAging[];
  summary: {
    current: number;
    d31_60: number;
    d61_90: number;
    d90Plus: number;
    total: number;
  };
}

interface PayableAging {
  supplierName: string;
  invoiceNo: string;
  invoiceDate: Date;
  dueDate: Date;
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  daysOverdue: number;
  bucket: 'NOT_DUE' | 'CURRENT' | 'D31_60' | 'D61_90' | 'D90PLUS';
}

interface PayablesAgingReport {
  asOfDate: Date;
  lines: PayableAging[];
  summary: {
    notDue: number;
    current: number;
    d31_60: number;
    d61_90: number;
    d90Plus: number;
    total: number;
  };
}
```

---

## PART 4: API ENDPOINTS

```typescript
// File: apps/backend/src/modules/mobileshop/reports/reports.controller.ts

@Controller('api/mobileshop/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private gstr1Service: GSTR1Service,
    private gstr2Service: GSTR2Service,
    private agingService: AgingReportsService,
  ) {}

  // ✅ NEW: GSTR-1 Sales Register
  @Get('gstr1')
  async getGSTR1(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr1Service.generateSalesRegister(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      shopId,
    );
  }

  // ✅ NEW: GSTR-2 Purchase Register
  @Get('gstr2')
  async getGSTR2(
    @Request() req,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.gstr2Service.generatePurchaseRegister(
      tenantId,
      new Date(startDate),
      new Date(endDate),
      shopId,
    );
  }

  // ✅ NEW: Receivables Aging
  @Get('receivables-aging')
  async getReceivablesAging(
    @Request() req,
    @Query('asOfDate') asOfDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.agingService.getReceivablesAging(
      tenantId,
      asOfDate ? new Date(asOfDate) : new Date(),
      shopId,
    );
  }

  // ✅ NEW: Payables Aging
  @Get('payables-aging')
  async getPayablesAging(
    @Request() req,
    @Query('asOfDate') asOfDate?: string,
    @Query('shopId') shopId?: string,
  ) {
    const tenantId = req.user.tenantId;
    return this.agingService.getPayablesAging(
      tenantId,
      asOfDate ? new Date(asOfDate) : new Date(),
      shopId,
    );
  }
}
```

---

## PART 5: FRONTEND IMPACT ANALYSIS

### 5.1 NEW Pages/Views Required

| Page                            | Purpose                             | Complexity | User Impact                            |
| ------------------------------- | ----------------------------------- | ---------- | -------------------------------------- |
| **Reports → GSTR-1**            | Download/view GST sales register    | 🟢 Low     | Read-only, export to JSON/CSV          |
| **Reports → GSTR-2**            | Download/view GST purchase register | 🟢 Low     | Read-only, export to JSON/CSV          |
| **Reports → Receivables Aging** | Customer outstanding by age         | 🟡 Medium  | Filters (shopId, asOfDate), drill-down |
| **Reports → Payables Aging**    | Supplier outstanding by age         | 🟡 Medium  | Filters (shopId, asOfDate), drill-down |

### 5.2 EXISTING Pages Requiring Changes

#### **Purchase Form** (Purchase Creation/Edit)

```typescript
// apps/mobibix-web/app/(app)/purchases/new/page.tsx

// NEW FIELD:
<div>
  <label>Supplier GSTIN (Optional)</label>
  <input
    type="text"
    placeholder="e.g., 27AABCU9603R1Z5"
    value={supplierGstin}
    onChange={(e) => {
      // Validate GSTIN format
      const gstin = e.target.value;
      if (gstin && !isValidGST IN(gstin)) {
        setError('Invalid GSTIN format');
      }
    }}
  />
  <small>Required if GST is applied (ITC eligibility)</small>
</div>

// ON SUBMIT (Purchase Submission):
if (totalGst > 0 && !supplierGstin) {
  alert('❌ Supplier GSTIN is mandatory for GST purchases');
  return;
}
```

**Changes**:

- ✅ Add GSTIN input field
- ✅ Client-side GSTIN format validation
- ✅ Show warning if GST applied without GSTIN
- ✅ Disable submission if validation fails

#### **Purchase List** (View existing purchases)

```typescript
// apps/mobibix-web/app/(app)/purchases/page.tsx

// ADD COLUMN:
<th>Supplier GSTIN</th>
<td>{purchase.supplierGstin || '—'}</td>

// When Purchase.status = SUBMITTED:
// - Show "✅ Stock received" indicator
// - Link to Stock Ledger entries created
```

#### **Receipt Form** (Create Receipt)

```typescript
// apps/mobibix-web/app/(app)/receipts/create/page.tsx

// ON RECEIPT CREATION:
// Frontend should:
// 1. Show invoice details (if linkedInvoiceId)
// 2. Display outstanding amount
// 3. PREVENT entry of amount > outstanding
// 4. Show impact: "Invoice will be marked PAID" etc

<div>
  <h4>Invoice {invoice.invoiceNumber}</h4>
  <p>Total: ₹{(invoice.totalAmount / 100).toFixed(2)}</p>
  <p>Already Paid: ₹{(invoice.paidAmount / 100).toFixed(2)}</p>
  <p style={{ color: 'green' }}>
    Outstanding: ₹{((invoice.totalAmount - invoice.paidAmount) / 100).toFixed(2)}
  </p>

  <input
    type="number"
    max={(invoice.totalAmount - invoice.paidAmount) / 100}
    placeholder="Receipt amount"
  />
</div>
```

**Changes**:

- ✅ Show invoice settlement progress (paid/outstanding)
- ✅ Disable receipt amount input if > outstanding
- ✅ Real-time validation feedback

#### **Invoice List** (View sales invoices)

```typescript
// apps/mobibix-web/app/(app)/sales/page.tsx

// COLUMN CHANGE:
// OLD: status = 'PAID' | 'VOIDED'
// NEW: status = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED'

// Add:
<td>{invoice.paidAmount || 0} / {invoice.totalAmount}</td>
<td>
  {invoice.status === 'PAID' && '✅'}
  {invoice.status === 'PARTIALLY_PAID' && '⏳'}
  {invoice.status === 'UNPAID' && '⏸️'}
</td>

// FILTER: Add filter by status
<select onChange={(e) => setStatusFilter(e.target.value)}>
  <option value="">All</option>
  <option value="UNPAID">Unpaid</option>
  <option value="PARTIALLY_PAID">Partial</option>
  <option value="PAID">Paid</option>
  <option value="VOIDED">Voided</option>
</select>
```

**Changes**:

- ✅ Update status enum in frontend type definitions
- ✅ Add paidAmount display
- ✅ Add status filter
- ✅ Update status badge styling

#### **Voucher Form** (Create Payment Voucher)

```typescript
// apps/mobibix-web/app/(app)/vouchers/create/page.tsx

// ON PURCHASE LINK CHANGE:
if (linkedPurchaseId) {
  const purchase = await getPurchase(linkedPurchaseId);
  setOutstandingAmount(purchase.grandTotal - purchase.paidAmount);
  setMaxAmount(purchase.grandTotal - purchase.paidAmount);
}

// Prevent over-payment:
<input
  type="number"
  max={outstandingAmount / 100}
  onChange={(e) => {
    if (e.target.value > outstandingAmount / 100) {
      setError(`Max ₹${(outstandingAmount / 100).toFixed(2)}`);
    }
  }}
/>
```

**Changes**:

- ✅ Show linked purchase outstanding amount
- ✅ Cap voucher amount input to outstanding
- ✅ Real-time validation

### 5.3 NEW Report Views

#### **GSTR-1 Report Page**

```typescript
// apps/mobibix-web/app/(app)/reports/gstr1/page.tsx

export default function GSTR1Page() {
  const [report, setReport] = useState<GSTR1Report | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const generateReport = async () => {
    const data = await fetch(`/api/mobileshop/reports/gstr1?startDate=${startDate}&endDate=${endDate}`)
      .then(r => r.json());
    setReport(data);
  };

  return (
    <div>
      <h1>GSTR-1 Sales Register</h1>

      {/* Date Filters */}
      <input type="date" onChange={(e) => setStartDate(e.target.value)} />
      <input type="date" onChange={(e) => setEndDate(e.target.value)} />
      <button onClick={generateReport}>Generate</button>

      {report && (
        <>
          {/* B2B Table */}
          <h2>B2B Sales (with GSTIN)</h2>
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Customer GSTIN</th>
                <th>Taxable</th>
                <th>CGST</th>
                <th>SGST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {report.b2b.lines.map(line => (
                <tr key={line.invoiceNo}>
                  <td>{line.invoiceNo}</td>
                  <td>{line.customerGstin}</td>
                  <td>₹{(line.taxableValue / 100).toFixed(2)}</td>
                  <td>₹{(line.cgstAmount / 100).toFixed(2)}</td>
                  <td>₹{(line.sgstAmount / 100).toFixed(2)}</td>
                  <td>₹{(line.totalValue / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* B2C Summary */}
          <h2>B2C Sales (without GSTIN)</h2>
          <div>
            <p>Total Invoices: {report.b2c.totalInvoices}</p>
            <p>Total Taxable: ₹{(report.b2c.totalTaxable / 100).toFixed(2)}</p>
            <p>CGST: ₹{(report.b2c.totalCgst / 100).toFixed(2)}</p>
            <p>SGST: ₹{(report.b2c.totalSgst / 100).toFixed(2)}</p>
          </div>

          {/* HSN Summary */}
          <h2>HSN-wise Summary</h2>
          <table>
            <thead>
              <tr>
                <th>HSN Code</th>
                <th>Qty</th>
                <th>Taxable</th>
                <th>Tax</th>
              </tr>
            </thead>
            <tbody>
              {report.hsnSummary.map(hsn => (
                <tr key={hsn.hsnCode}>
                  <td>{hsn.hsnCode}</td>
                  <td>{hsn.totalQty}</td>
                  <td>₹{(hsn.taxableValue / 100).toFixed(2)}</td>
                  <td>₹{(hsn.totalGst / 100).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Export */}
          <button onClick={() => downloadJSON(report, 'gstr1.json')}>
            Export JSON
          </button>
          <button onClick={() => downloadCSV(report, 'gstr1.csv')}>
            Export CSV
          </button>
        </>
      )}
    </div>
  );
}
```

#### **Receivables Aging Page**

```typescript
// apps/mobibix-web/app/(app)/reports/receivables-aging/page.tsx

export default function ReceivablesAgingPage() {
  const [report, setReport] = useState<ReceivablesAgingReport | null>(null);

  useEffect(() => {
    const fetchReport = async () => {
      const data = await fetch('/api/mobileshop/reports/receivables-aging')
        .then(r => r.json());
      setReport(data);
    };
    fetchReport();
  }, []);

  return (
    <div>
      <h1>Receivables Aging Report</h1>
      <p>As of: {new Date().toLocaleDateString()}</p>

      {/* Summary Cards */}
      <div className="grid">
        <div className="card">
          <h3>Current (0-30 days)</h3>
          <p>₹{(report?.summary.current! / 100).toFixed(2)}</p>
        </div>
        <div className="card warning">
          <h3>31-60 days</h3>
          <p>₹{(report?.summary.d31_60! / 100).toFixed(2)}</p>
        </div>
        <div className="card danger">
          <h3>61-90 days</h3>
          <p>₹{(report?.summary.d61_90! / 100).toFixed(2)}</p>
        </div>
        <div className="card critical">
          <h3>>90 days</h3>
          <p>₹{(report?.summary.d90Plus! / 100).toFixed(2)}</p>
        </div>
        <div className="card total">
          <h3>Total Outstanding</h3>
          <p>₹{(report?.summary.total! / 100).toFixed(2)}</p>
        </div>
      </div>

      {/* Detailed Table */}
      <h2>Customer-wise Aging</h2>
      <table>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Invoice</th>
            <th>Date</th>
            <th>Days Due</th>
            <th>Total</th>
            <th>Paid</th>
            <th>Outstanding</th>
          </tr>
        </thead>
        <tbody>
          {report?.lines.map(line => (
            <tr key={line.invoiceNo} className={`bucket-${line.bucket}`}>
              <td>{line.customerName}</td>
              <td>{line.invoiceNo}</td>
              <td>{new Date(line.invoiceDate).toLocaleDateString()}</td>
              <td>{line.daysDue}</td>
              <td>₹{(line.totalAmount / 100).toFixed(2)}</td>
              <td>₹{(line.paidAmount / 100).toFixed(2)}</td>
              <td>₹{(line.outstanding / 100).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 5.4 Type Definitions Update

```typescript
// apps/mobibix-web/src/types/accounting.ts

// Update Invoice status
export type InvoiceStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID' | 'VOIDED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number; // ← NEW
  status: InvoiceStatus; // ← Changed
  // ... rest
}

export interface Purchase {
  id: string;
  invoiceNumber: string;
  supplierGstin?: string; // ← NEW
  // ... rest
}

// Report types
export interface GSTR1Report {
  period: { startDate: Date; endDate: Date };
  b2b: { lines: GSTR1Line[]; ... };
  b2c: { totalInvoices: number; ... };
  hsnSummary: HSNLine[];
}

export interface GSTR2Report {
  period: { startDate: Date; endDate: Date };
  lines: GSTR2Line[];
  hsnSummary: ITCSummaryLine[];
}

export interface ReceivablesAgingReport {
  asOfDate: Date;
  lines: ReceivableAging[];
  summary: AgingSummary;
}

export interface PayablesAgingReport {
  asOfDate: Date;
  lines: PayableAging[];
  summary: AgingSummary;
}
```

---

## PART 6: TESTING SPECIFICATION

### Unit Tests (Backend)

```typescript
// tests/purchases.validation.spec.ts
describe('Purchase Submission Validation', () => {
  it('✅ allows GST purchase WITH supplier GSTIN', async () => {
    const purchase = { totalGst: 1800, supplierGstin: '27AABCU9603R1Z5' };
    // Should pass
  });

  it('❌ rejects GST purchase WITHOUT supplier GSTIN', async () => {
    const purchase = { totalGst: 1800, supplierGstin: null };
    // Should throw error
  });

  it('❌ rejects invalid GSTIN format', async () => {
    const purchase = { totalGst: 1800, supplierGstin: 'INVALID123' };
    // Should throw error
  });

  it('⚠️ warns on invoice > 180 days old', async () => {
    const purchase = { invoiceDate: new Date(Date.now() - 190 * 86400000) };
    // Should log warning but allow
  });
});

describe('Receipt Over-Collection Validation', () => {
  it('✅ allows receipt <= outstanding', async () => {
    const invoice = { totalAmount: 10000, paidAmount: 5000 };
    const receipt = { amount: 5000 };
    // Should pass
  });

  it('❌ rejects receipt > outstanding', async () => {
    const invoice = { totalAmount: 10000, paidAmount: 5000 };
    const receipt = { amount: 6000 };
    // Should throw error
  });
});

describe('Purchase Stock Integration', () => {
  it('✅ creates StockLedger entries atomically on purchase submission', async () => {
    const purchase = {
      id: 'p1',
      items: [{ shopProductId: 's1', quantity: 100, purchasePrice: 5000 }],
    };
    await submitPurchase(purchase);
    // Assert: 1 StockLedger entry created with type=IN, quantity=100
  });

  it('❌ rolls back if StockLedger creation fails', async () => {
    // Simulate DB error
    // Assert: Purchase NOT submitted, no partial state
  });
});
```

### Integration Tests (E2E)

```typescript
describe('Tier-2 Accounting Flow', () => {
  it('✅ E2E: Purchase → Receipt → GSTR Reports', async () => {
    // 1. Create purchase with GSTIN
    // 2. Submit purchase (stock created)
    // 3. Create receipt
    // 4. Generate GSTR-1, GSTR-2
    // 5. Verify ITC in report
  });

  it('✅ Invoice settlement tracking', async () => {
    // 1. Create invoice (status=UNPAID)
    // 2. Create receipt (paidAmount < total)
    // 3. Assert: status=PARTIALLY_PAID
    // 4. Create second receipt
    // 5. Assert: status=PAID
  });

  it('❌ Prevent over-payment', async () => {
    // 1. Create purchase with amount 10000
    // 2. Try voucher 11000
    // 3. Assert: rejected with error
  });
});
```

---

## PART 7: IMPLEMENTATION ROADMAP

### Week 1: Schema & Core Logic

- Day 1: Schema migration (Purchase.supplierGstin, Invoice.paidAmount/status)
- Day 2: Purchase submission validation + Stock integration
- Day 3: Receipt validation + Invoice settlement logic
- Day 4: Voucher payment validation
- Day 5: Unit tests + refine

### Week 2: Reports

- Day 1-2: GSTR-1 (Sales Register) implementation
- Day 3-4: GSTR-2 (Purchase Register) implementation
- Day 5: Aging reports

### Week 3: Frontend

- Day 1-2: Purchase form + list updates
- Day 3: Receipt form updates
- Day 4: New report pages
- Day 5: Integration testing

### Week 4: Testing & Polish

- Day 1-3: E2E testing, bug fixes
- Day 4: CA review & adjustments
- Day 5: Documentation & sign-off

---

## PART 8: RISK MITIGATION

### Backward Compatibility

```
⚠️ Invoice.status enum change (PAID → UNPAID|PARTIALLY_PAID|PAID|VOIDED)
  Solution: Create migration script to backfill status values

⚠️ Invoice.paidAmount new field
  Solution: Backfill from existing Receipt data

✅ All other changes are additive (no deletions)
```

### Data Quality Assurance

```
1. Pre-migration validation:
   - Verify all DRAFT invoices → status=UNPAID
   - Verify all VOIDED invoices → status=VOIDED
   - Calculate paidAmount from Receipts

2. Post-migration sanity check:
   - SUM(Invoice.paidAmount) should match SUM(Receipt.amount)
   - All outstanding > 0 should have non-PAID status
   - No invoices with status mismatch
```

---

## ✅ SIGN-OFF CHECKLIST

**Before deployment**:

- [ ] CA reviews GSTR-1 & GSTR-2 formats
- [ ] GSTIN validation regex approved by CA
- [ ] ITC eligibility rules confirmed
- [ ] Aging bucket definitions verified
- [ ] Schema migration tested on staging
- [ ] E2E tests passing
- [ ] Backward compatibility verified
- [ ] API documentation updated
- [ ] Frontend type definitions synced
