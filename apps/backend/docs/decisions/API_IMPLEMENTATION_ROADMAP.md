# MobiBix API Implementation Roadmap

## 🎯 API Endpoints to Implement

### 1. SUPPLIER MANAGEMENT

#### Global Suppliers (Tenant-wide)

```
POST   /api/suppliers                    Create new supplier
GET    /api/suppliers                    List all suppliers (tenant)
GET    /api/suppliers/:id                Get supplier details
PATCH  /api/suppliers/:id                Update supplier
DELETE /api/suppliers/:id                Delete supplier (soft delete)
GET    /api/suppliers/search/:query      Search suppliers by name
```

#### Shop-Specific Suppliers

```
POST   /api/shops/:shopId/suppliers      Add supplier to shop
GET    /api/shops/:shopId/suppliers      List shop suppliers
PATCH  /api/shops/:shopId/suppliers/:id  Update shop supplier info
GET    /api/suppliers/:id/outstanding    Get outstanding balance
```

---

### 2. PURCHASE MANAGEMENT

#### Purchase Invoices

```
POST   /api/purchases                    Create purchase invoice
GET    /api/purchases                    List purchases (with filters)
GET    /api/purchases/:id                Get purchase details
PATCH  /api/purchases/:id                Update purchase
DELETE /api/purchases/:id                Cancel purchase (soft delete)
GET    /api/purchases/filter?status=     Filter by status
GET    /api/purchases/supplier/:supplierId  Get supplier's purchases
```

#### Purchase Items

```
POST   /api/purchases/:purchaseId/items  Add line item
PATCH  /api/purchases/:purchaseId/items/:itemId  Update item
DELETE /api/purchases/:purchaseId/items/:itemId  Remove item (recalculate totals)
```

#### Purchase Reports

```
GET    /api/purchases/reports/outstanding   Outstanding suppliers by amount
GET    /api/purchases/reports/monthly       Monthly purchase analysis
GET    /api/purchases/reports/supplier/:id  Supplier purchase history
```

---

### 3. SUPPLIER PAYMENTS

#### Payments

```
POST   /api/payments/supplier             Record supplier payment
GET    /api/payments/supplier             List supplier payments
GET    /api/payments/supplier/:supplierId Get supplier payment history
PATCH  /api/payments/supplier/:paymentId  Update payment (if draft)
DELETE /api/payments/supplier/:paymentId  Cancel payment (if draft)
```

#### Payment Reconciliation

```
GET    /api/payments/supplier/:supplierId/reconcile  Get reconciliation status
POST   /api/payments/supplier/:supplierId/reconcile  Mark as reconciled
GET    /api/payments/aging                Get aging report
```

---

### 4. RECEIPTS

#### Customer Receipts

```
POST   /api/receipts                     Create receipt
GET    /api/receipts                     List receipts
GET    /api/receipts/:id                 Get receipt details
PATCH  /api/receipts/:id                 Update receipt (if draft)
DELETE /api/receipts/:id                 Cancel receipt
GET    /api/receipts/print/:receiptId    Get printable receipt
POST   /api/receipts/:id/print           Generate print number
```

#### Receipt Queries

```
GET    /api/receipts/invoice/:invoiceId  Get receipts for invoice
GET    /api/receipts/job/:jobCardId      Get receipts for job card
GET    /api/receipts/customer/:customerId Get customer receipt history
GET    /api/receipts/date-range?from=&to= Get receipts by date range
```

---

### 5. PAYMENT VOUCHERS

#### Expense Vouchers

```
POST   /api/vouchers/expense              Create expense voucher
GET    /api/vouchers/expense              List expense vouchers
PATCH  /api/vouchers/expense/:id          Update voucher
DELETE /api/vouchers/expense/:id          Cancel voucher
```

#### Supplier Vouchers

```
POST   /api/vouchers/supplier             Create supplier payment voucher
GET    /api/vouchers/supplier             List supplier vouchers
```

#### Salary Vouchers

```
POST   /api/vouchers/salary               Create salary voucher
GET    /api/vouchers/salary               List salary vouchers
```

#### Reports

```
GET    /api/vouchers/reports/by-category  Expenses grouped by category
GET    /api/vouchers/reports/monthly      Monthly expense summary
GET    /api/vouchers/reports/annual       Annual expense summary
```

---

### 6. QUOTATIONS

#### Quote Management

```
POST   /api/quotations                    Create quotation
GET    /api/quotations                    List quotations
GET    /api/quotations/:id                Get quotation details
PATCH  /api/quotations/:id                Update quotation
DELETE /api/quotations/:id                Delete quotation
POST   /api/quotations/:id/send           Send quotation to customer
POST   /api/quotations/:id/convert        Convert to invoice
```

#### Quote Items

```
POST   /api/quotations/:id/items          Add line item
PATCH  /api/quotations/:id/items/:itemId  Update item
DELETE /api/quotations/:id/items/:itemId  Remove item
```

#### Quote Tracking

```
GET    /api/quotations/customer/:customerId Get customer quotes
GET    /api/quotations/status/:status    Filter by status
GET    /api/quotations/expired           Get expired quotations
GET    /api/quotations/reports/conversion Get conversion metrics
```

---

### 7. PURCHASE ORDERS

#### PO Management

```
POST   /api/purchase-orders               Create PO
GET    /api/purchase-orders               List POs
GET    /api/purchase-orders/:id           Get PO details
PATCH  /api/purchase-orders/:id           Update PO
DELETE /api/purchase-orders/:id           Cancel PO
POST   /api/purchase-orders/:id/send      Send to supplier
```

#### PO Items & Receipts

```
POST   /api/purchase-orders/:id/items     Add line item
PATCH  /api/purchase-orders/:id/items/:itemId  Update item
POST   /api/purchase-orders/:id/receive   Record partial/full receipt
GET    /api/purchase-orders/:id/receipt-status  Get receipt tracking
```

#### PO Reports

```
GET    /api/purchase-orders/pending       Get pending POs
GET    /api/purchase-orders/overdue       Get overdue deliveries
GET    /api/purchase-orders/supplier/:id  Get supplier's POs
GET    /api/purchase-orders/reports/fulfillment  PO fulfillment rate
```

---

## 📊 Enhanced Invoice Endpoints

### Enhanced Sales Invoice

```
# Updated to include new fields
PATCH  /api/invoices/:id                 Now includes GST split, payment method split
GET    /api/invoices/:id/receipt-link    Get linked receipts
GET    /api/invoices/:id/gst-detail      Get detailed GST breakdown
```

---

## 💾 Database Operations Reference

### Common Query Patterns

#### Supplier Outstanding Balance

```typescript
// Update when payment made
await prisma.shopSupplier.update({
  where: { id: supplierInShop },
  data: {
    outstandingAmount: {
      decrement: paymentAmount,
    },
  },
});
```

#### Reorder Level Check

```typescript
// Get products below reorder level
const lowStockItems = await prisma.shopProduct.findMany({
  where: {
    shopId,
    stockOnHand: {
      lte: prisma.shopProduct.fields.reorderLevel,
    },
  },
});
```

#### Purchase Status Update

```typescript
// Mark purchase as paid when full payment received
await prisma.purchase.update({
  where: { id },
  data: {
    status: 'PAID',
    paidAmount: totalAmount,
  },
});
```

#### Receipt Number Generation

```typescript
// Get next print number
const lastReceipt = await prisma.receipt.findFirst({
  where: { shopId },
  orderBy: { createdAt: 'desc' },
  select: { printNumber: true },
});

const nextNumber = parseInt(lastReceipt?.printNumber || '0') + 1;
```

---

## 🔐 Security & Validation

### Request Validation

```typescript
// Supplier creation DTO
class CreateSupplierDto {
  @IsString() name: string;
  @IsPhoneNumber() primaryPhone: string;
  @IsEmail() @IsOptional() email?: string;
  @IsGSTIN() @IsOptional() gstin?: string;
  @IsArray() @IsOptional() tags?: string[];
}

// Purchase creation DTO
class CreatePurchaseDto {
  @IsString() invoiceNumber: string;
  @IsString() globalSupplierId: string;
  @IsISO8601() invoiceDate: string;
  @IsISO8601() @IsOptional() dueDate?: string;
  @IsArray() @ValidateNested() items: PurchaseItemDto[];
  @IsEnum(PaymentMode) paymentMethod: PaymentMode;
  @IsEnum(PurchaseStatus) status: PurchaseStatus;
}
```

### Authorization Checks

```typescript
// All endpoints must verify:
1. User belongs to tenant
2. User has access to shop (OWNER can access all, STAFF limited to assigned shops)
3. Supplier/Purchase/Receipt belongs to user's tenant
```

---

## 📈 Analytics & Reporting Endpoints

### Dashboard Widgets

```
GET    /api/analytics/supplier-stats     Total suppliers, outstanding amounts
GET    /api/analytics/purchase-stats     Total purchases, pending payments
GET    /api/analytics/receipt-stats      Total receipts, methods breakdown
GET    /api/analytics/quotation-stats    Quote count, conversion rate
GET    /api/analytics/po-stats           PO count, fulfillment rate
```

### Financial Reports

```
GET    /api/reports/payables-aging       Supplier payment aging
GET    /api/reports/purchase-analysis    Purchase trends by supplier
GET    /api/reports/expense-summary      Expense breakdown by category
GET    /api/reports/gst-liability        GST payable calculation
```

---

## 🧪 Testing Priorities

### Unit Tests

1. Supplier CRUD operations
2. Purchase calculation (subtotal, tax, total)
3. Receipt number generation
4. Outstanding balance calculation
5. Quotation status transitions

### Integration Tests

1. Create purchase → Create supplier payment → Verify outstanding balance
2. Create quotation → Convert to invoice → Verify linked data
3. Create PO → Receive items → Update inventory
4. Create invoice → Create receipt → Verify receipt status

### E2E Tests

1. Complete purchase flow (Create PO → Receive → Invoice → Pay)
2. Complete quotation flow (Create → Send → Convert → Invoice)
3. Multi-payment receipt scenario (partial payments)
4. Supplier reconciliation workflow

---

## 📦 Frontend Components Needed

### Supplier Module

- Supplier master list with search
- Supplier detail page with outstanding balance
- Supplier performance metrics
- Payment history view

### Purchase Module

- Purchase invoice list with filters
- Purchase creation wizard
- Invoice details and line items
- Payment tracking

### Receipt Module

- Receipt list and search
- Receipt generation form
- Receipt print preview
- Receipt tracking by invoice/job

### Quotation Module

- Quotation list with status indicators
- Quotation builder
- Email sending functionality
- Quote to invoice conversion

### PO Module

- PO list and status tracking
- PO creation and editing
- Goods receipt posting
- Supplier comparison

---

## 📋 Implementation Checklist

- [ ] Supplier controller & service
- [ ] Purchase controller & service
- [ ] Receipt controller & service
- [ ] Payment voucher controller & service
- [ ] Quotation controller & service
- [ ] Purchase order controller & service
- [ ] DTOs and validation
- [ ] Error handling
- [ ] Logging
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Unit tests
- [ ] Integration tests
- [ ] Frontend pages
- [ ] Reports and analytics
- [ ] Audit logging for all operations

---

**Status**: 🚀 Ready for implementation  
**Estimated Timeline**: 3-4 weeks for full implementation  
**Team Requirement**: 1-2 full-stack developers
