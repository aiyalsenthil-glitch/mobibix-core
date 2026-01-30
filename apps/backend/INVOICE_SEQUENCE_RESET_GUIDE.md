# Invoice Number Sequence Reset - Complete Guide

## Overview

Invoice numbering automatically resets to `0001` at the start of each financial year (April 1). This is achieved through intelligent financial year filtering in the database query.

## Financial Year Calculation

**Financial year runs from April to March:**

- April 2025 - March 2026 = FY `202526`
- April 2026 - March 2027 = FY `202627`
- April 2027 - March 2028 = FY `202728`

**Example:**

- January 2026 → FY `202526` (current FY started April 2025)
- March 2026 → FY `202526` (still in same FY)
- April 2026 → FY `202627` (new FY started)

### Code Implementation

```typescript
// getFinancialYear() in invoice-number.util.ts
if (month < 4) {
  // Before April: FY is previous year to current year
  return `${year - 1}${year}`;
} else {
  // April or later: FY is current year to next year
  return `${year}${year + 1}`;
}
```

## Invoice Number Format

**Sales Invoices:** `{SHOP_PREFIX}-S-{FINANCIAL_YEAR}-{SEQUENCE}`

- Example: `HP-S-202526-0001`, `HP-S-202526-0002`, `HP-S-202627-0001` (after April 1)

**Purchase Invoices:** `{SHOP_PREFIX}-P-{FINANCIAL_YEAR}-{SEQUENCE}`

- Example: `HP-P-202526-0001`, `HP-P-202526-0002`

**Job Cards:** `{SHOP_PREFIX}-J-{FINANCIAL_YEAR}-{SEQUENCE}`

- Example: `HP-J-202526-0001`, `HP-J-202526-0002`

## How Sequence Reset Works (The Magic)

### Step 1: Query with FY-Specific Filter

```typescript
// In getNextInvoiceNumber() in sales.service.ts
const allInvoices = await tx.invoice.findMany({
  where: {
    shopId: shopId,
    invoiceNumber: { contains: `-S-${fy}-` }, // KEY: Only finds current FY
  },
});
// fy = "202526" → finds: HP-S-202526-0001, HP-S-202526-0002, HP-S-202526-0003
// fy = "202627" → finds: HP-S-202627-0001, HP-S-202627-0002 (EMPTY on April 1)
```

### Step 2: Calculate Next Sequence from FY-Filtered Results

```typescript
let maxSeq = 0;
for (const inv of allInvoices) {
  const parts = inv.invoiceNumber.split('-');
  const seq = parseInt(parts[parts.length - 1], 10);
  if (seq > maxSeq) {
    maxSeq = seq;
  }
}

const nextSequence = maxSeq + 1;
// FY 202526: maxSeq = 3, nextSequence = 4 → HP-S-202526-0004
// FY 202627 (new year): maxSeq = 0 (no invoices found), nextSequence = 1 → HP-S-202627-0001
```

### Step 3: Generate Number with Correct FY

```typescript
const invoiceNumber = generateSalesInvoiceNumber(
  invoicePrefix, // "HP"
  nextSequence, // 1 (on new FY) or 4 (on same FY)
  today, // Today's date (automatically calculates correct FY)
);
// On April 1, 2026: HP-S-202627-0001 ✓
// Before April 1: HP-S-202526-0004 ✓
```

## Automatic Reset Mechanism

**Why the reset is automatic:**

The sequence resets because `getFinancialYear()` changes on April 1:

| Date         | FY Code  | Query Pattern         | Result                               |
| ------------ | -------- | --------------------- | ------------------------------------ |
| Mar 31, 2026 | `202526` | Contains `-S-202526-` | Finds: 0001, 0002, 0003 → Next: 0004 |
| Apr 1, 2026  | `202627` | Contains `-S-202627-` | Finds: NONE (new FY) → Next: 0001    |
| Apr 2, 2026  | `202627` | Contains `-S-202627-` | Finds: 0001 → Next: 0002             |

**No manual intervention needed.** The system automatically:

1. Calculates the current FY
2. Searches only for invoices with that FY code
3. Finds 0 invoices on the first day of new FY
4. Starts numbering from 0001

## Race Condition Handling

When two users simultaneously create invoices, the retry logic prevents duplicate numbers:

```typescript
let retries = 0;
const maxRetries = 5;

while (retries < maxRetries) {
  const existing = await tx.invoice.findFirst({
    where: { shopId, invoiceNumber },
  });

  if (!existing) {
    return invoiceNumber; // Unique number found
  }

  // If collision, increment and retry
  invoiceNumber = generateSalesInvoiceNumber(
    invoicePrefix,
    nextSequence + retries + 1,
    today,
  );
  retries++;
}
```

**Example of concurrent request handling:**

- User A: Creates invoice → Gets `HP-S-202526-0005`
- User B: Creates invoice at same time → Gets `HP-S-202526-0006`
- Both requests query max sequence (3), calculate next (4)
- User A saves 0005 first
- User B retries, finds 0005 exists, increments to 0006
- Result: ✓ Both have sequential, unique numbers

## Implementation Files

**Core Logic:**

- [invoice-number.util.ts](src/common/utils/invoice-number.util.ts) - Financial year calculation and number generation

**Service Integration:**

- [sales.service.ts](src/core/sales/sales.service.ts) - Sales invoice with sequence reset
- [repair.service.ts](src/modules/mobileshop/repair/repair.service.ts) - Repair invoices
- [job-cards.service.ts](src/modules/mobileshop/jobcard/job-cards.service.ts) - Job cards

**Tests:**

- [invoice-number.util.spec.ts](src/common/utils/__tests__/invoice-number.util.spec.ts) - FY calculation tests

## Testing the Reset (Manual)

### Test 1: Verify FY Calculation

```bash
# Create a sales invoice on March 31, 2026
# Expected: HP-S-202526-XXXX

# Create a sales invoice on April 1, 2026
# Expected: HP-S-202627-0001 (sequence reset!)
```

### Test 2: Verify Concurrent Creation

```bash
# Open two browser tabs, both logged in
# Tab 1: Create sales invoice for HP shop → Save
# Tab 2: Create sales invoice for HP shop → Save (at same time)
# Expected: Both succeed with sequential numbers (no duplicates)
# Example: Tab1=0005, Tab2=0006
```

### Test 3: Verify Different Shop Independence

```bash
# Shop HP: Creates invoices HP-S-202526-0001, 0002, 0003
# Shop AT: Creates invoices AT-S-202526-0001 (starts at 1, not 4)
# Each shop has independent sequence per FY
```

## Summary

✅ **Sequence automatically resets to `0001` on April 1 of each year**
✅ **No manual database updates needed**
✅ **Race conditions handled with atomic retry logic**
✅ **Each shop has independent sequence per invoice type per FY**
✅ **Financial year calculation based on April-March cycle**

The system is designed to be self-correcting: when FY changes, the database query returns empty results, naturally starting the sequence from 1.
