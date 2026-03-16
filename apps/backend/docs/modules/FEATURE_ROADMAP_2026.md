# MobiBix Feature Roadmap 2026

**Created:** 2026-03-16
**Status:** In Progress

---

## Implementation Sequence

```
Week 1 — Quick wins
  F1: Dynamic UPI QR on Invoice
  F2: WhatsApp Share Invoice Button

Week 2 — Staff Commission
  F3: Staff Commission Tracking

Week 3 — Trade-in
  F4: Trade-in / Buyback Workflow

Week 4 — Inventory Intelligence
  F5: Price Drop Protection
  F7: Predictive Demand Forecasting

Week 5+ — Compliance
  F6: E-way Bill (NIC API)
```

---

## F1 — Dynamic UPI QR on Invoice
**Priority:** High | **Effort:** Small

### What's missing
- `Shop.upiId` field (UPI VPA e.g. "shopname@ybl")
- QR code generation from UPI deep link
- Render QR in print templates

### Schema change
```prisma
// Shop model
upiId  String?   // UPI VPA e.g. "shopname@ybl"
```

### Backend
1. Migration: `npx prisma migrate dev --name add_shop_upiId`
2. `UpdateShopSettingsDto` — add `upiId?: string`
3. New util `src/core/sales/upi-qr.util.ts`:
```ts
import * as QRCode from 'qrcode';  // npm i qrcode @types/qrcode
export async function generateUpiQrBase64(upiId, amountPaisa, invoiceNumber) {
  const amount = (amountPaisa / 100).toFixed(2);
  const uri = `upi://pay?pa=${upiId}&am=${amount}&cu=INR&tn=Invoice%20${invoiceNumber}`;
  return QRCode.toDataURL(uri, { width: 180, margin: 1 });
}
```
4. `SalesService.getInvoiceDetails()` — attach QR if shop.upiId exists
5. Print adapter already maps `qrCode` field — no change needed

### Frontend
- Shop settings: "UPI ID" text input
- Print templates (CLASSIC, THERMAL): `<img src={qrCode}>` with "Scan to Pay" label
- Invoice detail: QR preview before print

### Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | +`upiId` on Shop |
| `src/core/shops/dto/update-shop-settings.dto.ts` | +`upiId` |
| `src/core/shops/shops.service.ts` | pass `upiId` in update |
| `src/core/sales/upi-qr.util.ts` | **new** |
| `src/core/sales/sales.service.ts` | call util in getInvoiceDetails |
| print templates | render QR image |
| web: shop settings page | UPI ID input |

---

## F2 — WhatsApp Share Invoice Button
**Priority:** High | **Effort:** Small

### What's missing
- One backend endpoint to trigger invoice WhatsApp send
- UI button on invoice detail/list

### WhatsApp Template (pre-register in Meta Business Manager)
```
Template name: invoice_ready
Category: UTILITY
Body: "Hi {{1}}, your invoice *{{2}}* for *₹{{3}}* is ready. View & download: {{4}}"
```

### Backend
```ts
// sales.controller.ts
@Post('invoice/:invoiceId/share/whatsapp')
@Permissions(Permission.MOBILE_SHOP.SALES.VIEW)
async shareInvoiceWhatsApp(@Param('invoiceId') invoiceId, @CurrentUser() user)

// sales.service.ts
async shareInvoiceViaWhatsApp(tenantId, invoiceId) {
  const invoice = await this.prisma.invoice.findFirstOrThrow({ where: { id: invoiceId, tenantId }, include: { shop: true } });
  if (!invoice.customerPhone) throw new BadRequestException('No customer phone');
  const publicLink = `https://REMOVED_DOMAIN/i/${invoiceId}`;
  const amount = (invoice.totalAmount / 100).toFixed(2);
  await this.whatsAppSender.sendTemplateMessage(
    tenantId, 'BILLING', invoice.customerPhone, 'invoice_ready',
    [invoice.customerName, invoice.invoiceNumber, amount, publicLink],
  );
}
```

### Frontend
- Invoice list row action: "Share WhatsApp" button
- Invoice detail: "Send to WhatsApp" button
- Toast: "Invoice sent to +91XXXXXXXXXX"

### Files
| File | Change |
|------|--------|
| `src/core/sales/sales.service.ts` | +`shareInvoiceViaWhatsApp()` |
| `src/core/sales/sales.controller.ts` | +`POST .../share/whatsapp` |
| `src/core/sales/sales.module.ts` | Import `WhatsAppModule` |
| web: invoice list/detail | Share button + toast |

---

## F3 — Staff Commission Tracking
**Priority:** High | **Effort:** Medium

### Schema — 2 new models + 3 enums
```prisma
model CommissionRule {
  id        String   @id @default(cuid())
  tenantId  String
  shopId    String
  name      String
  applyTo   CommissionScope   // ALL_STAFF | SPECIFIC_STAFF | SPECIFIC_ROLE
  staffId   String?
  staffRole UserRole?
  category  String?
  type      CommissionType    // PERCENTAGE_OF_SALE | PERCENTAGE_OF_PROFIT | FIXED_PER_ITEM
  value     Decimal
  isActive  Boolean @default(true)
  createdAt DateTime @default(now())
  shop      Shop   @relation(...)
  tenant    Tenant @relation(...)
  earnings  StaffEarning[]
  @@map("mb_commission_rule")
}

model StaffEarning {
  id           String   @id @default(cuid())
  tenantId     String
  shopId       String
  staffId      String
  invoiceId    String
  ruleId       String
  saleAmount   Int
  profitAmount Int?
  earned       Int
  status       EarningStatus @default(PENDING)
  paidAt       DateTime?
  createdAt    DateTime @default(now())
  rule         CommissionRule @relation(...)
  @@map("mb_staff_earning")
}

enum CommissionScope { ALL_STAFF, SPECIFIC_STAFF, SPECIFIC_ROLE }
enum CommissionType  { PERCENTAGE_OF_SALE, PERCENTAGE_OF_PROFIT, FIXED_PER_ITEM }
enum EarningStatus   { PENDING, APPROVED, PAID }
```

### Backend
- `CommissionService.calculateForInvoice(tenantId, invoice)` — match rules → create StaffEarning records
- Hook: `SalesService.createInvoice()` emits `invoice.created` → `@OnEvent` in CommissionService
- Routes: CRUD for rules + earnings list + bulk mark PAID

### Frontend
- Staff page: "Commission Rules" tab
- Reports → Staff Commission: table by staff, date filter, "Mark Paid" bulk action

---

## F4 — Trade-in / Buyback
**Priority:** High | **Effort:** Large

### Schema — 1 new model + 2 enums
```prisma
model TradeIn {
  id              String   @id @default(cuid())
  tenantId        String
  shopId          String
  tradeInNumber   String
  customerId      String?
  customerName    String
  customerPhone   String
  deviceBrand     String
  deviceModel     String
  deviceImei      String?
  deviceStorage   String?
  deviceColor     String?
  conditionChecks Json     @default("{}")
  conditionGrade  TradeInGrade
  marketValue     Int      // paisa
  offeredValue    Int      // paisa
  status          TradeInStatus @default(DRAFT)
  linkedInvoiceId String?
  notes           String?
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  @@unique([shopId, tradeInNumber])
  @@map("mb_trade_in")
}

enum TradeInGrade  { EXCELLENT, GOOD, FAIR, POOR }
enum TradeInStatus { DRAFT, OFFERED, ACCEPTED, REJECTED, COMPLETED }
```

### Grade → Deduction
```ts
const GRADE_MULTIPLIER = { EXCELLENT: 0.85, GOOD: 0.65, FAIR: 0.45, POOR: 0.25 };
// offeredValue = marketValue × multiplier
```

### Condition Checklist
```ts
{ screenCondition: 'PERFECT'|'MINOR_SCRATCHES'|'CRACKED',
  bodyCondition: 'PERFECT'|'MINOR_DENTS'|'DAMAGED',
  batteryHealth: number (0-100),
  cameraWorking: boolean, chargingPortWorking: boolean,
  speakerWorking: boolean, boxIncluded: boolean, chargerIncluded: boolean }
```

### Frontend — 3-step wizard
- Step 1: Customer + Device Info
- Step 2: Condition checklist (live grade badge)
- Step 3: Offer value (editable) + link to POS

---

## F5 — Price Drop Protection
**Priority:** Medium | **Effort:** Medium

### Schema
```prisma
model SupplierPriceAlert {
  id                 String   @id @default(cuid())
  tenantId           String
  shopId             String
  shopProductId      String
  supplierId         String
  affectedPurchaseId String
  newGrnId           String
  previousPrice      Int
  newPrice           Int
  priceDrop          Int
  quantityAtRisk     Int
  potentialCredit    Int
  status             PriceAlertStatus @default(PENDING)
  creditNoteId       String?
  dismissedAt        DateTime?
  createdAt          DateTime @default(now())
  @@map("mb_supplier_price_alert")
}
enum PriceAlertStatus { PENDING, CLAIMED, DISMISSED }
```

### Also add to ShopProduct
```prisma
lastPurchaseSupplierId  String?  // track supplier for price comparison
```

### Detection
- Trigger: GRN confirmation → for each item, if `confirmedPrice < product.lastPurchasePrice` AND same supplier → create `SupplierPriceAlert`

### Routes
```
GET  /api/stock/price-alerts
POST /api/stock/price-alerts/:id/claim   → creates Supplier CreditNote (PRICE_ADJUSTMENT)
PATCH /api/stock/price-alerts/:id/dismiss
```

---

## F6 — E-way Bill (NIC API)
**Priority:** Medium | **Effort:** Large

### Schema
```prisma
model EWayBill {
  id              String   @id @default(cuid())
  tenantId        String
  shopId          String
  invoiceId       String?
  ewbNumber       String?
  ewbDate         DateTime?
  validUpto       DateTime?
  transMode       String   // ROAD | RAIL | AIR | SHIP
  vehicleNumber   String?
  transporterId   String?
  transporterName String?
  distance        Int?
  status          EWayBillStatus @default(DRAFT)
  rawResponse     Json?
  generatedAt     DateTime?
  cancelledAt     DateTime?
  createdAt       DateTime @default(now())
  @@map("mb_eway_bill")
}
enum EWayBillStatus { DRAFT, GENERATED, CANCELLED }
```

### NIC API Integration
- Endpoint: `https://einv-apisandbox.nic.in/ewaybillapi/v1.03/ewayapi`
- Auth: GSTIN + password → session token
- Required: Supplier GSTIN, Buyer GSTIN, Invoice#, HSN, quantity, value, vehicle#
- Condition: invoice.totalAmount > ₹50,000 AND B2B (customerGstin present)

---

## F7 — Predictive Demand Forecasting
**Priority:** Medium | **Effort:** Medium

### Architecture
- New tool in `apps/ai-core/src/tools/implementations/demand-forecast.tool.ts`
- Backend endpoint: `GET /api/mobileshop/reports/demand-forecast?shopId=xxx`
- Calls ai-core internally

### Algorithm
- Last 90 days StockLedger OUT (SALE) grouped by product+week
- Simple moving average → weekly velocity
- Days to stockout = currentQty / avgWeeklySales × 7
- Flag: <7 days = CRITICAL, 7-14 = LOW, >14 = OK

### SQL
```sql
SELECT sl."shopProductId",
       DATE_TRUNC('week', sl."createdAt") as week,
       SUM(sl.quantity) as weekly_out,
       sp.name, sp.quantity as current_stock
FROM mb_stock_ledger sl
JOIN mb_shop_product sp ON sp.id = sl."shopProductId"
WHERE sl."tenantId" = $1 AND sl."shopId" = $2
  AND sl.type = 'OUT' AND sl."referenceType" = 'SALE'
  AND sl."createdAt" > NOW() - INTERVAL '90 days'
GROUP BY sl."shopProductId", week, sp.name, sp.quantity
ORDER BY sl."shopProductId", week
```

### Frontend widget
- Inventory page: "Reorder Alerts" tab
- Columns: Product | Stock | Avg Weekly Sales | Days to Stockout | Status Badge
- "Create PO" quick action per row

---

## Codebase Conventions (reference)
- Money: Paisa integers in DB; `Math.round(rupees * 100)` ↔ `amount / 100`
- IDs: `cuid()` everywhere
- All models scoped by `tenantId`
- Row-lock pattern: `SELECT...FOR UPDATE` on stock ops
- Events via `EventEmitter2` for cross-service triggers
- `TransformInterceptor` wraps non-`/mobileshop/*` routes
- IMEI model has no `shopId` — shop via `ShopProduct.shopId` relation
