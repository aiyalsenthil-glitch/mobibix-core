# Trade-In / Buyback Module — Implementation Documentation

> **Status:** Production-ready as of 2026-03-17
> **Vertical:** MOBILE_SHOP
> **Base Route:** `/trade-in`
> **Module:** `apps/backend/src/modules/mobileshop/tradein/`

---

## Overview

Enables mobile shops to formally manage device buy-back / trade-in flows. A shop can assess a customer's old device, record condition checks, auto-grade it with AI scoring, offer a buyback price, and link the trade-in credit to a new invoice.

---

## Database Schema

### `mb_trade_in`
```
id, tenantId, shopId
tradeInNumber   TEXT    -- TRD-0001 format
customerId      TEXT?   -- optional link to Party
customerName    TEXT    -- always stored directly (denormalized)
customerPhone   TEXT
deviceBrand     TEXT    -- "Apple", "Samsung"
deviceModel     TEXT    -- "iPhone 13", "Galaxy S22"
deviceImei      TEXT?
deviceStorage   TEXT?   -- "128GB"
deviceColor     TEXT?
conditionChecks Json    -- { screenCracked: bool, cameraWorking: bool, ... }
conditionGrade  TradeInGrade  -- EXCELLENT | GOOD | FAIR | POOR
marketValue     INT     -- paisa (estimated resale value)
offeredValue    INT     -- paisa (price offered to customer)
status          TradeInStatus -- DRAFT | OFFERED | ACCEPTED | REJECTED | COMPLETED
linkedInvoiceId TEXT?   -- set when trade-in credit applied to an invoice
notes           TEXT?
createdBy       TEXT    -- User.id
createdAt, updatedAt
```

### Enums
```
TradeInGrade:  EXCELLENT | GOOD | FAIR | POOR
TradeInStatus: DRAFT | OFFERED | ACCEPTED | REJECTED | COMPLETED
```

---

## API Endpoints

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/trade-in` | SALES_CREATE | Create trade-in record |
| GET | `/trade-in?shopId=&status=&page=&limit=` | SALES_VIEW | List trade-ins |
| GET | `/trade-in/:id` | SALES_VIEW | Get one trade-in |
| PATCH | `/trade-in/:id/status` | SALES_CREATE | Update status (accept/reject/complete) |
| PATCH | `/trade-in/:id/offer` | SALES_CREATE | Update offered value + set OFFERED status |
| POST | `/trade-in/auto-grade` | SALES_VIEW | AI grade from condition checks |

---

## Auto-Grade Engine (`TradeInIntelligenceService`)

### Condition Check Keys (10 checkpoints)

| Key | Type | Weight |
|-----|------|--------|
| `screenCracked` | Defect | 25 pts |
| `waterDamage` | Defect | 20 pts |
| `bodyDamaged` | Defect | 10 pts |
| `batteryIssue` | Defect | 10 pts |
| `cameraWorking` | Feature | 8 pts |
| `chargingWorking` | Feature | 8 pts |
| `wifiWorking` | Feature | 6 pts |
| `fingerprintWorking` | Feature | 5 pts |
| `speakerWorking` | Feature | 4 pts |
| `micWorking` | Feature | 4 pts |

- **Defect present** (`true`) → deduct weight
- **Feature not working** (`false`) → deduct weight
- Score starts at 100, minimum 0

### Grade → Valuation Multiplier

| Grade | Score Range | % of Market Value Offered |
|-------|------------|--------------------------|
| EXCELLENT | 90-100 | 80% |
| GOOD | 75-89 | 65% |
| FAIR | 55-74 | 50% |
| POOR | 30-54 | 30% |
| JUNK | 0-29 | 10% |

### Auto-Grade Request
```json
POST /trade-in/auto-grade
{
  "conditionChecks": {
    "screenCracked": false,
    "bodyDamaged": false,
    "cameraWorking": true,
    "chargingWorking": true,
    "speakerWorking": true,
    "micWorking": true,
    "fingerprintWorking": true,
    "wifiWorking": true,
    "batteryIssue": false,
    "waterDamage": false
  },
  "marketValue": 15000
}
```

**Response:**
```json
{
  "grade": "EXCELLENT",
  "score": 100,
  "deductions": [],
  "valuationMultiplier": 0.80,
  "gradeLabel": "Excellent (Like New)",
  "recommendation": "Accept and resell as-is. High demand in used market.",
  "suggestedOffer": 12000
}
```

---

## Workflow

```
1. Staff opens Trade-in → NEW wizard
2. Step 1 — Device Info: brand, model, IMEI, storage, color, customer details
3. Step 2 — Condition: tick each of 10 condition checks
4. Step 3 — Valuation:
     a. Enter market value (check platforms like OLX/Cashify for reference)
     b. Click "Auto-Grade & Suggest Offer" → AI calculates score + suggested price
     c. Adjust offered value as needed
     d. Save (status = DRAFT)
5. Present offer to customer → PATCH /trade-in/:id/offer (status → OFFERED)
6. Customer accepts → status = ACCEPTED
7. Link to new sale invoice → status = COMPLETED
```

---

## Invoice Integration

When a trade-in is accepted and customer buys a new device:
- `Invoice.tradeInId` = tradeIn.id
- `Invoice.tradeInCredit` = offeredValue (paisa) → subtracted from invoice total

This allows the shop to credit the trade-in value against the new purchase on the same invoice.

---

## Frontend Wizard

3-step wizard at `/trade-in`:
1. **Device Info** — brand, model, IMEI, storage, color, customer name/phone
2. **Condition** — grade selector (manual) + 10-checkbox condition checklist
3. **Valuation** — market value → Auto-Grade button → suggested offer shown → confirm offer

List view shows all trade-ins with inline status dropdown.

---

## File Structure

```
apps/backend/src/modules/mobileshop/tradein/
├── dto/
│   └── tradein.dto.ts                       # CreateTradeInDto, UpdateTradeInStatusDto
├── tradein.service.ts                        # CRUD + paisa conversion
├── tradein.controller.ts                     # REST + auto-grade endpoint
├── tradein-intelligence.service.ts           # Condition scoring + grade engine
└── tradein.module.ts

apps/mobibix-web/
├── src/services/tradein.api.ts               # API client + AutoGradeResult type
└── app/(app)/trade-in/page.tsx               # 3-step wizard + list
```
