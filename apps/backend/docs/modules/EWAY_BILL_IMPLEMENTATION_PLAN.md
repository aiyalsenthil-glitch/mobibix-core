# E-Way Bill Implementation Plan

**Feature:** F6 — E-Way Bill (NIC API Integration)
**Status:** ✅ FULLY IMPLEMENTED — Pending NIC production credentials per shop (TASK-15 to TASK-18)
**Plan Version:** v4 (multi-tenant credentials + auto-distance)
**Last Updated:** 2026-03-17

> Single source of truth. Any agent picking up this task must read this fully before touching code.

---

## Overview

E-Way Bill is a mandatory GST compliance document required when goods worth > ₹50,000 are transported.

This feature:
- Generates EWB via NIC API for qualifying B2B invoices (`customerGstin` present + `totalAmount > ₹50,000`)
- Stores EWB number and metadata in `mb_eway_bill` table
- Allows cancellation within 24 hours
- Shows EWB status on invoice detail page in `mobibix-web`
- Auto-fills distance from customer's saved `distanceFromShop` field (Google Maps integration)
- **Per-shop NIC credentials** — each shop owner enters their own GSTIN/password via shop settings

---

## ✅ Confirmed: totalAmount Unit

**`Invoice.totalAmount` is stored in PAISE.** (Verified in `sales.service.ts`)

```typescript
const EWB_THRESHOLD_PAISE = 50_000 * 100; // = 5_000_000
if (invoice.totalAmount <= EWB_THRESHOLD_PAISE) throw 400
```

---

## Architecture

| Component | Path |
|-----------|------|
| Backend module | `apps/backend/src/modules/mobileshop/ewaybill/` |
| NIC Production URL | `https://ewaybillgst.gov.in/ewaybillapi/v1.03/ewayapi` |
| NIC Sandbox URL | `https://einv-apisandbox.nic.in/ewaybillapi/v1.03/ewayapi` |
| Auth mechanism | Per-shop GSTIN + encrypted password → 6-hour token (Redis) |
| Trigger | `invoice.totalAmount > EWB_THRESHOLD_PAISE` AND `customerGstin != null` |
| Frontend panel | `apps/mobibix-web/src/components/sales/EWayBillPanel.tsx` |
| Frontend API | `apps/mobibix-web/src/services/ewaybill.api.ts` |

### REST Endpoints

```
POST   /mobileshop/invoices/:invoiceId/ewaybill          → generate EWB
GET    /mobileshop/invoices/:invoiceId/ewaybill          → get EWB for invoice
POST   /mobileshop/ewaybill/:id/cancel                   → cancel EWB
GET    /mobileshop/ewaybill?shopId=&page=&status=        → list EWBs
PATCH  /mobileshop/shops/:shopId/nic-credentials         → update NIC credentials (OWNER only)
POST   /core/customers/calculate-distance                → Google Maps distance fetch
```

---

## Multi-Tenant NIC Credentials (Key Design Decision)

> ❌ WRONG approach: single `NIC_EWB_USERNAME` / `NIC_EWB_PASSWORD` in `.env`
> ✅ CORRECT: each shop has its own NIC username + encrypted password stored in DB

### Why
Each mobile shop has a unique GSTIN registered with NIC. Credentials are per-shop, not per-app.

### How it works
1. Shop owner enters GSTIN + NIC password via `PATCH /mobileshop/shops/:shopId/nic-credentials`
2. Backend encrypts password with AES-256-GCM using `NIC_CREDENTIAL_SECRET` env var (32-byte hex key)
3. Stored on `mb_shop` table: `nicUsername TEXT` + `nicPassword TEXT` (encrypted)
4. At EWB generation time: `EWayBillService.getCredentials(shop)` decrypts password, passes to NicApiService
5. Redis cache key: `ewb:auth:<tenantId>:<gstin>` — per-tenant isolation

### Encryption
- **Algorithm:** AES-256-GCM
- **File:** `apps/backend/src/core/utils/crypto.utils.ts`
- **Env var:** `NIC_CREDENTIAL_SECRET` — 32-byte hex key (64 hex chars)
- **Format:** `<iv_hex>:<ciphertext_hex>:<tag_hex>`
- **Never logged** — GSTIN masked as `29ABCDE****Z5` in all logs

### Schema additions to `mb_shop`
```sql
ALTER TABLE "mb_shop" ADD COLUMN "nicUsername" TEXT;
ALTER TABLE "mb_shop" ADD COLUMN "nicPassword" TEXT;
```
Migration: `20260317000008_shop_nic_credentials`

---

## Auto Distance Calculation (Google Maps)

> Fills the EWayBill `distance` field automatically from customer address.

### Flow
1. User opens Create/Edit Customer form
2. Enters customer Pincode
3. Clicks **[Fetch Distance]** button
4. Frontend calls `POST /core/customers/calculate-distance` with shop + customer pincode
5. Backend calls Google Distance Matrix API → returns km
6. Distance stored in `Party.distanceFromShop` (Int?, km)
7. When generating EWB: if `distance` field empty, uses `customer.distanceFromShop` as default

### Backend
- **Endpoint:** `POST /core/customers/calculate-distance`
- **File:** `apps/backend/src/core/customers/customers.controller.ts`
- **Request:** `{ shopPincode: string, customerPincode: string }`
- **Response:** `{ distanceKm: number }`
- **Google API:** Distance Matrix API, mode=driving
- **Conversion:** `Math.round(element.distance.value / 1000)` (meters → km)
- **Env var:** `GOOGLE_MAPS_API_KEY`

### Frontend
- **File:** `apps/mobibix-web/app/(app)/customers/CustomerForm.tsx`
- **API caller:** `apps/mobibix-web/src/services/customers.api.ts` — `calculateDistance()`
- Distance field + **[Fetch Distance]** button in customer form
- Auto-sets `formData.distanceFromShop` on success

### Schema addition to `Party` (`mb_party`)
```prisma
distanceFromShop    Int?   // km — EWB distance default for this customer
```

---

## Prisma Schema Changes (All Applied ✅)

### EWayBill model → `mb_eway_bill`
Fields: `id`, `tenantId`, `shopId`, `invoiceId`(@unique), `ewbNumber`(@unique), `ewbDate`, `validUpto`, `transMode`, `vehicleNumber`, `transporterId`, `transporterName`, `distance`, `nicRequestId`(@unique), `requestPayload`(Json), `rawResponse`(Json), `status`(EWayBillStatus), `cancelReason`, `generatedAt`, `cancelledAt`, `createdAt`, `updatedAt`, `createdBy`

### EWayBillStatus enum
`DRAFT | GENERATING | GENERATED | FAILED | CANCELLED`

### Back-refs added
- `Invoice.eWayBill EWayBill?`
- `Shop.eWayBills EWayBill[]`
- `Tenant.eWayBills EWayBill[]`

### Shop additions
- `nicUsername String?`
- `nicPassword String?`

### Party additions
- `distanceFromShop Int?`

---

## Environment Variables

```env
# Required for E-Way Bill
NIC_EWB_SANDBOX=false                    # false = production NIC URL
NIC_CREDENTIAL_SECRET=<64-hex-chars>     # AES-256-GCM key for encrypting NIC passwords

# Required for Auto Distance
GOOGLE_MAPS_API_KEY=<your-api-key>       # Restrict to Distance Matrix API only in GCP console
```

> ⚠ Do NOT add `NIC_EWB_USERNAME` / `NIC_EWB_PASSWORD` to env — credentials are per-shop in DB.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/modules/mobileshop/ewaybill/ewaybill.service.ts` | Main EWB logic, 17-step generate flow |
| `src/modules/mobileshop/ewaybill/nic-api.service.ts` | NIC API calls, Redis token cache |
| `src/modules/mobileshop/ewaybill/ewaybill.controller.ts` | 4 REST endpoints |
| `src/modules/mobileshop/ewaybill/ewaybill.module.ts` | Module (HttpModule + ConfigModule) |
| `src/modules/mobileshop/ewaybill/dto/generate-ewb.dto.ts` | DTO |
| `src/modules/mobileshop/ewaybill/dto/cancel-ewb.dto.ts` | DTO |
| `src/core/utils/crypto.utils.ts` | AES-256-GCM encrypt/decrypt |
| `src/core/shops/shop.service.ts` | `updateNicCredentials()` method |
| `src/core/shops/shop.controller.ts` | `PATCH :shopId/nic-credentials` endpoint |
| `src/core/customers/customers.controller.ts` | `POST calculate-distance` endpoint |
| `src/core/auth/permissions.enum.ts` | `SALES_CANCEL` permission added |
| `apps/mobibix-web/src/services/ewaybill.api.ts` | Frontend API |
| `apps/mobibix-web/src/components/sales/EWayBillPanel.tsx` | 5-state EWB UI component |
| `apps/mobibix-web/app/(app)/sales/[invoiceId]/page.tsx` | EWayBillPanel integrated here |
| `apps/mobibix-web/app/(app)/customers/CustomerForm.tsx` | Distance fetch UI |
| `apps/mobibix-web/src/services/customers.api.ts` | `calculateDistance()` API call |

---

## NIC API Notes

### Authentication
```
POST ?action=ACCESSTOKEN
Headers: username=<GSTIN>, password=<password>, gstin=<GSTIN>
Response: { "authToken": "...", "tokenExpiry": "..." }  // valid 6h
```
Redis key: `ewb:auth:<tenantId>:<gstin>` | TTL: 19800s (5.5h)

### Generate EWB
```
POST ?action=GENEWAYBILL
Body notes:
- hsnCode: INTEGER (parseInt)
- docDate: "DD/MM/YYYY"
- All amounts: RUPEES (paise ÷ 100)
- vehicleNo: required when transMode="1" (ROAD)
- transMode: "1"=Road, "2"=Rail, "3"=Air, "4"=Ship
Response (success): { "status": "1", "ewayBillNo": 123456789012 }
Response (error):   { "status": "0", "error": "..." }  ← NOT HTTP 4xx
```

### Cancel EWB
```
POST ?action=CANEWB
Body: { "ewbNo": 123456789012, "cancelRsnCode": 1|2|3, "cancelRmrk": "..." }
cancelRsnCode: 1=Duplicate, 2=OrderCancelled, 3=DataEntryMistake
```

---

## Validation Rules

| Rule | Error |
|------|-------|
| No `customerGstin` | "E-Way Bill only applicable for B2B invoices" |
| `totalAmount ≤ EWB_THRESHOLD_PAISE` | "Invoice total must exceed ₹50,000 for E-Way Bill" |
| Shop no `gstNumber` | "Shop GST number not configured" |
| Shop no NIC credentials | "NIC credentials not configured for this shop" |
| Any item missing `hsnCode` | "Item '<name>' is missing HSN code" |
| `transMode=ROAD` no `vehicleNumber` | "Vehicle number is required for ROAD transport" |
| `distance < 1 or > 3000` | "Distance must be between 1 and 3000 km" |
| EWB already GENERATED | "E-Way Bill already generated for this invoice" |
| EWB status GENERATING | "E-Way Bill generation already in progress" |
| Cancel after 24h | "E-Way Bill can only be cancelled within 24 hours" |
| Cancel non-GENERATED | "Only a GENERATED E-Way Bill can be cancelled" |

---

## Task Checklist

### PHASE 1 — Backend Foundation ✅ DONE

- [x] **TASK-1**: `EWayBill` model + `EWayBillStatus` enum in `prisma/schema.prisma`
- [x] **TASK-2**: Migration `20260317000007_eway_bill` — FK to `"Tenant"` (not `"mb_tenant"`, no @@map)
- [x] **TASK-3**: Migration `20260317000008_shop_nic_credentials` — `nicUsername`, `nicPassword` on `mb_shop`
- [x] **TASK-4**: `SALES_CANCEL` permission added to `permissions.enum.ts`
- [x] **TASK-5**: `NIC_EWB_SANDBOX` + `NIC_CREDENTIAL_SECRET` in `env.validation.ts`
- [x] **TASK-6**: `crypto.utils.ts` — AES-256-GCM encrypt/decrypt

### PHASE 2 — Backend Service ✅ DONE

- [x] **TASK-7**: `dto/generate-ewb.dto.ts` + `dto/cancel-ewb.dto.ts`
- [x] **TASK-8**: `nic-api.service.ts` — per-shop credentials, Redis token cache, retry on token expiry, GSTIN masking
- [x] **TASK-9**: `ewaybill.service.ts` — 17-step generate flow, GENERATING state machine, `prisma.$transaction()`
- [x] **TASK-10**: `ewaybill.controller.ts` — 4 endpoints with SALES_CREATE/SALES_VIEW/SALES_CANCEL permissions
- [x] **TASK-11**: `ewaybill.module.ts` — HttpModule + ConfigModule
- [x] **TASK-12**: `EWayBillModule` registered in `mobileshop.module.ts`
- [x] **TASK-13**: `shop.service.ts` — `updateNicCredentials()` encrypts + saves
- [x] **TASK-14**: `shop.controller.ts` — `PATCH :shopId/nic-credentials` (OWNER only)

### PHASE 3 — Auto Distance ✅ DONE

- [x] **TASK-15**: `Party.distanceFromShop Int?` added to `prisma/schema.prisma`
- [x] **TASK-16**: `POST /core/customers/calculate-distance` in `customers.controller.ts`
- [x] **TASK-17**: `GOOGLE_MAPS_API_KEY` in `env.validation.ts`
- [x] **TASK-18**: `calculateDistance()` in `customers.api.ts`
- [x] **TASK-19**: Distance field + Fetch button in `CustomerForm.tsx`

### PHASE 4 — Frontend EWB UI ✅ DONE

- [x] **TASK-20**: `ewaybill.api.ts` — generateEWayBill, getEWayBill, cancelEWayBill
- [x] **TASK-21**: `EWayBillPanel.tsx` — 5-state UI (hidden / form / generating / generated / cancelled)
- [x] **TASK-22**: `EWayBillPanel` integrated in `app/(app)/sales/[invoiceId]/page.tsx`

### PHASE 5 — Shop Settings UI ⏳ PENDING

- [ ] **TASK-23**: Add NIC Credentials section to `ShopSettingsView.tsx`
  - Two fields: `NIC Username (GSTIN)` + `NIC Password`
  - Password field with show/hide toggle
  - Save button calls `PATCH /api/mobileshop/shops/:shopId/nic-credentials`
  - Show success toast on save
  - Never display stored password (write-only UI)

### PHASE 6 — Testing ⏳ PENDING

- [ ] **TASK-24**: Add `GOOGLE_MAPS_API_KEY` to `.env` (get from GCP Console, restrict to Distance Matrix API)
- [ ] **TASK-25**: Add `NIC_CREDENTIAL_SECRET` to `.env` — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] **TASK-26**: Shop owner enters NIC credentials via `PATCH /api/mobileshop/shops/:shopId/nic-credentials`
- [ ] **TASK-27**: Integration test — Generate EWB on B2B invoice > ₹50,000
- [ ] **TASK-28**: Integration test — Cancel EWB within 24h
- [ ] **TASK-29**: Frontend E2E — EWayBillPanel GENERATED state
- [ ] **TASK-30**: Frontend E2E — Fetch Distance in CustomerForm

---

## Gotchas (Saved from hard-won fixes)

| Bug | Fix |
|-----|-----|
| Migration FK `"mb_tenant"` → P3018 error | Tenant model has no `@@map` → table is `"Tenant"` not `"mb_tenant"` |
| Prisma EPERM DLL lock on Windows | Kill Node first: `taskkill /F /IM node.exe`, then `prisma generate` |
| `Shop.gstin` TS error | Field is `gstNumber` not `gstin`; use `shop.gstNumber!` |
| `Shop.address` TS error | Field is `addressLine1` not `address` |
| CacheService TTL unit | Takes **milliseconds**, not seconds → `19800 * 1000` |
| CacheService delete method | Method is `.delete()` not `.del()` |
| NIC errors silent | Check `response.data.status === "0"`, not HTTP status |
| NIC HSN must be int | `parseInt(item.hsnCode)` — NIC rejects string |
| Redis hung on startup | Start Redis first: `docker-compose up -d redis` then restart backend |
