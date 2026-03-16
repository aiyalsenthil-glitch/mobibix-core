# MobiBix Feature Implementation Analysis
# Staff Commission + Trade-In + Consumer Finance (EMI)

**Date:** 2026-03-16
**Status:** Commission ✅ Built | Trade-In ✅ Built | Consumer Finance 🔬 Research & Plan

---

## PART 1 — STAFF COMMISSION LEDGER (Built)

### Business Context

Mobile shop staff are typically paid a flat salary. The challenge: good sellers don't have
an incentive to upsell, push high-margin products, or close difficult customers. In Indian
retail shops, commission-based motivation is the norm — but tracking it manually (in a diary
or WhatsApp) is error-prone and creates disputes.

**Goal:** Auto-calculate per-staff commission on every invoice, give the owner a transparent
ledger to approve and settle payments, and show each staff member what they've earned.

---

### What Was Built

#### Database Schema (`prisma/schema.prisma`)

```prisma
// Migration: 20260316000000_feature_upi_commission_tradein_pricealert

enum CommissionScope {
  ALL_STAFF          // Rule applies to everyone who creates an invoice
  SPECIFIC_STAFF     // Rule targets one named staff member (staffId)
  SPECIFIC_ROLE      // Rule targets a role (e.g. OWNER, STAFF)
}

enum CommissionType {
  PERCENTAGE_OF_SALE    // e.g. 2% of invoice line total
  PERCENTAGE_OF_PROFIT  // e.g. 10% of (lineTotal - costPrice * qty)
  FIXED_PER_ITEM        // e.g. ₹50 per unit sold
}

enum EarningStatus {
  PENDING    // Auto-created, not yet reviewed
  APPROVED   // Owner approved — ready to pay
  PAID       // Settled (paidAt timestamp set)
}

model CommissionRule {
  id        String          @id
  tenantId  String
  shopId    String
  name      String          // "Sales Staff 5%" — human label
  applyTo   CommissionScope @default(ALL_STAFF)
  staffId   String?         // Used when applyTo = SPECIFIC_STAFF
  staffRole UserRole?       // Used when applyTo = SPECIFIC_ROLE
  category  String?         // Product category filter (null = all products)
  type      CommissionType
  value     Decimal         // % value or ₹ per item (rupees)
  isActive  Boolean         @default(true)
  createdAt DateTime        @default(now())
  earnings  StaffEarning[]
  @@map("mb_commission_rule")
}

model StaffEarning {
  id           String         @id
  tenantId     String
  shopId       String
  staffId      String         // User.id of the invoice creator
  invoiceId    String
  ruleId       String
  saleAmount   Int            // paisa — line total that triggered this earning
  profitAmount Int?           // paisa — estimated profit on the line
  earned       Int            // paisa — final commission amount
  status       EarningStatus  @default(PENDING)
  paidAt       DateTime?
  createdAt    DateTime       @default(now())
  @@map("mb_staff_earning")
}
```

---

#### Backend: `apps/backend/src/core/commission/`

| File | Responsibility |
|------|---------------|
| `commission.service.ts` | CRUD for rules, earning queries, `@OnEvent('invoice.created')` auto-calc |
| `commission.controller.ts` | REST endpoints, permission guards |
| `commission.module.ts` | Module declaration |
| `dto/commission.dto.ts` | `CreateCommissionRuleDto`, `MarkPaidDto` |

**Auto-Calculation Engine** (triggered by `invoice.created` event):

```
On each invoice creation:
1. Load invoice.items with product.category + product.lastPurchasePrice
2. Load invoice.createdBy → look up User.role
3. Load all active CommissionRules for that shop
4. For each rule:
   a. Scope check: skip if SPECIFIC_STAFF + staffId doesn't match
   b. Scope check: skip if SPECIFIC_ROLE + staffRole doesn't match
   c. For each invoice item:
      - Category check: skip if rule.category set and doesn't match item.product.category
      - Calculate earned:
        PERCENTAGE_OF_SALE   → round(lineTotal * value / 100)
        PERCENTAGE_OF_PROFIT → round(max(0, lineTotal - costPerUnit*qty) * value / 100)
        FIXED_PER_ITEM       → round(value * 100 * quantity)  [convert ₹ to paisa]
      - Skip if earned <= 0
      - Create StaffEarning { status: PENDING }
5. Bulk insert all earnings
6. Error is caught and logged — never blocks invoice creation
```

**Commission Rule Matching Logic:**

```
Rule scope → Who it applies to
─────────────────────────────────────────────────────────
ALL_STAFF         → every invoice regardless of who created it
SPECIFIC_STAFF    → only invoices created by rule.staffId
SPECIFIC_ROLE     → only invoices created by staff with rule.staffRole
+ category filter → further restrict to items in rule.category
```

**REST API Endpoints:**

```
POST   /commission/rules              Create rule        (STAFF_MANAGE)
GET    /commission/rules?shopId=      List rules         (STAFF_MANAGE)
PATCH  /commission/rules/:id/toggle   Activate/deactivate(STAFF_MANAGE)
DELETE /commission/rules/:id          Delete rule        (STAFF_MANAGE)
GET    /commission/earnings?shopId=   List earnings      (STAFF_VIEW)
       &staffId= &status= &page= &limit=
POST   /commission/earnings/mark-paid Bulk settle        (STAFF_MANAGE)
```

---

#### Frontend: `apps/mobibix-web/`

| File | Description |
|------|-------------|
| `src/services/commission.api.ts` | Typed API client for all commission endpoints |
| `app/(app)/staff-management/components/CommissionTab.tsx` | Full UI component |
| `app/(app)/staff-management/page.tsx` | Added "Commission" tab |

**UI Features:**
- Shop selector (multi-shop tenants)
- **Rules sub-tab**: Add form with name, scope, type, value, category filter; toggle active/inactive; delete
- **Earnings sub-tab**: Filter by status (PENDING/APPROVED/PAID); checkbox multi-select; "Mark N as Paid" bulk action; shows staff name, invoice number, rule name, sale amount, earned amount

---

### Integration Points & Gaps

| What Works | Known Limitation |
|-----------|-----------------|
| Auto-triggers on every new invoice | Does NOT re-calculate if invoice is later voided — handle manually |
| Multi-rule support (one invoice can earn from multiple rules) | No rule priority/conflict resolution — all matching rules apply simultaneously |
| Category filtering | Category is a free-text string on ShopProduct — must match exactly |
| Paisa-accurate math | `FIXED_PER_ITEM` rule.value is entered in rupees in UI, stored in DB as `Decimal` (rupees), converted to paisa during calculation |
| Tenant isolated | ✅ All queries scoped to `tenantId` |

### What's Missing for Production Completeness

1. **Void/refund reversal** — when an invoice is voided, PENDING earnings should be auto-cancelled
2. **Staff self-view** — staff should see only their own earnings (currently needs `STAFF_VIEW` permission)
3. **Monthly summary report** — total earnings per staff per month
4. **Approval workflow** — PENDING → APPROVED → PAID (currently skip to PAID directly)
5. **WhatsApp notification** — notify staff when earnings are settled

---

---

## PART 2 — TRADE-IN / BUYBACK MODULE (Built)

### Business Context

The used phone market in India is estimated at ₹20,000–25,000 Crore annually and growing.
Mobile shops that offer buyback / trade-in capture a customer who would otherwise sell
privately on OLX/Quikr. The shop:
- Builds relationship/loyalty (customer returns)
- Gets inventory for the used/refurbished segment
- Can bundle trade-in discount with a new phone sale

**Without a system:** staff write valuations on paper, IMEI isn't captured, disputes arise,
accounting can't track the buyback as a cost.

**Goal:** Record every trade-in with device details, condition checklist, market valuation,
and an offer price. Track it from DRAFT → OFFERED → ACCEPTED → COMPLETED, and link it to
a new phone invoice when the customer exchanges.

---

### What Was Built

#### Database Schema

```prisma
enum TradeInGrade { EXCELLENT | GOOD | FAIR | POOR }

enum TradeInStatus {
  DRAFT      // Saved, not yet offered
  OFFERED    // Offer communicated to customer
  ACCEPTED   // Customer said yes
  REJECTED   // Customer declined
  COMPLETED  // Exchange done, linked to a sales invoice
}

model TradeIn {
  id              String        @id
  tenantId        String
  shopId          String
  tradeInNumber   String        // Auto-generated: TRD-0001
  customerId      String?       // Optional Party link
  customerName    String
  customerPhone   String
  deviceBrand     String
  deviceModel     String
  deviceImei      String?
  deviceStorage   String?
  deviceColor     String?
  conditionChecks Json          // { screenCracked: false, cameraWorking: true, ... }
  conditionGrade  TradeInGrade  @default(FAIR)
  marketValue     Int           // paisa — current resale market value
  offeredValue    Int           // paisa — what shop offers customer
  status          TradeInStatus @default(DRAFT)
  linkedInvoiceId String?       // Invoice where customer bought new phone
  notes           String?
  createdBy       String        // User.id
  createdAt/updatedAt
  @@unique([shopId, tradeInNumber])
  @@map("mb_trade_in")
}
```

**Condition Checklist Keys** (stored as JSONB):
```
screenCracked, bodyDamaged, cameraWorking, chargingWorking,
speakerWorking, micWorking, fingerprintWorking, wifiWorking,
simWorking, batteryHealthGood
```

---

#### Backend: `apps/backend/src/modules/mobileshop/tradein/`

| File | Responsibility |
|------|---------------|
| `tradein.service.ts` | create, list, getOne, updateStatus, updateOffer |
| `tradein.controller.ts` | REST endpoints |
| `tradein.module.ts` | Module declaration, registered in `MobileShopModule` |
| `dto/tradein.dto.ts` | `CreateTradeInDto`, `UpdateTradeInStatusDto` |

**Number Generation:** `TRD-{count+1:04d}` — sequential per shop (race-condition-safe enough for current scale; upgrade to `SELECT ... FOR UPDATE` if high concurrency needed).

**Paisa Convention:** All `marketValue` and `offeredValue` stored as paisa integers. Service converts rupees ↔ paisa on input/output.

**REST API Endpoints:**

```
POST   /trade-in                     Create (SALES_CREATE)
GET    /trade-in?shopId=             List   (SALES_VIEW)
       &status= &page= &limit=
GET    /trade-in/:id                 Detail (SALES_VIEW)
PATCH  /trade-in/:id/status          Update status + link invoice (SALES_CREATE)
PATCH  /trade-in/:id/offer           Update offered value → sets status OFFERED (SALES_CREATE)
```

---

#### Frontend: `apps/mobibix-web/`

| File | Description |
|------|-------------|
| `src/services/tradein.api.ts` | Typed API client |
| `app/(app)/trade-in/page.tsx` | Full 3-step wizard + list view |
| `src/components/layout/sidebar.tsx` | Added "Trade-in / Buyback" sidebar link |

**3-Step Wizard Flow:**

```
Step 1: Device Info
  ├─ Customer Name (required)
  ├─ Phone (required)
  ├─ Device Brand (required)
  ├─ Device Model (required)
  ├─ IMEI (optional)
  └─ Storage (optional)

Step 2: Condition Assessment
  ├─ Overall Grade: EXCELLENT / GOOD / FAIR / POOR
  └─ Checklist: 10 checkboxes (screen, body, camera, charging, speaker,
                mic, fingerprint, wifi, sim, battery)

Step 3: Valuation
  ├─ Market Value ₹ (resale reference)
  ├─ Offered Value ₹ (what shop pays)
  └─ Notes (optional)
```

**List View:** Table with status dropdown per row for quick status transitions.

---

### Integration Points & Gaps

| What Works | Known Limitation |
|-----------|-----------------|
| Full CRUD lifecycle | No link-back from Invoice detail page to its trade-in |
| Condition checklist in JSONB | Not used for auto-grading suggestions yet |
| Linked to invoice via `linkedInvoiceId` | Link is manual — not enforced from invoice creation flow |
| Paisa-accurate | ✅ |
| Tenant isolated | ✅ |

### What's Missing for Production Completeness

1. **Invoice integration** — when creating a new sales invoice, show "Apply trade-in credit" option that deducts `offeredValue` from invoice total
2. **Print slip** — printable trade-in receipt for the customer (like a receipt for their old phone)
3. **Auto-linking** — on invoice creation with a customer who has a pending trade-in, prompt to link
4. **Photo capture** — Android app: capture damage photos stored in Firebase Storage
5. **Market value API** — integrate with 6rb.com or ImagineMarket (Indian used phone pricing APIs)
6. **Accounting entry** — when COMPLETED, create a corresponding stock-in for the used device (receivable as a separate product/IMEI)

---

---

## PART 3 — CONSUMER FINANCE / EMI TRACKING (Research & Plan)

### Business Context

**Why this matters more than anything else in Indian mobile retail:**

- ~65-70% of premium phones (>₹15,000) in India are sold on EMI
- Finance providers: Bajaj Finserv EMI Card, Home Credit, HDFC EasyEMI, Kotak EMI, ZestMoney (now defunct), IDFC First
- No-cost EMI on cards (SBI, HDFC, ICICI, Axis) is the most common mode
- Shop owner gives full price to bank → bank settles within 2-3 business days → subvention (discount) is borne by brand or shop
- **Problem:** Shop staff mark sale as "PAID" immediately, but cash actually arrives D+2. Owner has no visibility of pending bank settlements.

**The real gap shops face:**
1. "How much EMI sales pending settlement from Bajaj this week?"
2. "Customer defaulted on EMI — how do I recall/blacklist?"
3. "I gave a discount under 'no-cost EMI' but didn't track the subvention cost → incorrect profit calculation"
4. "My Bajaj agent brought paper forms — I don't know which invoices have EMI applications pending"

---

### Research: How EMI Works in Indian Mobile Shops

#### Mode 1: Card-based EMI (HDFC/SBI/ICICI no-cost EMI)
- Customer swipes card → bank auto-converts to EMI
- Shop receives full amount immediately (within 24h)
- **Tracking need:** Minimal — just mark PaymentMode as CARD_EMI, subvention is absorbed by bank/brand
- **Risk:** Low

#### Mode 2: Bajaj Finserv / Home Credit (NBFC Finance)
- Customer fills physical/digital form with NBFC agent at shop
- NBFC approves → settles T+2 or T+3 to shop's account
- Down payment collected by shop on sale day
- **Tracking need:** HIGH — shop must record application, down payment received, pending settlement amount, settlement date
- **Risk:** Settlement delays, application rejections

#### Mode 3: Shop-Owned EMI (Informal "Kistikatta")
- Shop extends credit directly, collects installments monthly
- Common in tier-2/3 cities, kirana electronics shops
- **Tracking need:** CRITICAL — who owes what, due dates, missed payments
- **Risk:** Customer default

---

### Feature Design: Consumer Finance Tracking

#### Scope Decision

Build Modes 2 + 3. Mode 1 is already handled by adding a new `PaymentMode: CARD_EMI`.

---

#### Database Schema (New Tables Required)

```sql
-- EMI Application (Bajaj/NBFC type)
CREATE TABLE "mb_emi_application" (
  "id"                TEXT PRIMARY KEY,
  "tenantId"          TEXT NOT NULL REFERENCES "Tenant"(id),
  "shopId"            TEXT NOT NULL REFERENCES "mb_shop"(id),
  "invoiceId"         TEXT NOT NULL REFERENCES "mb_invoice"(id),
  "customerId"        TEXT REFERENCES "mb_party"(id),
  "emiNumber"         TEXT NOT NULL,           -- EMI-0001
  "financeProvider"   TEXT NOT NULL,           -- 'BAJAJ_FINSERV' | 'HOME_CREDIT' | 'HDFC' etc.
  "applicationRef"    TEXT,                    -- NBFC's own application ID
  "loanAmount"        INTEGER NOT NULL,        -- paisa — total finance amount
  "downPayment"       INTEGER NOT NULL DEFAULT 0,  -- paisa — collected on day 1
  "tenureMonths"      INTEGER NOT NULL,        -- 3 | 6 | 9 | 12 | 18 | 24
  "monthlyEmi"        INTEGER NOT NULL,        -- paisa — customer's monthly installment
  "interestRate"      DECIMAL,                 -- annual % (null = no-cost EMI)
  "subventionAmount"  INTEGER NOT NULL DEFAULT 0,  -- paisa — discount borne by shop
  "status"            "EmiStatus" NOT NULL DEFAULT 'APPLIED',
  "settlementAmount"  INTEGER,                 -- paisa — actual amount received from NBFC
  "settledAt"         TIMESTAMP,
  "rejectedReason"    TEXT,
  "notes"             TEXT,
  "createdBy"         TEXT NOT NULL,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT now()
);

-- Status: APPLIED → APPROVED → SETTLED | REJECTED | CANCELLED
CREATE TYPE "EmiStatus" AS ENUM (
  'APPLIED', 'APPROVED', 'SETTLED', 'REJECTED', 'CANCELLED'
);

-- Shop-owned installment schedule (Mode 3 — Kistikatta)
CREATE TABLE "mb_installment_plan" (
  "id"            TEXT PRIMARY KEY,
  "tenantId"      TEXT NOT NULL REFERENCES "Tenant"(id),
  "shopId"        TEXT NOT NULL REFERENCES "mb_shop"(id),
  "invoiceId"     TEXT NOT NULL REFERENCES "mb_invoice"(id),
  "customerId"    TEXT NOT NULL REFERENCES "mb_party"(id),
  "planNumber"    TEXT NOT NULL,               -- INST-0001
  "totalAmount"   INTEGER NOT NULL,            -- paisa
  "downPayment"   INTEGER NOT NULL DEFAULT 0,  -- paisa
  "remainingAmount" INTEGER NOT NULL,          -- paisa
  "tenureMonths"  INTEGER NOT NULL,
  "monthlyAmount" INTEGER NOT NULL,            -- paisa
  "startDate"     TIMESTAMP NOT NULL,
  "notes"         TEXT,
  "status"        "InstallmentStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdBy"     TEXT NOT NULL,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"     TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TYPE "InstallmentStatus" AS ENUM (
  'ACTIVE', 'COMPLETED', 'DEFAULTED', 'CANCELLED'
);

-- Individual installment slots
CREATE TABLE "mb_installment_slot" (
  "id"              TEXT PRIMARY KEY,
  "planId"          TEXT NOT NULL REFERENCES "mb_installment_plan"(id),
  "tenantId"        TEXT NOT NULL,
  "slotNumber"      INTEGER NOT NULL,          -- 1, 2, 3...
  "dueDate"         TIMESTAMP NOT NULL,
  "amount"          INTEGER NOT NULL,          -- paisa
  "paidAmount"      INTEGER NOT NULL DEFAULT 0,
  "paidAt"          TIMESTAMP,
  "receiptId"       TEXT,                      -- links to mb_receipt if collected via app
  "status"          "SlotStatus" NOT NULL DEFAULT 'PENDING',
  "reminderSentAt"  TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TYPE "SlotStatus" AS ENUM (
  'PENDING', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'WAIVED'
);
```

**Indexes needed:**
```sql
CREATE INDEX ON "mb_emi_application"("tenantId", "shopId", "status");
CREATE INDEX ON "mb_emi_application"("invoiceId");
CREATE INDEX ON "mb_installment_plan"("tenantId", "shopId", "status");
CREATE INDEX ON "mb_installment_slot"("planId");
CREATE INDEX ON "mb_installment_slot"("tenantId", "dueDate") WHERE status IN ('PENDING', 'OVERDUE');
```

---

#### PaymentMode Extension

Add new enum values to the existing `PaymentMode` enum:
```
CARD_EMI    -- Card-based no-cost EMI (Mode 1 — settled immediately)
NBFC_EMI    -- Bajaj/Home Credit (Mode 2 — T+2 settlement)
SHOP_EMI    -- Shop-owned installment (Mode 3 — Kistikatta)
```

**Invoice creation flow** when `paymentMode = NBFC_EMI`:
- Total amount = loan amount + down payment collected
- Down payment → `paidAmount` on invoice immediately
- Balance → `paidAmount` updated when `EmiApplication.status = SETTLED`

When `paymentMode = SHOP_EMI`:
- Down payment → `paidAmount` on invoice
- Each `InstallmentSlot.PAID` event → increment `Invoice.paidAmount`
- Invoice status: `PARTIALLY_PAID` until all slots paid → `PAID`

---

#### Backend Architecture

**Module location:** `src/modules/mobileshop/finance/`

```
finance/
├── dto/
│   ├── create-emi-application.dto.ts
│   ├── create-installment-plan.dto.ts
│   └── record-payment.dto.ts
├── emi-application.service.ts     -- NBFC EMI CRUD + settlement
├── installment-plan.service.ts    -- Shop EMI plan creation + slot generation
├── installment-payment.service.ts -- Record payment, update invoice.paidAmount
├── finance-dashboard.service.ts   -- Pending settlements, overdue report
├── finance.controller.ts
└── finance.module.ts
```

**Key Service Methods:**

```typescript
// EmiApplicationService
createApplication(tenantId, dto: CreateEmiApplicationDto): Promise<EmiApplication>
  // Validates invoice exists, calculates subvention if rate given
  // Sets invoice paymentMode = NBFC_EMI
  // Creates EmiApplication { status: APPLIED }

settleApplication(tenantId, id, settlementAmount: number): Promise<void>
  // Updates status → SETTLED
  // Updates invoice.paidAmount += settlementAmount
  // If paidAmount >= totalAmount → Invoice status PAID

getPendingSettlements(tenantId, shopId): Promise<PendingSettlementSummary>
  // Group by financeProvider, sum loanAmount - downPayment

// InstallmentPlanService
createPlan(tenantId, dto: CreateInstallmentPlanDto): Promise<InstallmentPlan>
  // Auto-generates slots: startDate + (slotNumber * 30 days)
  // Sets invoice paymentMode = SHOP_EMI

recordPayment(tenantId, slotId, amount: number): Promise<void>
  // Marks slot PAID
  // Creates Receipt record
  // Updates invoice.paidAmount

getOverdueSlots(tenantId, shopId): Promise<OverdueSlot[]>
  // All slots WHERE status=PENDING AND dueDate < now()
  // Used for WhatsApp reminders

// FinanceDashboardService
getDashboard(tenantId, shopId): Promise<FinanceDashboard>
  // {
  //   pendingNbfcSettlement: { total, byProvider },
  //   overdueInstallments: { count, totalAmount, customerList },
  //   thisMonthEmiSales: { count, totalAmount },
  //   subventionCost: { total }
  // }
```

---

#### Automated WhatsApp Reminders (Integration)

Leverage the existing WhatsApp automation system:

```
Cron job: daily at 9:00 AM
→ Query overdue InstallmentSlots (dueDate < today, status = PENDING)
→ For each: send WhatsApp reminder to customer.phone
  Template: "installment_due_reminder"
  Variables: customer name, amount, due date, shop name

Cron job: daily at 9:00 AM
→ Query slots due tomorrow (dueDate = tomorrow)
→ Send advance reminder
  Template: "installment_due_tomorrow"
```

---

#### Frontend

**New page:** `/sales/emi` or `/finance` — Finance Dashboard

**Screens:**
1. **Finance Dashboard** — KPI cards: pending NBFC settlements, overdue installments, this month EMI revenue
2. **EMI Applications list** — filter by provider/status, mark settled
3. **Installment Plans list** — filter by status, show overdue in red
4. **Plan Detail** — slot timeline with payment recording per slot
5. **Invoice integration** — during invoice creation, if paymentMode = NBFC_EMI or SHOP_EMI, show inline form to create EMI application/plan

**Invoice creation integration:**
```
PaymentMode selector → User picks "NBFC EMI" (Bajaj Finserv)
  └─ Inline panel appears:
       Finance Provider: [Bajaj Finserv ▼]
       Application Ref: [__________]
       Loan Amount: ₹ [_________]
       Down Payment collected: ₹ [_________]
       Tenure: [12 months ▼]
       Subvention: ₹ [_________] (optional)
       [Save & Create Invoice]
```

---

### Risk Analysis

| Risk | Mitigation |
|------|-----------|
| Customer pays NBFC but shop records show PENDING | Require manual settlement confirmation; consider bank statement upload parsing (V2) |
| Shop EMI customer defaults | Overdue dashboard + WhatsApp reminders; no automated credit bureau reporting (out of scope) |
| Multiple EMI applications per invoice | Constrain: one EMI application per invoice (unique constraint on invoiceId) |
| Accounting impact — subvention is a cost | Subvention amount stored; can be exposed in P&L report as "Finance Cost" |
| Tax: GST on interest for shop-owned EMI | Out of scope for V1 — shop EMI interest is not typically registered |

---

### Implementation Priority

| Phase | What | Effort |
|-------|------|--------|
| V1 (2 days) | PaymentMode extension + NBFC EMI Application (Bajaj tracking) | Medium |
| V1 (1 day) | Pending settlement dashboard widget | Low |
| V2 (3 days) | Shop EMI installment plan + slot generation | Medium |
| V2 (2 days) | Overdue reminders via WhatsApp cron | Low (infra exists) |
| V3 (1 week) | Invoice creation inline EMI form | Medium |
| V3 | SMS/WhatsApp collection message with UPI deep link | Low |

**Recommend starting with V1** — NBFC EMI tracking captures the most common real-world pain
(₹ stuck with Bajaj pending settlement) and takes minimal schema changes.

---

### Prisma Schema Additions Needed

Add to `schema.prisma`:

```prisma
enum EmiStatus { APPLIED | APPROVED | SETTLED | REJECTED | CANCELLED }
enum InstallmentStatus { ACTIVE | COMPLETED | DEFAULTED | CANCELLED }
enum SlotStatus { PENDING | PAID | PARTIALLY_PAID | OVERDUE | WAIVED }

// Extend PaymentMode enum (requires migration):
// CARD_EMI, NBFC_EMI, SHOP_EMI

model EmiApplication {
  id               String    @id @default(cuid())
  tenantId         String
  shopId           String
  invoiceId        String    @unique  // one EMI per invoice
  customerId       String?
  emiNumber        String
  financeProvider  String
  applicationRef   String?
  loanAmount       Int
  downPayment      Int       @default(0)
  tenureMonths     Int
  monthlyEmi       Int
  interestRate     Decimal?
  subventionAmount Int       @default(0)
  status           EmiStatus @default(APPLIED)
  settlementAmount Int?
  settledAt        DateTime?
  rejectedReason   String?
  notes            String?
  createdBy        String
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt
  shop             Shop      @relation(fields: [shopId], references: [id])
  tenant           Tenant    @relation(fields: [tenantId], references: [id])
  invoice          Invoice   @relation(fields: [invoiceId], references: [id])
  customer         Party?    @relation(fields: [customerId], references: [id])
  @@index([tenantId, shopId, status])
  @@map("mb_emi_application")
}

model InstallmentPlan {
  id              String            @id @default(cuid())
  tenantId        String
  shopId          String
  invoiceId       String            @unique
  customerId      String
  planNumber      String
  totalAmount     Int
  downPayment     Int               @default(0)
  remainingAmount Int
  tenureMonths    Int
  monthlyAmount   Int
  startDate       DateTime
  notes           String?
  status          InstallmentStatus @default(ACTIVE)
  createdBy       String
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt
  slots           InstallmentSlot[]
  shop            Shop              @relation(fields: [shopId], references: [id])
  tenant          Tenant            @relation(fields: [tenantId], references: [id])
  customer        Party             @relation(fields: [customerId], references: [id])
  @@unique([shopId, planNumber])
  @@index([tenantId, shopId, status])
  @@map("mb_installment_plan")
}

model InstallmentSlot {
  id          String          @id @default(cuid())
  planId      String
  tenantId    String
  slotNumber  Int
  dueDate     DateTime
  amount      Int
  paidAmount  Int             @default(0)
  paidAt      DateTime?
  receiptId   String?
  status      SlotStatus      @default(PENDING)
  reminderSentAt DateTime?
  createdAt   DateTime        @default(now())
  plan        InstallmentPlan @relation(fields: [planId], references: [id])
  @@index([planId])
  @@index([tenantId, dueDate])
  @@map("mb_installment_slot")
}
```

---

## Summary Table

| Feature | DB Tables | Backend Endpoints | Frontend | Status |
|---------|-----------|------------------|---------|--------|
| Staff Commission | `mb_commission_rule`, `mb_staff_earning` | 6 endpoints | CommissionTab in staff-management | ✅ Built |
| Trade-In Buyback | `mb_trade_in` | 5 endpoints | `/trade-in` page + 3-step wizard | ✅ Built |
| Consumer Finance | `mb_emi_application`, `mb_installment_plan`, `mb_installment_slot` | ~10 endpoints needed | Finance dashboard + invoice integration | 🔬 Researched |

---

*Document generated: 2026-03-16*
