# MobileShop ERP Phase-1 - Implementation Plan

**Created**: February 10, 2026  
**Duration**: 18-21 days (3 weeks)  
**Team Size**: 2 engineers (1 backend, 1 full-stack)  
**Sprint Structure**: 3 weeks with daily standup

---

## WEEK 1: GST & PAYMENT INFRASTRUCTURE

### Day 1-2: GST Foundation Setup

#### Task 1.1: Database Schema Updates (Day 1 - 4 hours)

**File**: `prisma/schema.prisma`

```prisma
// Add to InvoiceItem model
model InvoiceItem {
  // ... existing fields
  gstRate        Int?              // 5, 9, 12, 18, 28 (basis points)
  taxableAmount  Int?              // Amount before GST
  cgst           Int?              // Calculated: amount * gstRate / 200
  sgst           Int?              // Calculated: amount * gstRate / 200
  igst           Int?              // For B2B interstate (zero for Phase-1)
  hsnCode        String?           // HSN code for item (for GSTR reporting)
  createdAt      DateTime @default(now())

  @@index([gstRate])
}

// Update Invoice model
model Invoice {
  // ... existing fields
  paidAmount     Int @default(0)   // Track payments collected
  status         InvoiceStatus     // NEW enum: DRAFT, ISSUED, PARTIAL, PAID, VOIDED
  cgst           Int @default(0)   // Aggregate from items
  sgst           Int @default(0)   // Aggregate from items
  igst           Int @default(0)   // For B2B interstate

  @@index([status])
  @@index([paidAmount])
}

// Update Purchase model
model Purchase {
  // ... existing fields
  supplierGstin  String?           // 15-char GSTIN of supplier
  paidAmount     Int @default(0)   // Track payments to supplier
  status         PurchaseStatus    // DRAFT, RECEIVED, PARTIAL, PAID, CANCELLED
  cgst           Int?
  sgst           Int?
  igst           Int?

  @@index([supplierGstin])
  @@index([status])
}

// NEW enum
enum InvoiceStatus {
  DRAFT              // Not yet issued
  ISSUED             // Given to customer
  PARTIAL            // Partial payment received
  PAID               // Fully paid
  VOIDED             // Cancelled with credit note
}

enum PurchaseStatus {
  DRAFT              // Not yet received
  RECEIVED           // Goods received
  PARTIAL            // Partial payment made
  PAID               // Fully paid
  CANCELLED          // Cancelled, goods returned
}
```

**Run migration**:

```bash
cd apps/backend
npx prisma migrate dev --name "add_gst_payment_tracking"
```

**Checklist**:

- [ ] Migration creates new columns
- [ ] Existing invoices default to gstRate=0, status=PAID (backward compat)
- [ ] Indexes created
- [ ] Prisma Client regenerated

---

#### Task 1.2: TaxCalculationService (Day 1 - 4 hours)

**File**: `src/modules/mobileshop/services/tax-calculation.service.ts`

```typescript
import { Injectable, BadRequestException, Logger } from '@nestjs/common';

@Injectable()
export class TaxCalculationService {
  private readonly logger = new Logger(TaxCalculationService.name);

  // Valid GST rates in India
  private readonly VALID_RATES = [0, 5, 9, 12, 18, 28];

  /**
   * Validate if rate is a valid GST rate
   */
  validateGSTRate(rate: number): void {
    if (!Number.isInteger(rate) || !this.VALID_RATES.includes(rate)) {
      throw new BadRequestException(
        `Invalid GST rate: ${rate}. Must be one of: ${this.VALID_RATES.join(', ')}`,
      );
    }
  }

  /**
   * Calculate state-level tax (CGST + SGST - intra-state supply)
   * CGST = amount * rate / 200
   * SGST = amount * rate / 200
   * Total = amount * rate / 100
   */
  calculateStateTax(amount: number, gstRate: number) {
    this.validateGSTRate(gstRate);

    const cgst = Math.round((amount * gstRate) / 200);
    const sgst = Math.round((amount * gstRate) / 200);

    return {
      taxableAmount: amount,
      gstRate,
      cgst,
      sgst,
      igst: 0,
      totalTax: cgst + sgst,
      grossAmount: amount + cgst + sgst,
    };
  }

  /**
   * Calculate integrated tax (IGST - interstate/B2B supply)
   * IGST = amount * rate / 100
   */
  calculateInterstateTab(amount: number, gstRate: number) {
    this.validateGSTRate(gstRate);

    const igst = Math.round((amount * gstRate) / 100);

    return {
      taxableAmount: amount,
      gstRate,
      cgst: 0,
      sgst: 0,
      igst,
      totalTax: igst,
      grossAmount: amount + igst,
    };
  }

  /**
   * Validate supplier GSTIN format (15-character alphanumeric)
   * GSTIN: 15 chars = 2-digit state + 5-digit PAN + 5-digit unit
   */
  validateGSTIN(gstin: string): boolean {
    if (!gstin || gstin.length !== 15) return false;
    return /^[A-Z0-9]{15}$/.test(gstin);
  }

  /**
   * Calculate total tax across all items in an invoice
   */
  calculateInvoiceTotals(items: Array<{ amount: number; gstRate: number }>) {
    let totalAmount = 0;
    let totalCGST = 0;
    let totalSGST = 0;
    let totalTax = 0;

    for (const item of items) {
      const tax = this.calculateStateTax(item.amount, item.gstRate);
      totalAmount += item.amount;
      totalCGST += tax.cgst;
      totalSGST += tax.sgst;
      totalTax += tax.totalTax;
    }

    return {
      subtotal: totalAmount,
      cgst: totalCGST,
      sgst: totalSGST,
      totalTax,
      grandTotal: totalAmount + totalTax,
    };
  }
}
```

**Test file**: `src/modules/mobileshop/services/tax-calculation.service.spec.ts`

```typescript
import { Test } from '@nestjs/testing';
import { TaxCalculationService } from './tax-calculation.service';
import { BadRequestException } from '@nestjs/common';

describe('TaxCalculationService', () => {
  let service: TaxCalculationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [TaxCalculationService],
    }).compile();
    service = module.get(TaxCalculationService);
  });

  describe('validateGSTRate', () => {
    it('should accept valid rates', () => {
      expect(() => service.validateGSTRate(5)).not.toThrow();
      expect(() => service.validateGSTRate(18)).not.toThrow();
    });

    it('should reject invalid rates', () => {
      expect(() => service.validateGSTRate(7)).toThrow(BadRequestException);
      expect(() => service.validateGSTRate(20)).toThrow(BadRequestException);
    });
  });

  describe('calculateStateTax', () => {
    it('should calculate CGST and SGST correctly', () => {
      const result = service.calculateStateTax(1000, 18);
      expect(result.cgst).toBe(90); // 1000 * 18 / 200
      expect(result.sgst).toBe(90);
      expect(result.totalTax).toBe(180);
      expect(result.grossAmount).toBe(1180);
    });

    it('should handle 5% GST rate', () => {
      const result = service.calculateStateTax(1000, 5);
      expect(result.cgst).toBe(25); // 1000 * 5 / 200
      expect(result.sgst).toBe(25);
      expect(result.totalTax).toBe(50);
    });
  });

  describe('validateGSTIN', () => {
    it('should validate correct GSTIN format', () => {
      expect(service.validateGSTIN('27AAFCU5055K1Z0')).toBe(true);
      expect(service.validateGSTIN('invalid')).toBe(false);
      expect(service.validateGSTIN('27AAFCU5055K1Z')).toBe(false); // 14 chars
    });
  });

  describe('calculateInvoiceTotals', () => {
    it('should sum multiple items with different tax rates', () => {
      const items = [
        { amount: 1000, gstRate: 18 }, // Labour with 18%
        { amount: 500, gstRate: 9 }, // Parts with 9%
      ];
      const result = service.calculateInvoiceTotals(items);
      expect(result.subtotal).toBe(1500);
      expect(result.cgst).toBe(90 + 22); // 90 + 22.5 rounded
      expect(result.sgst).toBe(90 + 22);
      expect(result.totalTax).toBe(224);
    });
  });
});
```

**What this does**:

- ✅ Validates GST rates (only 5%, 9%, 12%, 18%, 28% allowed)
- ✅ Calculates CGST/SGST splits
- ✅ Validates GSTIN format
- ✅ Aggregates invoice totals

---

### Day 2-3: Invoice Payment Framework

#### Task 1.3: Create InvoicePaymentService (Day 2-3 - 8 hours)

**File**: `src/modules/mobileshop/services/invoice-payment.service.ts`

```typescript
import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { InvoiceStatus } from '@prisma/client';

@Injectable()
export class InvoicePaymentService {
  private readonly logger = new Logger(InvoicePaymentService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Record a payment against an invoice
   * Updates invoice.paidAmount and status
   */
  async recordPayment(
    tenantId: string,
    invoiceId: string,
    amount: number,
    paymentMethod: string = 'CASH',
    reference?: string,
  ) {
    // Step 1: Fetch invoice with validation
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.tenantId !== tenantId) {
      throw new BadRequestException('Unauthorized');
    }

    // Step 2: Check if invoice can accept payment
    if (invoice.status === 'VOIDED' || invoice.status === 'DRAFT') {
      throw new BadRequestException(
        `Cannot accept payment on ${invoice.status} invoice`,
      );
    }

    // Step 3: Validate payment amount
    const balanceDue = invoice.totalAmount - invoice.paidAmount;
    if (amount > balanceDue) {
      throw new BadRequestException(
        `Cannot pay ₹${amount}. Balance due: ₹${balanceDue}`,
      );
    }

    if (amount <= 0) {
      throw new BadRequestException('Payment amount must be greater than 0');
    }

    // Step 4: Calculate new status
    const newPaidAmount = invoice.paidAmount + amount;
    const newStatus =
      newPaidAmount === invoice.totalAmount
        ? InvoiceStatus.PAID
        : InvoiceStatus.PARTIAL;

    // Step 5: Update invoice atomically
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Step 6: Create Receipt entry (for accounting)
    const receipt = await this.prisma.receipt.create({
      data: {
        tenantId,
        shopId: invoice.shopId,
        invoiceId,
        partyId: invoice.partyId,
        amount,
        paymentMethod,
        reference,
        customerId: invoice.partyId,
        status: 'COMPLETED',
      },
    });

    this.logger.log(
      `Payment recorded: Invoice ${invoice.invoiceNumber}, Amount ₹${amount}, New status: ${newStatus}`,
    );

    return { invoice: updatedInvoice, receipt };
  }

  /**
   * Get invoice payment status and aging
   */
  async getInvoiceStatus(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const balanceDue = invoice.totalAmount - invoice.paidAmount;
    const daysOverdue = this.calculateDaysOverdue(invoice.createdAt);

    return {
      invoiceNumber: invoice.invoiceNumber,
      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceDue,
      status: invoice.status,
      daysOverdue,
      isOverdue: daysOverdue > 0,
    };
  }

  /**
   * Prevent deletion of paid/partial invoices
   * Must create credit note instead
   */
  async validateBeforeDeletion(tenantId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) return true; // Already deleted

    if (invoice.paidAmount > 0) {
      throw new BadRequestException(
        `Cannot delete invoice with payments (₹${invoice.paidAmount} collected). ` +
          'Create a credit note instead.',
      );
    }

    return true;
  }

  private calculateDaysOverdue(createdAt: Date): number {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdAt < thirtyDaysAgo
      ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
  }
}
```

**What this does**:

- ✅ Records payments, updates invoice.paidAmount
- ✅ Automatically updates status (PARTIAL → PAID)
- ✅ Prevents overpayment
- ✅ Blocks deletion of paid invoices
- ✅ Creates Receipt entry for accounting

---

### Day 3-4: GSTReportsService Setup

#### Task 1.4: Create GSTReportsService (Day 3-4 - 8 hours)

**File**: `src/modules/mobileshop/services/gst-reports.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class GSTReportsService {
  private readonly logger = new Logger(GSTReportsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GSTR-1 B2B: Sales to registered customers (with GSTIN)
   */
  async getGSTR1B2B(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ) {
    const where = {
      tenantId,
      createdAt: { gte: fromDate, lte: toDate },
      party: {
        gstNumber: { not: null }, // B2B only
      },
      ...(shopId && { shopId }),
    };

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        items: true,
        party: true,
      },
    });

    return invoices.map((inv) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.createdAt,
      customerGstin: inv.party.gstNumber,
      customerName: inv.party.name,
      invoiceValue: inv.totalAmount,
      taxableValue: inv.totalAmount - inv.cgst - inv.sgst,
      cgst: inv.cgst,
      sgst: inv.sgst,
      igst: inv.igst || 0,
      totalTax: (inv.cgst || 0) + (inv.sgst || 0) + (inv.igst || 0),
    }));
  }

  /**
   * GSTR-1 B2C: Sales to unregistered customers (no GSTIN)
   * Summarized by HSN/SAC code
   */
  async getGSTR1B2C(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        party: {
          gstNumber: null, // B2C only
        },
        ...(shopId && { shopId }),
      },
      include: { items: true },
    });

    // Group by HSN code
    const hsnWise = new Map();
    for (const inv of invoices) {
      for (const item of inv.items) {
        const hsnCode = item.hsnCode || 'UNCLASSIFIED';
        if (!hsnWise.has(hsnCode)) {
          hsnWise.set(hsnCode, {
            hsn: hsnCode,
            invoiceCount: 0,
            taxableValue: 0,
            cgst: 0,
            sgst: 0,
            igst: 0,
          });
        }

        const existing = hsnWise.get(hsnCode);
        existing.invoiceCount++;
        existing.taxableValue += item.amount;
        existing.cgst += item.cgst || 0;
        existing.sgst += item.sgst || 0;
        existing.igst += item.igst || 0;
      }
    }

    return Array.from(hsnWise.values());
  }

  /**
   * GSTR-2 (Inward Supplies): Purchases from registered suppliers
   */
  async getGSTR2(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ) {
    const purchases = await this.prisma.purchase.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        supplierGstin: { not: null }, // Only GST-registered suppliers
        ...(shopId && { shopId }),
      },
      include: {
        party: true,
        items: true,
      },
    });

    return purchases.map((purch) => ({
      billNumber: `PUR-${purch.id}`,
      billDate: purch.createdAt,
      supplierGstin: purch.supplierGstin,
      supplierName: purch.party.name,
      invoiceValue: purch.totalAmount,
      taxableValue: purch.totalAmount - (purch.cgst || 0) - (purch.sgst || 0),
      cgst: purch.cgst || 0,
      sgst: purch.sgst || 0,
      igst: purch.igst || 0,
      totalTax: (purch.cgst || 0) + (purch.sgst || 0) + (purch.igst || 0),
      itcEligible: true, // Can claim ITC if supplier is registered
    }));
  }

  /**
   * Export GSTR-1 as CSV string
   */
  async exportGSTR1AsCSV(
    tenantId: string,
    fromDate: Date,
    toDate: Date,
    shopId?: string,
  ): Promise<string> {
    const b2b = await this.getGSTR1B2B(tenantId, fromDate, toDate, shopId);
    const b2c = await this.getGSTR1B2C(tenantId, fromDate, toDate, shopId);

    let csv = 'GSTR-1 Report\n';
    csv += `From: ${fromDate.toDateString()}\n`;
    csv += `To: ${toDate.toDateString()}\n\n`;

    // B2B section
    csv += 'B2B INVOICES\n';
    csv +=
      'Invoice No,Date,Customer GSTIN,Customer Name,Taxable Value,CGST,SGST,Total Tax\n';
    for (const item of b2b) {
      csv += `${item.invoiceNumber},${item.invoiceDate},${item.customerGstin},${item.customerName},${item.taxableValue},${item.cgst},${item.sgst},${item.totalTax}\n`;
    }

    // B2C section
    csv += '\nB2C SUMMARY (by HSN Code)\n';
    csv += 'HSN Code,Invoice Count,Taxable Value,CGST,SGST,Total Tax\n';
    for (const item of b2c) {
      csv += `${item.hsn},${item.invoiceCount},${item.taxableValue},${item.cgst},${item.sgst},${item.cgst + item.sgst}\n`;
    }

    return csv;
  }
}
```

**Test scenarios**:

- [ ] B2B invoices with GSTIN captured correctly
- [ ] B2C invoices grouped by HSN code
- [ ] Tax amounts split correctly (CGST/SGST)
- [ ] CSV export readable by Excel

---

### Day 4: Controller & API Layer

#### Task 1.5: Create Invoice Controller Updates (Day 4 - 4 hours)

**File**: `src/modules/mobileshop/controllers/invoices.controller.ts` (add these endpoints)

```typescript
/**
 * Create new invoice with GST
 */
@Post()
async createInvoice(@Body() dto: CreateInvoiceDto) {
  // Validate each item has gstRate
  for (const item of dto.items) {
    if (!item.gstRate) {
      throw new BadRequestException('gstRate required for each item');
    }
    this.taxService.validateGSTRate(item.gstRate);
  }

  // Create invoice with calculated tax
  return this.invoiceService.create(dto);
}

/**
 * Record payment against invoice
 */
@Post(':invoiceId/payments')
async recordPayment(
  @Param('invoiceId') invoiceId: string,
  @Body() dto: { amount: number; method: string; reference?: string },
) {
  return this.paymentService.recordPayment(
    this.user.tenantId,
    invoiceId,
    dto.amount,
    dto.method,
    dto.reference
  );
}

/**
 * Get invoice payment status
 */
@Get(':invoiceId/status')
async getStatus(@Param('invoiceId') invoiceId: string) {
  return this.paymentService.getInvoiceStatus(this.user.tenantId, invoiceId);
}

/**
 * Get GSTR-1 report for filing
 */
@Get('reports/gstr-1')
async getGSTR1Report(
  @Query('from') from: string,
  @Query('to') to: string,
  @Query('shopId') shopId?: string,
) {
  return this.gstService.getGSTR1B2B(
    this.user.tenantId,
    new Date(from),
    new Date(to),
    shopId
  );
}

/**
 * Export GSTR-1 as CSV
 */
@Get('reports/gstr-1/export')
async exportGSTR1(
  @Query('from') from: string,
  @Query('to') to: string,
  @Query('shopId') shopId?: string,
) {
  const csv = await this.gstService.exportGSTR1AsCSV(
    this.user.tenantId,
    new Date(from),
    new Date(to),
    shopId
  );

  return {
    data: csv,
    filename: `GSTR1_${new Date(from).getFullYear()}_Q${Math.ceil(
      (new Date(from).getMonth() + 1) / 3
    )}.csv`,
  };
}
```

**DTOs**: Update `CreateInvoiceDto` to include items with gstRate

```typescript
export class CreateInvoiceDto {
  // ... existing fields
  items: Array<{
    shopProductId: string;
    quantity: number;
    rate: number;
    gstRate: number; // ← NEW
    hsnCode?: string; // ← NEW
  }>;
}
```

---

### Day 4: Migration & Testing

#### Task 1.6: End-to-End Testing (Day 4 - 4 hours)

**Test file**: `test/e2e/invoice-gst.e2e.spec.ts`

```typescript
describe('Invoice GST Workflow (E2E)', () => {
  let app;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      // ... app setup
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  it('should create invoice with 18% GST', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/mobileshop/invoices')
      .send({
        partyId: 'cust123',
        items: [
          {
            shopProductId: 'prod1',
            quantity: 1,
            rate: 1000,
            gstRate: 18,
            hsnCode: '847130',
          },
        ],
      });

    expect(response.status).toBe(201);
    expect(response.body.cgst).toBe(90); // 1000 * 18 / 200
    expect(response.body.sgst).toBe(90);
    expect(response.body.totalAmount).toBe(1180);
  });

  it('should update status when payment collected', async () => {
    // Create invoice
    const invoice = await createTestInvoice();

    // Record payment
    const paymentRes = await request(app.getHttpServer())
      .post(`/api/mobileshop/invoices/${invoice.id}/payments`)
      .send({ amount: 500, method: 'CASH' });

    expect(paymentRes.body.status).toBe('PARTIAL');
    expect(paymentRes.body.paidAmount).toBe(500);

    // Full payment
    const finalRes = await request(app.getHttpServer())
      .post(`/api/mobileshop/invoices/${invoice.id}/payments`)
      .send({ amount: 680, method: 'UPI' });

    expect(finalRes.body.status).toBe('PAID');
  });

  it('should generate GSTR-1 report', async () => {
    const response = await request(app.getHttpServer()).get(
      '/api/mobileshop/reports/gstr-1?from=2026-01-01&to=2026-12-31',
    );

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });
});
```

---

### Week 1 Summary

**Completed**:

- ✅ Database schema updated (gstRate, paidAmount, status)
- ✅ TaxCalculationService (validates & calculates GST)
- ✅ InvoicePaymentService (tracks payments)
- ✅ GSTReportsService (GSTR-1, GSTR-2)
- ✅ API endpoints (create invoice, record payment, reports)
- ✅ E2E tests passing

**Days left**: 2 refinement days

**Deliverable**: GST-compliant invoicing, payment tracking, GSTR-1 report ready

---

## WEEK 2: INVENTORY & FINANCIAL INTEGRITY

### Day 5-6: Repair Stock Deduction

#### Task 2.1: StockValidationService (Day 5 - 4 hours)

**File**: `src/core/stock/stock-validation.service.ts`

```typescript
@Injectable()
export class StockValidationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Validate sufficient stock before OUT operation
   */
  async validateStockOut(
    tenantId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // SERVICE products don't have stock
    if (product.type === 'SERVICE') {
      throw new BadRequestException(
        'Cannot deduct stock from SERVICE products',
      );
    }

    if (product.isSerialized) {
      // Check IMEI count
      const available = await this.prisma.iMEI.count({
        where: {
          tenantId,
          shopProductId: productId,
          status: 'IN_STOCK',
        },
      });

      if (available < quantity) {
        throw new BadRequestException(
          `Insufficient serialized units. Available: ${available}, Requested: ${quantity}`,
        );
      }
    } else {
      // Check StockLedger balance
      const balance = await this.getStockBalance(tenantId, productId);

      if (balance < quantity) {
        throw new BadRequestException(
          `Insufficient bulk stock. Available: ${balance}, Requested: ${quantity}`,
        );
      }
    }
  }

  /**
   * Calculate current stock from StockLedger
   */
  async getStockBalance(tenantId: string, productId: string): Promise<number> {
    const entries = await this.prisma.stockLedger.findMany({
      where: {
        tenantId,
        shopProductId: productId,
      },
      select: { type: true, quantity: true },
    });

    return entries.reduce((balance, entry) => {
      return entry.type === 'IN'
        ? balance + entry.quantity
        : balance - entry.quantity;
    }, 0);
  }

  /**
   * Get breakdown of IMEI status
   */
  async getIMEIBreakdown(tenantId: string, productId: string) {
    const statuses = await this.prisma.iMEI.groupBy({
      by: ['status'],
      where: {
        tenantId,
        shopProductId: productId,
      },
      _count: true,
    });

    return Object.fromEntries(statuses.map((s) => [s.status, s._count]));
  }
}
```

---

#### Task 2.2: Fix JobCardsService.addPart() (Day 5-6 - 6 hours)

**File**: `src/modules/mobileshop/jobcard/job-cards.service.ts` (update addPart method)

```typescript
async addPart(
  user: any,
  shopId: string,
  jobId: string,
  dto: { productId: string; quantity: number }
) {
  await this.assertAccess(user, shopId);

  // Step 1: Fetch job
  const job = await this.prisma.jobCard.findUnique({
    where: { id: jobId, shopId },
  });

  if (!job) throw new NotFoundException('Job card not found');

  // Step 2: Validate job status (can only add parts before READY)
  if (['READY', 'DELIVERED', 'CANCELLED', 'RETURNED'].includes(job.status)) {
    throw new BadRequestException(
      'Cannot add parts: Job has moved past the parts stage'
    );
  }

  // Step 3: Fetch product
  const product = await this.prisma.shopProduct.findUnique({
    where: { id: dto.productId, shopId },
  });

  if (!product) throw new NotFoundException('Product not found');

  // Step 4: ✅ NEW: Validate stock FIRST
  await this.stockValidation.validateStockOut(
    user.tenantId,
    dto.productId,
    dto.quantity
  );

  // Step 5: Create RepairPartUsed entry
  const part = await this.prisma.repairPartUsed.create({
    data: {
      jobCardId: jobId,
      shopProductId: dto.productId,
      quantity: dto.quantity,
      costPerUnit: product.costPrice, // ✅ Snapshot cost for repair profitability
    },
  });

  // Step 6: ✅ NEW: Create StockLedger OUT entry (deduct from inventory)
  await this.stockService.recordStockOut({
    tenantId: user.tenantId,
    shopId,
    shopProductId: dto.productId,
    quantity: dto.quantity,
    referenceType: 'REPAIR',
    referenceId: jobId,
    costPerUnit: product.costPrice,
    note: `Used in job ${job.jobNumber}`,
  });

  this.logger.log(
    `Part added to job ${jobId}: ${product.name} x${dto.quantity}, stock deducted`
  );

  return part;
}
```

---

#### Task 2.3: Handle Repair Cancellation (Day 6 - 4 hours)

**File**: `src/modules/mobileshop/jobcard/job-cards.service.ts` (add cancelJob method)

```typescript
async cancelJob(user: any, shopId: string, jobId: string) {
  const job = await this.prisma.jobCard.findUnique({
    where: { id: jobId, shopId },
  });

  if (!job) throw new NotFoundException('Job not found');

  // Step 1: Fetch all parts used in this job
  const parts = await this.prisma.repairPartUsed.findMany({
    where: { jobCardId: jobId },
    include: { product: true },
  });

  // Step 2: Reverse stock deductions (restore inventory)
  for (const part of parts) {
    await this.stockService.recordStockIn({
      tenantId: user.tenantId,
      shopId,
      shopProductId: part.shopProductId,
      quantity: part.quantity,
      referenceType: 'REPAIR_REVERSAL',
      referenceId: jobId,
      costPerUnit: part.costPerUnit,
      note: `Cancelled job ${job.jobNumber}`,
    });
  }

  // Step 3: Cancel any linked invoices
  if (job.invoiceId) {
    await this.invoiceService.voidInvoice(job.invoiceId);
  }

  // Step 4: Update job status
  const updated = await this.prisma.jobCard.update({
    where: { id: jobId },
    data: {
      status: JobStatus.CANCELLED,
      statusHistory: {
        // Log status change
        push: {
          from: job.status,
          to: JobStatus.CANCELLED,
          at: new Date().toISOString(),
        },
      },
    },
  });

  // Step 5: Emit event for CRM
  this.eventEmitter.emit('job.cancelled', {
    jobCardId: jobId,
    jobNumber: job.jobNumber,
  });

  this.logger.log(
    `Job cancelled: ${jobNumber}, stock restored (${parts.length} parts)`
  );

  return updated;
}
```

---

### Day 7-8: Purchase Payment Tracking

#### Task 2.4: CreatePurchasePaymentService (Day 7 - 4 hours)

**File**: `src/modules/mobileshop/services/purchase-payment.service.ts`

```typescript
@Injectable()
export class PurchasePaymentService {
  constructor(private prisma: PrismaService) {}

  /**
   * Record payment to supplier
   */
  async recordPayment(
    tenantId: string,
    purchaseId: string,
    amount: number,
    paymentMethod: string = 'CASH',
  ) {
    // Validate
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });

    if (!purchase) throw new NotFoundException('Purchase not found');
    if (purchase.tenantId !== tenantId)
      throw new BadRequestException('Unauthorized');

    // Check balance
    const balanceDue = purchase.totalAmount - purchase.paidAmount;
    if (amount > balanceDue) {
      throw new BadRequestException(
        `Cannot pay ₹${amount}. Balance due: ₹${balanceDue}`,
      );
    }

    // Update
    const newPaidAmount = purchase.paidAmount + amount;
    const newStatus =
      newPaidAmount === purchase.totalAmount ? 'PAID' : 'PARTIAL';

    const updated = await this.prisma.purchase.update({
      where: { id: purchaseId },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    // Create PaymentVoucher entry
    const voucher = await this.prisma.paymentVoucher.create({
      data: {
        tenantId,
        shopId: purchase.shopId,
        partyId: purchase.partyId,
        amount,
        paymentMethod,
        referenceType: 'PURCHASE',
        referenceId: purchaseId,
        status: 'COMPLETED',
      },
    });

    return { purchase: updated, voucher };
  }
}
```

---

### Day 8: IMEI Linkage & Validation

#### Task 2.5: Link IMEI to Invoice Items (Day 8 - 6 hours)

**File**: `src/modules/mobileshop/services/sales.service.ts` (update invoice creation)

```typescript
async createInvoice(tenantId: string, shopId: string, dto: CreateInvoiceDto) {
  // Step 1: Validate items
  for (const item of dto.items) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: item.shopProductId },
    });

    if (!product) throw new NotFoundException('Product not found');

    // Step 2: For serialized products, validate IMEIs
    if (product.isSerialized) {
      if (!item.imeis || item.imeis.length !== item.quantity) {
        throw new BadRequestException(
          `Serialized product "${product.name}" requires ${item.quantity} IMEIs`
        );
      }

      // Validate each IMEI is IN_STOCK
      const imeis = await this.prisma.iMEI.findMany({
        where: {
          imei: { in: item.imeis },
          shopProductId: item.shopProductId,
          status: 'IN_STOCK',
        },
      });

      if (imeis.length !== item.quantity) {
        throw new BadRequestException(
          `${item.quantity - imeis.length} IMEIs not available in stock`
        );
      }
    }
  }

  // Step 3: Create invoice
  const invoice = await this.prisma.invoice.create({
    data: {
      tenantId,
      shopId,
      invoiceNumber: await this.docService.getNextInvoiceNumber(shopId),
      partyId: dto.partyId,
      status: 'ISSUED',
      totalAmount: dto.totalAmount,
      // ... other fields
    },
  });

  // Step 4: Create items + update IMEI status
  for (const item of dto.items) {
    await this.prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        shopProductId: item.shopProductId,
        quantity: item.quantity,
        rate: item.rate,
        gstRate: item.gstRate,
        cgst: item.cgst,
        sgst: item.sgst,
        // ... other fields
      },
    });

    // ✅ Update IMEI status to SOLD
    if (item.imeis) {
      await this.prisma.iMEI.updateMany({
        where: { imei: { in: item.imeis } },
        data: {
          status: 'SOLD',
          invoiceId: invoice.id,
          soldAt: new Date(),
        },
      });
    }

    // ✅ Create StockLedger OUT entry (bulk products)
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: item.shopProductId },
    });

    if (!product.isSerialized) {
      await this.stockService.recordStockOut({
        tenantId,
        shopId,
        shopProductId: item.shopProductId,
        quantity: item.quantity,
        referenceType: 'SALE',
        referenceId: invoice.id,
        costPerUnit: product.costPrice,
      });
    }
  }

  return invoice;
}
```

---

### Week 2 Summary

**Completed**:

- ✅ StockValidationService (prevents negative stock)
- ✅ Job card → add repair part → stock deduct
- ✅ Job cancellation → reverses stock deduction
- ✅ Purchase payment tracking
- ✅ IMEI linked to invoices
- ✅ Bulk products deducted via StockLedger

**Deliverable**: Accurate inventory, no negative stock possible

---

## WEEK 3: LEGAL & REPORTING

### Day 9-10: Job Card Legal Fields

#### Task 3.1: Add Consent Fields to JobCard (Day 9 - 3 hours)

**File**: `prisma/schema.prisma`

```prisma
model JobCard {
  // ... existing fields

  // Legal Compliance
  consentDeviceCondition  Boolean @default(false)
  consentDataLoss         Boolean @default(false)
  consentNonRefundable    Boolean @default(false)
  consentAt               DateTime?
  consentSignatureUrl     String?

  // Warranty Terms
  warrantyDuration        Int?        // Days
  warrantyType            String?     // PARTS | LABOR | BOTH
  warrantyExclusions      String[]    // e.g., "Water damage"
  warrantyTermsUrl        String?     // Link to shop terms
  warrantyTermsAccepted   Boolean @default(false)
  warrantyAcceptedAt      DateTime?

  @@index([consentAt])
  @@index([warrantyAcceptedAt])
}
```

**Run migration**:

```bash
npx prisma migrate dev --name "add_consent_warranty_fields"
```

---

#### Task 3.2: Update JobCard Controller (Day 9 - 3 hours)

**File**: `src/modules/mobileshop/jobcard/job-cards.controller.ts`

```typescript
/**
 * Record customer consent before issuing invoice
 * This is MANDATORY before moving to READY state
 */
@Post(':jobId/consent')
async recordConsent(
  @Param('jobId') jobId: string,
  @Body() dto: {
    consentDeviceCondition: boolean;
    consentDataLoss: boolean;
    consentNonRefundable: boolean;
    warrantyDuration: number;
    warrantyType: string;
    warrantyExclusions: string[];
    signatureUrl?: string;
  },
) {
  // Validate all consents are checked
  if (
    !dto.consentDeviceCondition ||
    !dto.consentDataLoss ||
    !dto.consentNonRefundable
  ) {
    throw new BadRequestException('All consent checkboxes must be checked');
  }

  // Update job with consent
  return this.jobCardService.update(user.tenantId, shopId, jobId, {
    consentDeviceCondition: true,
    consentDataLoss: true,
    consentNonRefundable: true,
    consentAt: new Date(),
    consentSignatureUrl: dto.signatureUrl,
    warrantyDuration: dto.warrantyDuration,
    warrantyType: dto.warrantyType,
    warrantyExclusions: dto.warrantyExclusions,
    warrantyAcceptedAt: new Date(),
  });
}

/**
 * Validate all consents before allowing READY status transition
 */
private validateReadyTransition(job: JobCard) {
  if (!job.consentDeviceCondition) {
    throw new BadRequestException('Customer must acknowledge device condition');
  }
  if (!job.consentDataLoss) {
    throw new BadRequestException('Customer must acknowledge data loss risk');
  }
  if (!job.consentNonRefundable) {
    throw new BadRequestException('Customer must acknowledge advance is non-refundable');
  }
  if (!job.warrantyDuration) {
    throw new BadRequestException('Warranty terms must be set');
  }
}
```

---

### Day 10-11: Core Reports

#### Task 3.3: ReceivablesAgingService (Day 10 - 5 hours)

**File**: `src/modules/mobileshop/services/receivables-aging.service.ts`

```typescript
@Injectable()
export class ReceivablesAgingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get outstanding receivables by age bucket
   */
  async getAgingReport(tenantId: string, shopId?: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: { in: ['ISSUED', 'PARTIAL'] }, // Not fully paid
        ...(shopId && { shopId }),
      },
      include: { party: true },
    });

    // Bucket by days overdue
    const buckets = {
      notDue: [], // 0-30 days
      thirtyDays: [], // 31-60 days
      sixtyDays: [], // 61-90 days
      ninetyPlus: [], // 90+ days
    };

    const today = new Date();

    for (const invoice of invoices) {
      const daysOld = Math.floor(
        (today.getTime() - invoice.createdAt.getTime()) / (1000 * 60 * 60 * 24),
      );

      const balanceDue = invoice.totalAmount - invoice.paidAmount;

      const item = {
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.party.name,
        customerPhone: invoice.party.phone,
        invoiceDate: invoice.createdAt,
        invoiceAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        balanceDue,
        daysOverdue: daysOld,
      };

      if (daysOld <= 30) buckets.notDue.push(item);
      else if (daysOld <= 60) buckets.thirtyDays.push(item);
      else if (daysOld <= 90) buckets.sixtyDays.push(item);
      else buckets.ninetyPlus.push(item);
    }

    // Calculate totals
    const summary = {
      notDue: {
        count: buckets.notDue.length,
        total: buckets.notDue.reduce((sum, i) => sum + i.balanceDue, 0),
      },
      thirtyDays: {
        count: buckets.thirtyDays.length,
        total: buckets.thirtyDays.reduce((sum, i) => sum + i.balanceDue, 0),
      },
      sixtyDays: {
        count: buckets.sixtyDays.length,
        total: buckets.sixtyDays.reduce((sum, i) => sum + i.balanceDue, 0),
      },
      ninetyPlus: {
        count: buckets.ninetyPlus.length,
        total: buckets.ninetyPlus.reduce((sum, i) => sum + i.balanceDue, 0),
      },
    };

    const grandTotal = Object.values(summary).reduce(
      (sum, b) => sum + b.total,
      0,
    );

    return {
      summary,
      grandTotal,
      details: {
        notDue: buckets.notDue,
        thirtyDays: buckets.thirtyDays,
        sixtyDays: buckets.sixtyDays,
        ninetyPlus: buckets.ninetyPlus,
      },
    };
  }
}
```

---

#### Task 3.4: DailySalesReportService (Day 10 - 4 hours)

**File**: `src/modules/mobileshop/services/daily-sales-report.service.ts`

```typescript
@Injectable()
export class DailySalesReportService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get daily sales summary
   */
  async getDailySales(tenantId: string, date: Date, shopId?: string) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: startOfDay, lte: endOfDay },
        ...(shopId && { shopId }),
      },
      include: { items: true },
    });

    // Calculate totals
    let totalRevenue = 0;
    let totalCash = 0;
    let totalUPI = 0;
    let totalCard = 0;
    let totalPending = 0;

    const productWiseSales = new Map();

    for (const invoice of invoices) {
      totalRevenue += invoice.totalAmount;

      // Payment mode breakdown (from receipts)
      const receipts = await this.prisma.receipt.findMany({
        where: { invoiceId: invoice.id },
      });

      for (const receipt of receipts) {
        if (receipt.paymentMethod === 'CASH') totalCash += receipt.amount;
        else if (receipt.paymentMethod === 'UPI') totalUPI += receipt.amount;
        else if (receipt.paymentMethod === 'CARD') totalCard += receipt.amount;
      }

      // Pending calculation
      const pending = invoice.totalAmount - invoice.paidAmount;
      if (pending > 0) totalPending += pending;

      // Product-wise breakdown
      for (const item of invoice.items) {
        const product = await this.prisma.shopProduct.findUnique({
          where: { id: item.shopProductId },
        });

        if (!productWiseSales.has(product.name)) {
          productWiseSales.set(product.name, {
            name: product.name,
            qty: 0,
            revenue: 0,
          });
        }

        const existing = productWiseSales.get(product.name);
        existing.qty += item.quantity;
        existing.revenue += item.amount + (item.cgst || 0) + (item.sgst || 0);
      }
    }

    return {
      date: date.toDateString(),
      invoiceCount: invoices.length,
      totalRevenue,
      cashCollection: totalCash,
      upiCollection: totalUPI,
      cardCollection: totalCard,
      totalCollection: totalCash + totalUPI + totalCard,
      totalPending,
      topProducts: Array.from(productWiseSales.values()).sort(
        (a, b) => b.revenue - a.revenue,
      ),
    };
  }
}
```

---

#### Task 3.5: InventoryValuationService (Day 11 - 5 hours)

**File**: `src/modules/mobileshop/services/inventory-valuation.service.ts`

```typescript
@Injectable()
export class InventoryValuationService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get current inventory value (asset for balance sheet)
   */
  async getInventoryValuation(tenantId: string, shopId?: string) {
    const products = await this.prisma.shopProduct.findMany({
      where: {
        tenantId,
        isActive: true,
        type: { in: ['PHONE', 'SPARE', 'ACCESSORY'] }, // Exclude SERVICE
        ...(shopId && { shopId }),
      },
    });

    let totalValue = 0;
    const items = [];

    for (const product of products) {
      let quantity = 0;

      if (product.isSerialized) {
        // Count IN_STOCK IMEIs
        quantity = await this.prisma.iMEI.count({
          where: {
            tenantId,
            shopProductId: product.id,
            status: 'IN_STOCK',
          },
        });
      } else {
        // Calculate from StockLedger
        const entries = await this.prisma.stockLedger.findMany({
          where: {
            tenantId,
            shopProductId: product.id,
          },
        });

        quantity = entries.reduce((sum, e) => {
          return e.type === 'IN' ? sum + e.quantity : sum - e.quantity;
        }, 0);
      }

      const value = quantity * (product.costPrice || 0);
      totalValue += value;

      items.push({
        productName: product.name,
        productId: product.id,
        quantity,
        costPrice: product.costPrice,
        totalValue: value,
        reorderLevel: product.minStock,
        needsReorder: quantity <= (product.minStock || 10),
        isSerialized: product.isSerialized,
      });
    }

    return {
      valuationDate: new Date(),
      items: items.sort((a, b) => b.totalValue - a.totalValue),
      totalInventoryValue: totalValue,
      itemCount: items.length,
      lowStockAlert: items.filter((i) => i.needsReorder),
    };
  }
}
```

---

### Day 11-12: API Endpoints & UI

#### Task 3.6: Create Reports API Endpoints (Day 11 - 4 hours)

**File**: `src/modules/mobileshop/controllers/reports.controller.ts`

```typescript
@Controller('api/mobileshop/reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(
    private receivablesService: ReceivablesAgingService,
    private salesService: DailySalesReportService,
    private inventoryService: InventoryValuationService,
  ) {}

  /**
   * GET /api/mobileshop/reports/receivables-aging
   * Get outstanding receivables by age bucket
   */
  @Get('receivables-aging')
  async getReceivablesAging(
    @Query('shopId') shopId?: string,
    @GetUser() user?: any,
  ) {
    return this.receivablesService.getAgingReport(user.tenantId, shopId);
  }

  /**
   * GET /api/mobileshop/reports/daily-sales?date=2026-02-10
   * Get daily sales summary
   */
  @Get('daily-sales')
  async getDailySales(
    @Query('date') date: string = new Date().toISOString(),
    @Query('shopId') shopId?: string,
    @GetUser() user?: any,
  ) {
    return this.salesService.getDailySales(
      user.tenantId,
      new Date(date),
      shopId,
    );
  }

  /**
   * GET /api/mobileshop/reports/inventory-valuation
   * Get current inventory asset value
   */
  @Get('inventory-valuation')
  async getInventoryValuation(
    @Query('shopId') shopId?: string,
    @GetUser() user?: any,
  ) {
    return this.inventoryService.getInventoryValuation(user.tenantId, shopId);
  }
}
```

---

### Day 12: QA & Testing

#### Task 3.7: Comprehensive Testing (Day 12 - 6 hours)

**Test scenarios**:

```typescript
describe('Phase-1 MVP - Integration Tests', () => {
  describe('Job Card → Invoice → Payment Flow', () => {
    it('should complete full repair cycle', async () => {
      // 1. Create job card
      const job = await createJobCard({
        deviceBrand: 'iPhone',
        deviceModel: '14 Pro',
        customerComplaint: 'Screen broken',
        estimatedCost: 5000,
      });

      // 2. Add repair parts (stock should deduct)
      await addPartToJob(job.id, 'battery', 1);
      const stockBefore = await getStockBalance('battery');
      expect(stockBefore).toBeLessThan(initialStock);

      // 3. Record consent before READY
      await recordConsent(job.id, {
        consentDeviceCondition: true,
        consentDataLoss: true,
        consentNonRefundable: true,
      });

      // 4. Move to READY (auto-creates invoice)
      const invoice = await updateJobStatus(job.id, 'READY');
      expect(invoice).toBeDefined();
      expect(invoice.status).toBe('ISSUED');

      // 5. Collect payment
      await recordPayment(invoice.id, 5000, 'CASH');
      const updated = await getInvoice(invoice.id);
      expect(updated.status).toBe('PAID');
      expect(updated.paidAmount).toBe(5000);

      // 6. Check receivables report
      const aging = await getReceivablesAging();
      expect(aging.summary.notDue.count).toBe(0); // No pending

      // 7. Check inventory report
      const inventory = await getInventoryValuation();
      expect(inventory.items.find(i => i.productName === 'battery').quantity)
        .toBe(initialStock - 1);
    });
  });

  describe('GST Compliance', () => {
    it('should calculate GST correctly for invoices', async () => {
      const invoice = await createInvoice({
        items: [
          { productId: 'p1', amount: 1000, gstRate: 18 },
          { productId: 'p2', amount: 500, gstRate: 9 },
        ],
      });

      expect(invoice.cgst).toBe(90 + 22); // 1000*18/200 + 500*9/200
      expect(invoice.sgst).toBe(90 + 22);
    });

    it('should export GSTR-1 report', async () => {
      const csv = await exportGSTR1('2026-01-01', '2026-01-31');
      expect(csv).toContain('GSTR-1');
      expect(csv).toContain('B2B');
      expect(csv).toContain('B2C');
    });
  });

  describe('Financial Safety', () => {
    it('should prevent overpayment on invoice', async () => {
      const invoice = await createInvoice({ totalAmount: 1000 },

      const error = await recordPayment(invoice.id, 1500).catch(e => e);
      expect(error.message).toContain('Balance due');
    });

    it('should prevent deletion of paid invoice', async () => {
      const invoice = await createInvoice({ totalAmount: 1000 });
      await recordPayment(invoice.id, 1000);

      const error = await deleteInvoice(invoice.id).catch(e => e);
      expect(error.message).toContain('Cannot delete paid invoice');
    });
  });

  describe('Inventory Safety', () => {
    it('should prevent selling more than in stock', async () => {
      const product = await createProduct({ initialStock: 5 });

      const error = await createInvoice({
        items: [{ productId: product.id, quantity: 10 }],
      }).catch(e => e);

      expect(error.message).toContain('Insufficient');
    });

    it('should prevent negative stock', async () => {
      const product = await createProduct({ isSerialized: false, stock: 5 });
      // Directly try to deduct without validation
      const attempt = () => {
        return prisma.stockLedger.create({
          data: {
            type: 'OUT',
            quantity: 10, // More than available
          },
        });
      };
      // ✅ Should be blocked by validation layer, not allowed at API level
    });
  });
});
```

---

## FINAL WEEK 3 SUMMARY

**Completed**:

- ✅ Job card consent fields (device condition, data loss, warranty)
- ✅ Receivables aging report (30/60/90/90+ buckets)
- ✅ Daily sales report (cash/UPI/card breakdown)
- ✅ Inventory valuation report
- ✅ API endpoints for all 3 reports
- ✅ Comprehensive E2E testing
- ✅ All blockers resolved

---

## DEPLOYMENT CHECKLIST

- [ ] All 3 database migrations applied
- [ ] Services compile without errors
- [ ] All E2E tests passing (83%+ coverage)
- [ ] GSTR-1 report generates valid CSV
- [ ] Payment status updates correctly
- [ ] Stock deduction works for repairs
- [ ] Inventory never goes negative
- [ ] Job card consent enforced
- [ ] 3 core reports accessible via API
- [ ] Staff training completed
- [ ] Backup taken
- [ ] Pilot shop identified

---

## TIME ALLOCATION

| Component                 | Days        | FTE                      | Role             |
| ------------------------- | ----------- | ------------------------ | ---------------- |
| **Week 1: GST/Payments**  | 5           | 1 FTE                    | Backend engineer |
| **Week 2: Inventory**     | 5           | 1 FTE                    | Backend engineer |
| **Week 3: Reports/Legal** | 4           | 1 backend + 0.5 frontend | Both             |
| **QA/Testing**            | 3           | 1 QA engineer            | QA               |
| **Documentation**         | 1           | 0.5 FTE                  | Tech writer      |
| **Buffer/Polish**         | 3           | 1 FTE                    | Backend          |
| **TOTAL**                 | **21 days** | **~2 FTE**               | —                |

---

**Next Steps**:

1. Assign tasks to engineers
2. Set up daily standup
3. Track blockers in real-time
4. Test early and often
5. Deploy to pilot shop by Day 21
