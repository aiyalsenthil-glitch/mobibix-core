# 🔐 TIER-2 HARDENING FIXES - RISK MITIGATION

**Content**: 6 critical risks and mitigation strategies

---

## RISK #1: LEGACY GST DATA FLAG

**Problem**: Backfilled CGST/SGST/IGST from totalGst is approximation; cannot claim ITC on uncertain data.

**Solution**: Add `isLegacyGstApproximation` flag to purchase; exclude from ITC totals by default.

### 1.1 Schema Changes

```prisma
// apps/backend/prisma/schema.prisma

model Purchase {
  id               String            @id @default(cuid())
  tenantId         String
  shopId           String
  invoiceNumber    String
  globalSupplierId String?
  supplierName     String
  supplierGstin    String?           // Existing
  subTotal         Int
  totalGst         Int
  cgst             Int?
  sgst             Int?
  igst             Int?

  // ✅ NEW: Track approximated GST
  isLegacyGstApproximation Boolean  @default(false)  // TRUE = backfilled data, NOT verified
  gstApproximationReason   String?  // e.g., "Backfilled from totalGst on 2025-01-15"
  verifiedByUserId         String?  // CA user who manually verified
  verifiedAt               DateTime? // When CA confirmed actual GST breakdown

  status           PurchaseStatus    @default(DRAFT)
  invoiceDate      DateTime          @default(now())
  dueDate          DateTime?
  paidAmount       Int               @default(0)
  items            PurchaseItem[]
  // ... rest unchanged
}
```

**Migration**:

```sql
ALTER TABLE "Purchase"
ADD COLUMN "isLegacyGstApproximation" BOOLEAN DEFAULT false,
ADD COLUMN "gstApproximationReason" TEXT,
ADD COLUMN "verifiedByUserId" VARCHAR(255),
ADD COLUMN "verifiedAt" TIMESTAMP;

-- Backfilled records (from schema migration Part 1):
UPDATE "Purchase"
SET "isLegacyGstApproximation" = true,
    "gstApproximationReason" = 'Backfilled from totalGst during migration'
WHERE "invoiceDate" < CURRENT_DATE - INTERVAL 30 DAY  -- Purchases > 30 days old
  AND "cgst" IS NOT NULL;  -- Only if already backfilled
```

### 1.2 GSTR-2 Report Query Adjustment

```typescript
// apps/backend/src/modules/mobileshop/reports/gstr2.service.ts

async generatePurchaseRegister(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  shopId?: string,
  includeUnverifiedLegacy: boolean = false  // Default: exclude legacy
): Promise<GSTR2Report> {
  const shopFilter = shopId ? Prisma.sql`AND p."shopId" = ${shopId}` : Prisma.empty;
  const legacyFilter = includeUnverifiedLegacy
    ? Prisma.empty
    : Prisma.sql`AND (p."isLegacyGstApproximation" = false OR p."verifiedAt" IS NOT NULL)`;

  const purchases = await this.prisma.purchase.findMany({
    where: {
      tenantId,
      status: { notIn: ['DRAFT', 'CANCELLED'] },
      invoiceDate: { gte: startDate, lte: endDate },
      totalGst: { gt: 0 },
      supplierGstin: { not: null },
      ...(shopId && { shopId })
    },
    include: {
      items: true,
      party: true
    }
  });

  // ✅ Filter: Exclude legacy approximations UNLESS manually verified
  const validPurchases = purchases.filter(p => {
    if (!includeUnverifiedLegacy && p.isLegacyGstApproximation && !p.verifiedAt) {
      return false; // Exclude unverified legacy
    }
    return true;
  });

  // Build ITC lines
  const lines = validPurchases.map(p => ({
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

    // ✅ NEW: Flag for CA audit
    isLegacyData: p.isLegacyGstApproximation && !p.verifiedAt,
    verificationStatus: p.verifiedAt ? 'VERIFIED_BY_CA' : 'APPROXIMATED'
  }));

  // Build summary
  const totalLines = lines.length;
  const legacyLines = lines.filter(l => l.isLegacyData).length;
  const verifiedLines = totalLines - legacyLines;

  return {
    period: { startDate, endDate },
    lines,
    summary: {
      totalLines,
      verifiedLines,
      legacyUnverifiedLines: legacyLines,
      totalTaxableValue: lines.reduce((s, l) => s + l.taxableValue, 0),
      totalCgstITC: lines.filter(l => !l.isLegacyData).reduce((s, l) => s + l.cgstITC, 0), // ✅ Exclude legacy from ITC total
      totalSgstITC: lines.filter(l => !l.isLegacyData).reduce((s, l) => s + l.sgstITC, 0),
      totalIgstITC: lines.filter(l => !l.isLegacyData).reduce((s, l) => s + l.igstITC, 0)
    },
    warnings: legacyLines > 0 ? [
      `${legacyLines} purchases have approximated GST data (backfilled). ` +
      `CA must review and verify actual GST breakdown before filing GSTR-2.`
    ] : [],
    generatedAt: new Date()
  };
}
```

### 1.3 CA Verification Service

```typescript
// apps/backend/src/modules/mobileshop/purchases/gst-verification.service.ts

@Injectable()
export class GSTVerificationService {
  constructor(
    private prisma: PrismaService,
    private logger: Logger,
  ) {}

  /**
   * CA verifies actual GST breakdown for legacy purchase
   * Updates CGST/SGST/IGST with verified amounts
   * Marks record as verified
   */
  async verifyLegacyGST(
    tenantId: string,
    purchaseId: string,
    verifiedCgst: number,
    verifiedSgst: number,
    verifiedIgst: number,
    verifiedBy: string,
  ): Promise<Purchase> {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) throw new NotFoundException('Purchase not found');
    if (!purchase.isLegacyGstApproximation) {
      throw new BadRequestException(
        'Only legacy approximated records need verification',
      );
    }

    // Validate: verified GST matches recorded totalGst
    const verifiedTotal = verifiedCgst + verifiedSgst + verifiedIgst;
    if (verifiedTotal !== purchase.totalGst) {
      throw new BadRequestException(
        `Verified GST total (₹${verifiedTotal / 100}) does not match recorded ₹${purchase.totalGst / 100}. ` +
          `Adjust rates or amounts first.`,
      );
    }

    const updated = await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        cgst: verifiedCgst,
        sgst: verifiedSgst,
        igst: verifiedIgst,
        isLegacyGstApproximation: false,
        verifiedByUserId: verifiedBy,
        verifiedAt: new Date(),
        gstApproximationReason: null, // Clear approximation reason
      },
    });

    this.logger.log(
      `Purchase ${purchase.invoiceNumber} GST verified by CA ${verifiedBy}: ` +
        `CGST=${verifiedCgst}, SGST=${verifiedSgst}, IGST=${verifiedIgst}`,
    );

    return updated;
  }

  /**
   * Generate unverified legacy GST report for CA review
   */
  async getUnverifiedLegacyPurchases(
    tenantId: string,
    shopId?: string,
  ): Promise<UnverifiedLegacyReport> {
    const unverified = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        isLegacyGstApproximation: true,
        verifiedAt: null,
        status: { notIn: ['DRAFT', 'CANCELLED'] },
        ...(shopId && { shopId }),
      },
      include: {
        items: true,
      },
      orderBy: { invoiceDate: 'desc' },
    });

    return {
      totalCount: unverified.length,
      totalApproximatedGst: unverified.reduce(
        (s, p) => s + (p.totalGst || 0),
        0,
      ),
      purchases: unverified.map((p) => ({
        invoiceNumber: p.invoiceNumber,
        supplierName: p.supplierName,
        invoiceDate: p.invoiceDate,
        totalGst: p.totalGst,
        cgst: p.cgst,
        sgst: p.sgst,
        igst: p.igst,
        approximationReason: p.gstApproximationReason,
      })),
      actionRequired: `CA must review and verify ${unverified.length} purchases with approximated GST before filing GSTR returns`,
    };
  }
}

interface UnverifiedLegacyReport {
  totalCount: number;
  totalApproximatedGst: number;
  purchases: Array<{
    invoiceNumber: string;
    supplierName: string;
    invoiceDate: Date;
    totalGst: number;
    cgst: number | null;
    sgst: number | null;
    igst: number | null;
    approximationReason: string | null;
  }>;
  actionRequired: string;
}
```

### 1.4 API Endpoint

```typescript
// apps/backend/src/modules/mobileshop/purchases/purchases.controller.ts

@Controller('api/mobileshop/purchases')
@UseGuards(JwtAuthGuard)
export class PurchasesController {
  constructor(
    private purchasesService: PurchasesService,
    private gstVerificationService: GSTVerificationService,
  ) {}

  // ✅ NEW: Get unverified legacy GST report
  @Get('legacy-gst/unverified')
  async getUnverifiedLegacy(@Request() req, @Query('shopId') shopId?: string) {
    const tenantId = req.user.tenantId;
    return this.gstVerificationService.getUnverifiedLegacyPurchases(
      tenantId,
      shopId,
    );
  }

  // ✅ NEW: CA verifies GST breakdown
  @Post(':id/verify-gst')
  async verifyGST(
    @Param('id') purchaseId: string,
    @Request() req,
    @Body() verifyDto: VerifyGSTDto,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.sub;

    return this.gstVerificationService.verifyLegacyGST(
      tenantId,
      purchaseId,
      verifyDto.cgst,
      verifyDto.sgst,
      verifyDto.igst,
      userId,
    );
  }
}

@IsNotEmpty()
export class VerifyGSTDto {
  @IsNumber()
  cgst: number;

  @IsNumber()
  sgst: number;

  @IsNumber()
  igst: number;
}
```

---

## RISK #2: PURCHASE SUBMISSION IDEMPOTENCY

**Problem**: Submitting same purchase twice can create duplicate StockLedger entries, doubling stock.

**Solution**: Enforce status check inside transaction; log and reject duplicate submissions.

### 2.1 Enhanced Purchase Submission Service

```typescript
// apps/backend/src/core/purchases/purchases.service.ts

async atomicPurchaseSubmit(tenantId: string, purchaseId: string): Promise<Purchase> {
  const purchase = await this.prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: { items: true }
  });

  if (!purchase) throw new NotFoundException('Purchase not found');

  // ✅ CRITICAL: Check status BEFORE transaction
  if (purchase.status !== 'DRAFT') {
    this.logger.warn(
      `Duplicate submission attempt: Purchase ${purchase.invoiceNumber} ` +
      `already status ${purchase.status}. Rejecting.`
    );
    throw new BadRequestException(
      `Purchase already submitted (status: ${purchase.status}). ` +
      `Cannot re-submit. Create a new purchase if more stock needed.`
    );
  }

  // All validations (from TIER2 spec)
  if (purchase.totalGst > 0 && !purchase.supplierGstin) {
    throw new BadRequestException('Supplier GSTIN is mandatory for GST purchases');
  }

  // ... rest of validations ...

  // ✅ ATOMIC TRANSACTION: Explicit transaction control
  return await this.prisma.$transaction(
    async (tx) => {
      // 1. Re-check status inside transaction (optimistic lock)
      const txPurchase = await tx.purchase.findUnique({
        where: { id: purchaseId }
      });

      if (txPurchase!.status !== 'DRAFT') {
        // Race condition detected: another process submitted first
        throw new BadRequestException(
          'Purchase status changed during submission. Please refresh and retry.'
        );
      }

      // 2. Update status
      await tx.purchase.update({
        where: { id: purchaseId },
        data: { status: 'SUBMITTED' }
      });

      // 3. Check for existing StockLedger entries (should not exist)
      const existingStock = await tx.stockLedger.findMany({
        where: {
          referenceId: purchaseId,
          referenceType: 'PURCHASE',
          type: 'IN'
        }
      });

      if (existingStock.length > 0) {
        // Stock already created: abort to prevent doubling
        throw new BadRequestException(
          `Stock entries already exist for this purchase. ` +
          `Cannot re-submit. Found ${existingStock.length} IN entries.`
        );
      }

      // 4. Create StockLedger entries
      const stockEntries = purchase.items
        .filter(item => item.shopProductId)
        .map(item => ({
          id: cuid(),
          tenantId,
          shopId: purchase.shopId,
          shopProductId: item.shopProductId!,
          type: 'IN' as StockEntryType,
          quantity: item.quantity,
          costPerUnit: item.purchasePrice,
          referenceType: 'PURCHASE' as StockRefType,
          referenceId: purchase.id,
          note: `Stock IN from Purchase #${purchase.invoiceNumber}`,
          createdAt: new Date()
        }));

      if (stockEntries.length > 0) {
        await tx.stockLedger.createMany({ data: stockEntries });
      }

      // 5. Update product WAC
      for (const item of purchase.items) {
        if (item.shopProductId) {
          await this.updateProductWAC(tx, item.shopProductId, item.quantity, item.purchasePrice, tenantId);
        }
      }

      this.logger.log(
        `✅ Purchase ${purchase.invoiceNumber} submitted atomically: ` +
        `${stockEntries.length} stock entries created`
      );

      return tx.purchase.findUniqueOrThrow({ where: { id: purchaseId } });
    },
    {
      timeout: 30000, // 30 second timeout for transaction
      isolationLevel: 'Serializable' // Highest isolation to prevent race conditions
    }
  );
}
```

### 2.2 Submission Audit Log

```typescript
// apps/backend/src/core/purchases/purchase-audit.service.ts

@Injectable()
export class PurchaseAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log all submission attempts (success and failure)
   */
  async logSubmissionAttempt(
    tenantId: string,
    purchaseId: string,
    status: 'SUCCESS' | 'FAILED_DUPLICATE' | 'FAILED_VALIDATION',
    reason?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        entityType: 'PURCHASE',
        entityId: purchaseId,
        action: 'SUBMIT',
        status,
        details: reason,
        timestamp: new Date(),
      },
    });
  }

  /**
   * Get submission history for a purchase
   */
  async getSubmissionHistory(purchaseId: string): Promise<SubmissionLog[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityId: purchaseId,
        entityType: 'PURCHASE',
        action: 'SUBMIT',
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
```

### 2.3 Prevent Duplicate Submissions in Controller

```typescript
@Post(':id/submit')
async submitPurchase(
  @Param('id') purchaseId: string,
  @Request() req
): Promise<{ message: string; purchase: Purchase }> {
  const tenantId = req.user.tenantId;
  const userId = req.user.sub;

  try {
    const submitted = await this.purchasesService.atomicPurchaseSubmit(tenantId, purchaseId);

    await this.auditService.logSubmissionAttempt(tenantId, purchaseId, 'SUCCESS');

    return {
      message: '✅ Purchase submitted successfully. Stock entries created.',
      purchase: submitted
    };
  } catch (error) {
    const reason = error.message;
    const isFailed = !reason.includes('already submitted');

    await this.auditService.logSubmissionAttempt(
      tenantId,
      purchaseId,
      'FAILED_DUPLICATE',
      reason
    );

    throw error;
  }
}
```

---

## RISK #3: RECEIPT CANCELLATION IS NOT REVENUE

**Problem**: Revenue reports include receipt cancellations, inflating sales figures; cashbook distorted.

**Solution**: Revenue queries MUST exclude FinancialEntry referenceType='RECEIPT_CANCELLATION'.

### 3.1 Corrected Revenue Report Queries

```typescript
// apps/backend/src/modules/mobileshop/reports/sales-report.service.ts

@Injectable()
export class SalesReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Sales Revenue Report
   * ✅ INCLUDES: Completed invoices (status != VOIDED)
   * ✅ EXCLUDES: Receipt cancellations
   */
  async getSalesReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<SalesReport> {
    const shopFilter = shopId
      ? Prisma.sql`AND i."shopId" = ${shopId}`
      : Prisma.empty;

    // Fetch invoices (VOIDED excluded automatically)
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'VOIDED' }, // ✅ Exclude voided
        invoiceDate: { gte: startDate, lte: endDate },
        ...(shopId && { shopId }),
      },
      include: {
        items: true,
        customer: true,
      },
    });

    // Build report
    const lines = invoices.map((inv) => ({
      invoiceNo: inv.invoiceNumber,
      customerName: inv.customerName || 'Walk-in',
      invoiceDate: inv.invoiceDate,
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      outstanding: Math.max(0, inv.totalAmount - inv.paidAmount),
      status: inv.status,
    }));

    const totalRevenue = invoices.reduce((s, i) => s + i.totalAmount, 0);
    const totalReceived = invoices.reduce((s, i) => s + i.paidAmount, 0);
    const totalOutstanding = totalRevenue - totalReceived;

    return {
      period: { startDate, endDate },
      lines,
      summary: {
        totalInvoices: invoices.length,
        totalRevenue,
        totalReceived,
        totalOutstanding,
      },
    };
  }

  /**
   * Cashbook Report
   * ✅ INCLUDES: All FinancialEntry(type=IN) from RECEIPT
   * ✅ INCLUDES: All FinancialEntry(type=OUT) including RECEIPT_CANCELLATION
   * ✅ EXCLUDES: Nothing (shows complete cash movement)
   */
  async getCashbookReport(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<CashbookReport> {
    const shopFilter = shopId
      ? Prisma.sql`AND fe."shopId" = ${shopId}`
      : Prisma.empty;

    // All FinancialEntry (IN and OUT)
    const entries = await this.prisma.financialEntry.findMany({
      where: {
        tenantId,
        createdAt: { gte: startDate, lte: endDate },
        ...(shopId && { shopId }),
      },
      orderBy: { createdAt: 'asc' },
    });

    // Segregate by type
    const inflows = entries.filter((e) => e.type === 'IN');
    const outflows = entries.filter((e) => e.type === 'OUT');

    const inflowsTotal = inflows.reduce((s, e) => s + e.amount, 0);
    const outflowsTotal = outflows.reduce((s, e) => s + e.amount, 0);

    // ✅ Show cancellations explicitly in cashbook
    const cancellationOutflows = outflows.filter(
      (e) => e.referenceType === 'RECEIPT_CANCELLATION',
    );

    return {
      period: { startDate, endDate },
      inflows: inflows.map((e) => ({
        date: e.createdAt,
        type: e.referenceType,
        amount: e.amount,
        mode: e.mode,
        note: e.note,
      })),
      outflows: outflows.map((e) => ({
        date: e.createdAt,
        type: e.referenceType,
        amount: e.amount,
        mode: e.mode,
        note: e.note,
        isCancellation: e.referenceType === 'RECEIPT_CANCELLATION', // ✅ Flag cancellations
      })),
      summary: {
        totalInflows: inflowsTotal,
        totalOutflows: outflowsTotal,
        netCashMovement: inflowsTotal - outflowsTotal,
        cancellationOutflows: cancellationOutflows.reduce(
          (s, e) => s + e.amount,
          0,
        ),
        note:
          cancellationOutflows.length > 0
            ? `⚠️ Cashbook includes ${cancellationOutflows.length} receipt cancellations (OUT). ` +
              `These reduce net cash and must be reconciled.`
            : undefined,
      },
    };
  }

  /**
   * GSTR-1 Sales Report (from spec, updated)
   * ✅ CRITICAL: Does NOT include receipt cancellations
   * (Receipt cancellations are not a business transaction; they reverse prior receipts)
   */
  async getGSTR1Register(
    tenantId: string,
    startDate: Date,
    endDate: Date,
    shopId?: string,
  ): Promise<GSTR1Report> {
    // Only invoices, NOT receipt cancellations
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'VOIDED' }, // ✅ Already excludes voided
        invoiceDate: { gte: startDate, lte: endDate },
        ...(shopId && { shopId }),
      },
      include: { items: true, customer: true },
    });

    // ... build B2B/B2C/HSN as per TIER2 spec ...
    // No special handling needed for cancellations (they don't appear in Invoice.status)
  }
}
```

### 3.2 Data Integrity Check Service

```typescript
// apps/backend/src/modules/mobileshop/reports/integrity-check.service.ts

@Injectable()
export class DataIntegrityCheckService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate revenue report integrity
   * Ensures Invoice totals match FinancialEntry(type=IN) excluding cancellations
   */
  async validateRevenueIntegrity(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<IntegrityCheckResult> {
    // Total from invoices (VOIDED excluded)
    const invoiceTotal = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT SUM("totalAmount") as "total"
      FROM "Invoice"
      WHERE "tenantId" = ${tenantId}
        AND "status" != 'VOIDED'
        AND "invoiceDate" >= ${startDate}
        AND "invoiceDate" <= ${endDate}
    `;

    // Total receipts (excluding cancellations)
    const receiptTotal = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT SUM(fe."amount") as "total"
      FROM "FinancialEntry" fe
      WHERE fe."tenantId" = ${tenantId}
        AND fe."type" = 'IN'
        AND fe."referenceType" = 'RECEIPT'
        AND fe."createdAt" >= ${startDate}
        AND fe."createdAt" <= ${endDate}
    `;

    // Total cancellations (OUT)
    const cancellationTotal = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT SUM(fe."amount") as "total"
      FROM "FinancialEntry" fe
      WHERE fe."tenantId" = ${tenantId}
        AND fe."type" = 'OUT'
        AND fe."referenceType" = 'RECEIPT_CANCELLATION'
        AND fe."createdAt" >= ${startDate}
        AND fe."createdAt" <= ${endDate}
    `;

    const invoiceTotalAmount = Number(invoiceTotal[0]?.total || 0);
    const receiptTotalAmount = Number(receiptTotal[0]?.total || 0);
    const cancellationAmount = Number(cancellationTotal[0]?.total || 0);

    const isValid = Math.abs(invoiceTotalAmount - receiptTotalAmount) < 100; // 1 rupee tolerance

    return {
      period: { startDate, endDate },
      invoiceTotal: invoiceTotalAmount,
      receiptTotal: receiptTotalAmount,
      cancellationTotal: cancellationAmount,
      netCash: receiptTotalAmount - cancellationAmount,
      isValid,
      discrepancy: invoiceTotalAmount - receiptTotalAmount,
      warnings: !isValid
        ? [
            `⚠️ Revenue discrepancy detected: Invoices ₹${(invoiceTotalAmount / 100).toFixed(2)} ` +
              `but Receipts ₹${(receiptTotalAmount / 100).toFixed(2)}. Diff: ₹${(Math.abs(invoiceTotalAmount - receiptTotalAmount) / 100).toFixed(2)}`,
          ]
        : [],
    };
  }
}

interface IntegrityCheckResult {
  period: { startDate: Date; endDate: Date };
  invoiceTotal: number;
  receiptTotal: number;
  cancellationTotal: number;
  netCash: number;
  isValid: boolean;
  discrepancy: number;
  warnings: string[];
}
```

---

## RISK #4: SUPPLIER ADVANCE HANDLING

**Problem**: Supplier advances (prepayments) are treated like purchase payments, inflating payables aging.

**Solution**: Split vouchers into ADVANCE (prepayment) and SETTLEMENT (payment against purchase).

### 4.1 Schema Enhancement

```prisma
// apps/backend/prisma/schema.prisma

enum VoucherSubType {
  ADVANCE      // Prepayment to supplier (not against specific purchase)
  SETTLEMENT   // Payment against purchase
}

model PaymentVoucher {
  id                String          @id @default(cuid())
  tenantId          String
  shopId            String
  voucherId         String          @unique  // Unique number
  voucherType       VoucherType     // SUPPLIER | EXPENSE | SALARY | ADJUSTMENT
  voucherSubType    VoucherSubType? @default(null) // ✅ NEW: ADVANCE or SETTLEMENT

  date              DateTime        @default(now())
  amount            Int
  paymentMethod     PaymentMethod   // CASH | UPI | CARD | BANK
  transactionRef    String?
  narration         String?

  globalSupplierId  String?         // For SUPPLIER type
  expenseCategory   String?         // For EXPENSE type
  linkedPurchaseId  String?         // ✅ For SETTLEMENT only (purchase payment)

  // ✅ NEW: For ADVANCE vouchers, track applications
  advanceApplications AdvanceApplication[]

  status            String          @default(ACTIVE)  // ACTIVE | REVERSED
  createdBy         String
  createdAt         DateTime        @default(now())
}

// ✅ NEW: Track how supplier advances are applied
model AdvanceApplication {
  id                String          @id @default(cuid())
  tenantId          String
  advanceVoucherId  String          @db.VarChar(255)
  purchaseId        String
  amount            Int             // Amount applied to this purchase
  appliedAt         DateTime        @default(now())

  @@foreign([advanceVoucherId])
}
```

**Migration**:

```sql
ALTER TABLE "PaymentVoucher"
ADD COLUMN "voucherSubType" VARCHAR(20);

CREATE TABLE "AdvanceApplication" (
  "id" VARCHAR(191) NOT NULL PRIMARY KEY,
  "tenantId" VARCHAR(191) NOT NULL,
  "advanceVoucherId" VARCHAR(191) NOT NULL,
  "purchaseId" VARCHAR(191) NOT NULL,
  "amount" INT NOT NULL,
  "appliedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("advanceVoucherId") REFERENCES "PaymentVoucher"("id")
);
```

### 4.2 Voucher Creation Service (Enhanced)

```typescript
// apps/backend/src/modules/mobileshop/vouchers/vouchers.service.ts

async createVoucher(
  tenantId: string,
  shopId: string,
  createVoucherDto: CreateVoucherDto,
  userId: string
): Promise<PaymentVoucher> {
  // ✅ VALIDATION: CREDIT rejected
  if (createVoucherDto.paymentMethod === 'CREDIT') {
    throw new BadRequestException('CREDIT payments not allowed');
  }

  // ✅ VALIDATION: SUPPLIER type requires subType if amount > threshold
  if (createVoucherDto.voucherType === 'SUPPLIER' && !createVoucherDto.globalSupplierId) {
    throw new BadRequestException('Supplier required for SUPPLIER vouchers');
  }

  // ✅ NEW LOGIC: If SUPPLIER type AND no linkedPurchaseId, must be ADVANCE
  if (createVoucherDto.voucherType === 'SUPPLIER' && !createVoucherDto.linkedPurchaseId) {
    // This is a supplier prepayment (advance)
    // Do NOT automatically update any Purchase.paidAmount
    return await this.createAdvanceVoucher(tenantId, shopId, createVoucherDto, userId);
  }

  // ✅ If SUPPLIER + linkedPurchaseId, it's SETTLEMENT
  if (createVoucherDto.voucherType === 'SUPPLIER' && createVoucherDto.linkedPurchaseId) {
    return await this.createSettlementVoucher(tenantId, shopId, createVoucherDto, userId);
  }

  // ✅ EXPENSE, SALARY, ADJUSTMENT: Regular vouchers
  return await this.createRegularVoucher(tenantId, shopId, createVoucherDto, userId);
}

private async createAdvanceVoucher(
  tenantId: string,
  shopId: string,
  createVoucherDto: CreateVoucherDto,
  userId: string
): Promise<PaymentVoucher> {
  return await this.prisma.$transaction(async (tx) => {
    const voucher = await tx.paymentVoucher.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        voucherId: this.generateVoucherId(),
        voucherType: 'SUPPLIER',
        voucherSubType: 'ADVANCE', // ✅ Mark as prepayment
        date: new Date(),
        amount: this.toPaisa(createVoucherDto.amount),
        paymentMethod: createVoucherDto.paymentMethod,
        transactionRef: createVoucherDto.transactionRef,
        narration: `[ADVANCE] ${createVoucherDto.narration || 'Supplier prepayment'}`,
        globalSupplierId: createVoucherDto.globalSupplierId,
        status: 'ACTIVE',
        createdBy: userId
      }
    });

    // ✅ Create FinancialEntry (money OUT)
    await tx.financialEntry.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        type: 'OUT',
        amount: voucher.amount,
        mode: voucher.paymentMethod,
        referenceType: 'VOUCHER_ADVANCE',
        referenceId: voucher.id,
        note: `Supplier advance: ${voucher.narration}`,
        createdAt: new Date()
      }
    });

    this.logger.log(
      `ADVANCE voucher created: ${voucher.voucherId} for ₹${(voucher.amount / 100).toFixed(2)}. ` +
      `Does NOT reduce any purchase outstanding yet.`
    );

    return voucher;
  });
}

private async createSettlementVoucher(
  tenantId: string,
  shopId: string,
  createVoucherDto: CreateVoucherDto,
  userId: string
): Promise<PaymentVoucher> {
  const purchase = await this.prisma.purchase.findUnique({
    where: { id: createVoucherDto.linkedPurchaseId! }
  });

  if (!purchase) throw new NotFoundException('Linked purchase not found');

  // ✅ Prevent over-payment
  const outstanding = purchase.grandTotal - purchase.paidAmount;
  if (createVoucherDto.amount > outstanding) {
    throw new BadRequestException(
      `Cannot pay ₹${createVoucherDto.amount}. Outstanding is only ₹${(outstanding / 100).toFixed(2)}`
    );
  }

  return await this.prisma.$transaction(async (tx) => {
    const voucher = await tx.paymentVoucher.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        voucherId: this.generateVoucherId(),
        voucherType: 'SUPPLIER',
        voucherSubType: 'SETTLEMENT', // ✅ Mark as purchase payment
        date: new Date(),
        amount: this.toPaisa(createVoucherDto.amount),
        paymentMethod: createVoucherDto.paymentMethod,
        transactionRef: createVoucherDto.transactionRef,
        narration: `Purchase ${purchase.invoiceNumber}`,
        globalSupplierId: createVoucherDto.globalSupplierId,
        linkedPurchaseId: createVoucherDto.linkedPurchaseId,
        status: 'ACTIVE',
        createdBy: userId
      }
    });

    // ✅ Update Purchase.paidAmount and status
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

    // ✅ Create FinancialEntry (money OUT)
    await tx.financialEntry.create({
      data: {
        id: cuid(),
        tenantId,
        shopId,
        type: 'OUT',
        amount: voucher.amount,
        mode: voucher.paymentMethod,
        referenceType: 'VOUCHER_SETTLEMENT',
        referenceId: voucher.id,
        note: `Settlement: Purchase ${purchase.invoiceNumber}`,
        createdAt: new Date()
      }
    });

    this.logger.log(
      `SETTLEMENT voucher created: ${voucher.voucherId} against Purchase ${purchase.invoiceNumber}. ` +
      `Paid: ₹${(newPaidAmount / 100).toFixed(2)} / ₹${(purchase.grandTotal / 100).toFixed(2)}`
    );

    return voucher;
  });
}

private async createRegularVoucher(
  tenantId: string,
  shopId: string,
  createVoucherDto: CreateVoucherDto,
  userId: string
): Promise<PaymentVoucher> {
  // EXPENSE, SALARY, ADJUSTMENT: No special handling
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
        expenseCategory: createVoucherDto.expenseCategory,
        status: 'ACTIVE',
        createdBy: userId
      }
    });

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
        note: `${createVoucherDto.voucherType}: ${createVoucherDto.narration}`,
        createdAt: new Date()
      }
    });

    return voucher;
  });
}
```

### 4.3 Advance Application Service

```typescript
// apps/backend/src/modules/mobileshop/vouchers/advance-application.service.ts

@Injectable()
export class AdvanceApplicationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Apply supplier advance to a purchase
   * Reduces Purchase.paidAmount if advance is sufficient
   */
  async applyAdvanceToPurchase(
    tenantId: string,
    advanceVoucherId: string,
    purchaseId: string,
    amountToApply: number, // paisa
  ): Promise<AdvanceApplication> {
    const advance = await this.prisma.paymentVoucher.findUnique({
      where: { id: advanceVoucherId },
    });

    if (!advance || advance.voucherSubType !== 'ADVANCE') {
      throw new BadRequestException('Invalid advance voucher');
    }

    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) throw new NotFoundException('Purchase not found');

    // Calculate remaining advance
    const appliedTotal = await this.getAppliedAdvanceTotal(advanceVoucherId);
    const remaining = advance.amount - appliedTotal;

    if (amountToApply > remaining) {
      throw new BadRequestException(
        `Cannot apply ₹${(amountToApply / 100).toFixed(2)}. ` +
          `Remaining advance: ₹${(remaining / 100).toFixed(2)}`,
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create application record
      const application = await tx.advanceApplication.create({
        data: {
          id: cuid(),
          tenantId,
          advanceVoucherId,
          purchaseId,
          amount: amountToApply,
          appliedAt: new Date(),
        },
      });

      // Update Purchase.paidAmount
      const newPaidAmount = purchase.paidAmount + amountToApply;
      const newStatus =
        newPaidAmount >= purchase.grandTotal
          ? 'PAID'
          : newPaidAmount > 0
            ? 'PARTIALLY_PAID'
            : 'DRAFT';

      await tx.purchase.update({
        where: { id: purchaseId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      return application;
    });
  }

  private async getAppliedAdvanceTotal(
    advanceVoucherId: string,
  ): Promise<number> {
    const result = await this.prisma.advanceApplication.aggregate({
      where: { advanceVoucherId },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  /**
   * Get remaining advance balance
   */
  async getAdvanceBalance(
    advanceVoucherId: string,
  ): Promise<{ total: number; applied: number; remaining: number }> {
    const advance = await this.prisma.paymentVoucher.findUnique({
      where: { id: advanceVoucherId },
    });

    if (!advance || advance.voucherSubType !== 'ADVANCE') {
      throw new BadRequestException('Not an advance voucher');
    }

    const applied = await this.getAppliedAdvanceTotal(advanceVoucherId);

    return {
      total: advance.amount,
      applied,
      remaining: advance.amount - applied,
    };
  }
}
```

### 4.4 Updated Payables Aging (Excludes Advances)

```typescript
// apps/backend/src/modules/mobileshop/reports/aging.service.ts

async getPayablesAging(
  tenantId: string,
  asOfDate: Date,
  shopId?: string
): Promise<PayablesAgingReport> {
  const today = asOfDate || new Date();

  // ✅ CRITICAL: Only SETTLEMENT vouchers reduce outstanding
  // ADVANCE vouchers are separate (not counted in payables aging)
  const purchases = await this.prisma.purchase.findMany({
    where: {
      tenantId,
      status: { notIn: ['DRAFT', 'CANCELLED'] },
      ...(shopId && { shopId })
    },
    include: {
      party: true,
      vouchers: {
        where: {
          voucherSubType: { in: ['SETTLEMENT', null] } // ✅ Exclude ADVANCE
        }
      }
    }
  });

  const payables: PayableAging[] = [];
  let total = 0;

  for (const purchase of purchases) {
    // outstanding = grandTotal - paidAmount
    // paidAmount only includes SETTLEMENT vouchers (advances tracked separately)
    const outstanding = Math.max(0, purchase.grandTotal - purchase.paidAmount);
    if (outstanding === 0) continue;

    const effectiveDueDate = purchase.dueDate || new Date(purchase.invoiceDate.getTime() + 30 * 86400000);
    const daysOverdue = Math.floor((today.getTime() - effectiveDueDate.getTime()) / (1000 * 86400));

    const bucket =
      daysOverdue < 0 ? 'NOT_DUE' :
      daysOverdue <= 30 ? 'CURRENT' :
      daysOverdue <= 60 ? 'D31_60' :
      daysOverdue <= 90 ? 'D61_90' :
      'D90PLUS';

    payables.push({
      supplierName: purchase.supplierName,
      invoiceNo: purchase.invoiceNumber,
      invoiceDate: purchase.invoiceDate,
      dueDate: effectiveDueDate,
      totalAmount: purchase.grandTotal,
      paidAmount: purchase.paidAmount, // SETTLEMENT only
      outstanding,
      daysOverdue,
      bucket
    });

    total += outstanding;
  }

  const summary = {
    notDue: payables.filter(p => p.bucket === 'NOT_DUE').reduce((s, p) => s + p.outstanding, 0),
    current: payables.filter(p => p.bucket === 'CURRENT').reduce((s, p) => s + p.outstanding, 0),
    d31_60: payables.filter(p => p.bucket === 'D31_60').reduce((s, p) => s + p.outstanding, 0),
    d61_90: payables.filter(p => p.bucket === 'D61_90').reduce((s, p) => s + p.outstanding, 0),
    d90Plus: payables.filter(p => p.bucket === 'D90PLUS').reduce((s, p) => s + p.outstanding, 0),
    total
  };

  return {
    asOfDate: today,
    lines: payables.sort((a, b) => b.daysOverdue - a.daysOverdue),
    summary,
    note: '⚠️ Supplier advances (prepayments) are NOT included in aging. ' +
          'Check AdvanceApplication for advance balances.'
  };
}
```

---

## RISK #5: GSTR-1 HSN CORRECTION

**Problem**: First item's HSN used for entire invoice; multi-HSN invoices report incorrectly.

**Solution**: Build HSN summary per InvoiceItem, not per Invoice.

### 5.1 Corrected GSTR-1 Implementation

```typescript
// apps/backend/src/modules/mobileshop/reports/gstr1.service.ts

async generateSalesRegister(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  shopId?: string,
  includeUnverifiedLegacy: boolean = false
): Promise<GSTR1Report> {
  const shopFilter = shopId ? Prisma.sql`AND i."shopId" = ${shopId}` : Prisma.empty;

  // Fetch invoices
  const invoices = await this.prisma.invoice.findMany({
    where: {
      tenantId,
      status: { not: 'VOIDED' },
      invoiceDate: { gte: startDate, lte: endDate },
      ...(shopId && { shopId })
    },
    include: {
      items: true,
      customer: true
    }
  });

  // Segregate B2B vs B2C
  const b2bInvoices = invoices.filter(i => i.customerGstin);
  const b2cInvoices = invoices.filter(i => !i.customerGstin);

  // ✅ CRITICAL: Build lines per InvoiceItem (not per Invoice)
  const b2bLines: GSTR1Line[] = [];

  for (const invoice of b2bInvoices) {
    for (const item of invoice.items) {
      // ✅ Each item is a separate line with its own HSN
      b2bLines.push({
        invoiceNo: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerGstin: invoice.customerGstin!,
        customerName: invoice.customerName || 'N/A',
        hsnCode: item.hsnCode || 'UNSPECIFIED', // ✅ Use item's HSN
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxableValue: item.lineTotal - (item.taxAmount || 0),
        cgstRate: 9,
        cgstAmount: Math.floor((item.taxAmount || 0) / 2), // Simplified
        sgstRate: 9,
        sgstAmount: (item.taxAmount || 0) - Math.floor((item.taxAmount || 0) / 2),
        igstRate: 0,
        igstAmount: 0,
        cessAmount: 0
      });
    }
  }

  // B2C summary (consolidated per invoice)
  const b2cTotal = {
    totalInvoices: b2cInvoices.length,
    totalValue: b2cInvoices.reduce((s, i) => s + i.totalAmount, 0),
    totalTaxable: b2cInvoices.reduce((s, i) => s + i.subTotal, 0),
    totalCgst: b2cInvoices.reduce((s, i) => s + (i.cgst || 0), 0),
    totalSgst: b2cInvoices.reduce((s, i) => s + (i.sgst || 0), 0),
    totalIgst: b2cInvoices.reduce((s, i) => s + (i.igst || 0), 0)
  };

  // ✅ HSN-wise summary (per item)
  const hsnSummary = await this.getHSNSummaryPerItem(tenantId, startDate, endDate, shopId);

  return {
    period: { startDate, endDate },
    b2b: {
      lines: b2bLines,
      totalLines: b2bLines.length,
      totalTaxableValue: b2bLines.reduce((s, l) => s + l.taxableValue, 0),
      totalCgst: b2bLines.reduce((s, l) => s + l.cgstAmount, 0),
      totalSgst: b2bLines.reduce((s, l) => s + l.sgstAmount, 0),
      totalIgst: b2bLines.reduce((s, l) => s + l.igstAmount, 0)
    },
    b2c: b2cTotal,
    hsnSummary,
    generatedAt: new Date(),
    note: '✅ HSN summary built per InvoiceItem (supports multi-HSN per invoice)'
  };
}

private async getHSNSummaryPerItem(
  tenantId: string,
  startDate: Date,
  endDate: Date,
  shopId?: string
): Promise<HSNSummaryLine[]> {
  const shopFilter = shopId ? Prisma.sql`AND i."shopId" = ${shopId}` : Prisma.empty;

  // ✅ GROUP BY hsnCode from items, not first item of invoice
  const result = await this.prisma.$queryRaw<HSNSummaryLine[]>`
    SELECT
      ii."hsnCode" as "hsnCode",
      COUNT(DISTINCT ii.id) as "totalItems",
      SUM(ii."quantity") as "totalQty",
      SUM(ii."lineTotal") as "totalValue",
      SUM(ii."lineTotal" - ii."taxAmount") as "taxableValue",
      SUM(ii."taxAmount") as "totalGst"
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

  return result.map(r => ({
    hsnCode: r.hsnCode || 'UNSPECIFIED',
    totalItems: Number(r.totalItems),
    totalQty: Number(r.totalQty),
    totalValue: Number(r.totalValue),
    taxableValue: Number(r.taxableValue),
    totalGst: Number(r.totalGst)
  }));
}
```

### 5.2 Multi-HSN Invoice Validation

```typescript
// apps/backend/src/modules/mobileshop/invoices/invoice-validation.service.ts

@Injectable()
export class InvoiceValidationService {
  /**
   * Report: Invoices with multiple HSNs
   * Useful for CA review of complex invoices
   */
  async getMultiHSNInvoices(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<MultiHSNReport> {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { not: 'VOIDED' },
        invoiceDate: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
      },
    });

    const multiHSN: MultiHSNInvoice[] = [];

    for (const invoice of invoices) {
      const hsnCodes = [...new Set(invoice.items.map((i) => i.hsnCode))];

      if (hsnCodes.length > 1) {
        multiHSN.push({
          invoiceNumber: invoice.invoiceNumber,
          customerName: invoice.customerName || 'N/A',
          hsnCount: hsnCodes.length,
          hsns: hsnCodes,
          itemCount: invoice.items.length,
          totalAmount: invoice.totalAmount,
        });
      }
    }

    return {
      period: { startDate, endDate },
      multiHSNInvoiceCount: multiHSN.length,
      invoices: multiHSN,
      note:
        multiHSN.length > 0
          ? `⚠️ ${multiHSN.length} invoices have multiple HSNs. ` +
            `GSTR-1 will split these into separate lines per HSN.`
          : 'All invoices have single HSN per line (standard)',
    };
  }
}

interface MultiHSNInvoice {
  invoiceNumber: string;
  customerName: string;
  hsnCount: number;
  hsns: string[];
  itemCount: number;
  totalAmount: number;
}

interface MultiHSNReport {
  period: { startDate: Date; endDate: Date };
  multiHSNInvoiceCount: number;
  invoices: MultiHSNInvoice[];
  note: string;
}
```

---

## RISK #6: GST RATE FLEXIBILITY

**Problem**: Hardcoded GST rates (9% CGST, 9% SGST, 18% IGST) don't match actual item rates.

**Solution**: Always derive rates from InvoiceItem and PurchaseItem data; never hardcode.

### 6.1 Item Tax Storage

```prisma
// apps/backend/prisma/schema.prisma

model InvoiceItem {
  id              String    @id @default(cuid())
  invoiceId       String
  invoice         Invoice   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)

  shopProductId   String?
  shopProduct     ShopProduct? @relation(fields: [shopProductId], references: [id])

  description     String
  hsnCode         String?
  quantity        Int
  unitPrice       Int       // paisa
  lineTotal       Int       // quantity * unitPrice (before tax)

  // ✅ Store actual rates (not hardcoded)
  cgstRate        Decimal   @default(9.0)   // e.g., 9.0, 5.0, 0.0
  sgstRate        Decimal   @default(9.0)
  igstRate        Decimal   @default(0.0)   // 0 for intra-state, 18 for inter-state

  cgstAmount      Int       // calculated
  sgstAmount      Int       // calculated
  igstAmount      Int       // calculated
  taxAmount       Int       // cgst + sgst + igst (total tax)

  createdAt       DateTime  @default(now())
}

model PurchaseItem {
  id              String    @id @default(cuid())
  purchaseId      String
  purchase        Purchase  @relation(fields: [purchaseId], references: [id], onDelete: Cascade)

  shopProductId   String?
  description     String
  hsnSac          String?
  quantity        Int
  purchasePrice   Int       // paisa (cost per unit)
  lineTotal       Int       // quantity * purchasePrice

  // ✅ Store actual rates
  cgstRate        Decimal   @default(9.0)
  sgstRate        Decimal   @default(9.0)
  igstRate        Decimal   @default(0.0)

  cgstAmount      Int
  sgstAmount      Int
  igstAmount      Int
  taxAmount       Int

  createdAt       DateTime  @default(now())
}
```

### 6.2 Item Tax Calculation Service

```typescript
// apps/backend/src/modules/mobileshop/invoices/item-tax.service.ts

@Injectable()
export class ItemTaxService {
  /**
   * Calculate item taxes based on stored rates
   * ✅ NO hardcoded values
   */
  calculateItemTax(
    lineTotal: number, // paisa
    cgstRate: number, // percentage
    sgstRate: number,
    igstRate: number,
    state?: 'same' | 'different', // For CGST/SGST vs IGST
  ): {
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    totalTax: number;
  } {
    let cgst = 0,
      sgst = 0,
      igst = 0;

    if (state === 'different' || igstRate > 0) {
      // Inter-state: IGST only
      igst = Math.round((lineTotal * igstRate) / 100);
    } else {
      // Intra-state: CGST + SGST
      cgst = Math.round((lineTotal * cgstRate) / 100);
      sgst = Math.round((lineTotal * sgstRate) / 100);
    }

    return {
      cgstAmount: cgst,
      sgstAmount: sgst,
      igstAmount: igst,
      totalTax: cgst + sgst + igst,
    };
  }

  /**
   * Validate: Item rates stored in DB match expected rates
   * (Useful for auditing)
   */
  async validateItemTaxRates(
    tenantId: string,
    hsnCode: string,
  ): Promise<ItemTaxValidation> {
    // Fetch all items with this HSN
    const items = await this.prisma.$queryRaw<ItemRateCheckResult[]>`
      SELECT DISTINCT 
        "cgstRate", "sgstRate", "igstRate",
        COUNT(*) as "occurrences"
      FROM "InvoiceItem"
      WHERE "hsnCode" = ${hsnCode}
        AND "invoice"."tenantId" = ${tenantId}
      GROUP BY "cgstRate", "sgstRate", "igstRate"
    `;

    const allRates = new Set(
      items.map((i) => `${i.cgstRate}/${i.sgstRate}/${i.igstRate}`),
    );

    return {
      hsnCode,
      distinctRateCombinations: allRates.size,
      rates: items.map((i) => ({
        cgst: i.cgstRate,
        sgst: i.sgstRate,
        igst: i.igstRate,
        occurrences: i.occurrences,
      })),
      warning:
        allRates.size > 1
          ? `⚠️ HSN ${hsnCode} has ${allRates.size} different rate combinations. ` +
            `Verify tax rate classification.`
          : null,
    };
  }
}

interface ItemRateCheckResult {
  cgstRate: Decimal;
  sgstRate: Decimal;
  igstRate: Decimal;
  occurrences: bigint;
}

interface ItemTaxValidation {
  hsnCode: string;
  distinctRateCombinations: number;
  rates: Array<{
    cgst: Decimal;
    sgst: Decimal;
    igst: Decimal;
    occurrences: number;
  }>;
  warning: string | null;
}
```

### 6.3 Report Query Updates (No Hardcoded Rates)

```typescript
// apps/backend/src/modules/mobileshop/reports/gstr1.service.ts

// BEFORE (WRONG):
// cgstAmount: 9% of taxableValue  ❌ Hardcoded

// AFTER (CORRECT):
// cgstAmount: ii."cgstAmount" FROM InvoiceItem ✅ Use stored value

const result = await this.prisma.$queryRaw<GSTR1LineItem[]>`
  SELECT 
    i."invoiceNumber" as "invoiceNo",
    i."invoiceDate",
    i."customerGstin",
    ii."hsnCode",
    ii."quantity",
    ii."lineTotal" - ii."cgstAmount" - ii."sgstAmount" - ii."igstAmount" as "taxableValue",
    ii."cgstRate" as "cgstRate",          -- ✅ From item
    ii."cgstAmount" as "cgstAmount",      -- ✅ From item
    ii."sgstRate" as "sgstRate",
    ii."sgstAmount" as "sgstAmount",
    ii."igstRate" as "igstRate",
    ii."igstAmount" as "igstAmount"
  FROM "InvoiceItem" ii
  JOIN "Invoice" i ON ii."invoiceId" = i."id"
  WHERE i."tenantId" = ${tenantId}
    AND i."status" != 'VOIDED'
    AND i."invoiceDate" >= ${startDate}
    AND i."invoiceDate" <= ${endDate}
  ORDER BY i."invoiceNumber", ii."hsnCode"
`;
```

### 6.4 Invoice & Purchase Form Updates (No Hardcoded Defaults)

```typescript
// apps/backend/src/modules/mobileshop/invoices/create-invoice.dto.ts

// Instead of:
// items: [{ quantity: 1, unitPrice: 100 }]  // CGST/SGST hardcoded to 9%

// Require explicit rates:
export class CreateInvoiceItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsNumber()
  quantity: number;

  @IsNumber()
  unitPrice: number; // paisa

  // ✅ MANDATORY: Tax rates
  @IsNumber()
  @Min(0)
  @Max(100)
  cgstRate: number; // e.g., 9.0, 5.0, 0.0

  @IsNumber()
  @Min(0)
  @Max(100)
  sgstRate: number; // e.g., 9.0, 5.0, 0.0

  @IsNumber()
  @Min(0)
  @Max(100)
  igstRate: number; // e.g., 0, 18.0 (mutually exclusive with CGST/SGST)
}

// Service validates:
validateTaxRates(cgst: number, sgst: number, igst: number) {
  if (igst > 0 && (cgst > 0 || sgst > 0)) {
    throw new BadRequestException('Cannot mix IGST with CGST/SGST (inter-state vs intra-state)');
  }
  if (cgst > 0 || sgst > 0) {
    if (cgst !== sgst) {
      this.logger.warn('⚠️ CGST ≠ SGST - typical rates are equal');
    }
  }
}
```

### 6.5 Tax Rate Audit Service

```typescript
// apps/backend/src/modules/mobileshop/reports/tax-audit.service.ts

@Injectable()
export class TaxAuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Audit: Detect anomalous tax rates
   */
  async auditTaxRates(
    tenantId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<TaxRateAuditReport> {
    // Find all distinct rate combinations used
    const ratesUsed = await this.prisma.$queryRaw<DistinctRateResult[]>`
      SELECT DISTINCT 
        CONCAT(cgstRate, '/', sgstRate, '/', igstRate) as "rateCombo",
        COUNT(*) as "count"
      FROM "InvoiceItem"
      JOIN "Invoice" i ON "invoiceId" = i."id"
      WHERE i."tenantId" = ${tenantId}
        AND i."invoiceDate" >= ${startDate}
        AND i."invoiceDate" <= ${endDate}
      GROUP BY "rateCombo"
      ORDER BY "count" DESC
    `;

    // Standard GST rates in India
    const standardRates = [
      '9.0/9.0/0',
      '5.0/5.0/0',
      '0/0/0',
      '18.0/18.0/0',
      '0/0/18',
    ];
    const anomalies = ratesUsed.filter(
      (r) => !standardRates.includes(r.rateCombo),
    );

    return {
      period: { startDate, endDate },
      distinctRateCombos: ratesUsed.length,
      ratesUsed: ratesUsed.map((r) => ({
        combo: r.rateCombo,
        count: Number(r.count),
      })),
      anomalies: anomalies.map((a) => ({
        combo: a.rateCombo,
        count: Number(a.count),
        flag: '⚠️ Non-standard rate combination',
      })),
      warnings:
        anomalies.length > 0
          ? [
              `${anomalies.length} non-standard rate combinations detected. CA review required.`,
            ]
          : [],
    };
  }
}

interface DistinctRateResult {
  rateCombo: string;
  count: number;
}

interface TaxRateAuditReport {
  period: { startDate: Date; endDate: Date };
  distinctRateCombos: number;
  ratesUsed: Array<{ combo: string; count: number }>;
  anomalies: Array<{ combo: string; count: number; flag: string }>;
  warnings: string[];
}
```

---

## SUMMARY TABLE: HARDENING FIXES

| Risk                     | Mitigation                                       | Backend Changes                                           | Report Impact                                   |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------- | ----------------------------------------------- |
| **Legacy GST**           | `isLegacyGstApproximation` flag; CA verification | Purchase schema + GSTVerificationService                  | GSTR-2 excludes unverified; flags for review    |
| **Double Stock**         | Status check INSIDE transaction; audit log       | Serializable isolation + SubmissionAuditService           | StockLedger prevents duplicates                 |
| **Receipt Cancellation** | Exclude RECEIPT_CANCELLATION from revenue        | SalesReportService + IntegrityCheckService                | Cashbook shows cancellations; revenue excludes  |
| **Supplier Advances**    | ADVANCE vs SETTLEMENT vouchers; separate ledger  | PaymentVoucher.voucherSubType + AdvanceApplicationService | Payables aging excludes ADVANCE                 |
| **Multi-HSN**            | Per-item HSN; not first item                     | GSTR1Service per InvoiceItem                              | HSN summary accurate for complex invoices       |
| **Flexible GST**         | Store rates in InvoiceItem/PurchaseItem          | Item schema + ItemTaxService                              | No hardcoded rates; audit service for anomalies |

---

## TESTING CHECKLIST

```typescript
describe('Hardening Fixes E2E', () => {
  it('✅ Legacy GST: Marked records excluded from ITC default', async () => {
    // Create purchase with isLegacyGstApproximation=true
    // Generate GSTR-2 (default includeUnverifiedLegacy=false)
    // Assert: ITC totals exclude this purchase
  });

  it('✅ Idempotency: Double submission rejected with audit log', async () => {
    // Submit purchase twice
    // Assert: First succeeds, second fails
    // Assert: AuditLog shows both attempts
  });

  it('✅ Receipt Cancellation: Not in revenue but in cashbook OUT', async () => {
    // Create invoice, receipt, then cancel
    // Get sales report: outstanding should be original
    // Get cashbook: should show cancellation OUT
  });

  it('✅ Advance Voucher: Not reduce purchase outstanding until applied', async () => {
    // Create advance (₹500)
    // Create purchase (₹1000)
    // Outstanding = ₹1000 (advance not applied)
    // Apply advance to purchase
    // Outstanding = ₹500
  });

  it('✅ Multi-HSN: GSTR-1 splits invoice per item HSN', async () => {
    // Create invoice with 2 items: HSN-1, HSN-2
    // Generate GSTR-1
    // Assert: 2 B2B lines (one per HSN)
  });

  it('✅ Tax Rates: Stored per item, not hardcoded in reports', async () => {
    // Create items with 5% GST (non-standard)
    // Generate GSTR-1
    // Assert: Report shows 5%, not 9%
    // Assert: TaxAuditService flags anomaly
  });
});
```

---

## DEPLOYMENT CHECKLIST

- [ ] Schema migrations applied (legacy flag, advance vouchers, item tax rates)
- [ ] GSTVerificationService tested with CA review flow
- [ ] IdempotencyService + AuditLog verified for double submissions
- [ ] Revenue/Cashbook report discrepancy checks passing
- [ ] ADVANCE voucher creation without automatic purchase payment
- [ ] AdvanceApplication flow tested (advance → purchase application)
- [ ] GSTR-1 generates multiple lines per multi-HSN invoice
- [ ] Tax rates read from items, not hardcoded
- [ ] TaxAuditService detects anomalies
- [ ] All 6 E2E tests passing
- [ ] CA review approved
- [ ] Staging production data tested
- [ ] Rollback plan documented

---

**END OF TIER-2 HARDENING FIXES**

**These 6 mitigations address critical gaps in the Tier-2 spec without redesign. Apply before production deployment.**
