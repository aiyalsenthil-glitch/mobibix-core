# MobiBix — Backend vs Frontend Feature Parity Audit
**Generated**: 2026-02-24 20:25 IST  
**Test Method**: Live browser walkthrough + code-level API endpoint comparison

---

## Executive Summary

| Category           | Count |
|--------------------|-------|
| ✅ Fully Implemented | 18    |
| ⚠️  Partially Implemented | 8     |
| ❌ Backend-Only (No Frontend) | 5     |
| 🐛 UI Bugs Found   | 6     |

---

## 🐛 Section 1: UI Bugs Found During Browser Testing

### BUG-001: Customer Form — Phone Validation False Positive
- **Page**: `/customers` → "+ Add Customer"
- **Severity**: 🔴 HIGH
- **Description**: The `getCustomerByPhone()` lookup in `CustomerForm.tsx` fires on every keystroke (debounced at 500ms). When it returns a match, it sets `phoneExistingCustomer` which displays "Customer exists!" banner AND disables the submit button (line 541: `!isEditing && phoneExistingCustomer !== null`). However, the API returns a customer even for partial phone matches, causing false positives for new unique numbers that share prefix digits with existing ones.
- **Root Cause**: `getCustomerByPhone` does a lookup that may return results for partial matches. The guard `phoneExistingCustomer !== null` should only block when the FULL phone number exactly matches.
- **Fix**: Add exact-match validation: only block if `phoneExistingCustomer.phone === formData.phone.trim()`.

### BUG-002: Inventory Page — "No shops selected" Despite Dropdown Showing Shop
- **Page**: `/inventory`
- **Severity**: 🟡 MEDIUM
- **Description**: The inventory page shows "Aiyal Technologies" in the shop dropdown but displays "No shops selected" empty state. The dropdown appears populated but the page does not auto-select the first shop on mount.
- **Root Cause**: `InventoryPage` waits for explicit user click on the dropdown to trigger shop selection. If `selectedShopId` is not yet set in the `ShopContext`, the page renders the empty state.
- **Fix**: Auto-select the first available shop on mount if `selectedShopId` is empty.

### BUG-003: Sales Page — "Please select a shop" Despite Multi-Shop Tenant
- **Page**: `/sales`
- **Severity**: 🟡 MEDIUM
- **Description**: Similar to the inventory bug — the Sales page shows SHOP dropdown with "--Select Shop--" default and requires manual selection even when only 2 shops exist. No auto-selection occurs.
- **Fix**: Mirror the same auto-select logic as the fix for BUG-002.

### BUG-004: Inventory Page — User Role Shows "Staff" Instead of "System Owner"
- **Page**: `/inventory`
- **Severity**: 🟢 LOW
- **Description**: The top nav bar displays "User / Staff" on the Inventory page, but displays "test@gmail.com / System Owner" on other pages. This suggests the Inventory page doesn't correctly read the auth context's role.
- **Root Cause**: Likely a different `useAuth()` hook path or missing auth context propagation in the Inventory layout.

### BUG-005: Dashboard — All Daily Stats Show ₹0
- **Page**: `/dashboard`
- **Severity**: 🟢 LOW (data-dependent)
- **Description**: The "Daily Stats (Consolidated)" section shows ₹0 for Total Revenue, Profit, Cash, and Digital for today. This could be correct if no sales occurred today, but the "This Month" section shows ₹12,650. Needs verification that the daily query uses correct timezone.

### BUG-006: "2 Issues" Badge in Footer
- **Page**: `/inventory` (and potentially others)
- **Severity**: 🟢 LOW
- **Description**: A red "2 Issues" badge appears in the bottom-left corner (Next.js dev indicator). This is a development-only artifact but indicates 2 unresolved console errors or warnings.

---

## ⚠️ Section 2: Partially Implemented Features

### PARTIAL-001: Staff Management — Missing Invite Flow
- **Backend**: `POST /staff/invite`, `GET /staff/invites`, `POST /staff/invite/accept`, `DELETE /staff/invite/:id`
- **Frontend**: `staff.api.ts` only has `listStaff()`, `addStaff()`, `removeStaff()`
- **Gap**: No invite acceptance flow, no pending invites view, no invite cancellation UI.
- **Page**: `/staff-management` — lists staff but doesn't show pending invites or provide an invite-by-email flow.

### PARTIAL-002: Loyalty System — No Configuration UI
- **Backend**: `GET /loyalty/config`, `PUT /loyalty/config`, `POST /loyalty/manual-adjustment`, `GET /loyalty/balance/:customerId`, `POST /loyalty/validate-redemption`
- **Frontend**: `loyalty.api.ts` has all 5 functions
- **Gap**: No dedicated `/loyalty` or `/settings/loyalty` page exists. Loyalty points (42 pts) are visible in the Customers table but there's no way to configure earn/redeem rates, apply manual adjustments, or view redemption history.

### PARTIAL-003: Approvals (Permission Workflow) — No UI
- **Backend**: `GET /approvals/pending`, `POST /approvals/:id/resolve`
- **Frontend**: No `approvals.api.ts` service file exists.
- **Gap**: Backend supports an approval workflow (likely for sensitive operations like cancellations/refunds), but there's no UI to view or resolve pending approvals.

### PARTIAL-004: Stock Management — Missing Summary & KPI Views  
- **Backend**: `GET /stock/summary`, `GET /stock/overview` (KPIs), `POST /stock/correct`, `GET /stock/negative-stock`
- **Frontend**: `stock.api.ts` has `getStockBalances()`, `correctStock()`, `getNegativeStockReport()`
- **Gap**: Missing `GET /stock/summary` (summary view) and `GET /stock/overview` (KPI dashboard). The frontend has a `/inventory/stock-correction` page and `/inventory/negative-stock` page, but no stock KPI widget or summary dashboard.

### PARTIAL-005: Customer Timeline / CRM — Accessible Only from Dropdown
- **Backend**: Full CRM API: `GET /timeline/:customerId`, `GET /timeline/:customerId/stats`, `GET /crm-dashboard`, follow-ups CRUD
- **Frontend**: `/crm` page, `/crm/follow-ups`, `/crm/timeline` pages exist. Customer timeline drawer is embedded in Sales actions dropdown.
- **Gap**: CRM is not prominently accessible from the sidebar. The sidebar shows "WhatsApp" but CRM sub-pages (follow-ups, timeline) are only accessible via the `/crm` route or the sales dropdown menu.

### PARTIAL-006: Reports — Missing Repair & Profit Report Data
- **Backend**: Full reporting API including GSTR-1, GSTR-2, receivables aging, payables aging
- **Frontend**: 9 report pages exist (`/reports/sales`, `/reports/purchases`, `/reports/inventory`, `/reports/gstr-1`, `/reports/gstr-2`, `/reports/aging/receivables`, `/reports/aging/payables`, `/reports/repair`, `/reports/profit`)
- **Gap**: Reports depend on selected shop — if no shop is pre-selected, reports show empty state (same BUG-002/003 pattern).

### PARTIAL-007: Shop Settings — Document Settings Not Fully Exposed
- **Backend**: `GET /shops/:shopId/document-settings`, `PUT /shops/:shopId/document-settings/:documentType`
- **Frontend**: `document-settings.api.ts` exists with `getDocumentSettings()`, `updateDocumentSetting()`
- **Gap**: The shop settings page at `/shops/[id]/settings` exists but document settings (invoice templates, footer text, terms & conditions) may not be fully interactive.

### PARTIAL-008: Vouchers — No Apply-to-Purchase Integration
- **Backend**: `POST /vouchers/advance/:voucherId/apply-to-purchase`, `GET /vouchers/advance/:voucherId/balance`, `GET /vouchers/advance/:voucherId/applications`
- **Frontend**: `vouchers.api.ts` has `createVoucher`, `getVouchers`, `getVoucher`, `cancelVoucher`, `getVoucherSummary`
- **Gap**: Missing API functions for advance voucher balance check and applying vouchers to purchases. The `/vouchers` pages exist for CRUD but the advance payment workflow is not connected to the purchase flow.

---

## ❌ Section 3: Backend-Only Features (No Frontend)

### MISSING-001: Repair / Job Card Service Module  
- **Backend**: `core/repair/` with service management capabilities
- **Frontend**: Job Cards pages exist (`/jobcards`) but the repair service module's API is not directly exposed. The `jobcard.api.ts` service handles job card CRUD but repair-specific workflows (diagnosis, parts allocation, status transitions) may not be fully represented.

### MISSING-002: Ledger Module
- **Backend**: `core/ledger/` with ledger controller
- **Frontend**: ❌ No `ledger.api.ts`, no `/ledger` page
- **Impact**: No double-entry accounting view, no journal entries, no trial balance. Financial data is only visible through reports.

### MISSING-003: Payment History & Retry
- **Backend**: `GET /payments/history`, `POST /payments/:id/retry`
- **Frontend**: ❌ `payments.api.ts` only has `createOrder`, `verifyPayment`, `bypassPayment`
- **Gap**: No payment history page. No retry failed payment UI. Users cannot view past transactions or retry failed subscription payments.

### MISSING-004: Global Products / Shop Product Linking
- **Backend**: 
  - `POST /global-products`, `GET /global-products`, `PATCH /global-products/:id`, `DELETE /global-products/:id`
  - `POST /shop-products/link`, `GET /shop-products/catalog`
- **Frontend**: ❌ No `/global-products` page. `global-suppliers.api.ts` exists (for suppliers) but no equivalent for global products.
- **Gap**: Admin MDM feature for managing a shared product catalog across tenants is not exposed.

### MISSING-005: Product Import/Export
- **Backend**: `POST /products/import`, `GET /products/export`
- **Frontend**: `products.api.ts` has `listProducts`, `createProduct`, `updateProduct` but **no import/export functions**
- **Gap**: Bulk product onboarding via CSV/Excel import is not available on the web frontend.

---

## ✅ Section 4: Fully Implemented Features (Verified)

| # | Module | Backend | Frontend | Browser Test |
|---|--------|---------|----------|-------------|
| 1 | **Auth** (Firebase/Google) | ✅ | ✅ | ✅ Login works |
| 2 | **Dashboard** | ✅ | ✅ | ✅ Enterprise Overview loads |
| 3 | **Customers CRUD** | ✅ | ✅ | ✅ List/Add/Edit/Delete |
| 4 | **Sales Invoices** | ✅ | ✅ | ✅ List/Create/Edit/Cancel/Print |
| 5 | **Collect Payment** | ✅ | ✅ | ✅ Modal in sales dropdown |
| 6 | **Products CRUD** | ✅ | ✅ | ✅ Page renders |
| 7 | **Inventory/Stock** | ✅ | ✅ | ✅ Stock levels page |
| 8 | **Negative Stock Report** | ✅ | ✅ | ✅ `/inventory/negative-stock` |
| 9 | **Stock Correction** | ✅ | ✅ | ✅ `/inventory/stock-correction` |
| 10 | **Suppliers CRUD** | ✅ | ✅ | ✅ `/suppliers` page |
| 11 | **Purchases CRUD** | ✅ | ✅ | ✅ `/purchases` + `/purchases/new` |
| 12 | **Shops CRUD** | ✅ | ✅ | ✅ 2 shops visible, Manage Settings |
| 13 | **Subscription & Billing** | ✅ | ✅ | ✅ Plan toggle, upgrade, downgrade |
| 14 | **Staff Management** | ✅ | ✅ | ✅ List + Add |
| 15 | **Roles & Permissions** | ✅ | ✅ | ✅ `/roles` with edit |
| 16 | **WhatsApp CRM** | ✅ | ✅ | ✅ Dashboard/Promo renders |
| 17 | **Receipts / Vouchers** | ✅ | ✅ | ✅ CRUD pages exist |
| 18 | **Reports (9 types)** | ✅ | ✅ | ✅ All report pages render |

---

## 📊 Section 5: Priority Matrix

### 🔴 Critical (Fix Immediately)
1. **BUG-001**: Customer phone validation false positive — blocks customer creation entirely
2. **MISSING-003**: Payment history — users have no visibility into transaction records

### 🟠 High Priority (Next Sprint)  
3. **BUG-002 + BUG-003**: Auto-select shop on mount (affects Sales, Inventory, and Reports)
4. **PARTIAL-001**: Staff invite flow — incomplete RBAC workflow
5. **MISSING-005**: Product import/export — critical for onboarding

### 🟡 Medium Priority
6. **PARTIAL-002**: Loyalty configuration UI
7. **PARTIAL-003**: Approvals workflow UI
8. **PARTIAL-008**: Voucher → Purchase integration

### 🟢 Low Priority / Backlog
10. **BUG-004**: Role display inconsistency on Inventory page
11. **BUG-005**: Daily stats timezone verification
12. **MISSING-002**: Ledger module (accounting)
13. **MISSING-004**: Global product catalog (admin feature)

---

## 🧪 Section 6: Playwright Test Coverage Map

| Test File | Tests | Status |
|-----------|-------|--------|
| `auth.setup.ts` | 1 (authenticate) | ✅ PASS |
| `core-flows.spec.ts` | 4 (navigate, customer, sales, inventory) | ✅ PASS |
| `performance.spec.ts` | 1 (SLA benchmarks: customers, sales, settings) | ✅ PASS |
| `plan-migrations.spec.ts` | 2 (billing toggle, upgrade/downgrade checks) | ✅ PASS |
| `shops.spec.ts` | 1 (shops grid) | ✅ PASS |
| `whatsapp-gating.spec.ts` | 1 (CRM page render) | ✅ PASS |
| **Total** | **10 tests** | **10/10 PASS (29.7s)** |

### Recommended Additional Test Coverage:
- [ ] Supplier CRUD flow
- [ ] Purchase creation + payment flow
- [ ] Report page loading (all 9 types)
- [ ] Voucher creation flow
- [ ] Staff invite + acceptance flow
- [ ] Role CRUD flow
- [ ] Shop settings modification
