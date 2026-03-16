# E-Way Bill Implementation Plan

**Feature:** F6 — E-Way Bill (NIC API Integration)
**Status:** NOT STARTED
**Plan Version:** v2 (reviewed & hardened)
**Date Created:** 2026-03-17

> This document is the single source of truth for implementing E-Way Bill.
> Any agent picking up this task should read this file fully before touching code.

---

## Overview

E-Way Bill is a mandatory GST compliance document required when goods worth > ₹50,000
are transported. This feature:
- Generates EWB via NIC API for qualifying B2B invoices (`customerGstin` present + `totalAmount > ₹50,000`)
- Stores EWB number and metadata in `mb_eway_bill` table
- Allows cancellation within 24 hours
- Shows EWB status on invoice detail page in `mobibix-web`

---

## ✅ Confirmed: totalAmount Unit

**`Invoice.totalAmount` is stored in PAISE.** (Verified in `sales.service.ts` — `totalAmount: totalAmountPaisa`)

```typescript
// CORRECT CONSTANT — use this everywhere, never hardcode
const EWB_THRESHOLD_PAISE = 50_000 * 100; // = 5_000_000

// Check:
if (invoice.totalAmount <= EWB_THRESHOLD_PAISE) throw 400
```

---

## Architecture

- **Module path:** `apps/backend/src/modules/mobileshop/ewaybill/`
- **NIC Sandbox URL:** `https://einv-apisandbox.nic.in/ewaybillapi/v1.03/ewayapi`
- **NIC Production URL:** `https://ewaybillgst.gov.in/ewaybillapi/v1.03/ewayapi`
- **Auth mechanism:** GSTIN + password → 6-hour OTP session token (cached in Redis)
- **Trigger condition:** `invoice.totalAmount > EWB_THRESHOLD_PAISE` AND `invoice.customerGstin != null`
- **Transport default:** ROAD
- **Storage:** All amounts in paisa in DB; NIC API receives rupees (divide by 100)
- **Generation:** Synchronous (Phase-1). Phase-2: BullMQ background job for resilience.

### REST Endpoint Design

```
POST   /invoices/:invoiceId/ewaybill          → generate EWB
GET    /invoices/:invoiceId/ewaybill          → get EWB for invoice
POST   /ewaybill/:id/cancel                   → cancel EWB
GET    /ewaybill?shopId=&page=&status=        → list EWBs
```

> Nested under `/invoices/:invoiceId/ewaybill` because EWB is per-invoice.

---

## Existing Infrastructure (DO NOT RECREATE)

| What | Where |
|------|--------|
| Invoice model with `customerGstin`, `shopGstin`, `totalAmount` (paise), `invoiceNumber`, `customerState` | `prisma/schema.prisma` line 1633 |
| InvoiceItem with `hsnCode` | `prisma/schema.prisma` line ~1701 |
| Shop with `state`, `stateCode`, `gstEnabled`, `gstin` | `prisma/schema.prisma` ~line 1195 |
| MobileshopModule | `src/modules/mobileshop/mobileshop.module.ts` |
| PrismaService | `src/core/prisma/prisma.service.ts` |
| `paiseToRupees` util | `src/core/utils/currency.utils.ts` |
| Redis (check injection pattern in other services) | `src/core/redis/` |
| JwtAuthGuard + `@Permissions()` | `src/core/auth/` |
| authenticatedFetch + extractData | `apps/mobibix-web/src/services/auth.api.ts` |

---

## NIC API Authentication

```
POST /ewaybillapi/v1.03/ewayapi?action=ACCESSTOKEN
Headers: username=<GSTIN>, password=<password>, gstin=<GSTIN>
Response: { "authToken": "...", "tokenExpiry": "..." }   // valid 6 hours
```

- Redis key: **`ewb:auth:<tenantId>:<gstin>`** (include tenantId for multi-tenant safety)
- TTL: **19800 seconds** (5.5 hours, slightly less than 6h to avoid expiry edge cases)
- On every EWB call: check Redis → if miss → re-authenticate → cache → return token

---

## NIC API: Generate E-Way Bill

```
POST /ewaybillapi/v1.03/ewayapi?action=GENEWAYBILL
Headers: Authorization: Bearer <authToken>, gstin: <GSTIN>

Body (critical notes):
- hsnCode: INTEGER (not string — do parseInt(item.hsnCode))
- docDate: "DD/MM/YYYY" format
- fromStateCode / toStateCode: INTEGER
- All amounts: RUPEES (float) — convert from paise
- vehicleNo: REQUIRED when transMode="1" (ROAD)
- transMode: "1"=Road, "2"=Rail, "3"=Air, "4"=Ship

Response (success): { "status": "1", "ewayBillNo": 123456789012, ... }
Response (error):   { "status": "0", "error": "..." }  ← NOT HTTP 4xx
```

**NIC Error Handling Rule:** Always check `response.status === "0"` not HTTP status code.
Throw `BadRequestException(response.error)` on status 0.

---

## NIC API: Cancel E-Way Bill

```
POST /ewaybillapi/v1.03/ewayapi?action=CANEWB
Body: { "ewbNo": 123456789012, "cancelRsnCode": 2, "cancelRmrk": "Duplicate" }
cancelRsnCode: 1=Duplicate, 2=OrderCancelled, 3=DataEntryMistake
```

---

## Prisma Schema Changes

### New model — add after Invoice model (~line 1699 in `schema.prisma`)

```prisma
model EWayBill {
  id              String         @id @default(cuid())
  tenantId        String
  shopId          String
  invoiceId       String         @unique  // one EWB per invoice

  ewbNumber       String?
  ewbDate         DateTime?
  validUpto       DateTime?

  transMode       String         @default("ROAD") // ROAD | RAIL | AIR | SHIP
  vehicleNumber   String?
  transporterId   String?
  transporterName String?
  distance        Int?           // km (1–3000)

  nicRequestId    String?        @unique  // idempotency — prevent duplicate EWB
  requestPayload  Json?          // NIC request body (for tax audits)
  rawResponse     Json?          // full NIC API response

  status          EWayBillStatus @default(DRAFT)
  cancelReason    String?
  generatedAt     DateTime?
  cancelledAt     DateTime?

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  createdBy       String?

  invoice         Invoice        @relation(fields: [invoiceId], references: [id])
  shop            Shop           @relation(fields: [shopId], references: [id])
  tenant          Tenant         @relation(fields: [tenantId], references: [id])

  @@index([tenantId, shopId])
  @@index([tenantId, ewbNumber])
  @@index([tenantId, status])
  @@map("mb_eway_bill")
}

enum EWayBillStatus {
  DRAFT
  GENERATING   // in-flight — prevents duplicate submissions
  GENERATED
  FAILED       // NIC returned error or timeout
  CANCELLED
}
```

### Back-references to add on existing models

```prisma
// In model Invoice, add:
eWayBill        EWayBill?

// In model Shop, add:
eWayBills       EWayBill[]

// In model Tenant, add:
eWayBills       EWayBill[]
```

---

## Migration SQL

**File:** `apps/backend/prisma/migrations/20260317000007_eway_bill/migration.sql`

```sql
-- Create EWayBillStatus enum
DO $$ BEGIN
  CREATE TYPE "EWayBillStatus" AS ENUM ('DRAFT', 'GENERATING', 'GENERATED', 'FAILED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create mb_eway_bill table
CREATE TABLE IF NOT EXISTS "mb_eway_bill" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT NOT NULL,
  "shopId"          TEXT NOT NULL,
  "invoiceId"       TEXT NOT NULL,
  "ewbNumber"       TEXT,
  "ewbDate"         TIMESTAMPTZ,
  "validUpto"       TIMESTAMPTZ,
  "transMode"       TEXT NOT NULL DEFAULT 'ROAD',
  "vehicleNumber"   TEXT,
  "transporterId"   TEXT,
  "transporterName" TEXT,
  "distance"        INTEGER,
  "nicRequestId"    TEXT,
  "requestPayload"  JSONB,
  "rawResponse"     JSONB,
  "status"          "EWayBillStatus" NOT NULL DEFAULT 'DRAFT',
  "cancelReason"    TEXT,
  "generatedAt"     TIMESTAMPTZ,
  "cancelledAt"     TIMESTAMPTZ,
  "createdAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "createdBy"       TEXT,
  CONSTRAINT "mb_eway_bill_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "mb_eway_bill_invoiceId_key"  UNIQUE ("invoiceId"),
  CONSTRAINT "mb_eway_bill_nicRequestId_key" UNIQUE ("nicRequestId"),
  CONSTRAINT "mb_eway_bill_invoiceId_fkey" FOREIGN KEY ("invoiceId")
    REFERENCES "mb_invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_eway_bill_shopId_fkey"   FOREIGN KEY ("shopId")
    REFERENCES "mb_shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "mb_eway_bill_tenantId_fkey" FOREIGN KEY ("tenantId")
    REFERENCES "mb_tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "mb_eway_bill_tenantId_shopId_idx"  ON "mb_eway_bill"("tenantId", "shopId");
CREATE INDEX IF NOT EXISTS "mb_eway_bill_tenantId_ewbNumber_idx" ON "mb_eway_bill"("tenantId", "ewbNumber");
CREATE INDEX IF NOT EXISTS "mb_eway_bill_tenantId_status_idx"  ON "mb_eway_bill"("tenantId", "status");
```

---

## Backend File Structure

```
apps/backend/src/modules/mobileshop/ewaybill/
├── dto/
│   ├── generate-ewb.dto.ts
│   └── cancel-ewb.dto.ts
├── ewaybill.controller.ts
├── ewaybill.service.ts
├── nic-api.service.ts
└── ewaybill.module.ts
```

---

## DTO Specifications

### `generate-ewb.dto.ts`
```typescript
import { IsString, IsOptional, IsInt, IsIn, Min, Max } from 'class-validator';

export class GenerateEWayBillDto {
  // transMode defaults to ROAD in service if not provided
  @IsIn(['ROAD', 'RAIL', 'AIR', 'SHIP'])
  @IsOptional()
  transMode?: string;

  // Required for ROAD — enforced in service (not DTO, because depends on transMode)
  @IsString()
  @IsOptional()
  vehicleNumber?: string;

  @IsString()
  @IsOptional()
  transporterId?: string;

  @IsString()
  @IsOptional()
  transporterName?: string;

  // NIC requires distance. Valid range: 1–3000 km
  @IsInt()
  @Min(1)
  @Max(3000)
  distance: number;
}
```

### `cancel-ewb.dto.ts`
```typescript
import { IsIn, IsString, IsOptional } from 'class-validator';

export class CancelEWayBillDto {
  @IsIn([1, 2, 3])
  cancelRsnCode: number; // 1=Duplicate, 2=OrderCancelled, 3=DataEntryMistake

  @IsString()
  @IsOptional()
  cancelRmrk?: string;
}
```

---

## Service Logic: `ewaybill.service.ts`

### Constants (top of file)
```typescript
const EWB_THRESHOLD_PAISE = 50_000 * 100; // 5_000_000 paise = ₹50,000
const EWB_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 hours in ms
const TRANS_MODE_MAP = { ROAD: '1', RAIL: '2', AIR: '3', SHIP: '4' } as const;
```

### `generateEWayBill(tenantId, userId, invoiceId, dto)` — Full flow

```
1. Load invoice + items (with hsnCode) + shop (gstin, stateCode, address) from Prisma
2. Validate invoice exists + belongs to tenantId + not deleted
3. Validate invoice.customerGstin is present → 400: "E-Way Bill only for B2B invoices"
4. Validate invoice.totalAmount > EWB_THRESHOLD_PAISE → 400: "Invoice total must exceed ₹50,000"
5. Validate shop.gstin present → 400: "Shop GST number not configured"
6. Validate ALL items have hsnCode → 400: "Item '<name>' missing HSN code"
7. Validate vehicleNumber required when transMode=ROAD → 400: "Vehicle number required for ROAD transport"
8. Validate distance in 1–3000 → 400: "Distance must be between 1 and 3000 km"
9. Check if mb_eway_bill exists for invoiceId with status GENERATED → 409: "EWB already generated"
10. Check if mb_eway_bill exists with status GENERATING → 409: "EWB generation already in progress"
11. Generate nicRequestId = cuid() for idempotency
12. Upsert mb_eway_bill with status=GENERATING (prevents double submission)
13. Build NIC payload:
    - Convert paise→rupees (divide by 100)
    - Parse date as "DD/MM/YYYY"
    - parseInt(item.hsnCode) for each item
    - Map transMode ROAD→"1", RAIL→"2", etc.
14. Call NicApiService.generateEWayBill(shop.gstin, payload)
    - On NIC error: update status=FAILED, store rawResponse, rethrow
    - On network timeout: update status=FAILED, throw 503
15. Parse response: ewayBillNo, ewayBillDate, validUpto
16. Update mb_eway_bill: status=GENERATED, ewbNumber, ewbDate, validUpto, rawResponse, generatedAt
17. Return EWayBill record
```

### `cancelEWayBill(tenantId, ewbId, dto)` — Cancel flow

```
1. Load mb_eway_bill record, verify tenantId
2. Validate status === GENERATED → 400: "Only GENERATED EWBs can be cancelled"
3. Validate generatedAt within 24h → 400: "EWB cannot be cancelled after 24 hours"
4. Call NicApiService.cancelEWayBill(shopGstin, ewbNumber, dto.cancelRsnCode, dto.cancelRmrk)
5. Update: status=CANCELLED, cancelledAt=now(), cancelReason=dto.cancelRmrk
6. Return updated record
```

### Other methods
- `getEWayBillByInvoice(tenantId, invoiceId)` — returns null if not found
- `listEWayBills(tenantId, shopId, page, status)` — paginated, 20 per page

---

## NIC API Service: `nic-api.service.ts`

```typescript
@Injectable()
export class NicApiService {
  private readonly logger = new Logger(NicApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly redis: /* inject Redis — check pattern in other services */,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = configService.get('NIC_EWB_BASE_URL');
  }

  private maskGstin(gstin: string): string {
    // 29ABCDE1234F1Z5 → 29ABCDE****Z5
    return gstin.slice(0, 7) + '****' + gstin.slice(-2);
  }

  private async getAuthToken(tenantId: string, gstin: string): Promise<string> {
    const redisKey = `ewb:auth:${tenantId}:${gstin}`;
    const cached = await this.redis.get(redisKey);
    if (cached) return cached;

    // POST to NIC /ACCESSTOKEN
    const response = await this.httpService.axiosRef.post(
      `${this.baseUrl}?action=ACCESSTOKEN`,
      {},
      {
        headers: {
          username: this.configService.get('NIC_EWB_USERNAME'),
          password: this.configService.get('NIC_EWB_PASSWORD'),
          gstin,
        },
        timeout: 15000,  // IMPORTANT: NIC can hang
      }
    );

    if (response.data.status === '0') {
      throw new BadRequestException(`NIC auth failed: ${response.data.error}`);
    }

    const token = response.data.authToken;
    await this.redis.setex(redisKey, 19800, token); // 5.5h TTL
    return token;
  }

  async generateEWayBill(tenantId: string, gstin: string, payload: object): Promise<any> {
    // Log masked GSTIN only — never full GSTIN
    this.logger.log(`Generating EWB for tenant=${tenantId} gstin=${this.maskGstin(gstin)}`);

    const token = await this.getAuthToken(tenantId, gstin);
    const response = await this.httpService.axiosRef.post(
      `${this.baseUrl}?action=GENEWAYBILL`,
      payload,
      {
        headers: { Authorization: `Bearer ${token}`, gstin },
        timeout: 15000,
      }
    );

    if (response.data.status === '0') {
      this.logger.error(`NIC EWB generation failed: ${response.data.error}`);
      throw new BadRequestException(`NIC API error: ${response.data.error}`);
    }

    return response.data;
  }

  async cancelEWayBill(tenantId: string, gstin: string, ewbNo: string, rsnCode: number, remark: string): Promise<void> {
    const token = await this.getAuthToken(tenantId, gstin);
    const response = await this.httpService.axiosRef.post(
      `${this.baseUrl}?action=CANEWB`,
      { ewbNo, cancelRsnCode: rsnCode, cancelRmrk: remark },
      {
        headers: { Authorization: `Bearer ${token}`, gstin },
        timeout: 15000,
      }
    );

    if (response.data.status === '0') {
      throw new BadRequestException(`NIC cancel failed: ${response.data.error}`);
    }
  }
}
```

**Note on rate limiting:** Add a Redis-based throttle guard in production:
```typescript
// In NicApiService before each outbound call:
const rateKey = `ewb:rate:${tenantId}`;
const count = await this.redis.incr(rateKey);
if (count === 1) await this.redis.expire(rateKey, 1); // 1-second window
if (count > 5) throw new TooManyRequestsException('NIC rate limit: max 5 req/sec');
```

---

## Controller: `ewaybill.controller.ts`

```typescript
// Route prefix: '' (mounted at sales routes level)
// Endpoints:
POST   /invoices/:invoiceId/ewaybill       → generate
GET    /invoices/:invoiceId/ewaybill       → get by invoice
POST   /ewaybill/:id/cancel               → cancel
GET    /ewaybill                          → list (shopId, page, status query params)
```

All endpoints: `@UseGuards(JwtAuthGuard)` + `@Permissions(Permission.SALES_CREATE / SALES_VIEW)`

---

## Module: `ewaybill.module.ts`

```typescript
@Module({
  imports: [
    HttpModule.register({ timeout: 15000 }),
    // PrismaModule if needed (or PrismaService is global)
  ],
  controllers: [EWayBillController],
  providers: [EWayBillService, NicApiService],
  exports: [EWayBillService],
})
export class EWayBillModule {}
```

Add `EWayBillModule` to `mobileshop.module.ts` imports.

---

## Environment Variables

Add to `.env` AND `.env.example`:

```
NIC_EWB_BASE_URL=https://einv-apisandbox.nic.in/ewaybillapi/v1.03/ewayapi
NIC_EWB_USERNAME=<sandbox-gstin>
NIC_EWB_PASSWORD=<sandbox-password>
NIC_EWB_SANDBOX=true
```

---

## Frontend

### `ewaybill.api.ts`

```typescript
export interface EWayBill {
  id: string;
  invoiceId: string;
  ewbNumber?: string;
  ewbDate?: string;
  validUpto?: string;
  status: 'DRAFT' | 'GENERATING' | 'GENERATED' | 'FAILED' | 'CANCELLED';
  vehicleNumber?: string;
  transMode: string;
  distance?: number;
  cancelReason?: string;
  generatedAt?: string;
  cancelledAt?: string;
}

// ALWAYS add !res.ok guard (known project bug: extractData doesn't check res.ok)
export async function generateEWayBill(invoiceId: string, dto: {...}): Promise<EWayBill>
export async function getEWayBill(invoiceId: string): Promise<EWayBill | null>
export async function cancelEWayBill(ewbId: string, dto: {...}): Promise<EWayBill>
```

### `EWayBillPanel.tsx` States

```
GSTIN missing OR amount ≤ ₹50,000 → render nothing (hidden)

No EWB / DRAFT / FAILED:
  → Warning banner "⚠ E-Way Bill Required"
  → Form: vehicleNumber, distance (km), transMode (ROAD/RAIL/AIR/SHIP)
  → Vehicle number input hidden/disabled when transMode ≠ ROAD
  → "Generate E-Way Bill" button

GENERATING:
  → Spinner "Generating with NIC..."

GENERATED:
  → Green badge with EWB number
  → "Valid until: <date>"
  → "Cancel" button (only shown if generatedAt within last 24h)

CANCELLED:
  → Grey badge "Cancelled"
  → Cancel reason shown
```

**GSTIN Validation (frontend, before submit):**
```typescript
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
if (!GSTIN_REGEX.test(invoice.customerGstin)) // warn user
```

### Integration Point

- Integrate `EWayBillPanel` into invoice detail page
- **Verify actual path first** (search `apps/mobibix-web/app` for `[id]` invoice detail page)
- Render: `<EWayBillPanel invoiceId={invoice.id} invoice={invoice} />`

---

## Validation Rules (Complete)

| Rule | Error Message |
|------|--------------|
| No `customerGstin` | "E-Way Bill only applicable for B2B invoices" |
| `totalAmount <= EWB_THRESHOLD_PAISE` | "Invoice total must exceed ₹50,000 for E-Way Bill" |
| Shop has no `gstin` | "Shop GST number not configured. Update shop settings." |
| Any item missing `hsnCode` | "Item '<productName>' is missing HSN code" |
| `transMode=ROAD` and no `vehicleNumber` | "Vehicle number is required for ROAD transport" |
| `distance < 1 or > 3000` | "Distance must be between 1 and 3000 km" |
| EWB status already GENERATED | "E-Way Bill already generated for this invoice" |
| EWB status GENERATING | "E-Way Bill generation already in progress" |
| Cancel after 24h | "E-Way Bill can only be cancelled within 24 hours of generation" |
| Cancel non-GENERATED status | "Only a GENERATED E-Way Bill can be cancelled" |

---

## Task Checklist

> Mark each task DONE by changing `[ ]` to `[x]`. Work strictly in order.

### PHASE 1 — Backend Foundation

- [ ] **TASK-1**: Add `EWayBill` model + `EWayBillStatus` enum to `prisma/schema.prisma`
  - Use exact schema from "Prisma Schema Changes" section above
  - Add back-refs: `eWayBill EWayBill?` on Invoice, `eWayBills EWayBill[]` on Shop + Tenant
  - File: `apps/backend/prisma/schema.prisma`

- [ ] **TASK-2**: Create migration SQL
  - File: `apps/backend/prisma/migrations/20260317000007_eway_bill/migration.sql`
  - Use exact SQL from "Migration SQL" section above

- [ ] **TASK-3**: Run `npx prisma generate`
  - **STOP BACKEND FIRST** (Windows DLL lock — backend must not be running)
  - Command: `cd apps/backend && npx prisma generate`
  - Verify: no TypeScript errors related to EWayBill type

- [ ] **TASK-4**: Add env vars
  - Add to `apps/backend/.env`: `NIC_EWB_BASE_URL`, `NIC_EWB_USERNAME`, `NIC_EWB_PASSWORD`, `NIC_EWB_SANDBOX`
  - Add same keys to `apps/backend/.env.example` (with placeholder values)

### PHASE 2 — Backend Service

- [ ] **TASK-5**: Create `dto/generate-ewb.dto.ts`
  - Use spec from "DTO Specifications" section
  - Note: vehicleNumber optional in DTO, enforced in service

- [ ] **TASK-6**: Create `dto/cancel-ewb.dto.ts`

- [ ] **TASK-7**: Create `nic-api.service.ts`
  - Check Redis injection pattern: search `@InjectRedis` or `getRedisToken` in `apps/backend/src/`
  - Implement `getAuthToken`, `generateEWayBill`, `cancelEWayBill`
  - Add `timeout: 15000` to all axios calls
  - Mask GSTIN in all log statements
  - Rate limiting Redis guard (5 req/sec per tenant)

- [ ] **TASK-8**: Create `ewaybill.service.ts`
  - Define `EWB_THRESHOLD_PAISE = 50_000 * 100` constant
  - Define `EWB_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000` constant
  - Define `TRANS_MODE_MAP` constant
  - Implement generate flow (17 steps listed above — follow order exactly)
  - Implement cancel flow (6 steps listed above)
  - Implement `getEWayBillByInvoice` and `listEWayBills`

- [ ] **TASK-9**: Create `ewaybill.controller.ts`
  - 4 endpoints with correct REST paths (see "Controller" section)
  - Import and use `@Permissions(Permission.SALES_CREATE)` and `@Permissions(Permission.SALES_VIEW)`

- [ ] **TASK-10**: Create `ewaybill.module.ts`
  - Import `HttpModule.register({ timeout: 15000 })`
  - Register `NicApiService`, `EWayBillService`, `EWayBillController`

- [ ] **TASK-11**: Register `EWayBillModule` in `mobileshop.module.ts`
  - Add to imports array (one line)

### PHASE 3 — Frontend

- [ ] **TASK-12**: Create `apps/mobibix-web/src/services/ewaybill.api.ts`
  - Implement `generateEWayBill`, `getEWayBill`, `cancelEWayBill`
  - **Always add `!res.ok` guard before `extractData`** (known project bug)
  - Export `EWayBill` interface (see spec above)

- [ ] **TASK-13**: Create `apps/mobibix-web/src/components/sales/EWayBillPanel.tsx`
  - 5-state UI: hidden | form | generating | generated | cancelled
  - Hide vehicleNumber field when transMode ≠ ROAD
  - Add GSTIN format validation before submit
  - Cancel button only shown when `generatedAt` within last 24h

- [ ] **TASK-14**: Find invoice detail page and integrate EWayBillPanel
  - Run: `find apps/mobibix-web/app -name "page.tsx" -path "*sales*"`
  - OR search for the invoice detail route (look for `params.id` or `invoiceId` usage in `app/(app)/sales/`)
  - Add `<EWayBillPanel invoiceId={...} invoice={invoice} />`

### PHASE 4 — Testing

- [ ] **TASK-15**: Get NIC Sandbox credentials
  - Register at: https://ewaybillgst.gov.in/Others/SandBox.aspx
  - OR use test credentials from NIC documentation
  - Update `.env` with real sandbox credentials

- [ ] **TASK-16**: Integration test — Generate EWB
  - Create B2B invoice with customerGstin + totalAmount > ₹50,000
  - `POST /api/invoices/:invoiceId/ewaybill` with `{ vehicleNumber: "KA01AB1234", distance: 100 }`
  - Verify: EWB number returned, `mb_eway_bill` status=GENERATED

- [ ] **TASK-17**: Integration test — Cancel EWB
  - Use EWB from TASK-16 (within 24h)
  - `POST /api/ewaybill/:id/cancel` with `{ cancelRsnCode: 2 }`
  - Verify: status=CANCELLED in DB

- [ ] **TASK-18**: Frontend E2E
  - Open invoice detail page for qualifying B2B invoice (> ₹50K, has customerGstin)
  - Verify EWayBillPanel renders with form
  - Fill distance + vehicle number → click Generate
  - Verify EWB number appears in GENERATED state

---

## Edge Cases Reference

| Case | Handling |
|------|----------|
| NIC auth token expired mid-request | NicApiService: retry once with fresh token (delete Redis key, re-auth) |
| NIC API down / timeout | catch → update status=FAILED → throw `ServiceUnavailableException` |
| GENERATING status already set | 409 Conflict (prevents race condition double submit) |
| FAILED status — user retries | Allow (upsert record, reset to GENERATING, try again) |
| Sandbox vs Production URL | Use `NIC_EWB_SANDBOX=true` to toggle in ConfigService |

---

## Key Notes for Any Agent Taking Over

1. **Read this entire file before touching code**
2. **Work tasks in strict order** — schema before service, service before frontend
3. **STOP backend before `prisma generate`** on Windows (EPERM DLL lock)
4. **`totalAmount` is in PAISE** — always use `EWB_THRESHOLD_PAISE` constant, never `> 50000`
5. **HSN must be integer for NIC** — `parseInt(item.hsnCode)` in every item mapping
6. **NIC errors use `status:"0"`** not HTTP 4xx — check response body, not HTTP status
7. **`!res.ok` guard required in all frontend API functions** — known extractData bug
8. **Log masking** — never log full GSTIN, use `maskGstin()` helper
9. **Redis key includes tenantId** — `ewb:auth:<tenantId>:<gstin>`
10. **axios timeout: 15000ms** on all NIC calls — NIC API can hang
