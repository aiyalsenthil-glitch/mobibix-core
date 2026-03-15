# Loyalty Points System - GST-Safe Implementation Specification

## Executive Summary

**System Type:** Configurable Per-Tenant Loyalty with Ledger-Based Balance  
**Compliance:** Indian GST-safe (redemption as discount line item)  
**Accounting Method:** Accrual on PAID status only  
**Storage:** Pure ledger (remove direct balance field)

---

## Problems Solved

1. ✅ **No more direct balance field** (eliminates sync issues)
2. ✅ **Points earned only on PAID invoices** (accrual accounting)
3. ✅ **Configurable per tenant** (earn rate, redemption %, expiry)
4. ✅ **GST-safe redemption** (discount line, doesn't alter tax base incorrectly)
5. ✅ **Audit trail for manual adjustments** (createdBy tracking)
6. ✅ **Automatic reversal on cancellation** (maintains integrity)
7. ✅ **Idempotency protection** (no double-earn on duplicate events)

---

## Database Schema

### 1. LoyaltyConfig (New Model)

```prisma
model LoyaltyConfig {
  id        String   @id @default(cuid())
  tenantId  String   @unique // One config per tenant

  // Feature Toggle
  isEnabled Boolean  @default(false)

  // Earning Rules
  earnAmountPerPoint Int      @default(10000) // ₹100 in paise = 1 point
  pointsPerEarnUnit  Int      @default(1)     // How many points per unit

  // Redemption Rules
  pointValueInRupees Float    @default(1.0)   // 1 point = ₹1
  maxRedeemPercent   Int      @default(50)    // Max 50% of invoice can be loyalty

  // Category Restrictions
  allowOnRepairs     Boolean  @default(true)
  allowOnAccessories Boolean  @default(true)
  allowOnServices    Boolean  @default(false) // Services usually excluded

  // Expiry
  expiryDays         Int?     // null = never expires

  // Admin Controls
  allowManualAdjustment Boolean @default(false)
  minInvoiceForEarn     Int?   // Minimum invoice amount (paise) to earn points

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  tenant     Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}
```

**Example Configuration:**

```typescript
// Aggressive loyalty: 1 point per ₹50
{
  earnAmountPerPoint: 5000, // ₹50 in paise
  pointsPerEarnUnit: 1,
  pointValueInRupees: 0.5,  // 1 point = ₹0.50 discount
  maxRedeemPercent: 30      // Max 30% discount
}

// Conservative loyalty: 1 point per ₹200
{
  earnAmountPerPoint: 20000, // ₹200 in paise
  pointsPerEarnUnit: 1,
  pointValueInRupees: 2.0,   // 1 point = ₹2 discount
  maxRedeemPercent: 50       // Max 50% discount
}
```

---

### 2. LoyaltyTransaction (Enhanced)

```prisma
model LoyaltyTransaction {
  id          String        @id @default(cuid())
  tenantId    String
  customerId  String

  // Transaction Details
  points      Int           // Positive = earn, Negative = redeem/expire/reverse
  type        LoyaltyTransactionType // EARN, REDEEM, EXPIRE, MANUAL, REVERSAL
  source      LoyaltySource // INVOICE, MANUAL, PROMOTION, REFERRAL, REDEMPTION

  // Audit Trail
  invoiceId   String?       // Link to invoice (for earn/redeem)
  reversalOf  String?       // Points to original transaction ID if reversal

  // Metadata
  note        String?
  createdBy   String?       // User ID for manual adjustments
  createdAt   DateTime      @default(now())

  // Relations
  customer    Party         @relation(fields: [customerId], references: [id], onDelete: Cascade)
  tenant      Tenant        @relation(fields: [tenantId], references: [id])

  @@index([tenantId])
  @@index([customerId])
  @@index([invoiceId])      // NEW: Critical for reversal lookups
  @@index([reversalOf])     // NEW: Track reversal chains
  @@index([createdAt])
}

enum LoyaltyTransactionType {
  EARN       // Points earned (invoice PAID)
  REDEEM     // Points redeemed (invoice creation with loyalty discount)
  EXPIRE     // Points expired (cron job)
  MANUAL     // Manual adjustment by admin
  REVERSAL   // Reverse previous transaction (cancel/void)
}
```

**Key Changes:**

- ✅ Added `type` field (more specific than source)
- ✅ Added `reversalOf` (track reversal chains)
- ✅ Added `createdBy` (audit manual adjustments)
- ✅ Added `invoiceId` index (performance for reversals)

---

### 3. Party Model (Remove Direct Balance)

```prisma
model Party {
  // ... existing fields ...

  // REMOVE THIS:
  // loyaltyPoints Int @default(0) ❌

  // Balance is now ALWAYS calculated:
  // SELECT SUM(points) FROM LoyaltyTransaction WHERE customerId = ?
}
```

**Migration Strategy:**

1. Calculate current balance from existing LoyaltyTransaction
2. If Party.loyaltyPoints != calculated balance, create MANUAL adjustment
3. Drop Party.loyaltyPoints column

---

## Business Logic

## Paid Invoice Immutability Policy

**Decision:** Do NOT edit paid invoices.

**If date/party is wrong:**

1. Void/credit the original invoice.
2. Create a new invoice with correct date/party.

**Allowed changes after PAID (low risk):**

- Internal notes
- Optional reference fields (PO number, remark)
- Non-financial print footer text

**Blocked changes after PAID (high risk):**

- Customer/party change
- Invoice date change
- Items, prices, taxes, discounts
- Payment mode / amounts

**Reason:** GST period reporting, place-of-supply, loyalty ledger, and stock reconciliation all depend on paid invoice immutability.

### Earning Points Flow

```
1. Invoice created (status = UNPAID)
   → No points yet

2. Payment recorded → Invoice.status = PAID
   → Trigger: eareLoyaltyPoints()

3. eareLoyaltyPoints():
   a. Check if config.isEnabled
   b. Check if invoice amount >= minInvoiceForEarn
   c. Check if already earned (idempotency: LoyaltyTransaction exists with invoiceId + type=EARN)
   d. Calculate points: floor((invoice.subTotal - discounts) / earnAmountPerPoint) * pointsPerEarnUnit
   e. Create LoyaltyTransaction (type=EARN, source=INVOICE, invoiceId=xxx, note="Earned X points")
```

**GST Safety Rule:**

- Base calculation uses `invoice.subTotal` (BEFORE GST)
- Never use `invoice.totalAmount` (includes GST) → would give too many points

**Idempotency:**

```typescript
const existing = await prisma.loyaltyTransaction.findFirst({
  where: {
    invoiceId,
    type: 'EARN',
    customerId,
  },
});
if (existing) return; // Already earned
```

---

### Redemption Flow (GST-Safe)

**Invoice Creation with Loyalty:**

```typescript
// 1. Frontend calculates max redeemable
const config = await getLoyaltyConfig(tenantId);
const balance = await getCustomerLoyaltyBalance(customerId);
const maxRedeemPoints = Math.floor(
  (invoice.subTotal * config.maxRedeemPercent) /
    100 /
    config.pointValueInRupees,
);
const redeemablePoints = Math.min(balance, maxRedeemPoints);

// 2. User selects points to redeem (e.g., 50 points)
const redeemPoints = 50;
const discountAmount = redeemPoints * config.pointValueInRupees; // ₹50

// 3. Create invoice with loyalty line item
const items = [
  // ... regular items ...
  {
    shopProductId: null, // Special: No product
    name: 'Loyalty Redemption',
    quantity: 1,
    rate: -discountAmount, // NEGATIVE amount
    gstRate: 0, // No GST on discount
    hsnCode: '9997', // SAC code for discounts
  },
];

// 4. Calculate invoice totals
//    Item 1: iPhone ₹50,000 + GST 18% = ₹59,000
//    Item 2: Loyalty Discount -₹50
//    Subtotal: ₹49,950
//    GST (18% of ₹49,950): ₹8,991
//    Total: ₹58,941

// 5. Create redemption transaction (BEFORE invoice is paid)
await prisma.loyaltyTransaction.create({
  data: {
    tenantId,
    customerId,
    points: -redeemPoints, // NEGATIVE
    type: 'REDEEM',
    source: 'REDEMPTION',
    invoiceId: invoice.id,
    note: `Redeemed ${redeemPoints} points for ₹${discountAmount} discount`,
  },
});
```

**GST Compliance:**

- ✅ Loyalty discount reduces TAXABLE VALUE correctly
- ✅ GST calculated on (subTotal - loyalty discount)
- ✅ Discount shown as separate line item (audit trail)
- ✅ No manipulation of GST rates

**Invoice JSON Structure:**

```json
{
  "items": [
    {
      "name": "iPhone 14",
      "quantity": 1,
      "rate": 50000,
      "taxableValue": 50000,
      "gstRate": 18,
      "gstAmount": 9000,
      "total": 59000
    },
    {
      "name": "Loyalty Redemption",
      "quantity": 1,
      "rate": -50,
      "taxableValue": -50,
      "gstRate": 0,
      "gstAmount": 0,
      "total": -50
    }
  ],
  "subTotal": 49950,
  "totalGST": 8991,
  "grandTotal": 58941
}
```

---

### Cancellation & Reversal Flow

**Invoice Voided/Cancelled:**

```typescript
async handleInvoiceCancellation(invoiceId: string) {
  // 1. Find all loyalty transactions for this invoice
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: { invoiceId }
  });

  // 2. Reverse each transaction
  for (const txn of transactions) {
    if (txn.type === 'EARN') {
      // Customer earned 100 points → Reverse with -100
      await prisma.loyaltyTransaction.create({
        data: {
          tenantId: txn.tenantId,
          customerId: txn.customerId,
          points: -txn.points,          // Negative of original
          type: 'REVERSAL',
          source: txn.source,
          invoiceId,
          reversalOf: txn.id,            // Link to original
          note: `Reversed: Invoice cancelled`
        }
      });
    } else if (txn.type === 'REDEEM') {
      // Customer redeemed 50 points → Restore with +50
      await prisma.loyaltyTransaction.create({
        data: {
          tenantId: txn.tenantId,
          customerId: txn.customerId,
          points: Math.abs(txn.points),  // Positive (restore)
          type: 'REVERSAL',
          source: txn.source,
          invoiceId,
          reversalOf: txn.id,
          note: `Reversed: Invoice cancelled`
        }
      });
    }
  }
}
```

**Invoice Edit After Payment:**

- ❌ BLOCKED: Cannot edit paid invoices (existing rule)
- Workaround: Void old invoice → Create new invoice

---

## Edge Case Protection

### 1. Double Payment Prevention

```typescript
// In recordPayment() or webhook handler
if (invoice.status === 'PAID') {
  // Already paid, check if points already earned
  const existing = await prisma.loyaltyTransaction.findFirst({
    where: {
      invoiceId: invoice.id,
      type: 'EARN',
    },
  });
  if (existing) return; // Idempotent
}
```

### 2. Race Condition Protection

```typescript
// Use transaction with SELECT FOR UPDATE
await prisma.$transaction(async (tx) => {
  // Lock customer record
  await tx.party.findUnique({
    where: { id: customerId },
    // Prisma doesn't support FOR UPDATE directly
    // But transaction isolation prevents race
  });

  // Check balance
  const balance = await getBalance(customerId, tx);

  // Redeem if sufficient
  if (balance >= requestedPoints) {
    await tx.loyaltyTransaction.create({...});
  }
});
```

### 3. Cross-Tenant Leakage Prevention

```typescript
// Always include tenantId in WHERE clause
const config = await prisma.loyaltyConfig.findUnique({
  where: { tenantId }, // Enforces isolation
});

const balance = await prisma.loyaltyTransaction.aggregate({
  where: {
    tenantId, // CRITICAL
    customerId,
  },
  _sum: { points: true },
});
```

### 4. Partial Payments

```typescript
// Only award points when FULLY PAID
if (invoice.status === 'PAID' && invoice.paidAmount >= invoice.totalAmount) {
  await awardLoyaltyPoints(invoice);
}

// Partial payment: Wait for full payment
```

### 5. Refunds

```typescript
// If invoice paid → points earned → then refund issued:
await handleInvoiceCancellation(invoiceId); // Reverses points
```

### 6. Manual Override Abuse

```typescript
// In LoyaltyService.createManualAdjustment()
if (!config.allowManualAdjustment) {
  throw new ForbiddenException('Manual adjustments disabled');
}

// Log admin action
await prisma.loyaltyTransaction.create({
  data: {
    ...
    type: 'MANUAL',
    createdBy: userId,  // Audit trail
    note: `Manual adjustment by ${adminName}: ${reason}`
  }
});

// Alert owner
await sendAlert(tenantId, {
  message: `${adminName} manually adjusted ${customerName}'s loyalty: ${points} points`
});
```

---

## Service Layer Pseudocode

### calculateEarnedPoints()

```typescript
async calculateEarnedPoints(
  tenantId: string,
  customerId: string,
  invoice: Invoice
): Promise<number> {
  // 1. Get config
  const config = await prisma.loyaltyConfig.findUnique({
    where: { tenantId }
  });

  if (!config || !config.isEnabled) return 0;

  // 2. Check minimum invoice amount
  if (config.minInvoiceForEarn && invoice.subTotal < config.minInvoiceForEarn) {
    return 0;
  }

  // 3. Check invoice type restrictions
  if (invoice.invoiceType === 'REPAIR' && !config.allowOnRepairs) {
    return 0;
  }

  // 4. Calculate base amount (subTotal - any discounts BEFORE loyalty)
  // GST-safe: Use taxable amount, not total
  const baseAmount = invoice.subTotal; // Already in paise

  // 5. Calculate points
  const earnUnits = Math.floor(baseAmount / config.earnAmountPerPoint);
  const points = earnUnits * config.pointsPerEarnUnit;

  return points;
}
```

### awardLoyaltyPoints()

```typescript
async awardLoyaltyPoints(
  tenantId: string,
  invoice: Invoice
): Promise<void> {
  // Idempotency check
  const existing = await prisma.loyaltyTransaction.findFirst({
    where: {
      tenantId,
      invoiceId: invoice.id,
      type: 'EARN'
    }
  });

  if (existing) {
    this.logger.warn(`Loyalty already earned for invoice ${invoice.id}`);
    return;
  }

  // Calculate points
  const points = await this.calculateEarnedPoints(
    tenantId,
    invoice.customerId,
    invoice
  );

  if (points <= 0) return;

  // Create transaction
  await prisma.loyaltyTransaction.create({
    data: {
      tenantId,
      customerId: invoice.customerId,
      points,
      type: 'EARN',
      source: 'INVOICE',
      invoiceId: invoice.id,
      note: `Earned ${points} points from invoice ${invoice.invoiceNumber} (₹${invoice.subTotal / 100})`
    }
  });

  this.logger.log(`Awarded ${points} points to customer ${invoice.customerId}`);
}
```

### redeemPoints()

```typescript
async redeemPoints(
  tenantId: string,
  customerId: string,
  points: number,
  invoiceId: string
): Promise<{ success: boolean; discount: number }> {
  // 1. Get config
  const config = await prisma.loyaltyConfig.findUnique({
    where: { tenantId }
  });

  if (!config || !config.isEnabled) {
    throw new BadRequestException('Loyalty program not enabled');
  }

  // 2. Get current balance
  const balance = await this.getCustomerBalance(tenantId, customerId);

  if (balance < points) {
    throw new BadRequestException(`Insufficient points. Available: ${balance}`);
  }

  // 3. Calculate discount
  const discountRupees = points * config.pointValueInRupees;
  const discountPaise = Math.round(discountRupees * 100);

  // 4. Validate against max redeem percent (caller must check)
  // This is enforced at invoice creation level

  // 5. Create redemption transaction
  await prisma.loyaltyTransaction.create({
    data: {
      tenantId,
      customerId,
      points: -points,  // NEGATIVE
      type: 'REDEEM',
      source: 'REDEMPTION',
      invoiceId,
      note: `Redeemed ${points} points for ₹${discountRupees} discount`
    }
  });

  return {
    success: true,
    discount: discountPaise
  };
}
```

### reversePointsOnCancel()

```typescript
async reversePointsOnCancel(
  tenantId: string,
  invoiceId: string
): Promise<void> {
  // Find all transactions for this invoice
  const transactions = await prisma.loyaltyTransaction.findMany({
    where: {
      tenantId,
      invoiceId
    }
  });

  if (transactions.length === 0) return;

  // Create reversals
  for (const txn of transactions) {
    // Skip if already reversed
    const existingReversal = await prisma.loyaltyTransaction.findFirst({
      where: { reversalOf: txn.id }
    });

    if (existingReversal) continue;

    // Create reversal with opposite sign
    await prisma.loyaltyTransaction.create({
      data: {
        tenantId: txn.tenantId,
        customerId: txn.customerId,
        points: -txn.points,      // Flip sign
        type: 'REVERSAL',
        source: txn.source,
        invoiceId,
        reversalOf: txn.id,
        note: `Reversal: Invoice ${invoiceId} cancelled`
      }
    });
  }

  this.logger.log(`Reversed ${transactions.length} loyalty transactions for invoice ${invoiceId}`);
}
```

### getCustomerBalance()

```typescript
async getCustomerBalance(
  tenantId: string,
  customerId: string
): Promise<number> {
  const result = await prisma.loyaltyTransaction.aggregate({
    where: {
      tenantId,
      customerId
    },
    _sum: {
      points: true
    }
  });

  return result._sum.points || 0;
}
```

---

## GST-Safe Explanation

### How Loyalty Interacts with Invoice Total

**Scenario: ₹1,00,000 Purchase + 1000 Points Redeemed (₹1000 discount)**

**Without Loyalty:**

```
Item: Mobile Phone
Quantity: 1
Rate: ₹1,00,000
─────────────────────
Subtotal:     ₹1,00,000
GST @ 18%:    ₹18,000
─────────────────────
Total:        ₹1,18,000
```

**With Loyalty (CORRECT - GST-Safe):**

```
Item: Mobile Phone
Quantity: 1
Rate: ₹1,00,000

Item: Loyalty Redemption
Quantity: 1
Rate: -₹1,000
─────────────────────
Subtotal:     ₹99,000    ← Taxable value reduced
GST @ 18%:    ₹17,820    ← GST calculated on ₹99,000
─────────────────────
Total:        ₹1,16,820
```

**GST Compliance:**

- ✅ Taxable value correctly reduced to ₹99,000
- ✅ GST calculated on reduced amount (₹17,820 instead of ₹18,000)
- ✅ Discount shown as separate line item (audit trail)
- ✅ No manipulation of HSN codes or GST rates

**WRONG Approach (DO NOT DO THIS):**

```
Subtotal:     ₹1,00,000
GST @ 18%:    ₹18,000
Total:        ₹1,18,000
Loyalty Discount: -₹1,000  ← WRONG: Reduces final total but not GST base
─────────────────────
Final Total:  ₹1,17,000  ← GST incorrectly charged on full amount
```

### Why Tax Base Remains Correct

**Key Principle:** Loyalty redemption is a **commercial discount**, not a tax exemption.

**Indian GST Law (Section 15):**

- Discounts given **before or at the time of supply** reduce taxable value
- Must be recorded in invoice
- Must be in accordance with normal business practice

**Our Implementation:**

1. Loyalty discount = Line item with negative rate
2. Subtotal calculation includes discount line
3. GST calculated on final subtotal (after discount)
4. ✅ Complies with GST law

**Invoice Print Format:**

```
INVOICE No: MB-2026-0123
Date: 11-Feb-2026

Items:
1. iPhone 15 Pro (128GB)         ₹1,00,000.00
   HSN: 8517
   GST @ 18%                     ₹18,000.00

2. Loyalty Redemption (1000 pts) -₹1,000.00
   SAC: 9997
   GST @ 0%                      ₹0.00

                        ──────────────
Subtotal                         ₹99,000.00
CGST @ 9%                        ₹8,910.00
SGST @ 9%                        ₹8,910.00
                        ──────────────
Grand Total                      ₹1,16,820.00

Loyalty Balance After: 0 points
```

---

## Final Verdict: Is System Safe?

### ✅ **YES - If Implemented Correctly**

**Accounting Safe:**

- ✅ Accrual basis (points earned only when PAID)
- ✅ Matching principle (redemption matched to invoice)
- ✅ Audit trail (immutable ledger)
- ✅ Reversal mechanism (maintains integrity)

**GST Safe:**

- ✅ Discount reduces taxable value correctly
- ✅ No manipulation of tax rates or HSN codes
- ✅ Separate line item (transparent)
- ✅ Complies with Section 15 of CGST Act

**Technical Safe:**

- ✅ Idempotency (no duplicate earning)
- ✅ Transaction isolation (race condition protection)
- ✅ Cross-tenant isolation (tenant ID checks)
- ✅ Audit trail (manual adjustments tracked)

---

## Top 5 Mistakes to Avoid

### 1. ❌ **Reducing Total Without Reducing GST Base**

**WRONG:**

```typescript
invoice.totalAmount = invoice.totalAmount - loyaltyDiscount;
// GST already calculated on full amount!
```

**CORRECT:**

```typescript
// Add loyalty as negative line item BEFORE calculating GST
items.push({
  name: 'Loyalty Redemption',
  rate: -loyaltyDiscount,
  gstRate: 0,
});
// Then calculate GST on new subtotal
```

### 2. ❌ **Earning Points on Invoice Creation (Not Payment)**

**WRONG:**

```typescript
await prisma.invoice.create({...});
await awardLoyaltyPoints(invoice); // Points given before payment!
```

**CORRECT:**

```typescript
// In recordPayment() or webhook handler
if (invoice.status === 'PAID') {
  await awardLoyaltyPoints(invoice);
}
```

### 3. ❌ **Using Direct Balance Field Instead of Ledger**

**WRONG:**

```typescript
await prisma.party.update({
  where: { id: customerId },
  data: {
    loyaltyPoints: { increment: points }, // Race condition risk!
  },
});
```

**CORRECT:**

```typescript
// Balance is ALWAYS calculated from ledger
const balance = await prisma.loyaltyTransaction.aggregate({
  where: { customerId },
  _sum: { points: true },
});
```

### 4. ❌ **Forgetting to Reverse Points on Cancellation**

**WRONG:**

```typescript
await prisma.invoice.update({
  where: { id },
  data: { status: 'VOIDED' },
});
// Points still in customer balance!
```

**CORRECT:**

```typescript
await prisma.$transaction(async (tx) => {
  await tx.invoice.update({
    where: { id },
    data: { status: 'VOIDED' },
  });
  await reversePointsOnCancel(tenantId, id);
});
```

### 5. ❌ **No Idempotency Protection**

**WRONG:**

```typescript
// Webhook called twice → Double points!
await awardLoyaltyPoints(invoice);
```

**CORRECT:**

```typescript
const existing = await prisma.loyaltyTransaction.findFirst({
  where: { invoiceId, type: 'EARN' },
});
if (existing) return; // Already processed
```

---

## Implementation Checklist

- [ ] Create LoyaltyConfig model & migration
- [ ] Update LoyaltyTransaction model (add type, reversalOf, createdBy)
- [ ] Migrate existing Party.loyaltyPoints to ledger
- [ ] Create LoyaltyService with methods above
- [ ] Hook into InvoicePaymentService.recordPayment()
- [ ] Add loyalty redemption to invoice creation flow
- [ ] Implement voiding reversal logic
- [ ] Add loyalty config UI (admin panel)
- [ ] Write integration tests (earn, redeem, cancel)
- [ ] Document GST compliance for accountants
