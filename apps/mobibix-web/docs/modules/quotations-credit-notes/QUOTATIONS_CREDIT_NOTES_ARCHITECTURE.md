# Quotations & Credit Notes — Architecture Documentation

> Added in: March 2026 session
> Vertical: MOBILE_SHOP
> Status: Schema + Frontend complete. Backend NestJS modules pending.

---

## Overview

Two new financial document types added to the MobiBix ERP:

- **Quotations** — pre-sale estimates sent to customers, convertible to Invoice or Job Card
- **Credit Notes** — post-sale adjustments issued to customers (sales returns, price corrections) or received from suppliers (purchase returns)

---

## Schema Changes (`apps/backend/prisma/schema.prisma`)

### New Models

#### `Quotation`
```prisma
model Quotation {
  id              String                @id @default(cuid())
  tenantId        String
  shopId          String
  quotationNumber String
  customerId      String?
  customerName    String
  customerPhone   String?
  quotationDate   DateTime              @default(now())
  subTotal        Float                 @default(0)
  gstAmount       Float                 @default(0)
  totalAmount     Float
  notes           String?
  status          QuotationStatus       @default(DRAFT)
  validityDays    Int                   @default(7)
  expiryDate      DateTime?
  linkedInvoiceId String?
  linkedJobCardId String?
  conversionType  QuotationConversionType?
  convertedAt     DateTime?
  convertedBy     String?
  financialYear   String?
  createdAt       DateTime              @default(now())
  updatedAt       DateTime              @updatedAt
  items           QuotationItem[]
  ...relations
  @@map("mb_quotation")
}
```

#### `QuotationItem`
```prisma
model QuotationItem {
  id            String    @id @default(cuid())
  quotationId   String
  shopProductId String?
  description   String
  quantity      Float
  price         Float
  gstRate       Float     @default(0)
  gstAmount     Float     @default(0)
  lineTotal     Float
  totalAmount   Float
  @@map("mb_quotation_item")
}
```

#### `CreditNote`
```prisma
model CreditNote {
  id               String           @id @default(cuid())
  tenantId         String
  shopId           String
  creditNoteNo     String
  date             DateTime         @default(now())
  financialYear    String?
  customerId       String?
  supplierId       String?
  linkedInvoiceId  String?
  linkedPurchaseId String?
  type             CreditNoteType
  reason           CreditNoteReason
  status           CreditNoteStatus @default(DRAFT)
  subTotal         Float
  gstAmount        Float
  totalAmount      Float
  appliedAmount    Float            @default(0)
  refundedAmount   Float            @default(0)
  notes            String?
  voidReason       String?
  voidedAt         DateTime?
  ...relations
  @@map("mb_credit_note")
}
```

#### `CreditNoteItem`
```prisma
model CreditNoteItem {
  id            String   @id @default(cuid())
  creditNoteId  String
  shopProductId String?
  description   String
  quantity      Float
  rate          Float
  hsnCode       String?
  gstRate       Float    @default(0)
  gstAmount     Float    @default(0)
  lineTotal     Float
  restockItem   Boolean  @default(false)  // ← controls inventory restock
  @@map("mb_credit_note_item")
}
```

#### `CreditNoteApplication`
```prisma
model CreditNoteApplication {
  id           String    @id @default(cuid())
  creditNoteId String
  invoiceId    String?   // offset against customer invoice
  purchaseId   String?   // offset against supplier invoice
  amount       Float
  appliedAt    DateTime  @default(now())
  appliedBy    String
  @@map("mb_credit_note_application")
}
```

### New Enums

```prisma
enum QuotationStatus {
  DRAFT | SENT | ACCEPTED | REJECTED | EXPIRED | CONVERTED
}

enum QuotationConversionType {
  INVOICE | JOB_CARD
}

enum CreditNoteType {
  CUSTOMER  // issued to customer (sales return, price adjustment)
  SUPPLIER  // received from supplier (purchase return)
}

enum CreditNoteReason {
  SALES_RETURN | PURCHASE_RETURN | PRICE_ADJUSTMENT
  DISCOUNT_POST_SALE | OVERBILLING | WARRANTY_CLAIM
}

enum CreditNoteStatus {
  DRAFT | ISSUED | PARTIALLY_APPLIED | FULLY_APPLIED | REFUNDED | VOIDED
}
```

### Modified Enums

- `DocumentType` — added `CREDIT_NOTE`
- `QuotationStatus` — added `CONVERTED`

---

## Document Numbering

Both documents registered in `DocumentNumberService.initializeShopDocumentSettings()`:

| Document | Code | Format Example |
|---|---|---|
| `QUOTATION` | `Q` | `HP-Q-2526-0001` |
| `CREDIT_NOTE` | `CN` | `HP-CN-2526-0001` |

File: `apps/backend/src/common/services/document-number.service.ts`

---

## Business Flow

### Quotation Lifecycle

```
Create (DRAFT)
  → Send to customer (SENT)
    → Customer accepts (ACCEPTED)
      → Convert to Invoice (CONVERTED, conversionType=INVOICE)
      → Convert to Job Card (CONVERTED, conversionType=JOB_CARD)
    → Customer rejects (REJECTED)
    → Validity expires (EXPIRED)
```

**Conversion rules:**
- `INVOICE` conversion: creates Sales Invoice from quotation items, preserves GST rates, links via `linkedInvoiceId`
- `JOB_CARD` conversion: creates Job Card, requires device fields (type, brand, model, complaint), links via `linkedJobCardId`
- Only `ACCEPTED` or `SENT` quotations can be converted (not DRAFT/REJECTED/EXPIRED)

### Credit Note Lifecycle

```
Create (DRAFT)
  → Issue (ISSUED) — becomes usable
    → Apply against Invoice/Purchase (PARTIALLY_APPLIED → FULLY_APPLIED)
    → Mark as Cash Refund (REFUNDED)
    → Void (VOIDED) — requires reason
```

**`restockItem` flag:**
- When `true` on a `CreditNoteItem`, the returned goods go back to inventory stock (creates StockLedger entry with positive quantity)
- When `false`, it's a financial-only credit (price adjustment, service discount, etc.)

---

## Financial Impact

| Credit Note Type | Effect on Receivables | Effect on Payables | Inventory |
|---|---|---|---|
| CUSTOMER | Reduces what customer owes | — | Optional restock |
| SUPPLIER | — | Reduces what we owe supplier | Optional restock |

`CreditNoteApplication` tracks partial offsets — a ₹5000 CN can be applied as ₹2000 against Invoice A and ₹3000 against Invoice B.

---

## Frontend Implementation

### API Services
- `apps/mobibix-web/src/services/quotations.api.ts` — full typed API
- `apps/mobibix-web/src/services/credit-notes.api.ts` — full typed API

### Pages
- `apps/mobibix-web/app/(app)/quotations/page.tsx` — quotations list with create/convert modals
- `apps/mobibix-web/app/(app)/credit-notes/page.tsx` — credit notes list with issue/void modals

### Sidebar
- `Quotations` nav item added (after Job Cards, `ClipboardList` icon)
- `Credit Notes` nav item added (after Supplier Invoices, `FileMinus` icon)
- Both require `SALES_VIEW` permission

### Suppliers page
- Link to `/credit-notes?type=SUPPLIER` added to replace manual notice

---

## Backend Modules (Pending Implementation)

The following NestJS modules still need to be built:

### Quotations Module
- Path: `apps/backend/src/modules/mobileshop/quotations/`
- Files needed: `quotations.controller.ts`, `quotations.service.ts`, `quotations.module.ts`
- DTOs: `create-quotation.dto.ts`, `update-quotation.dto.ts`, `convert-quotation.dto.ts`
- Route prefix: `mobileshop/shops/:shopId/quotations`

**Key endpoints:**
```
GET    /mobileshop/shops/:shopId/quotations            — list with filters
GET    /mobileshop/shops/:shopId/quotations/:id        — single quotation
POST   /mobileshop/shops/:shopId/quotations            — create
PATCH  /mobileshop/shops/:shopId/quotations/:id        — update (DRAFT only)
POST   /mobileshop/shops/:shopId/quotations/:id/status — change status
POST   /mobileshop/shops/:shopId/quotations/:id/convert — convert to invoice/job card
DELETE /mobileshop/shops/:shopId/quotations/:id        — delete (DRAFT only)
```

**Conversion logic:**
1. Validate quotation is ACCEPTED or SENT
2. If `conversionType = INVOICE`: call `InvoiceService.createFromQuotation(quotation)`
3. If `conversionType = JOB_CARD`: call `JobCardsService.createFromQuotation(quotation, deviceDetails)`
4. Set `quotation.status = CONVERTED`, `linkedInvoiceId/linkedJobCardId`, `convertedAt`, `convertedBy`

### Credit Notes Module
- Path: `apps/backend/src/modules/mobileshop/credit-notes/`
- Files needed: `credit-notes.controller.ts`, `credit-notes.service.ts`, `credit-notes.module.ts`
- Route prefix: `mobileshop/shops/:shopId/credit-notes`

**Key endpoints:**
```
GET    /mobileshop/shops/:shopId/credit-notes           — list
GET    /mobileshop/shops/:shopId/credit-notes/:id       — single
POST   /mobileshop/shops/:shopId/credit-notes           — create
POST   /mobileshop/shops/:shopId/credit-notes/:id/issue — DRAFT → ISSUED
POST   /mobileshop/shops/:shopId/credit-notes/:id/apply — apply against invoice
POST   /mobileshop/shops/:shopId/credit-notes/:id/refund — mark as cash refunded
POST   /mobileshop/shops/:shopId/credit-notes/:id/void  — void with reason
```

**Apply logic:**
1. Validate `appliedAmount <= (totalAmount - appliedAmount - refundedAmount)`
2. Create `CreditNoteApplication` record
3. Update `creditNote.appliedAmount += amount`
4. Update status: if `appliedAmount + refundedAmount >= totalAmount` → `FULLY_APPLIED` else `PARTIALLY_APPLIED`
5. If `restockItem = true` on any items: create `StockLedger` entries

---

## Integration Points

- `DocumentNumberService` — generates `Q-` and `CN-` document numbers
- `StockService` — called on credit note apply when `restockItem = true`
- `InvoiceService` — called during quotation→invoice conversion
- `JobCardsService` — called during quotation→job card conversion
- Both modules: `@ModuleScope(ModuleType.MOBILE_SHOP)` + `@Roles(OWNER, STAFF)`
