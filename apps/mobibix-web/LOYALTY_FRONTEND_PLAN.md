# 🎯 Mobibix Loyalty System - Frontend Implementation Plan

**Phase:** Starting Phase 1 (Earning & Display)  
**Timeline:** ~20-25 hours across 3 phases  
**Complexity:** Medium (API integration, form validation, real-time calculations)

---

## 📊 Architecture Overview

### Current Flow

```
Customer → Invoice Created → Items Added → Payment Collected → Invoice PAID
```

### After Loyalty Integration

```
Customer → Invoice Created → Items Added → [LOYALTY AVAILABLE] → Payment Collected → Invoice PAID → Points Earned
```

---

## 🔄 Phase 1: Loyalty Display & Earning (7-8 hours)

### 1.1 API Layer Updates (`src/services/sales.api.ts`)

**New Endpoints:**

```typescript
// 1. Get customer loyalty balance
getCustomerLoyaltyBalance(customerId: string): Promise<number>

// 2. Validate redemption before invoice creation
validateLoyaltyRedemption(dto: {
  customerId: string;
  points: number;
  invoiceSubTotal: number;
}): Promise<{
  success: boolean;
  maxPoints: number;
  discountPaise: number;
  error?: string;
}>

// 3. Get loyalty config
getLoyaltyConfig(): Promise<LoyaltyConfig>
```

**Type Updates:**

```typescript
export interface SalesInvoice {
  // ... existing fields ...

  // NEW: Loyalty fields
  loyaltyDiscount?: number; // In paisa
  loyaltyPointsRedeemed?: number;
  loyaltyPointsEarned?: number;
}

export interface LoyaltyConfig {
  isEnabled: boolean;
  earnAmountPerPoint: number; // ₹100 = 1 point
  pointValueInRupees: number; // 1 point = ₹1
  maxRedeemPercent: number; // Max 50%
}
```

### 1.2 UI Components - Invoice Creation

**File:** `src/components/invoices/InvoiceForm.tsx`

**Changes Required:**

1. **Add customer loyalty info display** (after customer name/phone selection)
   - Show "Customer Balance: X points (₹Y)" in a badge
   - Fetch balance when customer is selected
   - Show loading state while fetching

2. **Add loyalty section in form** (below items, before payment mode)
   - Checkbox: "Use Loyalty Points?"
   - Input field: "Points to Redeem" (only shown if checked)
   - Live validation against max balance
   - Real-time discount calculation
   - Display: "Discount: -₹X" (in green)
   - Show max allowed: "Max points allowed: Y"
   - Error message if exceeds limits

3. **Update invoice totals calculation**
   - Integrate loyalty discount into GST calculation
   - Ensure discount reduces taxable value (not applied after GST)
   - Update line items preview to show loyalty discount as negative line

4. **Form submission**
   - Include loyaltyPointsRedeemed in invoice creation request
   - Pass loyalty discount to backend

**New Sub-Components:**

```
InvoiceForm
├── LoyaltyInfo.tsx              [NEW] - Shows customer balance
├── LoyaltyRedemptionInput.tsx   [NEW] - Input + validation
└── (existing: ItemsTable, TotalsDisplay, etc.)
```

### 1.3 UI Components - Invoice Display

**File:** `src/components/invoices/InvoiceDetail.tsx` (or similar)

**Changes Required:**

1. **Display earned loyalty points** (after invoice total)
   - If invoice is PAID: "✅ Points Earned: +50"
   - Shows total points earned on this invoice

2. **Display redeemed loyalty points** (if applicable)
   - "💳 Points Redeemed: -100"
   - Shows discount amount: "(₹100 discount)"

3. **Timeline/History** (if invoice has timeline)
   - Add loyalty earning event: "Points earned on payment"
   - Add reversal event: "Points reversed on cancellation"

### 1.4 Payment Collection - Loyalty Earning Integration

**File:** `src/components/sales/CollectPaymentModal.tsx`

**Changes Required:**

1. **Add loyalty notification before submit**
   - "This invoice qualifies for X points on payment"
   - "Current balance will be: Y + X = Z points"
   - Only show if loyalty is enabled and customer has no prior balance

2. **Success message enhancement**
   - "✅ Payment collected. Earned 50 loyalty points!"
   - Show new balance: "New balance: 150 points (₹150)"

---

## 🎁 Phase 2: Loyalty Redemption UI (8-10 hours)

### 2.1 Redemption at Invoice Creation

**File:** `src/components/invoices/InvoiceForm.tsx`

**Changes Required:**

1. **Enhanced loyalty input section**
   - Existing from Phase 1
   - Add slider for point selection (optional UX enhancement)
   - Add "Max" button to quickly select maximum allowed points
   - Live preview of line item to be added

2. **Invoice items table update**
   - Show loyalty discount as a separate negative line item
   - Display: "Loyalty Redemption -₹100 @0% GST"
   - Allow removal of loyalty discount (uncheck box)

3. **GST calculation integration**
   - Subtotal reduces by loyalty discount amount
   - GST recalculated on reduced subtotal
   - Show calculation breakdown

### 2.2 Redemption History

**File:** `src/components/crm/CustomerProfile.tsx` (or new page)

**Changes Required:**

1. **Customer loyalty dashboard section**
   - Current balance: [X points = ₹Y]
   - Progress bar: "50 points away from ₹500 discount"
   - Transaction history table:
     - Date | Type | Points | Amount | Invoice# | Notes
     - 2026-02-10 | Earned | +100 | ₹100 | INV-001 | Points on payment
     - 2026-02-08 | Redeemed | -50 | -₹50 | INV-002 | Used on purchase
     - 2026-02-05 | Reversed | -30 | - | INV-001 | Invoice cancelled

2. **Filters**
   - Date range filter
   - Type filter (Earned/Redeemed/Reversed)
   - Search by invoice number

### 2.3 New Component: Loyalty Dashboard Page

**File:** `app/dashboard/loyalty/page.tsx` (or add to admin)

**Display:**

1. **Tenant loyalty settings** (admin view)
   - "Loyalty is [Enabled/Disabled]"
   - Config snapshot: "₹100 = 1 point, Max 50% discount"
   - Toggle to enable/disable

2. **Customer summary**
   - Total customers with loyalty balance
   - Top customers by balance
   - Recent transactions

3. **Analytics** (optional)
   - Total points issued this month
   - Total points redeemed
   - Popular redemption % (20%, 40%, 60%?)

---

## ⚙️ Phase 3: Admin Configuration & Reporting (5-7 hours)

### 3.1 Loyalty Settings Page

**File:** `app/dashboard/settings/loyalty.tsx` [NEW]

**UI Elements:**

1. **Feature Toggle**
   - Checkbox: "Enable Loyalty Program"
   - Warning: "Disabling will freeze earning but not reverse existing points"

2. **Earning Configuration**
   - Input: "X rupees = Y points"
   - Example: "100 = 1" means ₹100 → 1 point
   - Validation: Must be positive integers

3. **Redemption Configuration**
   - Input: "1 point = ₹X"
   - Input: "Maximum discount: Y%"
   - Example: "1 point = ₹1", "Max 50%"

4. **Category Restrictions**
   - Checkbox: "Allow on Repairs"
   - Checkbox: "Allow on Accessories"
   - Checkbox: "Allow on Services"

5. **Expiry & Controls**
   - Input: "Points expire after X days" (optional)
   - Checkbox: "Allow manual adjustments"
   - Warning color: "Manual adjustments are audited"

6. **Save button** - "Update Loyalty Configuration"

### 3.2 Reports Page

**File:** `app/dashboard/reports/loyalty.tsx` [NEW]

**Sections:**

1. **Period Selection**
   - Month/Year dropdowns
   - "Generate Report" button

2. **Summary Cards**
   - Total Points Issued
   - Total Points Redeemed
   - Points Outstanding
   - Active Customers (with balance)

3. **Detailed Table**
   - Customer Name
   - Current Balance
   - Points Earned (Month)
   - Points Redeemed (Month)
   - Last Activity

4. **Export**
   - "Download CSV" button
   - "Download PDF" button

### 3.3 Loyalty Transactions Log

**File:** `app/dashboard/audit/loyalty-log.tsx` [NEW]

**Table Columns:**

- Date/Time
- Customer Name
- Type (EARN/REDEEM/MANUAL/REVERSAL)
- Points (±)
- Amount (₹)
- Invoice#
- Reference
- Audit Trail (createdBy for manual)

**Filters:**

- Date range
- Transaction type
- Customer search
- Status

---

## 📁 File Structure Summary

### New Files to Create

```
src/
├── components/
│   ├── loyalty/
│   │   ├── CustomerLoyaltyInfo.tsx       [NEW]
│   │   ├── LoyaltyRedemptionInput.tsx    [NEW]
│   │   ├── LoyaltyHistory.tsx            [NEW]
│   │   └── LoyaltyTransactionRow.tsx     [NEW]
│   └── (existing: invoices/, sales/)    [MODIFY]
├── services/
│   └── loyalty.api.ts                   [NEW]
└── types/
    └── loyalty.types.ts                 [NEW]

app/
├── dashboard/
│   ├── loyalty/
│   │   └── page.tsx                     [NEW]
│   ├── settings/
│   │   └── loyalty.tsx                  [NEW]
│   ├── reports/
│   │   └── loyalty.tsx                  [NEW]
│   └── audit/
│       └── loyalty-log.tsx              [NEW]
└── (existing: layout, providers)        [MAYBE MODIFY]
```

### Files to Modify

| File                                           | Changes                                                                                    | Phase |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ | ----- |
| `src/components/invoices/InvoiceForm.tsx`      | Add customer loyalty balance display, add redemption input section, update GST calculation | 1, 2  |
| `src/components/sales/CollectPaymentModal.tsx` | Add loyalty earning notification, update success message                                   | 1     |
| `src/services/sales.api.ts`                    | Add loyalty API methods, update type definitions                                           | 1     |
| `src/types/sales.types.ts`                     | Add loyalty discount fields to invoice type                                                | 1     |
| Customer profile component (TBD)               | Add loyalty transaction history section                                                    | 2     |
| App navigation                                 | Add "Loyalty" link in admin/settings menu                                                  | 3     |

---

## 🔌 API Integration Points

### Backend Endpoints Used (Already Implemented ✅)

```
GET  /loyalty/balance/:customerId
     → Returns: { customerId, balance, pointValueInRupees }

POST /loyalty/validate-redemption
     → Request: { customerId, points, invoiceSubTotal }
     → Returns: { success, points, discountPaise, error }

GET  /loyalty/config
     → Returns: { isEnabled, earnAmountPerPoint, pointValueInRupees, maxRedeemPercent, ... }

PUT  /loyalty/config
     → Request: { isEnabled, earnAmountPerPoint, ... }
     → Returns: { config }

POST /loyalty/manual-adjustment
     → Request: { customerId, points, reason }
     → Returns: { message, adjustment }
```

### Frontend → Backend Flow

**On Invoice Creation with Loyalty:**

```
1. User selects customer
2. Frontend calls: GET /loyalty/balance/:customerId
3. Display balance in UI
4. User enters points to redeem
5. Frontend calls: POST /loyalty/validate-redemption { customerId, points, invoiceSubTotal }
6. Backend returns: { success, discountPaise, maxPoints }
7. Frontend updates invoice totals with discount (pre-GST)
8. User clicks "Create Invoice"
9. Frontend calls: POST /invoices { items, loyaltyPointsRedeemed, loyaltyDiscount, ... }
10. Backend:
    - Creates invoice with loyalty discount line item
    - Calls LoyaltyService.redeemPoints()
    - Returns created invoice with loyalty info
11. Frontend displays success with new balance
```

**On Invoice Payment:**

```
1. User collects payment in CollectPaymentModal
2. Backend recordPayment() updates status → PAID
3. Backend automatically:
   - Calls LoyaltyService.awardLoyaltyPoints()
   - Creates loyalty transaction with EARN type
4. Frontend shows: "Earned X points!"
```

---

## 🎨 UI/UX Details

### Color Coding

- **Earning:** Green badge "✅ +50 points"
- **Redeeming:** Blue section "💳 Redeem loyalty"
- **Discount:** Green text "-₹100"
- **Error:** Red text "Exceeds max limit"

### States & Loading

1. **Loading loyalty balance**
   - Show skeleton loader in info badge
   - Disable redemption input until loaded

2. **Validating redemption**
   - Debounce validation request (500ms)
   - Show "Validating..." status
   - Prevent form submission until valid

3. **Creating invoice with loyalty**
   - Show: "Creating invoice with loyalty redemption..."
   - Disable submit button

4. **Payment success with loyalty**
   - Success toast: "✅ Payment collected. +50 points earned!"
   - Update customer balance in UI

### Forms Validation

**Redemption Input:**

- Must be integer ≥ 0
- Must be ≤ customer balance
- Must not exceed max % of invoice
- Real-time error feedback
- Disable submit if invalid

---

## 📋 Implementation Checklist

### Phase 1: Display & Earning

- [ ] Create `src/services/loyalty.api.ts` with API methods
- [ ] Create `src/components/loyalty/CustomerLoyaltyInfo.tsx`
- [ ] Create `src/components/loyalty/LoyaltyRedemptionInput.tsx`
- [ ] Modify `InvoiceForm.tsx` to include customer balance display
- [ ] Modify `InvoiceForm.tsx` to include redemption input (non-functional, just UI)
- [ ] Modify `InvoiceForm.tsx` GST calculation to account for loyalty discount
- [ ] Modify `CollectPaymentModal.tsx` to show earning notification
- [ ] Update types in `sales.api.ts`
- [ ] Test customer balance display
- [ ] Test redemption input validation
- [ ] Test GST calculation with loyalty discount

### Phase 2: Redemption & History

- [ ] Connect redemption input to submit (call validateRedemption)
- [ ] Update invoice creation to include loyalty discount line item
- [ ] Create `src/components/loyalty/LoyaltyHistory.tsx`
- [ ] Add loyalty history to customer profile
- [ ] Create transaction history table
- [ ] Add filters (type, date range)
- [ ] Test redemption flow end-to-end
- [ ] Test history display and filters

### Phase 3: Admin & Reporting

- [ ] Create loyalty settings page
- [ ] Create loyalty reports page
- [ ] Create loyalty audit log page
- [ ] Implement loyalty toggle
- [ ] Implement config save/update
- [ ] Test config updates in production
- [ ] Test reports and exports

---

## ⚡ Performance Considerations

### API Call Optimization

1. **Debounce balance fetch** after customer selection (300ms)
2. **Cache loyalty config** (refresh every 5 minutes)
3. **Debounce redemption validation** (500ms while user typing)
4. **Pagination** for transaction history (20 per page)

### Component Optimization

1. Use `useMemo` for calculated totals
2. Use `useCallback` for event handlers
3. Lazy load loyalty dashboard if it's heavy
4. Cache customer balance in context (optional)

---

## 🧪 Testing Checklist

### Unit Tests

- [ ] LoyaltyRedemptionInput: validates max points
- [ ] LoyaltyRedemptionInput: calculates discount correctly
- [ ] GST calculation: applies discount before tax
- [ ] Balance display: shows correct format (X points = ₹Y)

### Integration Tests

- [ ] Customer balance fetches on load
- [ ] Redemption validation calls backend
- [ ] Invoice creation includes loyalty discount
- [ ] Payment earning triggers correctly

### E2E Tests (Manual)

- [ ] Create invoice with customer who has balance
- [ ] Redeem points → invoice created with discount
- [ ] Collect payment → points earned shown
- [ ] Cancel invoice → points reversed (Phase 3)
- [ ] Admin can update loyalty config
- [ ] Loyalty report generates correctly

---

## 🚀 Rollout Strategy

### Soft Launch (Week 1)

- Deploy Phase 1 (earning only)
- Enable on staging first
- Get accountant approval
- Monitor for GST calculation correctness

### Phase 1 Launch (Week 2)

- Enable on production for 1-2 tenants
- Monitor points earning, balance accuracy
- Get user feedback on UI

### Phase 2 Launch (Week 3)

- Roll out redemption to all tenants
- Train staff on "Use Loyalty Points" feature
- Promote customer loyalty program

### Phase 3 Launch (Week 4)

- Roll out admin settings page
- Tenants can configure earning/redemption rules
- Reports available for all transactions

---

## 📞 Support & Documentation

### For Users (In-App)

- [ ] Tooltip: "Earn X points on every ₹Y purchase"
- [ ] Tooltip: "Redeem points for discounts (max 50%)"
- [ ] Help text: "Points are earned when invoice is PAID"
- [ ] Message: "Points reversed if invoice is cancelled"

### For Admins

- [ ] Settings page help text explaining each field
- [ ] Quick reference: "₹100 = 1 point means customers earn 1 point per ₹100 spent"

### For Developers

- [ ] API documentation in IMPLEMENTATION_SUMMARY.md
- [ ] Loyalty system spec: LOYALTY_SYSTEM_SPEC.md
- [ ] Code comments for complex GST calculations
- [ ] Error handling guide for API failures

---

## 💰 Estimated Hours

| Phase           | Component                        | Hours        |
| --------------- | -------------------------------- | ------------ |
| 1               | API integration                  | 2            |
| 1               | CustomerLoyaltyInfo component    | 1.5          |
| 1               | LoyaltyRedemptionInput (UI only) | 1.5          |
| 1               | InvoiceForm integration          | 1.5          |
| 1               | CollectPaymentModal enhancement  | 0.5          |
| 1               | Testing Phase 1                  | 1            |
| **1 Total**     |                                  | **8 hours**  |
| 2               | Redemption completion            | 2            |
| 2               | LoyaltyHistory component         | 2            |
| 2               | Customer profile integration     | 2            |
| 2               | Testing Phase 2                  | 2            |
| **2 Total**     |                                  | **8 hours**  |
| 3               | Settings page                    | 2.5          |
| 3               | Reports page                     | 2.5          |
| 3               | Audit log page                   | 1.5          |
| 3               | Testing Phase 3                  | 1.5          |
| **3 Total**     |                                  | **8 hours**  |
| **Grand Total** |                                  | **24 hours** |

---

## ✅ Success Criteria

### Phase 1 Complete When:

- ✅ Customer loyalty balance displays correctly
- ✅ Redemption input shows with validation
- ✅ GST calculated on reduced subtotal
- ✅ Points earned on invoice payment
- ✅ Balance updates after earning
- ✅ Payment modal shows earning notification

### Phase 2 Complete When:

- ✅ Redemption line item added to invoice
- ✅ Invoice created with loyalty discount
- ✅ Loyalty discount reduces invoice total correctly
- ✅ Transaction history displays
- ✅ Filters work on history

### Phase 3 Complete When:

- ✅ Admin can enable/disable loyalty
- ✅ Admin can update config (earn rate, max %)
- ✅ Reports show correct totals
- ✅ Audit log shows all transactions
- ✅ No GST compliance issues

---

**🎯 READY TO IMPLEMENT?**

This plan covers:

- All user-facing features (earning, display, redemption)
- All admin features (config, reports, audit)
- Full GST compliance
- Complete API integration
- Performance optimization

Start with Phase 1 → Phase 2 → Phase 3 for a smooth rollout.
