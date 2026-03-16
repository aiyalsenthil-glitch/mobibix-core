# Staff Commission Module — Implementation Documentation

> **Status:** Production-ready as of 2026-03-16
> **Vertical:** MOBILE_SHOP (via core)
> **Base Route:** `/commission`
> **Module:** `apps/backend/src/core/commission/`

---

## Overview

The Staff Commission module automatically calculates and tracks sales commissions for shop staff. It fires on every `invoice.created` event and supports 3 commission types across 3 targeting scopes.

---

## Database Schema

### `mb_commission_rule`
```
id, tenantId, shopId
name        TEXT    -- "Mobile Sales 5%"
applyTo     CommissionScope  -- ALL_STAFF | SPECIFIC_STAFF | SPECIFIC_ROLE
staffId     TEXT?   -- only when SPECIFIC_STAFF
staffRole   UserRole? -- only when SPECIFIC_ROLE
category    TEXT?   -- product category filter (null = all categories)
type        CommissionType   -- PERCENTAGE_OF_SALE | PERCENTAGE_OF_PROFIT | FIXED_PER_ITEM
value       DECIMAL -- % (for percentage types) or rupees (for FIXED_PER_ITEM)
isActive    BOOLEAN -- soft toggle
createdAt, updatedAt
```

### `mb_staff_earning`
```
id, tenantId, shopId, staffId, invoiceId, ruleId
saleAmount    INT   -- paisa (lineTotal of matched invoice item)
profitAmount  INT   -- paisa (saleAmount - cost*qty)
earned        INT   -- paisa (calculated commission)
status        EarningStatus -- PENDING | PAID
paidAt        TIMESTAMP
createdAt
```

---

## API Endpoints

### Commission Rules

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| POST | `/commission/rules` | STAFF_MANAGE | Create rule |
| GET | `/commission/rules?shopId=` | STAFF_MANAGE | List rules |
| PATCH | `/commission/rules/:id/toggle?active=true` | STAFF_MANAGE | Toggle active |
| DELETE | `/commission/rules/:id` | STAFF_MANAGE | Delete rule |

**Create rule body:**
```json
{
  "shopId": "...",
  "name": "Accessories 3%",
  "applyTo": "ALL_STAFF",
  "type": "PERCENTAGE_OF_SALE",
  "value": 3,
  "category": "ACCESSORIES"
}
```

### Earnings

| Method | Path | Permission | Description |
|--------|------|-----------|-------------|
| GET | `/commission/earnings?shopId=&staffId=&status=&page=&limit=` | STAFF_VIEW | List earnings |
| POST | `/commission/earnings/mark-paid` | STAFF_MANAGE | Bulk mark paid |

**Mark paid body:**
```json
{ "earningIds": ["id1", "id2", "id3"] }
```

---

## Auto-Calculation Engine

Triggered by `@OnEvent('invoice.created')` in `CommissionService`:

```
invoice.created event
  → load invoice with items (including product.category, lastPurchasePrice)
  → load staff user (role)
  → load active commission rules for shop
  → for each rule:
      if SPECIFIC_STAFF: skip if rule.staffId !== invoice.createdBy
      if SPECIFIC_ROLE:  skip if rule.staffRole !== staff.role
      for each invoice item:
        if rule.category set: skip if item.product.category !== rule.category
        calculate:
          saleAmount   = item.lineTotal (paisa)
          profitAmount = max(0, saleAmount - costPerUnit * qty)
          earned = ...
            PERCENTAGE_OF_SALE:   earned = saleAmount * value / 100
            PERCENTAGE_OF_PROFIT: earned = profitAmount * value / 100
            FIXED_PER_ITEM:       earned = value(rupees) * 100 * qty
        if earned > 0: push to earningsToCreate[]
  → prisma.staffEarning.createMany(earningsToCreate)
```

**Error isolation:** The event handler is wrapped in try/catch — commission calculation failure never blocks invoice creation.

---

## Frontend (Commission Tab in Staff Management)

Located at `/staff-management` (4th tab: "Commission").

**Sub-tabs:**
1. **Rules** — Create/toggle/delete rules, shop selector, form with scope/type/value
2. **Earnings** — Paginated list, filter by status, bulk checkbox select → "Mark Paid" action

---

## File Structure

```
apps/backend/src/core/commission/
├── dto/
│   └── commission.dto.ts              # CreateCommissionRuleDto, MarkPaidDto
├── commission.service.ts              # Rule CRUD + event handler + calculation
├── commission.controller.ts           # REST endpoints
└── commission.module.ts

apps/mobibix-web/
├── src/services/commission.api.ts
└── app/(app)/staff-management/components/CommissionTab.tsx
```

---

## Commission Rule Examples

| Name | applyTo | category | type | value | Effect |
|------|---------|----------|------|-------|--------|
| All Sales 2% | ALL_STAFF | — | PERCENTAGE_OF_SALE | 2 | Every staff earns 2% of every sale |
| Mobile Profit 10% | ALL_STAFF | MOBILE | PERCENTAGE_OF_PROFIT | 10 | 10% of profit margin on mobiles |
| Fixed ₹50/accessory | SPECIFIC_ROLE | ACCESSORIES | FIXED_PER_ITEM | 50 | ₹50 per accessory unit sold |
| Senior bonus 5% | SPECIFIC_STAFF | — | PERCENTAGE_OF_SALE | 5 | Only for one named staff member |
