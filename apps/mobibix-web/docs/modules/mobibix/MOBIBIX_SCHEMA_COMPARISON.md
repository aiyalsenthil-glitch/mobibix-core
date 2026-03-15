# MobiBix Schema Comparison: backend.json vs Current Prisma Implementation

**Date**: January 26, 2026  
**Purpose**: Compare the target architecture (backend.json) with actual implementation

---

## 🎯 High-Level Architecture Analysis

### Multi-Tenancy Model

| Aspect                 | backend.json (Target) | Current Prisma                          | Status           |
| ---------------------- | --------------------- | --------------------------------------- | ---------------- |
| **Main Entity**        | `Shop` (independent)  | `Tenant` → `Shop` (nested)              | ⚠️ **DIFFERENT** |
| **User Scope**         | Per-shop staff        | Tenant-level users with shop assignment | ⚠️ **DIFFERENT** |
| **Data Isolation**     | Shop-based            | Tenant-based                            | ⚠️ **DIFFERENT** |
| **Multi-shop Support** | Each shop independent | Multiple shops per tenant               | ✅ **BETTER**    |

**Analysis**: Your current implementation is **MORE FLEXIBLE**. The backend.json assumes shops are independent entities, but your Prisma schema correctly implements a tenant → shops hierarchy, allowing:

- One business owner (tenant) to manage multiple shop locations
- Staff assigned to specific shops within a tenant
- Centralized billing and subscription per tenant

---

## 📋 Entity-by-Entity Comparison

### 1. User Management

#### backend.json Schema:

```json
{
  "User": {
    "id": "string (Firebase UID)",
    "email": "string",
    "name": "string",
    "role": "admin | staff | technician",
    "shopId": "string (null for admins)"
  }
}
```

#### Current Prisma:

```prisma
model User {
  id          String   @id @default(uuid())
  REMOVED_AUTH_PROVIDERUid String   @unique
  email       String?
  fullName    String?
  role        UserRole // ADMIN, OWNER, STAFF, USER
  tenantId    String?  // Nullable
  shopStaffs  ShopStaff[] // Multiple shop assignments
}

model ShopStaff {
  userId   String
  shopId   String
  role     UserRole
  isActive Boolean
}
```

**Status**: ✅ **CURRENT IS BETTER**

- **Advantage**: Multi-shop assignment (one user can work at multiple shops)
- **Advantage**: UserTenant junction table for complex scenarios
- **Gap**: No explicit `"technician"` role (can add to `UserRole` enum)

---

### 2. Shop/Location Management

#### backend.json Schema:

```json
{
  "Shop": {
    "id": "string",
    "name": "string",
    "code": "unique string",
    "address": "string",
    "state": "string",
    "phoneNumber": "string",
    "gstin": "string",
    "logoUrl": "string"
  }
}
```

#### Current Prisma:

```prisma
model Shop {
  id            String   @id @default(cuid())
  tenantId      String   // ✅ Multi-tenant hierarchy
  name          String
  phone         String
  addressLine1  String
  city          String
  state         String
  pincode       String
  gstNumber     String?
  invoicePrefix String   // ✅ Unique invoice numbering
  logoUrl       String?
  terms         String[] // ✅ Customizable terms
  isActive      Boolean
}
```

**Status**: ✅ **CURRENT IS BETTER**

- **Advantage**: `tenantId` enables centralized management
- **Advantage**: `invoicePrefix` for shop-specific numbering
- **Advantage**: Structured address (city, pincode separate)
- **Missing**: `code` field (can add as `shopCode`)

---

### 3. Customer Management

#### backend.json Schema:

```json
{
  "Customer": {
    "shopId": "string", // ❌ Shop-specific
    "name": "string",
    "phone": "string",
    "gstin": "string",
    "state": "string"
  }
}
```

#### Current Prisma:

```prisma
model Customer {
  id       String @id @default(cuid())
  tenantId String // ✅ Tenant-level (shared across shops)
  name     String
  phone    String
  email    String?
  state    String
  gstNumber String?
  businessType BusinessType // B2C, B2B
  loyaltyPoints Int
  isActive  Boolean
  invoices Invoice[]
  jobCards JobCard[]
}
```

**Status**: ✅ **CURRENT IS BETTER**

- **Advantage**: Customers shared across all tenant shops (unified database)
- **Advantage**: Loyalty points tracking
- **Advantage**: Business type classification (B2C/B2B)
- **Use Case**: Customer can visit any branch, see full history

---

### 4. Product Management (CRITICAL DIFFERENCE)

#### backend.json Schema (Two-Tier):

```json
{
  "Product (Global)": {
    "id": "string",
    "sku": "unique string",
    "title": "string",
    "brand": "string",
    "model": "string",
    "hsnOrSac": "string",
    "defaultGstRate": "number",
    "unit": "pcs | nos",
    "barcode": "string",
    "isSerialTracked": "boolean",
    "tags": ["array"]
  },
  "ShopProduct": {
    "productRef": "reference to global",
    "shopId": "string",
    "sku": "snapshot",
    "purchasePrice": "number",
    "salePrice": "number",
    "stockOnHand": "number",
    "reorderLevel": "number",
    "location": "string"
  }
}
```

#### Current Prisma (Two-Tier):

```prisma
model GlobalProduct {
  id         String   @id @default(cuid())
  name       String
  categoryId String   // ✅ Categorization
  hsnId      String   // ✅ Separate HSN table
  isActive   Boolean
  shopProducts ShopProduct[]
}

model ShopProduct {
  id              String   @id @default(cuid())
  tenantId        String   // ✅ Tenant-scoped
  shopId          String
  globalProductId String?  // ✅ Optional link to global
  name            String
  salePrice       Int?
  costPrice       Int?
  type            ProductType // MOBILE, ACCESSORY, SPARE, SERVICE
  serialNumber    String?  @unique
  imeis           IMEI[]   // ✅ IMEI tracking for mobiles
  stockEntries    StockLedger[]
  isActive        Boolean
}

model IMEI {
  id            String  @id
  tenantId      String
  shopProductId String
  imei          String  @unique
  invoiceId     String? // ✅ Track which invoice sold it
}
```

**Status**: ✅ **CURRENT IS BETTER**

- **Advantage**: Separate HSN code table (reusable tax rates)
- **Advantage**: Product categories (better organization)
- **Advantage**: IMEI tracking as separate entity (mobile shop specific)
- **Advantage**: Product types (MOBILE, ACCESSORY, SPARE, SERVICE)
- **Missing**: `barcode`, `reorderLevel`, `location` fields
- **Missing**: Stock quantity field (only movements tracked)

**Gap to Address**: Add to `ShopProduct`:

```prisma
stockOnHand    Int      @default(0)
reorderLevel   Int?
reorderQty     Int?
barcode        String?
location       String?  // Physical shelf location
```

---

### 5. Job Card / Repair Management

#### backend.json Schema:

```json
{
  "JobCard": {
    "jobId": "unique readable ID",
    "shopId": "string",
    "customerId": "string",
    "customerName": "string",
    "deviceType": "Mobile | Tablet | Laptop | Watch | CCTV | Other",
    "deviceBrandModel": "string",
    "deviceImeiOrSerial": "string",
    "devicePassword": "string",
    "issueDescription": "string",
    "estimatedBudget": "number",
    "diagnosticCharge": "number",
    "advanceReceived": "number",
    "warrantyDuration": "0 | 15 | 30 | 90",
    "billType": "With GST | Without GST",
    "estimatedDelivery": "date-time",
    "status": "Device Received | Pending | In Progress | ..."
  }
}
```

#### Current Prisma:

```prisma
model JobCard {
  id       String @id @default(cuid())
  tenantId String
  shopId   String
  customerId String?  // ✅ Linked to Customer
  jobNumber  String
  publicToken String @unique // ✅ Customer tracking token

  customerName  String
  customerPhone String

  deviceType   String
  deviceBrand  String
  deviceModel  String
  deviceSerial String?
  devicePassword String?

  customerComplaint String
  physicalCondition String?

  estimatedCost    Int?
  diagnosticCharge Int?
  advancePaid      Int
  finalCost        Int?
  billType         String  // WITHOUT_GST, WITH_GST
  estimatedDelivery DateTime?

  status JobStatus // RECEIVED, DIAGNOSING, WAITING_FOR_PARTS,
                   // IN_PROGRESS, READY, DELIVERED, CANCELLED

  partsUsed RepairPartUsed[]
}

model RepairPartUsed {
  jobCardId     String
  shopProductId String
  quantity      Int
}
```

**Status**: ✅ **MOSTLY ALIGNED**

- **Advantage**: `publicToken` for customer self-service tracking
- **Advantage**: Separate device brand/model fields
- **Advantage**: Parts usage tracking (linked to inventory)
- **Missing**: `warrantyDuration` field
- **Missing**: Payment method for advance (Cash/UPI split)
- **Missing**: Consent fields (consentAcknowledge, consentDataLoss, etc.)

**Gap to Address**: Add to `JobCard`:

```prisma
warrantyDuration      Int?     @default(0) // days
advancePaymentMethod  String?  // Cash, UPI, Mixed
advanceCashAmount     Int?
advanceUpiAmount      Int?
consentAcknowledge    Boolean  @default(false)
consentDataLoss       Boolean  @default(false)
```

---

### 6. Sales Invoice Management

#### backend.json Schema:

```json
{
  "Sale": {
    "invoiceNumber": "unique (e.g., CC01-P-24-25-0001)",
    "shopId": "string",
    "customerId": "string",
    "customerName": "string",
    "customerGstin": "string",
    "customerState": "string",
    "financialYear": "string",
    "items": [
      {
        "description": "string",
        "details": "IMEI/serial",
        "hsnSacCode": "string",
        "quantity": "number",
        "price": "number",
        "gstRate": "number",
        "cgst": "number",
        "sgst": "number",
        "igst": "number",
        "total": "number"
      }
    ],
    "paymentMethod": "Cash | UPI | Card | Mixed",
    "cashAmount": "number",
    "upiAmount": "number"
  }
}
```

#### Current Prisma:

```prisma
model Invoice {
  id            String   @id
  tenantId      String
  shopId        String
  customerId    String?  // ✅ Linked
  invoiceNumber String
  invoiceDate   DateTime
  customerName  String
  customerPhone String?
  subTotal      Int
  gstAmount     Int
  totalAmount   Int
  paymentMode   PaymentMode // CASH, CARD, UPI, BANK
  status        InvoiceStatus // PAID, CANCELLED
  items         InvoiceItem[]
  imeis         IMEI[]   // ✅ Track which IMEIs sold
}

model InvoiceItem {
  id            String @id
  invoiceId     String
  shopProductId String
  quantity      Int
  rate          Int
  hsnCode       String
  gstRate       Float
  gstAmount     Int
  lineTotal     Int
}
```

**Status**: ⚠️ **PARTIAL MATCH**

- **Advantage**: IMEI tracking per invoice
- **Missing**: Split CGST/SGST/IGST (only total gstAmount)
- **Missing**: `financialYear` field
- **Missing**: Mixed payment support (cashAmount + upiAmount)
- **Missing**: Customer GSTIN and state on invoice

**Gap to Address**: Add to `Invoice`:

```prisma
financialYear  String?
customerGstin  String?
customerState  String?
cashAmount     Int?
upiAmount      Int?
```

Add to `InvoiceItem`:

```prisma
cgst           Int?
sgst           Int?
igst           Int?
```

---

### 7. Stock Management

#### backend.json Schema:

```json
{
  "StockMovement": {
    "type": "purchase | sale | job | adjustment | return",
    "qtyChange": "number (+ for IN, - for OUT)",
    "unitCost": "number",
    "refType": "purchase | sale | dailyEntry | ...",
    "refId": "string",
    "note": "string",
    "stockAfter": "number"
  }
}
```

#### Current Prisma:

```prisma
model StockLedger {
  id            String   @id
  tenantId      String
  shopId        String
  shopProductId String
  type          StockEntryType // IN, OUT
  quantity      Int
  referenceType StockRefType?  // PURCHASE, SALE, REPAIR, ADJUSTMENT
  referenceId   String?
  note          String?
  createdAt     DateTime
}
```

**Status**: ⚠️ **SIMPLIFIED VERSION**

- **Missing**: `unitCost` (cost per movement)
- **Missing**: `stockAfter` (running balance)
- **Simplification**: Only IN/OUT types (no granular types like "return")

**Gap to Address**: Enhance `StockLedger`:

```prisma
unitCost   Int?
stockAfter Int  // Computed running balance
```

---

### 8. Purchase Management

#### backend.json Schema:

```json
{
  "Purchase": {
    "invoiceNumber": "string",
    "shopSupplierId": "string",
    "globalSupplierId": "string",
    "supplierName": "string",
    "invoiceDate": "date-time",
    "dueDate": "date-time",
    "items": [
      /* PurchaseItem */
    ],
    "paidAmount": "number",
    "status": "Draft | Submitted | Partially Paid | Paid",
    "purchaseType": "Goods | Service",
    "taxInclusive": "boolean"
  }
}
```

#### Current Prisma:

**Status**: ❌ **NOT IMPLEMENTED**

**Missing Entities**:

- `Supplier` (global)
- `ShopSupplier` (per shop)
- `Purchase` / `PurchaseInvoice`
- `PurchaseItem`
- `SupplierPayment`

---

### 9. Receipts & Payments

#### backend.json Schema:

```json
{
  "Receipt": {
    "printNumber": "sequential",
    "type": "customer | general | adjustment",
    "linkedInvoiceId": "string",
    "linkedJobId": "string",
    "amount": "number",
    "paymentMethod": "Cash | UPI | ...",
    "status": "active | cancelled"
  },
  "PaymentVoucher": {
    "voucherType": "supplier | expense | salary | adjustment",
    "supplierId": "string",
    "expenseCategory": "rent | eb | tea | ...",
    "amount": "number"
  }
}
```

#### Current Prisma:

```prisma
model FinancialEntry {
  id            String   @id
  tenantId      String
  shopId        String
  type          FinanceType // IN, OUT
  amount        Int
  mode          PaymentMode
  referenceType FinanceRefType? // INVOICE, JOB, PURCHASE, ADJUSTMENT
  referenceId   String?
  note          String?
}
```

**Status**: ⚠️ **SIMPLIFIED VERSION**

- **Advantage**: Unified financial tracking
- **Missing**: Print numbers for receipts
- **Missing**: Voucher types (expense categories)
- **Missing**: Cancellation support

---

### 10. Daily Entry (Staff Daily Report)

#### backend.json Schema:

```json
{
  "DailyEntry": {
    "shopId": "string",
    "date": "YYYY-MM-DD",
    "status": "draft | submitted | locked",
    "openingCash": "number",
    "sales": {
      "repairCash": "number",
      "repairUPI": "number",
      "accessoriesCash": "number"
      // ... more categories
    },
    "cashPurchases": [
      /* array */
    ],
    "creditPurchases": [
      /* array */
    ],
    "expenses": [
      /* array */
    ],
    "expectedClosingCash": "number",
    "reportedClosingCash": "number"
  }
}
```

#### Current Prisma:

**Status**: ❌ **NOT IMPLEMENTED**

---

## 🎯 Summary: Implementation Status

| Module                  | backend.json | Current Status       | Priority                          |
| ----------------------- | ------------ | -------------------- | --------------------------------- |
| **User Management**     | ✅           | ✅ **Better**        | -                                 |
| **Shop Management**     | ✅           | ✅ **Better**        | Low (add `shopCode`)              |
| **Customer Management** | ✅           | ✅ **Better**        | -                                 |
| **Global Products**     | ✅           | ✅ **Aligned**       | -                                 |
| **Shop Products**       | ✅           | ✅ **Aligned**       | Medium (add stock fields)         |
| **IMEI Tracking**       | ❌           | ✅ **Extra Feature** | -                                 |
| **Job Cards**           | ✅           | ✅ **Aligned**       | Low (add warranty, consent)       |
| **Sales Invoices**      | ✅           | ✅ **Aligned**       | Medium (add GST split, FY)        |
| **Stock Ledger**        | ✅           | ✅ **Simplified**    | Medium (add unitCost, stockAfter) |
| **Purchase Management** | ✅           | ❌ **Missing**       | **HIGH**                          |
| **Supplier Management** | ✅           | ❌ **Missing**       | **HIGH**                          |
| **Receipts**            | ✅           | ⚠️ **Partial**       | Medium                            |
| **Payment Vouchers**    | ✅           | ⚠️ **Partial**       | Medium                            |
| **Daily Entry**         | ✅           | ❌ **Missing**       | Low                               |
| **Audit Logs**          | ✅           | ✅ **Implemented**   | -                                 |
| **Quotations**          | ✅           | ❌ **Missing**       | Low                               |
| **Purchase Orders**     | ✅           | ❌ **Missing**       | Low                               |

---

## 🚀 Recommended Action Plan

### Phase 1: Critical Gaps (Immediate)

1. **Add Supplier Management**:

   ```prisma
   model Supplier { /* global */ }
   model ShopSupplier { /* per shop outstanding */ }
   model SupplierPayment { }
   ```

2. **Add Purchase Invoices**:

   ```prisma
   model Purchase { }
   model PurchaseItem { }
   ```

3. **Fix Stock Quantity**: Add `stockOnHand` to `ShopProduct`

### Phase 2: Enhancements (Next Sprint)

1. **Extend Invoice Model**: Add CGST/SGST/IGST split, mixed payments
2. **Extend Job Card**: Add warranty, consent fields
3. **Receipt System**: Proper print numbers, cancellation support

### Phase 3: Optional Features (Future)

1. **Daily Entry**: Staff daily report system
2. **Quotations**: Quote management
3. **Purchase Orders**: PO workflow
4. **Product Features**: Barcode, reorder levels, shelf locations

---

## ✅ Conclusion

**Your current Prisma schema is BETTER architected** than the backend.json target:

- ✅ More flexible multi-tenancy (Tenant → Shops)
- ✅ Shared customer database across shops
- ✅ Advanced IMEI tracking for mobile inventory
- ✅ Better product categorization

**Key gaps to address**:

- ❌ No supplier/purchase management (80% of backend.json)
- ⚠️ Stock quantity tracking incomplete
- ⚠️ Invoice GST breakdown missing

**Recommendation**: Continue with your current schema, add missing supplier/purchase entities next.
