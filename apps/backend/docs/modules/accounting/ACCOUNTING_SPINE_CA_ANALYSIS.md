# 🧾 ACCOUNTING SPINE ANALYSIS - CA + ERP ARCHITECT PERSPECTIVE

**Prepared For**: Gym SaaS Mobile Shop ERP (India GST Compliant)  
**Date**: February 7, 2026  
**Context**: Sales & Jobcard modules stabilized → Accounting foundation readiness assessment  
**Target**: Retail mobile shop operations with GST compliance

---

## EXECUTIVE SUMMARY

**Status**: 🟡 **PARTIALLY READY** - Strong foundation with critical gaps  
**Maturity Level**: 60% - Operational modules exist but accounting integrity incomplete  
**Risk Level**: MEDIUM - Current system can operate but lacks full audit trail and compliance reporting

**Immediate Action Required**:

1. Complete Purchase → Inventory → Ledger integration
2. Implement proper double-entry accounting layer
3. Build GST compliance reports (GSTR-1, GSTR-2)
4. Add Outstanding Receivables/Payables reconciliation

---

## 1️⃣ PURCHASE MODULE ANALYSIS

### Current Implementation Status

**Models Present**:

- ✅ `Purchase` - Main invoice entity (WITH Items, GST breakdown)
- ✅ `PurchaseItem` - Line items with HSN/SAC, GST rates
- ✅ `SupplierPayment` - Payment tracking (links to Purchase)
- ✅ `Party` (Supplier) - Supplier master data
- ✅ `StockLedger` - Inventory movement tracking
- ✅ `PaymentVoucher` - Money OUT recording (SUPPLIER type)

**Operational Flow** (as implemented):

```
1. Create Purchase Invoice
   └─> Purchase{grandTotal, paidAmount=0, status='DRAFT'}
   └─> PurchaseItem[] (with purchasePrice in PAISA, gstRate, taxAmount)
   └─> NO automatic stock entry (manual step required)

2. Record Payment
   └─> SupplierPayment{amount, paymentMethod}
   └─> PaymentVoucher{voucherType='SUPPLIER', linkedPurchaseId}
   └─> FinancialEntry{type='OUT', mode, amount}
   └─> Purchase.paidAmount += payment
   └─> Purchase.status → 'PAID' | 'PARTIALLY_PAID'
```

### ✅ CORRECT ACCOUNTING BEHAVIOR

1. **Purchase Invoice** = Liability Recognition
   - Does NOT create ledger entry immediately
   - Captures: Supplier liability, Input Tax Credit (ITC), Inventory value
   - Status progression: DRAFT → SUBMITTED → PARTIALLY_PAID → PAID

2. **Payment Voucher** = Liability Settlement
   - Creates `FinancialEntry` (MONEY OUT)
   - Links to Purchase via `linkedPurchaseId`
   - Proper segregation: Invoice ≠ Payment

3. **GST Structure**:
   - ✅ Captures `subTotal`, `totalGst`, `grandTotal`
   - ✅ Item-level `gstRate`, `taxAmount`
   - ✅ Supports `hsnSac` codes (required for GSTR-2)

### ⚠️ GAPS & ISSUES

#### **GAP 1: Inventory Integration Incomplete**

```typescript
// Current: Purchase does NOT auto-create StockLedger
// Should be atomic:
await tx.purchase.create({ ... });
await tx.stockLedger.createMany({
  data: items.map(i => ({
    type: 'IN',
    shopProductId: i.shopProductId,
    quantity: i.quantity,
    costPerUnit: i.purchasePrice, // ✅ Already in PAISA
    referenceType: 'PURCHASE',
    referenceId: purchase.id
  }))
});
```

**Impact**: Manual stock-in step can be forgotten → Inventory mismatch  
**Fix Required**: Atomic transaction linking Purchase → StockLedger

#### **GAP 2: Input Tax Credit (ITC) Not Ledger-Visible**

```
Purchase.totalGst = ₹1,800 (on ₹10,000 purchase)
  → Should create Ledger Entry:
     Dr. GST Input Credit ₹1,800
     Dr. Inventory         ₹10,000
     Cr. Supplier Payable ₹11,800
```

**Current**: `FinancialEntry` only created on PAYMENT, not on PURCHASE  
**Impact**: ITC not reconcilable with GST returns  
**Fix Required**: Journal entry on Purchase submission

#### **GAP 3: Expense vs Stock Purchase Not Distinguished**

```
Current: All purchases treated as Inventory
Should support:
- Goods for Resale (Inventory)
- Consumables (Expense - direct P&L)
- Capital Assets (Fixed Assets)
```

**Field Present**: `purchaseType` (string) - not enforced  
**Fix Required**: Enum validation + different accounting treatment

#### **GAP 4: Purchase Returns Not Implemented**

```
Required for:
- Defective goods return
- ITC reversal
- Supplier credit notes
```

**Fix Required**: Add `PurchaseReturn` model or status='RETURNED'

### 🎯 MANDATORY FIELDS & BUSINESS RULES

| Field           | Current            | Should Be           | Rule                                             |
| --------------- | ------------------ | ------------------- | ------------------------------------------------ |
| `invoiceNumber` | ✅ Unique per shop | ✅ CORRECT          | Supplier's invoice # (not our generated)         |
| `invoiceDate`   | ✅ DateTime        | ✅ CORRECT          | Supplier's invoice date (for ITC claim period)   |
| `supplierName`  | ✅ Required        | ⚠️ Needs validation | Must match GST records if `globalSupplierId` set |
| `gstNumber`     | ❌ Missing         | 🔴 CRITICAL         | Supplier GSTIN (mandatory for B2B ITC)           |
| `subTotal`      | ✅ Calculated      | ✅ CORRECT          | Base value before tax                            |
| `totalGst`      | ✅ Calculated      | ✅ CORRECT          | But needs CGST/SGST/IGST split                   |
| `dueDate`       | ✅ Optional        | ⚠️ Should default   | `invoiceDate + paymentTerms`                     |
| `taxInclusive`  | ✅ Boolean         | ⚠️ Rare case        | Most B2B purchases are tax-exclusive             |

#### **ILLEGAL COMBINATIONS**

```typescript
// ❌ REJECT: GST purchase without supplier GSTIN
if (totalGst > 0 && !supplierGstin) {
  throw Error('Supplier GSTIN required for GST purchases (ITC eligibility)');
}

// ❌ REJECT: Future-dated invoice
if (invoiceDate > today) {
  throw Error('Invoice date cannot be in future');
}

// ❌ REJECT: Invoice date beyond ITC time limit
if (invoiceDate < (today - 180days)) {
  throw Error('ITC claim window expired (CGST Act Sec 16)');
}
```

### 📊 DERIVED vs ENTERED

**ENTERED (User Input)**:

- Supplier name/GSTIN
- Invoice number & date
- Payment terms
- Item descriptions, quantities, rates
- GST rates per item

**DERIVED (System Calculated)**:

- `subTotal` = Σ(quantity × purchasePrice)
- `totalGst` = Σ(taxAmount per item)
- `grandTotal` = subTotal + totalGst
- `outstandingAmount` = grandTotal - paidAmount
- `status` (based on payment state)

### 🔗 LINKAGES

```
Purchase ─┬─> PurchaseItem[] (line items)
          ├─> SupplierPayment[] (payment history)
          ├─> Party (supplier master)
          ├─> StockLedger (inventory IN) ← SHOULD be automatic
          └─> PaymentVoucher (money OUT) ← Created on payment
```

---

## 2️⃣ PAYMENT VOUCHER ANALYSIS

### Current Implementation Status

**Model**: `PaymentVoucher`

```prisma
{
  voucherId: String (unique, e.g., "VCH-123-456")
  voucherType: SUPPLIER | EXPENSE | SALARY | ADJUSTMENT
  amount: Int (paisa)
  paymentMethod: CASH | UPI | CARD | BANK (NOT CREDIT)
  date: DateTime
  linkedPurchaseId?: String (optional FK)
  globalSupplierId?: String
  expenseCategory?: String
  narration?: String
  status: ACTIVE | CANCELLED
}
```

### ✅ CORRECT ACCOUNTING BEHAVIOR

1. **Strict CREDIT Rejection**:

   ```typescript
   if (paymentMethod === 'CREDIT') {
     throw Error('CREDIT is NOT a payment. Record only actual money out');
   }
   ```

   ✅ This is **CORRECT** - Prevents fictitious cash book entries

2. **Double-Entry Hook**:

   ```typescript
   await tx.financialEntry.create({
     type: 'OUT',
     amount: voucher.amount,
     mode: voucher.paymentMethod,
     referenceType: 'VOUCHER',
     referenceId: voucher.id,
   });
   ```

   ✅ Every voucher creates FinancialEntry (audit trail)

3. **Voucher Types Coverage**:
   - SUPPLIER → Paying for purchases
   - EXPENSE → Operational expenses (rent, utilities)
   - SALARY → Staff wages
   - ADJUSTMENT → Corrections/misc

### ⚠️ GAPS & ISSUES

#### **GAP 1: No Ledger Account Mapping**

```
Current: PaymentVoucher → FinancialEntry (flat)
Should be:
  PaymentVoucher → Journal Entry:
    Dr. Supplier Payable (or Expense Account)
    Cr. Cash/Bank Account
```

**Impact**: Cannot generate Trial Balance or P&L automatically  
**Fix Required**: Chart of Accounts + Ledger Posting

#### **GAP 2: Partial Payments Not Enforced**

```typescript
// Should validate:
if (linkedPurchaseId) {
  const purchase = await getPurchase(linkedPurchaseId);
  if (amount > purchase.outstandingAmount) {
    throw Error('Payment exceeds outstanding');
  }
}
```

#### **GAP 3: Expense Categories Not Standardized**

```
Current: expenseCategory is String (free text)
Should be: Enum with standard expense heads:
  - RENT
  - ELECTRICITY
  - SALARY (wait, there's SALARY type too - conflict?)
  - TELEPHONE
  - REPAIRS_MAINTENANCE
  - MARKETING
  - TRANSPORTATION
```

#### **GAP 4: No Advance Payment Handling**

```
Case: Pay ₹5,000 to supplier before receiving goods
Current: Can create voucher but Purchase doesn't exist yet
Should: Support ADVANCE type + reconcile later
```

### 🎯 VOUCHER vs PURCHASE PAYMENT

| Scenario                | Purchase Update?          | Voucher Created?        | FinancialEntry?     |
| ----------------------- | ------------------------- | ----------------------- | ------------------- |
| Create purchase invoice | No (liability recognized) | ❌ No                   | ❌ No (no cash yet) |
| Pay against purchase    | ✅ paidAmount +=          | ✅ voucherType=SUPPLIER | ✅ type=OUT         |
| Pay supplier advance    | ❌ No purchase yet        | ✅ voucherType=SUPPLIER | ✅ type=OUT         |
| Pay shop rent           | N/A                       | ✅ voucherType=EXPENSE  | ✅ type=OUT         |
| Staff salary            | N/A                       | ✅ voucherType=SALARY   | ✅ type=OUT         |

### 📋 AUDIT TRAIL REQUIREMENTS

**Must Support**:

- ✅ Voucher cancellation with reason (already has `status=CANCELLED`)
- ⚠️ Edit history (not present - use AuditLog?)
- ✅ Sequential numbering (`voucherId` is timestamp-based - NOT sequential)
- ⚠️ Should be: "PV-2025-0001" (sequential per financial year)

---

## 3️⃣ RECEIPT VOUCHER ANALYSIS

### Current Implementation Status

**Model**: `Receipt`

```prisma
{
  receiptId: String (unique, "RCP-123-456")
  printNumber: String (sequential)
  receiptType: CUSTOMER | GENERAL | ADJUSTMENT | PAYMENT
  amount: Int (paisa)
  paymentMethod: CASH | UPI | CARD | BANK (NOT CREDIT)
  customerName: String
  linkedInvoiceId?: String
  status: ACTIVE | CANCELLED
}
```

### ✅ CORRECT ACCOUNTING BEHAVIOR

1. **Receipt ≠ Sales**:

   ```typescript
   // CORRECT: Receipt only records money IN
   // Invoice already created revenue entry
   ```

   ✅ No duplicate revenue recognition

2. **Strict CREDIT Rejection**:

   ```typescript
   if (paymentMethod === 'CREDIT') {
     throw Error(
       'CREDIT sales do NOT create receipts. Receipt = actual payment',
     );
   }
   ```

   ✅ Prevents inflating cash collections

3. **Double-Entry Hook**:
   ```typescript
   await tx.financialEntry.create({
     type: 'IN',
     amount: receipt.amount,
     mode: receipt.paymentMethod,
   });
   ```

### ⚠️ GAPS & ISSUES

#### **GAP 1: Invoice Settlement Not Bi-directional**

```
Current: Receipt links to Invoice via linkedInvoiceId
But: Invoice.status is NOT updated based on receipts

Should be:
  Invoice.paidAmount = SUM(receipts.amount)
  Invoice.status = calculateStatus(totalAmount, paidAmount)
```

#### **GAP 2: Partial Receipts Validation Missing**

```typescript
// Should reject over-collection:
if (linkedInvoiceId) {
  const invoice = await getInvoice(linkedInvoiceId);
  const existingReceipts = await getReceiptsForInvoice(invoiceId);
  const totalReceived = sum(existingReceipts.amount) + newReceipt.amount;

  if (totalReceived > invoice.totalAmount) {
    throw Error('Cannot receive more than invoice amount');
  }
}
```

#### **GAP 3: On-Account Receipts Not Clear**

```
receiptType = PAYMENT (what is this?)
Should be: ADVANCE or ON_ACCOUNT
Use case: Customer pays ₹10,000 without specific invoice
Later: Allocate to future invoices
```

#### **GAP 4: Refunds Not Supported**

```
Required for:
- Product returns
- Overpayment corrections
- Sales cancellation

Should have: Receipt with negative amount?
OR: Separate RefundVoucher model?
```

---

## 4️⃣ ACCOUNTING FLOW INTEGRITY

### What CREATES Ledger Entries?

| Event                         | Ledger Entry?   | Reason                                      |
| ----------------------------- | --------------- | ------------------------------------------- |
| **Create Sales Invoice**      | ✅ YES (should) | Dr. Customer / Cr. Revenue + Tax            |
| **Create Purchase Invoice**   | ⚠️ PARTIAL      | Only `FinancialEntry` not true ledger       |
| **Record Payment (Purchase)** | ✅ YES          | Creates `PaymentVoucher` → `FinancialEntry` |
| **Record Receipt (Sales)**    | ✅ YES          | Creates `Receipt` → `FinancialEntry`        |
| **Stock IN (Purchase)**       | ❌ NO           | Should create Inventory ledger              |
| **Stock OUT (Sale/Repair)**   | ✅ YES          | Creates `StockLedger` type=OUT              |
| **Expense Voucher**           | ✅ YES          | `PaymentVoucher` → `FinancialEntry`         |

### What MUST NOT Create Ledger Entries?

| Event                       | Should Create? | Current Status                                  |
| --------------------------- | -------------- | ----------------------------------------------- |
| **Save Draft Invoice**      | ❌ NO          | ✅ CORRECT (status=DRAFT excluded from reports) |
| **Create Quotation**        | ❌ NO          | ✅ CORRECT (separate model)                     |
| **Job Card Creation**       | ❌ NO          | ✅ CORRECT (only invoice creates entry)         |
| **Product Master Updates**  | ❌ NO          | ✅ CORRECT                                      |
| **Supplier Master Updates** | ❌ NO          | ✅ CORRECT                                      |

### Double-Entry Preservation Check

**Current Model**: `FinancialEntry`

```prisma
{
  type: 'IN' | 'OUT'   // ⚠️ Single-sided entry
  amount: Int
  mode: PaymentMode
  referenceType: 'SALE' | 'PURCHASE' | 'VOUCHER' | 'RECEIPT'
  referenceId: String
}
```

**❌ CRITICAL ISSUE**: Not true double-entry

- Only records money movement (Cash/Bank side)
- Does NOT record contra accounts (Revenue, Expense, Payables, Receivables)

**Should Be**: Journal Entry Model

```prisma
model JournalEntry {
  id: String
  date: DateTime
  narration: String
  lines: JournalLine[]  // Must have Dr = Cr
}

model JournalLine {
  journalId: String
  ledgerAccountId: String  // FK to Chart of Accounts
  debit: Int
  credit: Int
  // debit + credit for all lines must balance
}
```

**Reconciliation Gap**:

```
FinancialEntry shows: Cash IN = ₹50,000
But cannot answer:
  - How much is Revenue vs Advance?
  - How much is Taxable vs Tax?
  - What is outstanding receivable?
```

---

## 5️⃣ REPORTS ANALYSIS

### Currently Implemented

#### ✅ Owner Dashboard

- Sales Paid (from Receipts)
- Sales Credit (Invoices - Receipts)
- Total Purchases
- Total Expenses (Vouchers)
- Net Cash Flow (FinancialEntry IN - OUT)
- Pending Receivables/Payables

**Assessment**: Good operational KPIs but not compliance-ready

#### ✅ Sales Report

- Filters: date range, shop, customer
- Shows: invoice#, customer, amount, profit (if cost available)
- Excludes: VOIDED invoices

**Gap**: No GST breakup, no B2B vs B2C segregation

#### ✅ Purchase Report

- Filters: date range, shop, supplier
- Shows: invoice#, supplier, amounts, outstanding

**Gap**: No ITC summary, no HSN-wise aggregation

#### ✅ Inventory Report

- Current stock balances (quantity & value)
- Low stock alerts

**Gap**: No stock valuation method clarity (FIFO? WAC?)

#### ✅ Profit Summary

- Revenue vs Cost (uses StockLedger costPerUnit)
- Sales/Repair segregation

**Gap**: Doesn't account for overhead expenses

### ❌ MISSING CRITICAL REPORTS

#### 1️⃣ **Sales Register (GSTR-1 Ready)**

```
Required Fields (per invoice):
- Invoice #, Date
- Customer GSTIN (if B2B)
- Taxable Value
- CGST/SGST/IGST (separate columns)
- Total Invoice Value
- HSN-wise summary
- B2B vs B2C segregation
```

**Current Gap**: Invoice model has `gstAmount` but not split CGST/SGST/IGST  
**Schema Present**: `cgst`, `sgst`, `igst` fields exist ✅  
**Issue**: Reports don't use them

#### 2️⃣ **Purchase Register (GSTR-2 Ready)**

```
Required Fields (per invoice):
- Supplier GSTIN ← MISSING from Purchase model
- Invoice #, Date
- Taxable Value
- ITC Available (CGST/SGST/IGST split)
- HSN-wise ITC summary
```

**Current Gap**: No supplier `gstNumber` in Purchase  
**Blocker**: Cannot generate GSTR-2 without supplier GSTIN

#### 3️⃣ **Outstanding Receivables (Debtor Aging)**

```
Format:
Customer Name | Total Due | 0-30 days | 31-60 days | 61-90 days | >90 days
```

**Current**: Can calculate `Invoice.totalAmount - SUM(Receipt.amount)`  
**Gap**: No aging buckets, no date-based grouping

#### 4️⃣ **Outstanding Payables (Creditor Aging)**

```
Format:
Supplier Name | Total Due | 0-30 days | 31-60 days | 61-90 days | >90 days
```

**Current**: `Purchase.grandTotal - Purchase.paidAmount`  
**Gap**: Same as receivables - no aging logic

#### 5️⃣ **Cash/Bank Summary (Daily Entry)**

```
Date | Opening | Cash IN | Cash OUT | Closing | Bank IN | Bank OUT | Bank Closing
```

**Current**: `FinancialEntry` has data but no mode-wise daily summary endpoint  
**Gap**: No reconciliation with physical cash count

#### 6️⃣ **Trial Balance**

```
Ledger Account | Debit | Credit
```

**Current**: ❌ CANNOT GENERATE - No ledger accounts, no Journal Entries  
**Blocker**: Fundamental design gap (single-entry system)

---

## 6️⃣ DATA QUALITY & LEGACY ISSUES

### Reports Must Handle

#### ✅ Invalid/Legacy Data Exclusion

```typescript
// Current: Reports correctly filter status
where: {
  status: {
    not: 'VOIDED';
  } // Invoices
  status: {
    not: 'CANCELLED';
  } // Purchases
  status: 'ACTIVE'; // Receipts, Vouchers
}
```

#### ⚠️ Missing Snapshot Data

```
Issue: Stock cost calculation uses ShopProduct.avgCost
Problem: If avgCost is NULL, profit cannot be calculated

Solution Needed:
- StockLedger.costPerUnit should NEVER be null
- Enforce at insertion time
- Backfill legacy data with reasonable estimate
```

#### ⚠️ Backdated Entries

```
Scenario: User creates invoice with past date
Impact on:
- Sequential numbering (out of order)
- Period reports (retrospective changes)
- GST returns (filed vs actual)

Control Needed:
- Allow backdate only within current month
- Require approval for previous periods
- Lock closed financial periods
```

---

## 7️⃣ ERP MATURITY ASSESSMENT

### Scalability to Other Retail Types

| Retail Type           | Current Fit | Changes Required                         |
| --------------------- | ----------- | ---------------------------------------- |
| **Mobile Shop**       | ✅ 90%      | Minor (current use case)                 |
| **Electronics Store** | ✅ 85%      | Add warranty tracking                    |
| **Apparel Store**     | ⚠️ 60%      | Size/Color variants, Barcode scanning    |
| **Grocery Store**     | ⚠️ 50%      | Batch/Expiry dates, Weight-based pricing |
| **Restaurant**        | ❌ 30%      | Table management, Recipe costing         |
| **Service Business**  | ⚠️ 40%      | Time tracking, Billable hours            |

**Core Assumption**: Product-based retail with inventory  
**Portable Components**:

- Party (Customer/Supplier) management ✅
- Purchase Invoice flow ✅
- Payment/Receipt vouchers ✅
- GST calculation logic ✅

**Non-Portable**:

- JobCard (repair-specific) ❌
- IMEI tracking (mobile-specific) ❌

### India-Specific vs Universal

#### 🇮🇳 India-Specific (Permanent for Indian Market)

- GST calculation (CGST/SGST/IGST) ✅ KEEP
- HSN/SAC codes ✅ KEEP
- GSTIN validation ✅ KEEP
- Financial Year (April-March) ✅ KEEP
- State-based tax routing ✅ KEEP

#### 🌍 Universal (Already Abstracted)

- Multi-tenant architecture ✅
- Multi-shop support ✅
- Multi-currency (currency field present) ✅
- Paisa-based storage (can adapt to cents/paise) ✅
- Payment modes (CASH/CARD/UPI) ⚠️ UPI is India-specific

#### Should Parameterize

```typescript
// Make tax system pluggable:
interface TaxCalculator {
  calculate(amount, context): TaxBreakup
}

// Implementations:
- GSTCalculator (India)
- VATCalculator (EU/UK)
- SalesTaxCalculator (US)
- NoTaxCalculator (exempt regions)
```

---

## 8️⃣ CRITICAL FIXES REQUIRED (Priority Order)

### 🔴 BLOCKER (Cannot operate without)

1. **Add Supplier GSTIN to Purchase Model**

   ```prisma
   model Purchase {
     supplierGstin String?  // Required for B2B ITC
   }
   ```

   **Impact**: Without this, GSTR-2 reporting impossible

2. **Atomic Purchase → StockLedger Integration**
   - Make stock-in automatic on purchase submission
   - Prevents inventory-accounting mismatch

3. **Invoice → Receipt Reconciliation**
   - Update `Invoice.status` based on receipt amounts
   - Add `Invoice.paidAmount` tracking

### 🟠 HIGH PRIORITY (Required for compliance)

4. **GSTR-1 Sales Register Report**
   - Use existing `cgst/sgst/igst` fields
   - Add B2B vs B2C segregation
   - HSN-wise summary

5. **GSTR-2 Purchase Register Report**
   - Depends on #1 (supplier GSTIN)
   - ITC availability calculation

6. **Sequential Numbering for Vouchers**
   - Change from timestamp-based to: "PV-FY26-0001"
   - Add year-wise reset logic

7. **Outstanding Reports with Aging**
   - Receivables aging (30/60/90 days)
   - Payables aging

### 🟡 MEDIUM PRIORITY (Improves accuracy)

8. **Journal Entry System (Double-Entry)**
   - Introduce `JournalEntry` + `JournalLine` models
   - Chart of Accounts
   - Replace `FinancialEntry` with proper ledger posting

9. **Purchase Return Module**
   - `PurchaseReturn` model
   - ITC reversal logic
   - Stock adjustment

10. **Advance Payment Handling**
    - ADVANCE voucher type
    - Allocation to future invoices
    - Reconciliation reports

### 🟢 LOW PRIORITY (Nice to have)

11. **Period Lock Mechanism**
    - Lock closed months from editing
    - Requires approval for backdated entries

12. **Bank Reconciliation Module**
    - Match `FinancialEntry` (mode=BANK) with bank statement
    - Flag discrepancies

13. **Expense Budget Tracking**
    - Set monthly budgets per category
    - Variance reports

---

## 9️⃣ DO / DO NOT RULES

### ✅ DO (Accounting Best Practices)

1. **DO separate Invoice from Payment**
   - Invoice = Revenue recognition / Liability recognition
   - Payment/Receipt = Cash movement
   - Never conflate the two

2. **DO enforce sequential numbering**
   - Per document type, per shop, per financial year
   - Critical for audit trail

3. **DO capture source documents**
   - Purchase: Supplier's invoice #
   - Payment: Bank reference, Cheque #
   - Never rely on system-generated IDs alone

4. **DO maintain cost history**
   - StockLedger should capture costPerUnit at time of entry
   - Enables accurate profit calculation even after price changes

5. **DO validate GST structure**

   ```typescript
   // Intra-state: CGST + SGST = Total GST
   // Inter-state: IGST = Total GST
   if (shopState === customerState) {
     assert(cgst + sgst === gstAmount);
     assert(igst === 0);
   } else {
     assert(igst === gstAmount);
     assert(cgst === 0 && sgst === 0);
   }
   ```

6. **DO preserve audit trail**
   - Every modification should log: who, when, what, why
   - Use `AuditLog` table or soft-delete with history

### ❌ DO NOT (Common ERP Mistakes)

1. **DO NOT allow CREDIT to create cash entries**

   ```typescript
   // ❌ WRONG:
   if (paymentMode === 'CREDIT') {
     createReceipt({ amount }); // NO! This inflates cash
   }

   // ✅ CORRECT:
   if (paymentMode === 'CREDIT') {
     invoice.status = 'CREDIT'; // Mark as unpaid
     // Receipt created only when actual payment received
   }
   ```

2. **DO NOT double-count GST Input Credit**

   ```typescript
   // ❌ WRONG: Claiming ITC without matching Purchase invoice
   // ✅ CORRECT: ITC only on invoices with:
   //   - Valid supplier GSTIN
   //   - Goods received (stock updated)
   //   - Payment made (if composition scheme)
   ```

3. **DO NOT modify historical periods without controls**

   ```typescript
   // ❌ WRONG: Allow free editing of closed months
   // ✅ CORRECT: Lock periods after GST filing
   if (invoiceDate < lastFiledGSTRPeriod) {
     throw Error('Period locked - contact admin');
   }
   ```

4. **DO NOT bypass stock ledger**

   ```typescript
   // ❌ WRONG: Manual stock adjustments without logging
   // ✅ CORRECT: Every stock change via StockLedger
   //   - Purchase IN, Sale OUT, Damage, Return - all recorded
   ```

5. **DO NOT use revenue account for advances**

   ```typescript
   // ❌ WRONG:
   onAdvanceReceipt: () => {
     revenue += advance; // Premature revenue recognition
   };

   // ✅ CORRECT:
   onAdvanceReceipt: () => {
     advanceFromCustomers += advance; // Liability account
   };
   onInvoiceGeneration: () => {
     advanceFromCustomers -= allocatedAdvance;
     revenue += invoiceAmount;
   };
   ```

6. **DO NOT allow negative stock without investigation**
   ```typescript
   // ❌ WRONG: Allow sale when stock = 0
   // ✅ CORRECT: Either:
   //   - Block sale (strict mode)
   //   - Allow but flag for review (retail mode)
   //   - Auto-create negative stock adjustment (with approval)
   ```

---

## 🔟 FINAL READINESS VERDICT

### Module-Wise Score

| Module               | Functional | Accounting Correct | Compliance Ready | Score   |
| -------------------- | ---------- | ------------------ | ---------------- | ------- |
| **Sales (Invoice)**  | ✅ 95%     | ✅ 90%             | ⚠️ 70%           | **85%** |
| **Purchase**         | ✅ 90%     | ⚠️ 70%             | ⚠️ 60%           | **73%** |
| **Payment Voucher**  | ✅ 95%     | ✅ 85%             | ✅ 80%           | **87%** |
| **Receipt Voucher**  | ✅ 95%     | ✅ 85%             | ✅ 80%           | **87%** |
| **Inventory**        | ✅ 85%     | ⚠️ 60%             | N/A              | **73%** |
| **Reports**          | ⚠️ 60%     | ⚠️ 50%             | ❌ 30%           | **47%** |
| **Accounting Spine** | ⚠️ 40%     | ⚠️ 40%             | ❌ 20%           | **33%** |

### Overall System Maturity: **68% (C+ Grade)**

### Recommendation Tiers

#### TIER 1: Deploy with Manual Workarounds (Current State)

- ✅ Can operate mobile shop daily operations
- ⚠️ Requires manual GST return preparation (export to Excel)
- ⚠️ Requires separate accounting software for full books
- ❌ Cannot scale to multi-location or franchise

#### TIER 2: Fix Critical Gaps (3-4 weeks effort)

- Add Supplier GSTIN field + validation
- Implement GSTR-1, GSTR-2 reports
- Auto-link Purchase → Stock
- Outstanding aging reports
- **Result**: Self-sufficient for GST compliance

#### TIER 3: Full ERP Grade (8-12 weeks effort)

- Implement Journal Entry system (double-entry)
- Chart of Accounts
- Trial Balance, P&L, Balance Sheet
- Period lock controls
- Bank reconciliation
- **Result**: Replace Tally/SAP for small businesses

### Risk Mitigation

**Current Risk Level**: 🟡 MEDIUM

- Business can operate but with manual gaps
- GST compliance requires external tools
- Audit trail gaps (can be questioned by tax authorities)

**Post Tier-2 Risk**: 🟢 LOW

- Fully GST compliant
- Automated reports for filing
- Complete audit trail

**Post Tier-3 Risk**: 🔵 NONE

- Enterprise-grade accounting
- Ready for statutory audits
- Scalable to complex business models

---

## 📚 APPENDIX: KEY CONCEPTS

### Input Tax Credit (ITC)

- Tax paid on purchases can be claimed as credit against sales tax
- **Eligible only if**:
  - Supplier has valid GSTIN
  - Goods received (stock updated)
  - Invoice within time limit (180 days for Sec 16(4))
- **Critical**: Supplier GSTIN field is MANDATORY for ITC

### B2B vs B2C Sales

- **B2B**: Customer has GSTIN → Detailed invoice in GSTR-1
- **B2C**: No GSTIN → Consolidated summary in GSTR-1
- **Current System**: Doesn't segregate (all treated as B2C)

### CGST/SGST/IGST Rules

```
If Shop State = Customer State:
  CGST (9%) + SGST (9%) = 18%
  → Goes to Central + State govt

If Shop State ≠ Customer State:
  IGST (18%)
  → Fully to Central govt (redistributed later)
```

### Financial Year (India)

- April 1 to March 31 (not calendar year)
- Document numbering should reset per FY: "INV-FY26-0001"
- GST returns filed per FY

### Paisa Storage Convention

- Store amounts as integers in smallest currency unit
- ₹100.50 → 10050 paisa
- **Avoids**: Floating-point arithmetic errors
- **Critical**: All calculations in paisa, display in rupees

---

## ✅ CONCLUSION

**Accounting Spine Status**: Foundational architecture present, critical gaps identified

**Can Go Live?**: ✅ YES (for small-scale operations with manual accounting backup)

**Should Go Live?**: ⚠️ CONDITIONAL (complete Tier-2 fixes first for confidence)

**Competitive Position**:

- vs Manual Billing: 🟢 MUCH BETTER (automation, inventory, GST aware)
- vs Excel: 🟢 MUCH BETTER (relational integrity, audit trail)
- vs Tally: 🟡 COMPARABLE (after Tier-2 fixes)
- vs SAP/Oracle: ⚠️ NOT YET (needs Tier-3 double-entry system)

**Next Steps**:

1. Prioritize Supplier GSTIN field addition (1 day)
2. Build GSTR-1 report (3 days)
3. Implement Purchase → Stock auto-link (2 days)
4. Test end-to-end with dummy GST filing (1 day)
5. Deploy to pilot shop (with manual backup for 1 month)
6. Iterate based on CA feedback

**CA Sign-Off Required On**:

- GST report format (match with GSTR-1/2 JSON schema)
- Outstanding calculation logic
- Period lock rules
- ITC eligibility criteria

---

**Document Version**: 1.0  
**Reviewer**: CA + ERP Architect  
**Status**: Ready for Implementation Planning
