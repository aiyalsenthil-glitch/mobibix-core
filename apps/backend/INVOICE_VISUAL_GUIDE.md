# Invoice Numbering System - Visual Guide

## 📊 Timeline: How Sequence Reset Works

```
FINANCIAL YEAR 202526 (Apr 2025 - Mar 2026)
═══════════════════════════════════════════════════════════════════

Apr 1, 2025          Sep 2025            Dec 2025            Mar 31, 2026
├─────────────────────────────────────────────────────────────────┤
│ First Invoice      5th Invoice       10th Invoice         Last Invoice
│ HP-S-202526-0001   HP-S-202526-0005  HP-S-202526-0010    HP-S-202526-XXXX
└─────────────────────────────────────────────────────────────────┘
 All numbers contain "-S-202526-" pattern

APRIL 1, 2026: FINANCIAL YEAR CHANGES! 🔄
═══════════════════════════════════════════════════════════════════

FINANCIAL YEAR 202627 (Apr 2026 - Mar 2027)
═══════════════════════════════════════════════════════════════════

Apr 1, 2026        Sep 2026             Dec 2026            Mar 31, 2027
├─────────────────────────────────────────────────────────────────┤
│ First Invoice    5th Invoice          10th Invoice        Last Invoice
│ HP-S-202627-0001 HP-S-202627-0005    HP-S-202627-0010   HP-S-202627-XXXX
└─────────────────────────────────────────────────────────────────┘
 All numbers contain "-S-202627-" pattern ← DIFFERENT FY CODE!

 ⬆️ SEQUENCE RESETS TO 0001 AUTOMATICALLY! ⬆️
```

## 🔍 How Database Query Works

### BEFORE APRIL 1 (FY 202526)

```
Query Pattern: invoiceNumber CONTAINS "-S-202526-"
┌────────────────────────────────────────────┐
│ Database Search Results                    │
├────────────────────────────────────────────┤
│ HP-S-202526-0001 ← Found                   │
│ HP-S-202526-0002 ← Found                   │
│ HP-S-202526-0003 ← Found                   │
│ HP-S-202526-0004 ← Found                   │
│ HP-S-202526-0005 ← Found                   │
│ HP-S-202627-XXXX ← NOT found (wrong FY!)   │
│ AT-S-202526-XXXX ← NOT found (wrong shop!) │
└────────────────────────────────────────────┘
maxSeq = 5
nextSequence = 6
Next Invoice: HP-S-202526-0006 ✓
```

### AFTER APRIL 1 (FY 202627)

```
Query Pattern: invoiceNumber CONTAINS "-S-202627-"
┌────────────────────────────────────────────┐
│ Database Search Results                    │
├────────────────────────────────────────────┤
│ HP-S-202526-0001 ← NOT found (old FY!)     │
│ HP-S-202526-0002 ← NOT found (old FY!)     │
│ HP-S-202526-XXXX ← NOT found (old FY!)     │
│                                            │
│ ← EMPTY! No invoices for new FY yet!       │
│                                            │
│ HP-S-202627-XXXX ← Will be created         │
└────────────────────────────────────────────┘
maxSeq = 0 (no invoices found)
nextSequence = 1
Next Invoice: HP-S-202627-0001 ✓✓ RESET!
```

## 🏪 Shop Independence

Each shop has its own independent sequence:

```
HP Shop Invoices:                AT Shop Invoices:
─────────────────               ─────────────────
HP-S-202526-0001                AT-S-202526-0001
HP-S-202526-0002                AT-S-202526-0002
HP-S-202526-0003                AT-S-202526-0003

HP continues: 0004, 0005...      AT continues: 0004, 0005...

Database Query for HP:           Database Query for AT:
WHERE shopId = 'hp_id'           WHERE shopId = 'at_id'
AND invoiceNumber                AND invoiceNumber
  CONTAINS "-S-202526-"            CONTAINS "-S-202526-"

Result: 3 invoices (0001-0003)   Result: 3 invoices (0001-0003)
Next: 0004                       Next: 0004
```

## 📝 Invoice Type Independence

Each invoice type has separate sequences:

```
Sales Invoices (Type S):         Purchase Invoices (Type P):
─────────────────────────        ─────────────────────────
HP-S-202526-0001                 HP-P-202526-0001
HP-S-202526-0002                 HP-P-202526-0002
HP-S-202526-0003

Query includes "-S-202526-"      Query includes "-P-202526-"
Returns: 3                       Returns: 2
Next Sales: 0004                 Next Purchase: 0003

Job Cards (Type J):
─────────────────
HP-J-202526-0001
HP-J-202526-0002

Query includes "-J-202526-"
Returns: 2
Next JobCard: 0003
```

## ⚡ Concurrent Request Handling

What happens when two users create invoices at the same time?

```
TIME: T0
┌─────────────────────────────────────────────────────────┐
│ User A (Chrome Tab 1)     │  User B (Chrome Tab 2)     │
└─────────────────────────────────────────────────────────┘

T0+0ms: Both click "Create Invoice"
        Both queries execute simultaneously
        Both find maxSeq = 5
        Both calculate nextSequence = 6

T0+10ms:
        User A attempts: INSERT HP-S-202526-0006
        → SUCCESS ✓ (inserted first)

        User B attempts: INSERT HP-S-202526-0006
        → COLLISION! ✗ (duplicate already exists)

T0+20ms:
        System detects collision on User B
        Retries with incremented sequence: 0007
        → SUCCESS ✓

FINAL RESULT:
├─ User A's Invoice: HP-S-202526-0006 ✓
└─ User B's Invoice: HP-S-202526-0007 ✓

No duplicates! Both have sequential numbers!
```

## 🔐 Database Constraints

The system uses these safety mechanisms:

```
1. UNIQUE Constraint
   ─────────────────
   CREATE UNIQUE INDEX idx_invoice_unique
   ON invoices(shopId, invoiceNumber)

   Prevents duplicate (shop_id + invoice_number) combinations

2. Transaction Isolation
   ────────────────────
   All operations within Prisma transaction
   Ensures atomicity even with concurrent requests

3. Retry Logic
   ──────────
   If collision detected (maxRetries = 5)
   Increment sequence and retry
   Ensures eventual success

4. FY-Based Query Filter
   ────────────────────
   invoiceNumber CONTAINS "-S-{currentFY}-"
   Automatically resets when FY changes
   No manual cleanup needed
```

## 📈 Number Growth Over Time

```
Financial Year 202526 (Apr 2025 - Mar 2026):
HP Shop - Sales Invoices
─────────────────────────
April:     HP-S-202526-0001 → HP-S-202526-0015
May:       HP-S-202526-0016 → HP-S-202526-0035
June:      HP-S-202526-0036 → HP-S-202526-0055
...
February:  HP-S-202526-4850 → HP-S-202526-4890
March:     HP-S-202526-4891 → HP-S-202526-4950

Total Invoices in FY: 4,950


Financial Year 202627 (Apr 2026 - Mar 2027):
HP Shop - Sales Invoices
─────────────────────────
April:     HP-S-202627-0001 ← RESET! ← ← ←
           HP-S-202627-0002
           ...continuing from scratch
```

## 🎯 Real-World Example

Let's trace one invoice creation:

```
SCENARIO: Manager creates sales invoice on January 15, 2026

Step 1: Manager selects HP shop, enters invoice details
Step 2: Clicks "Create Invoice"
        System calculates:
        - Today = Jan 15, 2026
        - getFinancialYear() = "202526" (still in Apr 2025 - Mar 2026)

Step 3: Backend queries:
        WHERE shopId = "hp_shop_id"
        AND invoiceNumber CONTAINS "-S-202526-"
        Results: [0001, 0002, 0003, 0004, 0005]
        maxSeq = 5
        nextSequence = 6

Step 4: Generate number:
        generateSalesInvoiceNumber("HP", 6, jan15_2026)
        Returns: "HP-S-202526-0006"

Step 5: Check uniqueness:
        Query for shopId="hp_shop_id" AND invoiceNumber="HP-S-202526-0006"
        Result: Not found ✓

Step 6: Insert into database:
        INSERT INTO invoices (shopId, invoiceNumber, amount, ...)
        VALUES ("hp_shop_id", "HP-S-202526-0006", ...)
        ✓ SUCCESS

Step 7: Return to manager:
        Invoice created! Your invoice number is: HP-S-202526-0006

Manager sees: HP-S-202526-0006 ← Correct format! ✓✓✓
```

## 🎓 Key Takeaways

```
┌─────────────────────────────────────────────────────┐
│ 1. FINANCIAL YEAR = April to March                  │
│    FY 202526 means Apr 2025 to Mar 2026             │
├─────────────────────────────────────────────────────┤
│ 2. SEQUENCE RESETS on April 1                       │
│    No manual action needed!                         │
├─────────────────────────────────────────────────────┤
│ 3. EACH SHOP HAS OWN SEQUENCE                       │
│    HP starts at 0001, AT starts at 0001             │
├─────────────────────────────────────────────────────┤
│ 4. EACH TYPE HAS OWN SEQUENCE                       │
│    Sales ≠ Purchase ≠ JobCard                       │
├─────────────────────────────────────────────────────┤
│ 5. SAFE FOR CONCURRENT USE                         │
│    Two users? No duplicates, both succeed!          │
├─────────────────────────────────────────────────────┤
│ 6. AUTOMATIC & SELF-CORRECTING                      │
│    System fixes itself when FY changes               │
└─────────────────────────────────────────────────────┘
```

---

**This visual guide should help understand how the invoice numbering system works without reading complex code!**
