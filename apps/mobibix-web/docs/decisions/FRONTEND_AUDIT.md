# Frontend-Backend Wiring & Rules Audit

## Phase 1: Analysis Only

### 1️⃣ API Usage Inventory

#### **Sales Module (`src/services/sales.api.ts`)**
*   **Create Invoice**: `POST /mobileshop/sales/invoice` (✅ Approved)
*   **List Invoices**: `GET /mobileshop/sales/invoices` (✅ Approved)
*   **Collect Payment**: `POST /mobileshop/sales/invoice/:id/collect-payment` (✅ Approved)
    *   *Usage*: Used in `CollectPaymentModal.tsx`.
*   **Record Payment (Legacy)**: `POST /mobileshop/sales/invoice/:id/payment` (❌ **LEGACY**)
    *   *Usage*: **NOT USED** in codebase (Verified via grep).
    *   *Action*: Should be removed to prevent accidental usage.
*   **Cancel Invoice**: `POST /mobileshop/sales/invoice/:id/cancel` (✅ Approved)
    *   *Usage*: **MISSING** in `InvoiceDetailPage` UI.

#### **Purchase Module (`src/services/purchases.api.ts`)**
*   **Create Purchase**: `POST /purchases` (✅ Approved)
*   **Record Payment**: `POST /purchases/:id/pay` (✅ Approved - Helper for Supplier Payments)
*   **Cancel Purchase**: `DELETE /purchases/:id` (⚠️ **RISKY**)
    *   *Usage*: Used in `PurchasesPage` with simple JS `confirm()`.
    *   *Risk*: No UI guard for "Consumed Stock" or "Paid Status".

#### **Stock Module (`src/services/stock.api.ts`)**
*   **Correct Stock**: `POST /mobileshop/stock/correct` (✅ Approved)
*   **Get Balances**: `GET /mobileshop/stock/summary` (✅ Approved)

---

### 2️⃣ Screen → Action → Backend Flow Map

| Screen | User Action | API Called | Backend Rule | UI Enforcement | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Invoice Detail** | Collect Payment | `collectPayment` | No Overpayment | ✅ Blocks > Balance | 🟢 **SAFE** |
| **Invoice Detail** | Cancel Invoice | `cancelInvoice` | Reverse Stock/Fin | ❌ Button Missing | 🔴 **GAP** |
| **Purchases** | Create Purchase | `createPurchase` | Stock IN | ✅ Validates Form | 🟢 **SAFE** |
| **Purchases** | Cancel Purchase | `cancelPurchase` | Stock logic? | ❌ No State Check | ⚠️ **UNSAFE** |
| **Purchases** | Pay Supplier | `recordPayment` | No Overpayment | ✅ Preset Amount | 🟢 **SAFE** |

---

### 3️⃣ State Machine Check

#### **Invoice State (UI)**
*   **DRAFT**: Not exposed in UI (Direct Creation).
*   **PAID/CREDIT**: Correctly visualized with Color Badges in `InvoiceDetailPage`.
*   **CANCELLED**: Logic exists in `sales.api` types, but no UI action to transition to this state.

#### **Purchase State (UI)**
*   **Status Badges**: DRAFT, SUBMITTED, PAID, CANCELLED are handled with specific colors in `PurchasesPage`.
*   **Transitions**:
    *   `Cancel` button available for all purchases?
    *   Current logic: `handleCancel` does **not** check `status` before showing confirm dialog.
    *   *Risk*: User can try to cancel a PAID purchase. Backend should block, but UI should hide button.

#### **UI Gaps Identified**
1.  **Sales Cancellation**: Completely missing from UI.
2.  **Purchase Cancellation**: Exposed to user even if invalid state (e.g. PAID).
3.  **Legacy Code**: `sales.api.ts` still contains `recordPayment`.

---

### Phase 2 Readiness
**Frontend analysis complete. Ready to enforce rules.**
I recomend:
1.  **Harden Purchase Cancellation**: Disable button if `status === 'PAID'` or `partially_paid`.
2.  **Implement Sales Cancellation**: Add button to `InvoiceDetailPage` with "Reason" modal.
3.  **Clean Up**: Remove legacy `recordPayment` from `sales.api.ts`.
