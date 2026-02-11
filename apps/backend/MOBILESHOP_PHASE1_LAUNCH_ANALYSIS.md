# MobileShop ERP Phase-1 Launch Analysis

**Assessment Date**: February 10, 2026  
**Scope**: Phase-1 MVP for Indian mobile repair shops  
**Perspective**: Senior SaaS product architect + ERP consultant

---

## EXECUTIVE SUMMARY

| Category                  | Status                    | Confidence |
| ------------------------- | ------------------------- | ---------- |
| **Core Repair Workflow**  | Ready as-is ✅            | 95%        |
| **Financial Safety**      | Must fix before launch ⚠️ | 85%        |
| **GST Compliance**        | Must fix before launch ⚠️ | 70%        |
| **Inventory Accuracy**    | Partially ready ⚠️        | 75%        |
| **Legal Compliance**      | Launch risk if ignored 🔴 | 90%        |
| **Daily Shop Operations** | Ready with caution ⚠️     | 80%        |

**Bottom Line**: **NOT READY for live Indian shops**. Core workflows exist but financial/GST gaps create legal and operational risk. 2-3 weeks of focused development required before launch.

---

## SECTION 1: READY AS-IS (DO NOT TOUCH)

### 1.1 Job Card Management ✅

**Status**: Fully implemented and tested

**What works**:

- Complete job lifecycle: RECEIVED → DIAGNOSING → WAITING_APPROVAL → APPROVED → IN_PROGRESS → READY → DELIVERED
- Device details capture (brand, model, serial, password)
- Customer complaint + physical condition documentation
- Estimated & final cost tracking
- Warranty handling (rework jobs on delivery)
- Advance payment capture (cash/UPI split ready)
- Estimated delivery date management
- Status validation prevents invalid transitions
- Financial entry creation on delivery

**Production-ready features**:

- Public job tracking token (customers can check status via link)
- Automatic invoice creation when job moves to READY
- WhatsApp event triggers on status changes
- CreatedBy tracking for audit
- Job number generation with FY format

**Real-world workflow**: ✅ Matches Indian mobile repair shop practices

- Customer walks in → Device received (RECEIVED)
- Technician diagnoses → Updates diagnosis (DIAGNOSING) → Seeks approval (WAITING_APPROVAL)
- Customer approves cost → Tech starts repair (APPROVED → IN_PROGRESS)
- Repair complete → Ready for delivery (READY)
- Customer collects → Mark delivered (DELIVERED)

**No changes needed**: Job card module is solid.

---

### 1.2 Core Multi-Tenant Architecture ✅

**Status**: Battle-tested and correct

**What works**:

- Clean tenant isolation at database level
- All models have `tenantId` foreign key
- No cross-tenant queries possible
- Auth flow correct: Firebase ID → Backend JWT with tenantId binding
- Subscription system properly abstracts plans/features

**Why it's safe**:

- Core relationship constraints in Prisma are correct
- JWT guard validates tenantId on every request
- No loose filtering on tenant queries

**No changes needed**: Architecture foundation is secure.

---

### 1.3 Basic Customer Management ✅

**Status**: Functional and sufficient for Phase-1

**What works**:

- Party model captures customers + suppliers
- Phone number as unique identifier per tenant (Indian-friendly)
- GSTIN field present (for B2B invoices)
- Phone number validation (with alt phone)
- Business type enum (B2C vs B2B)
- Is Active flag for archiving
- Created/Updated timestamps

**What's NOT implemented** (but not critical Phase-1):

- Customer credit limits
- Payment terms defaults
- Loyalty points system

**Real-world usage**: ✅ Sufficient for MVP

- Shop owner can walk in, customer name captured, phone linked
- Search customers by phone number
- Mark B2B vs B2C for GST purposes
- Capture GSTIN for corporate customers

**No changes needed** for Phase-1. Loyalty features can wait.

---

## SECTION 2: MUST FIX BEFORE LAUNCH

### 2.1 GST Compliance - CRITICAL GAPS 🔴

**Current State**: Schema has fields but business logic incomplete

**What's broken**:

#### Problem A: GST Rate Capture Missing

```prisma
// SCHEMA: Has these fields
model Invoice {
  cgst, sgst, igst Int?  // ✅ Present
}

model InvoiceItem {
  // ❌ BUT: No gstRate field per item
  // ❌ AND: No logic to calculate cgst/sgst/igst from rate
}
```

**Real problem in India**:

- Different products have different GST rates (5%, 9%, 12%, 18%, 28%)
- A single repair invoice might have:
  - Labour (5% GST with exemption)
  - Spare parts (18% GST)
  - Accessories (9% GST)
- Current system can't handle this

**Impact**:

- ❌ Can't generate GSTR-1 (GST Return filing)
- ❌ Auditors will reject invoices
- ❌ Shop liable for GST penalties

**Fix Required** (2 days):

1. Add to `InvoiceItem` schema:

   ```prisma
   gstRate        Int?          // 5, 9, 12, 18, 28
   cgst           Int?          // Calculated: amount * gstRate / 200
   sgst           Int?          // Calculated: amount * gstRate / 200
   igst           Int?          // For B2B outside state
   taxableAmount  Int?          // Before GST
   ```

2. Before saving invoice:

   ```typescript
   // Validate
   if (item.gstRate && ![5, 9, 12, 18, 28].includes(item.gstRate)) {
     throw new BadRequestException('Invalid GST rate');
   }

   // Calculate
   item.cgst = (item.amount * item.gstRate) / 200;
   item.sgst = (item.amount * item.gstRate) / 200;

   // Aggregate to Invoice totals
   invoice.cgst = items.reduce((sum, item) => sum + item.cgst, 0);
   invoice.sgst = items.reduce((sum, item) => sum + item.sgst, 0);
   ```

3. Add service: `TaxCalculationService` with validation

**Affected components**:

- `/invoice-creation` API ← Must validate gstRate
- Invoice PDF print template ← Must show GST breakup
- GSTR-1 report endpoint ← Depends on this

---

#### Problem B: GSTR-1 Not Implemented

**What's missing**:

- No endpoint to export GSTR-1 (B2B + B2C sales register)
- No GSTR-2 (inward supplies/purchases - needed for ITC)
- Can't reconcile with the annual filing

**Impact**:

- ❌ Shop owner can't file GST returns
- ❌ Tax department inquiry → penalties
- ❌ Loss of ITC (Input Tax Credit) on purchases

**Fix Required** (3-4 days):

1. Create `GSTReportsService`:

   ```typescript
   // B2B: Invoices to customers with GSTIN
   getGSTR1B2B(fromDate, toDate) {
     return invoices where:
     - customerGstin exists
     - status = PAID (or invoice.paidAmount == invoice.total)
     - Columns: InvoiceNo, Date, CustomerGSTIN, TaxableAmount, CGST, SGST
   }

   // B2C: Summary of invoices without GSTIN
   getGSTR1B2C(fromDate, toDate) {
     return sum of invoices where:
     - customerGstin is NULL
     - Columns: TotalInvoices, TotalTaxable, TotalTax
   }
   ```

2. Add API endpoint:

   ```
   GET /api/mobileshop/reports/gstr-1?from=2024-01-01&to=2024-03-31
   ```

3. Frontend: GSTR-1 page with export to CSV/XLSX

---

#### Problem C: No Supplier GSTIN Validation

**Current state**:

```prisma
model Purchase {
  // ❌ No supplierGstin field
  // ❌ No validation that GST is applicable
}
```

**Real problem**:

- Purchases from GSTIN suppliers → Can claim ITC (Input Tax Credit)
- Purchases from non-GSTIN suppliers (e.g., local vendor) → Cannot claim ITC
- If shop claims ITC on unregistered vendor purchases → GST audit failure

**Fix Required** (2 days):

1. Add to Purchase schema:

   ```prisma
   supplierGstin     String?
   // If supplier has GSTIN: Can claim full ITC
   // If supplier is unregistered: Mark as non-GST purchase
   ```

2. Add validation:

   ```typescript
   if (supplierGstin) {
     // Validate GSTIN format (15-char alphanumeric)
     if (!validGSTINFormat(supplierGstin)) {
       throw new BadRequestException('Invalid GSTIN');
     }
     // Flag: This purchase allows ITC
     canClaimITC = true;
   } else {
     canClaimITC = false; // Cash purchase from unregistered vendor
   }
   ```

3. Create `GSTR2Service` for return filing (Import of goods)

---

### 2.2 Financial Integrity - Payment Linkage 🔴

**Current Status**: Partially implemented, unsafe gaps remain

**What's broken**:

#### Problem A: Invoice Payment Tracking Incomplete

```prisma
// SCHEMA: Has this
model Invoice {
  totalAmount  Int
  // ❌ But NO paidAmount or paymentStatus
  // ❌ Can't tell if invoice is PAID, PARTIAL, UNPAID
}
```

**Real problem**:

- Customer owes ₹5000 for repair
- Shop collects ₹3000 today, ₹2000 next week
- Current system can't track this "partial payment"
- Reports will show UNPAID when it's actually half-paid

**Impact**:

- ❌ Shop can't track outstanding receivables
- ❌ Can't follow up with customers for balance
- ❌ Aged receivables report broken
- ❌ Can't calculate shop cash flow

**Fix Required** (3 days):

1. Add to Invoice schema:

   ```prisma
   model Invoice {
     totalAmount    Int
     paidAmount     Int     @default(0)
     balanceAmount  Int     // Calculated: totalAmount - paidAmount
     paymentStatus  String  // UNPAID | PARTIAL | PAID | VOIDED
   }
   ```

2. When Receipt created:

   ```typescript
   const receipt = await createReceipt(invoiceId, amount);

   const invoice = await prisma.invoice.update({
     where: { id: invoiceId },
     data: {
       paidAmount: { increment: amount },
       paymentStatus: paidAmount >= totalAmount ? 'PAID' : 'PARTIAL',
     },
   });
   ```

3. Add validation to prevent over-payment:

   ```typescript
   if (amount > invoice.balanceAmount) {
     throw new BadRequestException(
       `Cannot pay ₹${amount}. Balance due: ₹${invoice.balanceAmount}`,
     );
   }
   ```

4. On Invoice cancellation:
   ```typescript
   if (invoice.paidAmount > 0) {
     // Must create refund/credit note
     // Block direct deletion
     throw new BadRequestException(
       'Cannot delete paid invoice. Create credit note instead.',
     );
   }
   ```

**Affected components**:

- Invoice creation API ← Initialize paidAmount = 0
- Receipt API ← Update invoice.paidAmount when payment collected
- Dashboard ← Show aging of unpaid invoices
- Reports → Receivables aging

---

#### Problem B: Purchase Payment Tracking Missing

**Same as invoices above, but for purchases**:

```prisma
// MISSING
model Purchase {
  totalAmount    Int
  paidAmount     Int?         // ← ADD THIS
  paymentStatus  String?      // UNPAID | PARTIAL | PAID
}
```

**Real problem**:

- Shop buys ₹10,000 stock from supplier
- Pays ₹5,000 today, ₹5,000 next month
- Can't track payables
- Can't generate payables aging report for accountant

**Fix Required** (Same pattern as invoices, 2 days)

---

### 2.3 Inventory Integrity - Critical Gaps ⚠️

**Current Status**: Schema fixed, service implementation incomplete

**What's fixed** ✅:

- StockLedger is now single source of truth
- IMEI status tracking (IN_STOCK / SOLD / RETURNED / DAMAGED / LOST / TRANSFERRED)
- Cost per unit captured for COGS
- isSerialized flag on ShopProduct

**What's NOT implemented** ❌:

#### Problem A: Repair Parts Not Deducted from Stock

```typescript
// Current code in JobCardsService.addPart()
async addPart(jobId, productId, qty) {
  // Creates RepairPartUsed entry
  await prisma.repairPartUsed.create({
    data: { jobCardId: jobId, shopProductId: productId, quantity: qty }
  });

  // ❌ BUG: Doesn't create StockLedger OUT entry!
  // ❌ Result: Stock shows 100 units, but repair used 5 → Still shows 100!
}
```

**Real impact**:

- Shop has 20 batteries in stock
- Uses 5 for repairs this week
- Report shows 20 (not 15)
- Next Saturday: Shop tries to sell 18 batteries → Only 15 available → Customer left waiting

**Fix Required** (2 days):

1. When part added to repair:

   ```typescript
   async addPart(jobId, productId, qty) {
     // 1. Check if stock available
     const available = await stockService.getAvailableStock(productId);
     if (available < qty) {
       throw new BadRequestException('Insufficient stock');
     }

     // 2. Create RepairPartUsed
     const part = await prisma.repairPartUsed.create({
       data: { jobCardId, shopProductId: productId, quantity: qty }
     });

     // 3. ✅ Create StockLedger OUT entry
     await prisma.stockLedger.create({
       data: {
         type: 'OUT',
         quantity: qty,
         referenceType: 'REPAIR',
         referenceId: jobId,
         costPerUnit: product.costPrice,
         note: `Used in job ${jobCard.jobNumber}`
       }
     });
   }
   ```

2. When job cancelled/returned:
   ```typescript
   async cancelJob(jobId) {
     const job = await jobCard.findUnique(jobId);

     // Reverse all repair part stock deductions
     const parts = await prisma.repairPartUsed.findMany({ jobCardId });

     for (const part of parts) {
       // Create IN entry to restore stock
       await prisma.stockLedger.create({
         data: {
           type: 'IN',
           quantity: part.quantity,
           referenceType: 'REPAIR_REVERSAL',
           referenceId: jobId,
           note: `Cancelled job ${jobNumber}`
         }
       });
     }
   }
   ```

**Affected components**:

- `/api/mobileshop/jobcards/:id/parts` ← Must validate stock
- Inventory report ← Now accurate
- Dashboard stock alerts ← Now trigger correctly

---

#### Problem B: No Validation on Stock OUT

**Current state**: Anyone can create arbitrary stock entries

```typescript
// ❌ VULNERABLE: No checks
await prisma.stockLedger.create({
  data: { type: 'OUT', quantity: 99999 }, // Can sell 99,999 units that don't exist!
});
```

**Real impact**:

- Data entry error: Staff fat-fingers "500" instead of "5"
- Shop shows -495 battery units
- Reports broken
- Can't trust any inventory number

**Fix Required** (1 day):

1. Create `StockValidationService`:

   ```typescript
   async validateStockOut(productId, qty, jobId) {
     // Only allow OUT if:
     if (product.isSerialized) {
       // 1. For phones: Check if IMEIs exist and are IN_STOCK
       const available = await prisma.iMEI.count({
         where: { shopProductId: productId, status: 'IN_STOCK' }
       });
       if (available < qty) {
         throw new BadRequestException(
           `Only ${available} units in stock, requested ${qty}`
         );
       }
     } else {
       // 2. For accessories: Check StockLedger balance
       const balance = await getStockBalance(productId);
       if (balance < qty) {
         throw new BadRequestException(
           `Stock insufficient: ${balance} available, ${qty} requested`
         );
       }
     }
   }
   ```

2. Use validation in all OUT operations:
   - Sales (invoice creation)
   - Repairs (job parts)
   - Adjustments (damage/loss)

---

#### Problem C: IMEI Not Linked to Job Card Sales

**Current state**:

```prisma
// When phone is sold via invoice
model InvoiceItem {
  // ❌ No IMEI field linking which specific unit was sold
}

model IMEI {
  imei String
  // Has invoiceId field, but
  // If changed later → Can't trace back to original invoice
}
```

**Real impact**:

- Customer buys phone with IMEI ABC123
- 3 months later: Phone is broken (warranty claim)
- Can't find which invoice or which customer bought it (bad records)
- Warranty rework flow impossible to track

**Fix Required** (2 days):

1. Update invoice creation:

   ```typescript
   async createInvoice(jobId, items) {
     for (const item of items) {
       // If serialized (phone)
       if (product.isSerialized) {
         // Map each IMEI to this invoice
         const imeis = await getIMEIsForQuantity(product, item.qty);

         for (const imei of imeis) {
           // Update IMEI status
           await prisma.iMEI.update({
             where: { imei },
             data: {
               status: 'SOLD',
               invoiceId: invoice.id,
               soldAt: new Date()
             }
           });
         }
       }
     }
   }
   ```

2. On invoice cancellation:
   ```typescript
   async cancelInvoice(invoiceId) {
     // Revert IMEIs back to IN_STOCK
     await prisma.iMEI.updateMany({
       where: { invoiceId },
       data: { status: 'IN_STOCK', invoiceId: null, soldAt: null }
     });
   }
   ```

**Affected components**:

- Invoice API ← IMEI selection required
- Warranty rework flow ← Can trace original invoice
- IMEI reports ← Show full lifecycle
- Negative stock protection ← IMEIs checked first

---

### 2.4 Missing Legal Documents & Compliance Tracking 🔴

**What's missing**:

#### Problem A: No Invoice Consent/Acknowledgment

**Real-world Indian law** (especially with GST):

- Mobile repair shops must capture customer consent:
  1. Device condition acknowledgment (baseline for warranty exclusions)
  2. Data loss disclaimer (esp. for screen/storage repairs)
  3. Advance amount non-refundable consent

**Current state**:

```prisma
model JobCard {
  // ❌ No consentAcknowledge field
  // ❌ No consentDataLoss field
}
```

**Impact**:

- ❌ No record that customer acknowledged device condition
- ❌ Customer claims phone was broken when handed in (dispute)
- ❌ No protection against "you lost my data" claims
- ❌ No evidence advance payment was explained as non-refundable

**Fix Required** (1 day):

```prisma
model JobCard {
  consentDeviceCondition  Boolean @default(false)
  consentDataLoss         Boolean @default(false)
  consentNonRefundable    Boolean @default(false)
  consentAt               DateTime?
  consentSignatureUrl     String?  // Photo of signed form
}
```

And in the UI:

```
Before marking READY, shop owner must check:
☐ Device condition acknowledged
☐ Data loss risk acknowledged
☐ Advance is non-refundable
Only then: Can proceed
```

---

#### Problem B: No Warranty Terms Capture

**Current schema**:

```prisma
model JobCard {
  warrantyDuration  Int?  // ← Field exists but unused
  // No warranty terms (parts only vs labor?)
  // No warranty exclusions captured
}
```

**Real problem**:

- Customer claims "you promised 3-month warranty"
- Shop says "only 1 month on battery"
- Dispute with no written T&Cs

**Fix Required** (1 day):

```prisma
model JobCard {
  warrantyDuration        Int?        // Days
  warrantyType            String?     // PARTS | LABOR | BOTH
  warrantyExclusions      String[]?   // e.g., "Water damage", "Physical damage"
  warrantyTermsUrl        String?     // Link to shop's standard terms
  warrantyTermsAccepted   Boolean @default(false)
  warrantyAcceptedAt      DateTime?
}
```

---

### 2.5 Missing Critical Reports 🔴

**What's missing**:

#### Problem A: Receivables Aging Report

**For**: Shop owner to know who owes money

**Current state**: No endpoint

**Must implement** (2 days):

```
GET /api/mobileshop/reports/receivables-aging?shopId=X
Response:
{
  "notDue": { count: 5, total: ₹15000 },      // Paid within 30 days
  "30days": { count: 2, total: ₹8000 },        // 30-60 days overdue
  "60days": { count: 1, total: ₹5000 },        // 60-90 days overdue
  "90plus": { count: 0, total: 0 },            // 90+ days

  "details": [
    { customerName, phone, invoiceNo, dueDate, amount, daysOverdue }
  ]
}
```

**Why it matters**:

- Shop owner knows exactly who owes what
- Can prioritize collection calls
- Can identify bad customers early

---

#### Problem B: Daily Sales Report

**For**: Shop owner to see today's revenue

**Must implement** (1 day):

```
GET /api/mobileshop/reports/daily-sales?shopId=X&date=2026-02-10
Response:
{
  "invoiceCount": 12,
  "totalRevenue": ₹125000,
  "totalCash": ₹75000,
  "totalUPI": ₹50000,
  "totalPending": ₹0,
  "topProducts": [ { name, qty, revenue } ]
}
```

---

#### Problem C: Stock Valuation Report

**For**: Accounting and balance sheet

**Must implement** (2 days):

```
GET /api/mobileshop/reports/inventory-valuation?shopId=X
Response:
{
  "items": [
    { productName, quantity, costPrice, totalValue, minStockAlert }
  ],
  "totalInventoryValue": ₹250000
}
```

**Why it matters**:

- Shows shop's asset value (for balance sheet)
- Identifies dead stock (old phones not moving)
- Validates physical count vs. system

---

## SECTION 3: DEFER SAFELY TO PHASE-2

### 3.1 Advanced GST Features ✅ Can Wait

These are accountant-only features:

**Defer safely**:

- ❌ GST reconciliation with actual filing (manual process ok for Phase-1)
- ❌ GSTR-3B (consolidated return) - Too complex for MVP
- ❌ ITC credit tracking/optimization
- ❌ Inter-state supply tracking (IGST vs CGST/SGST)
- ❌ E-invoice OCR (QR code scanning)

**Phase-2** can add these with CA involvement.

---

### 3.2 Loyalty & Rewards ✅ Can Wait

**Current**: Schema ready, logic not needed yet

**Defer safely**:

- Loyalty points on repairs
- Referral discounts
- Repeat customer tracking
- Tier-based pricing

**Why Phase-2**: First get solid revenue tracking, then optimize for retention.

---

### 3.3 Advanced Analytics & Dashboards ✅ Can Wait

**Defer safely**:

- Charts + graphs (visualizations)
- Predictive stock management (ML)
- Technician productivity tracking
- Cost variance analysis
- Seasonality forecasting

**Why Phase-2**: Basic daily sales report is enough for MVP.

---

### 3.4 Multi-Shop Management ✅ Can Wait

**Current state**: Schema supports it, but untested

**Defer safely**:

- Consolidated reports across shops
- Inter-shop inventory transfers (marked as TODO)
- Multi-shop staff allocation
- Centralized customer database

**Why Phase-2**: Phase-1 is for single-shop operations. Chains can come later.

---

### 3.5 Booking & Scheduling ✅ Can Wait

**Defer safely**:

- Customer booking system
- Technician time slots
- Appointment reminders
- Queue management

**Why Phase-2**: Manual job acceptance is fine for Phase-1. Schedule after core ops work.

---

### 3.6 POS Integration & Billing Kiosk ✅ Can Wait

**Defer safely**:

- Bill printing at counter
- Quick receipt lookup
- Barcode scanning for invoice search
- Thermal printer support

**Why Phase-2**: PDF-based invoicing works. POS polish later.

---

## SECTION 4: LAUNCH RISKS IF IGNORED

### 🔴 CRITICAL: GST Non-Compliance

**If NOT fixed**: Shop liable for GST penalties + audit

- Penalty: 10-25% of unpaid GST
- May face denial of ITC (bigger financial loss)
- Reputation damage if discovered

**Action**: MUST implement by launch

---

### 🔴 CRITICAL: Inventory Mismatch

**If NOT fixed**: Stock numbers don't match reality

- Customer comes in, can't sell because "system shows out of stock"
- Lost sales, angry customers
- Accounting reconciliation impossible

**Action**: MUST test & validate repairs deduction

---

### 🔴 CRITICAL: Financial Tracking Impossible

**If NOT fixed**:

- Can't track who owes money
- Can't generate receivables for auditor
- Can't reconcile cash vs. bank

**Action**: MUST implement payment status

---

### 🟡 HIGH: No Warranty Protection

**If NOT fixed**:

- Disputes with customers escalate
- Shop's liability in law unclear
- No legal footprint

**Action**: MUST add consent capture

---

### 🟡 HIGH: Reports Missing

**If NOT fixed**:

- Shop owner flying blind on daily performance
- Accountant can't reconcile books
- Business metrics invisible

**Action**: MUST implement 3 core reports

---

## SECTION 5: IMPLEMENTATION ROADMAP (2-3 weeks)

### **Week 1: GST & Payments**

| Task                                 | Days | Dependency |
| ------------------------------------ | ---- | ---------- |
| Add gstRate per InvoiceItem          | 1.5  | None       |
| Implement TaxCalculationService      | 1.5  | ↑          |
| Add invoice.paidAmount tracking      | 2    | None       |
| Add purchase.paidAmount tracking     | 1    | invoice ↑  |
| Implement GSTReportsService + GSTR-1 | 2    | TaxCalc ↑  |
| Add supplierGstin validation         | 1    | None       |

**Deliverable**: Full GST compliance ready, GSTR-1 report working

---

### **Week 2: Inventory & Safety**

| Task                           | Days | Dependency |
| ------------------------------ | ---- | ---------- |
| Fix repairs stock deduction    | 1.5  | None       |
| Add StockValidationService     | 1.5  | None       |
| Link IMEI to invoice items     | 2    | None       |
| Test negative stock prevention | 1    | All ↑      |

**Deliverable**: Inventory numbers match reality, no negative stock possible

---

### **Week 2-3: Legal & Reports**

| Task                              | Days | Dependency         |
| --------------------------------- | ---- | ------------------ |
| Add job card consent fields       | 1    | None               |
| Implement warranty terms capture  | 1    | None               |
| Create receivables aging report   | 1.5  | Payment tracking ↑ |
| Create daily sales report         | 1    | None               |
| Create inventory valuation report | 1.5  | Stock fix ↑        |
| **Testing & QA**                  | 3    | All ↑              |

**Deliverable**: All critical reports working, legal protection in place

---

### **Team Effort**

- **Backend**: 1 engineer (14 days)
- **Frontend**: 1 engineer (10 days) - UI for new fields, reports
- **QA**: 1 engineer (5 days) - Payment flow testing, inventory validation
- **CA Consultant**: 2-3 hours - GST validation, report review

**Total**: 2-3 weeks, 2-3 engineers

---

## SECTION 6: DEPLOYMENT CHECKLIST

### Before Going Live:

**Database**:

- [ ] All migrations applied (gstRate, paidAmount, supplierGstin fields)
- [ ] Indexes created for payment_status, gstRate
- [ ] Backup taken
- [ ] Tested on production-like data

**Backend**:

- [ ] GST calculation tested with 5%, 9%, 18% rates
- [ ] Stock OUT validates quantity first
- [ ] IMEI allocation works for serialized products
- [ ] GSTR-1 report generates correctly
- [ ] Receivables aging calculated correctly
- [ ] Payment tracking on invoice updates

**Frontend**:

- [ ] Job card shows consent checkboxes before READY
- [ ] Invoice edit screen has gstRate dropdown
- [ ] Receipt collection updates invoice.paidAmount
- [ ] Dashboard shows daily sales summary
- [ ] Reports menu has 3 core reports

**Testing Scenarios**:

- [ ] Create job → add repair parts → check stock deducts
- [ ] Create invoice with mixed GST items → GSTR-1 report correct
- [ ] Invoice Rs. 1000, collect Rs. 600 → shows PARTIAL, not PAID
- [ ] Attempt to sell 10 units with only 5 in stock → blocked with error
- [ ] Serialized phone sold → IMEI marked SOLD with invoice link

**Operational Readiness**:

- [ ] Shop owner trained on new fields
- [ ] CA trained on GSTR-1 export process
- [ ] Error messages are clear (not technical jargon)
- [ ] PDF invoices show GST breakup
- [ ] Backup & restore tested

---

## SECTION 7: SUCCESS METRICS (Phase-1)

By launch, these metrics confirm MVP readiness:

| Metric                    | Target  | Measures                           |
| ------------------------- | ------- | ---------------------------------- |
| **Inventory Accuracy**    | ±2%     | StockLedger vs. physical count     |
| **Payment Completion**    | 100%    | All invoices can reach PAID status |
| **GST Report Validity**   | 100%    | GSTR-1 can be filed without errors |
| **Zero Negative Stock**   | 0 cases | No product should go negative      |
| **Page Load Time**        | <2s     | Invoice/report queries are fast    |
| **Mobile Responsiveness** | 100%    | Job card creation works on mobile  |
| **Error Rate**            | <1%     | API failures logged, not silent    |

---

## FINAL VERDICT

### What You Have ✅

- Solid job card workflow
- Proper multi-tenant architecture
- Basic customer & product management
- Inventory schema (mostly)
- WhatsApp integration foundation

### What You MUST Add ⚠️

1. GST calculation & GSTR reporting (legal requirement)
2. Payment status tracking (financial necessity)
3. Repair stock deduction (operational correctness)
4. Consent capture (legal protection)
5. Core 3 reports (business intelligence)

### Timeline

- **Minimum**: 2 weeks focused development
- **Realistic**: 3 weeks with testing & polish
- **Not recommended to launch without these fixes**

### Bottom Line

**Current state**: 60-70% ready for production

**After 3-week hardening**: 95%+ ready for first real customers

Choose a pilot shop, test for 1 week, then wider launch.

---

## APPENDIX: Code Templates

### Template A: TaxCalculationService

```typescript
@Injectable()
export class TaxCalculationService {
  // Validate GST rate
  validateGSTRate(rate: number) {
    const validRates = [0, 5, 9, 12, 18, 28];
    if (!validRates.includes(rate)) {
      throw new BadRequestException(`GST rate must be one of: ${validRates}`);
    }
  }

  // Calculate CGST/SGST (same tax split for intra-state)
  calculateStateTax(amount: number, gstRate: number) {
    this.validateGSTRate(gstRate);
    const taxPerItem = (amount * gstRate) / 200; // Divided by 200 for CGST+SGST
    return {
      cgst: taxPerItem,
      sgst: taxPerItem,
      igst: 0,
      totalTax: taxPerItem * 2,
    };
  }

  // Calculate IGST (for interstate B2B)
  calculateInterstateTab(amount: number, gstRate: number) {
    this.validateGSTRate(gstRate);
    const igst = (amount * gstRate) / 100;
    return { cgst: 0, sgst: 0, igst };
  }
}
```

### Template B: StockValidationService

```typescript
@Injectable()
export class StockValidationService {
  async validateBeforeStockOut(
    tenantId: string,
    productId: string,
    quantity: number,
  ) {
    const product = await this.prisma.shopProduct.findUnique({
      where: { id: productId },
    });

    if (product.isSerialized) {
      // Check IMEI count
      const available = await this.prisma.iMEI.count({
        where: { shopProductId: productId, status: 'IN_STOCK' },
      });
      if (available < quantity) {
        throw new BadRequestException(
          `Only ${available} units available, requested ${quantity}`,
        );
      }
    } else {
      // Check StockLedger balance
      const entries = await this.prisma.stockLedger.findMany({
        where: { shopProductId: productId },
      });
      const balance = entries.reduce(
        (sum, e) => (e.type === 'IN' ? sum + e.quantity : sum - e.quantity),
        0,
      );
      if (balance < quantity) {
        throw new BadRequestException(
          `Insufficient stock: ${balance} available`,
        );
      }
    }
  }
}
```

### Template C: GSTR1Service

```typescript
@Injectable()
export class GSTR1Service {
  async getGSTR1B2B(tenantId: string, fromDate: Date, toDate: Date) {
    return this.prisma.invoice.findMany({
      where: {
        tenantId,
        createdAt: { gte: fromDate, lte: toDate },
        party: { gstNumber: { not: null } }, // Only B2B
      },
      select: {
        invoiceNumber: true,
        createdAt: true,
        party: { select: { gstNumber: true } },
        items: {
          select: {
            amount: true,
            cgst: true,
            sgst: true,
            igst: true,
          },
        },
      },
    });
  }
}
```

---

**Assessment Completed**: February 10, 2026  
**Next Step**: Prioritize Week-1 tasks and assign engineers
