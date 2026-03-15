# Frontend Implementation Task List

**Target App**: `apps/mobibix-web` (MobileShop ERP Frontend)  
**Estimated Duration**: 15-18 days (3 weeks)  
**Prerequisites**: Backend Week 1-3 complete  
**Start Date**: After backend completion (~March 3, 2026)

---

## PHASE 1: GST & PAYMENT UI (5 days)

### Task F1.1: Invoice Creation with GST (2 days)

**Goal**: Create/edit invoices with item-level GST calculation

**Components to Update**:

- `components/invoices/InvoiceForm.tsx`
- `components/invoices/InvoiceItemRow.tsx`

**Features**:

- [ ] GST rate dropdown per item (0%, 5%, 9%, 12%, 18%, 28%)
- [ ] Auto-calculate CGST/SGST on item amount change
- [ ] Show taxable amount + GST breakdown in item rows
- [ ] Display total CGST, SGST, grand total in footer
- [ ] HSN code input field (optional, for GSTR compliance)
- [ ] State selection for customer (for intra-state GST split logic)

**API Integration**:

```typescript
POST /api/invoices
Body: {
  items: [{
    shopProductId: string,
    quantity: number,
    rate: number,
    gstRate: number, // 5, 9, 12, 18, 28
    hsnCode?: string
  }]
}
```

**UI Validations**:

- GST rate must be in [0, 5, 9, 12, 18, 28]
- Prevent saving if total CGST+SGST > subtotal (sanity check)

---

### Task F1.2: Payment Collection UI (1.5 days)

**Goal**: Record customer payments against invoices

**Components to Create**:

- `components/invoices/PaymentModal.tsx`
- `components/invoices/PaymentHistory.tsx`

**Features**:

- [ ] "Record Payment" button on invoice detail page
- [ ] Modal with: amount input, payment method dropdown (Cash/UPI/Card), reference field
- [ ] Show balance due, already paid amount
- [ ] Prevent overpayment (client-side + server validation)
- [ ] Auto-update invoice status badge (UNPAID → PARTIAL → PAID)
- [ ] Payment history table with date, amount, method, reference

**API Integration**:

```typescript
POST /api/invoices/:id/payments
Body: { amount: number, paymentMethod: 'CASH'|'UPI'|'CARD', reference?: string }

GET /api/invoices/:id/status
Response: { balanceDue, paidAmount, status, daysOverdue, isOverdue }
```

---

### Task F1.3: GSTR-1 Report Viewer (1.5 days)

**Goal**: Display B2B and B2C sales reports for GST filing

**Components to Create**:

- `pages/reports/gstr-1.tsx`
- `components/reports/GSTR1B2BTable.tsx`
- `components/reports/GSTR1B2CSummary.tsx`

**Features**:

- [ ] Date range picker (from/to dates)
- [ ] Shop filter dropdown (multi-shop tenants)
- [ ] Two tabs: "B2B Invoices" and "B2C Summary"
- [ ] B2B table: Invoice No, Date, Customer GSTIN, Name, Taxable Value, CGST, SGST, Total Tax
- [ ] B2C table: HSN Code, Invoice Count, Taxable Value, CGST, SGST, Total Tax (grouped)
- [ ] "Export CSV" button for CA filing
- [ ] Loading states, empty states

**API Integration**:

```typescript
GET /api/reports/gstr-1/b2b?from=2026-04-01&to=2026-04-30&shopId=xyz
GET /api/reports/gstr-1/b2c?from=2026-04-01&to=2026-04-30&shopId=xyz
GET /api/reports/gstr-1/export?from=...&to=... (returns CSV)
```

---

## PHASE 2: INVENTORY & STOCK UI (5 days)

### Task F2.1: Repair Parts Stock Deduction Indicator (1 day)

**Goal**: Show real-time stock availability when adding parts to repairs

**Components to Update**:

- `components/jobcard/AddPartDialog.tsx`
- `components/jobcard/PartsList.tsx`

**Features**:

- [ ] Display "Available: X units" next to product selector
- [ ] Red badge if stock insufficient (< quantity requested)
- [ ] Prevent saving if negative stock would result (client-side warning)
- [ ] Show IMEI selector dropdown if product is serialized
- [ ] Display "Out of Stock" tooltip on hover if balance = 0

**API Integration**:

```typescript
GET /api/stock/balance?productId=xyz&tenantId=abc
Response: { balance: number, isSerialized: boolean, availableIMEIs?: string[] }
```

---

### Task F2.2: Repair Cancellation with Stock Restoration (1 day)

**Goal**: Allow cancelling repairs with automatic part return to inventory

**Components to Create**:

- `components/jobcard/CancelJobModal.tsx`

**Features**:

- [ ] "Cancel Job" button on job detail page (only if status < DELIVERED)
- [ ] Confirmation modal: "All used parts will be restored to inventory. Continue?"
- [ ] List of parts to be restored with quantities
- [ ] Reason dropdown (Customer changed mind, Error in job, Unrepairable)
- [ ] Auto-void linked invoice if exists (show warning)
- [ ] Update job status badge to "CANCELLED" after success

**API Integration**:

```typescript
POST /api/jobcards/:id/cancel
Body: { reason?: string }
Response: { restoredParts: [{ name, quantity }] }
```

---

### Task F2.3: IMEI Tracking on Sales (2 days)

**Goal**: Link IMEI units to sales invoices, track sold status

**Components to Update**:

- `components/invoices/InvoiceItemRow.tsx`
- `components/products/IMEISelector.tsx` (NEW)

**Features**:

- [ ] If product is serialized, show "Select IMEIs" button next to quantity field
- [ ] Modal with list of IN_STOCK IMEIs for that product
- [ ] Multi-select checkboxes (limit to quantity selected)
- [ ] Show selected IMEI numbers as badges below item row
- [ ] Prevent invoice save if serialized items missing IMEI selection
- [ ] After invoice save, IMEIs auto-marked as SOLD

**API Integration**:

```typescript
GET /api/products/:id/imeis?status=IN_STOCK
Response: [{ imei: string, status: string }]

POST /api/invoices (updated)
Body: {
  items: [{
    shopProductId: string,
    quantity: number,
    imeis?: string[] // Required if product.isSerialized = true
  }]
}
```

---

### Task F2.4: Low Stock Dashboard Widget (1 day)

**Goal**: Alert shop owners about products below reorder level

**Components to Create**:

- `components/dashboard/LowStockAlert.tsx`

**Features**:

- [ ] Card widget on main dashboard below KPIs
- [ ] Table: Product Name, Current Balance, Reorder Level, Action button
- [ ] Red badge if balance = 0, orange if balance < reorderLevel
- [ ] "Create Purchase Order" quick action button
- [ ] Auto-refresh every 30 seconds (optional)

**API Integration**:

```typescript
GET /api/stock/low-stock?shopId=xyz
Response: [{ id, name, balance, reorderLevel }]
```

---

## PHASE 3: SUPPLIER PAYMENTS UI (3 days)

### Task F3.1: Purchase Payment Recording (1.5 days)

**Goal**: Record payments to suppliers against purchase invoices

**Components to Create**:

- `pages/purchases/[id].tsx` (update detail page)
- `components/purchases/PaymentModal.tsx`

**Features**:

- [ ] "Record Payment" button on purchase detail page
- [ ] Modal: amount, payment method (CASH/UPI/BANK), reference, payment date picker
- [ ] Show balance due, already paid amount
- [ ] Prevent overpayment (validation)
- [ ] Display payment history table below purchase details
- [ ] Auto-update purchase status badge (SUBMITTED → PARTIALLY_PAID → PAID)

**API Integration**:

```typescript
POST /api/purchases/:id/payments
Body: { amount, paymentMethod, paymentReference, paymentDate }

GET /api/purchases/:id/status
Response: { totalAmount, paidAmount, balanceDue, status, daysOverdue }
```

---

### Task F3.2: Pending Payables List (1 day)

**Goal**: Show all unpaid/partial supplier invoices in one view

**Components to Create**:

- `pages/reports/payables.tsx`
- `components/purchases/PayablesTable.tsx`

**Features**:

- [ ] Table: Purchase No, Supplier Name, Total Amount, Paid, Balance Due, Due Date, Days Overdue
- [ ] Sort by: Due Date (default), Balance Due, Days Overdue
- [ ] Filter: Supplier dropdown, Shop dropdown
- [ ] Quick "Pay Now" button in each row (opens payment modal)
- [ ] Red highlight for overdue purchases (daysOverdue > 0)
- [ ] Summary footer: Total Payables, Total Overdue

**API Integration**:

```typescript
GET /api/purchases/pending?shopId=xyz&supplierId=abc
Response: [{ id, purchaseNumber, supplier, totalAmount, paidAmount, balanceDue, dueDate, daysOverdue }]
```

---

### Task F3.3: Payables Aging Report (0.5 day)

**Goal**: Financial report showing supplier dues by age buckets

**Components to Create**:

- `components/reports/PayablesAgingChart.tsx`

**Features**:

- [ ] Bar chart: X-axis = Age buckets (Current, 30-60 days, 60-90 days, 90+ days), Y-axis = Amount
- [ ] Total payables KPI card
- [ ] Date range filter (optional, default = current month)
- [ ] Export CSV button

**API Integration**:

```typescript
GET /api/reports/payables-aging?shopId=xyz
Response: { current, thirtyToSixty, sixtyToNinety, ninetyPlus, total, totalDue }
```

---

## PHASE 4: LEGAL & COMPLIANCE UI (2 days)

### Task F4.1: Customer Consent Form (1 day)

**Goal**: Capture data privacy consent at job creation

**Components to Update**:

- `components/jobcard/CreateJobForm.tsx`

**Features**:

- [ ] Checkbox: "Customer consents to data collection for repair purposes"
- [ ] Disabled submit button if unchecked
- [ ] Show consent modal on first click (with privacy policy link)
- [ ] Display consent status on job detail page (timestamp + IP if available)

**API Integration**:

```typescript
POST /api/jobcards
Body: { ..., customerConsent: boolean, consentTimestamp: Date }
```

---

### Task F4.2: Warranty Expiry Tracking (1 day)

**Goal**: Show warranty status, send alerts before expiry

**Components to Create**:

- `components/jobcard/WarrantyBadge.tsx`
- `pages/reports/warranties.tsx`

**Features**:

- [ ] Badge on job detail: "Under Warranty" (green), "Expired" (red), "Expiring Soon" (orange, <7 days)
- [ ] Warranty expiry date field on job creation (auto-calculate from completionDate + warrantyDays)
- [ ] Dashboard widget: "Expiring Warranties" (next 30 days)
- [ ] Report page: Filterable list of all warranties with expiry dates

**API Integration**:

```typescript
GET /api/jobcards/:id (response includes warrantyExpiryDate)
GET /api/reports/warranties/expiring?days=30
```

---

## PHASE 5: REPORTING & ANALYTICS (3 days)

### Task F5.1: Receivables Aging Report (1 day)

**Goal**: Show customer dues by age buckets

**Components to Create**:

- `pages/reports/receivables.tsx`
- `components/reports/ReceivablesAgingChart.tsx`

**Features**:

- [ ] Bar chart: Current, 30-60, 60-90, 90+ days
- [ ] Table: Customer name, total due, age bucket breakdown
- [ ] Filter by shop, date range
- [ ] Export CSV

**API Integration**:

```typescript
GET /api/reports/receivables-aging?shopId=xyz
Response: { current, thirtyToSixty, sixtyToNinety, ninetyPlus, total, totalDue }
```

---

### Task F5.2: Daily Sales Report (1 day)

**Goal**: Consolidated view of daily sales with GST breakdown

**Components to Create**:

- `pages/reports/daily-sales.tsx`

**Features**:

- [ ] Table: Date, Invoices Count, Total Sales, Total CGST, Total SGST, Grand Total
- [ ] Date range picker
- [ ] Line chart for trend visualization
- [ ] Export PDF/CSV

**API Integration**:

```typescript
GET /api/reports/daily-sales?from=...&to=...&shopId=xyz
Response: [{ date, invoiceCount, totalSales, cgst, sgst, grandTotal }]
```

---

### Task F5.3: Inventory Valuation Report (1 day)

**Goal**: Show current stock value (cost basis)

**Components to Create**:

- `pages/reports/inventory-valuation.tsx`

**Features**:

- [ ] Table: Product, Quantity, Avg Cost, Total Value
- [ ] Total inventory value KPI card
- [ ] Filter by category, shop
- [ ] Export CSV

**API Integration**:

```typescript
GET /api/reports/inventory-valuation?shopId=xyz
Response: [{ productName, quantity, avgCost, totalValue }]
```

---

## TECHNICAL REQUIREMENTS

### State Management

- [ ] Use React Query for API caching
- [ ] Optimistic updates for payment recording
- [ ] Invalidate cache on entity mutations

### Form Validation

- [ ] Zod schema validation for all forms
- [ ] React Hook Form integration
- [ ] Server-side error display

### UI Components

- [ ] Shadcn/ui for base components
- [ ] TailwindCSS for styling
- [ ] Recharts for data visualization

### Configuration

- [ ] Environment variable for API base URL
- [ ] Error boundary for graceful failures
- [ ] Toast notifications for success/error states

---

## TESTING CHECKLIST

### Unit Tests (Jest + React Testing Library)

- [ ] InvoiceForm GST calculation logic
- [ ] Payment modal validation
- [ ] IMEI selector multi-select behavior

### Integration Tests (Playwright)

- [ ] End-to-end invoice creation with payment
- [ ] Repair cancellation flow
- [ ] Purchase payment recording

### Manual Testing Scenarios

- [ ] Create invoice with 5% GST, record partial payment, verify status
- [ ] Add part to repair with insufficient stock, verify error
- [ ] Cancel repair, verify parts restored to inventory
- [ ] Generate GSTR-1 report, export CSV, verify format
- [ ] Record supplier payment, verify payables aging update

---

## DEPLOYMENT CHECKLIST

### Pre-Production

- [ ] All API endpoints documented (Swagger/Postman)
- [ ] Environment variables configured (.env.production)
- [ ] Build optimizations enabled (minification, code splitting)
- [ ] Analytics integration (Posthog/Mixpanel)

### Production

- [ ] Deploy backend first, verify health check
- [ ] Deploy frontend, verify API connectivity
- [ ] Run smoke tests on production
- [ ] Monitor error logs for 24 hours

---

## TIMELINE SUMMARY

| Phase                 | Days        | Dependencies              |
| --------------------- | ----------- | ------------------------- |
| GST & Payment UI      | 5           | Backend Week 1 complete   |
| Inventory & Stock UI  | 5           | Backend Week 2 complete   |
| Supplier Payments UI  | 3           | Backend Week 2 complete   |
| Legal & Compliance UI | 2           | Backend Week 3 complete   |
| Reporting & Analytics | 3           | Backend Week 1-3 complete |
| **Total**             | **18 days** | All backend APIs ready    |

**Recommended Start**: March 3, 2026 (after backend completion)  
**Target Launch**: March 24, 2026 (with 3-day buffer for testing)
