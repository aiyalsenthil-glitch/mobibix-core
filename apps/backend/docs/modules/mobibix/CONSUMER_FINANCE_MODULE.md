# Consumer Finance Module — Implementation Documentation

> **Status:** Production-ready as of 2026-03-17
> **Vertical:** MOBILE_SHOP
> **Base Route:** `/finance`
> **Module:** `apps/backend/src/modules/mobileshop/finance/`

---

## Overview

The Consumer Finance module enables mobile shop owners to manage two types of customer financing:

| Type | Use Case | Flows |
|------|----------|-------|
| **NBFC EMI** | Bajaj Finserv, Home Credit, HDFC etc. | Apply → Approve → Settle |
| **Kistikatta** | Shop-owned installment plans | Create → Slot generation → Monthly collection |

Both are linked to an `Invoice` (1:1 relation), ensuring no double-financing per sale.

---

## Database Schema

### New Tables

#### `mb_emi_application` — NBFC/Bank EMI tracking
```
id, tenantId, shopId, invoiceId (UNIQUE), customerId
emiNumber       TEXT     -- EMI-0001 format
financeProvider TEXT     -- "Bajaj Finserv", "Home Credit" etc.
applicationRef  TEXT     -- Provider's reference number (filled on approval)
loanAmount      INT      -- paisa
downPayment     INT      -- paisa
tenureMonths    INT      -- 3/6/9/12/18/24
monthlyEmi      INT      -- paisa
interestRate    DECIMAL  -- % (0 for 0% EMI / subvention)
subventionAmount INT     -- paisa (bank pays shop this to offer 0% EMI)
status          EmiStatus
settlementAmount INT     -- actual settled amount (paisa)
settledAt       TIMESTAMP
rejectedReason  TEXT
createdBy, createdAt, updatedAt
```

#### `mb_installment_plan` — Shop-owned Kistikatta plans
```
id, tenantId, shopId, invoiceId (UNIQUE), customerId
planNumber      TEXT     -- KIS-0001 format
totalAmount     INT      -- paisa (full sale value)
downPayment     INT      -- paisa (paid upfront)
remainingAmount INT      -- paisa (decrements on payment)
tenureMonths    INT
monthlyAmount   INT      -- auto-calculated (remaining / tenure)
startDate       TIMESTAMP
status          InstallmentStatus
createdBy, createdAt, updatedAt
```

#### `mb_installment_slot` — Individual due dates per plan
```
id, planId (FK → plan, CASCADE DELETE), tenantId
slotNumber  INT       -- 1..tenureMonths
dueDate     TIMESTAMP
amount      INT       -- paisa (last slot absorbs rounding)
paidAmount  INT       -- paisa (cumulative)
paidAt      TIMESTAMP
receiptId   TEXT      -- optional link to sales receipt
status      SlotStatus
reminderSentAt TIMESTAMP -- for WhatsApp reminders
```

### New Enums
```sql
EmiStatus:         APPLIED | APPROVED | SETTLED | REJECTED | CANCELLED
InstallmentStatus: ACTIVE | COMPLETED | DEFAULTED | CANCELLED
SlotStatus:        PENDING | PAID | PARTIALLY_PAID | OVERDUE | WAIVED
```

### Extensions to Existing Tables
```sql
-- PaymentMode enum
ALTER TYPE "PaymentMode" ADD VALUE 'CARD_EMI';
ALTER TYPE "PaymentMode" ADD VALUE 'NBFC_EMI';
ALTER TYPE "PaymentMode" ADD VALUE 'SHOP_EMI';

-- Invoice
ALTER TABLE "mb_invoice" ADD COLUMN "tradeInId"     TEXT;
ALTER TABLE "mb_invoice" ADD COLUMN "tradeInCredit" INTEGER DEFAULT 0;
```

---

## API Endpoints

All endpoints require `JwtAuthGuard`. All money values are **rupees** on the API surface (converted to paisa in service layer).

### Dashboard

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/finance/summary?shopId=` | SALES_VIEW | KPI cards for EMI + installment |

**Response:**
```json
{
  "emi": {
    "pending":  { "count": 3, "totalLoanAmount": 45000 },
    "approved": { "count": 7, "totalLoanAmount": 105000 },
    "settled":  { "count": 12, "totalSettled": 180000 },
    "rejected": { "count": 1 }
  },
  "installment": {
    "activePlans":   { "count": 5, "totalRemaining": 87500 },
    "overdueSlots":  2,
    "thisMonthDue":  { "count": 8, "amount": 24000 }
  }
}
```

### EMI Applications

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/finance/emi` | SALES_CREATE | Create EMI application |
| GET | `/finance/emi?shopId=&status=&page=&limit=` | SALES_VIEW | List EMIs |
| GET | `/finance/emi/:id` | SALES_VIEW | Get one EMI |
| PATCH | `/finance/emi/:id/status` | SALES_CREATE | Update EMI status |

**Create EMI body:**
```json
{
  "shopId": "...",
  "invoiceId": "...",
  "financeProvider": "Bajaj Finserv",
  "loanAmount": 30000,
  "downPayment": 5000,
  "tenureMonths": 12,
  "monthlyEmi": 2500,
  "interestRate": 0,
  "subventionAmount": 1200,
  "applicationRef": "BFPL-2026-0001",
  "notes": "Customer applied on store"
}
```

**Update status body:**
```json
{
  "status": "SETTLED",
  "settlementAmount": 29800,
  "applicationRef": "BFPL-2026-0001-SET"
}
```

### Installment Plans (Kistikatta)

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/finance/installment` | SALES_CREATE | Create plan + auto-generate slots |
| GET | `/finance/installment?shopId=&status=&page=&limit=` | SALES_VIEW | List plans |
| GET | `/finance/installment/:id` | SALES_VIEW | Get plan with all slots |
| POST | `/finance/installment/slots/:slotId/pay` | SALES_CREATE | Record slot payment |

**Create plan body:**
```json
{
  "shopId": "...",
  "invoiceId": "...",
  "customerId": "...",
  "totalAmount": 18000,
  "downPayment": 3000,
  "tenureMonths": 5,
  "startDate": "2026-03-17",
  "notes": "Customer is regular, trusted"
}
```
Auto-generates 5 monthly slots starting from April. Monthly = (18000-3000)/5 = ₹3000/mo. Last slot absorbs rounding.

**Record payment body:**
```json
{
  "paidAmount": 3000,
  "receiptId": "optional-receipt-id"
}
```

---

## Business Logic

### Auto Slot Generation
When a plan is created with `tenureMonths = N`:
- Generates N `InstallmentSlot` records
- `dueDate` = startDate + 1 month, +2 months, ... +N months
- `amount` = `ceil(remaining / N)` for all except last slot
- Last slot = `remaining - monthly * (N-1)` (absorbs rounding)

### Plan Completion
After each slot payment, the service checks if all slots are `PAID` or `WAIVED`. If yes, plan status is set to `COMPLETED`.

### Overdue Detection
`POST /finance/installment/mark-overdue` (internal) — or trigger via cron — runs:
```sql
UPDATE mb_installment_slot
SET status = 'OVERDUE'
WHERE status = 'PENDING' AND dueDate < NOW()
```

### Paisa Convention
All DB storage is in **paisa** (integer). Division/multiplication happens only in service layer:
- `toPaisa(rupees)` = `Math.round(rupees * 100)`
- `fromPaisa(paisa)` = `paisa / 100`

### 1:1 Invoice Guard
Both `EmiApplication` and `InstallmentPlan` have `invoiceId UNIQUE`. The service checks for existing application before creating, throwing `BadRequestException` if one already exists.

---

## File Structure

```
apps/backend/src/modules/mobileshop/finance/
├── dto/
│   └── finance.dto.ts              # CreateEmiApplicationDto, CreateInstallmentPlanDto, RecordSlotPaymentDto, UpdateEmiStatusDto
├── emi-application.service.ts      # NBFC EMI lifecycle + summary KPIs
├── installment-plan.service.ts     # Kistikatta plan + slot generation + payment recording
├── finance.controller.ts           # REST controller
└── finance.module.ts               # Module registration

apps/mobibix-web/
├── src/services/finance.api.ts     # Typed fetch client
└── app/(app)/finance/page.tsx      # Dashboard + EMI list + plan list + plan detail modal
```

---

## Frontend Features

The `/finance` page provides:

1. **KPI Cards** — Pending EMI count/amount, Approved, Overdue slots, This-month collections
2. **Tab: NBFC EMI Applications** — Table with filter by status, modal to create new EMI
3. **Tab: Kistikatta Plans** — Cards with next-due slot, click → detail modal
4. **Plan Detail Modal** — Full slot timeline, inline payment recording per slot, progress bar

---

## Future Improvements (Not Yet Built)

- WhatsApp reminder on slot due date (hook into `reminderSentAt`)
- Cron job for `markOverdue()` (run nightly)
- PDF plan agreement generation
- Bulk overdue reporting to owner
- Integration with credit scoring / customer risk flag
