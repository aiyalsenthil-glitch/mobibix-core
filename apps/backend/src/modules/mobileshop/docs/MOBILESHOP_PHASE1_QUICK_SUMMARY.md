# MobileShop ERP - Phase-1 Launch: Quick Summary

## Status by Area

| Area                     | Status        | Must Fix? | Effort   |
| ------------------------ | ------------- | --------- | -------- |
| **Job Cards**            | ✅ Ready      | No        | —        |
| **Architecture**         | ✅ Ready      | No        | —        |
| **Customers**            | ✅ Ready      | No        | —        |
| **GST Compliance**       | ⚠️ Incomplete | YES       | 6 days   |
| **Payment Tracking**     | ⚠️ Incomplete | YES       | 3 days   |
| **Inventory Deductions** | ⚠️ Incomplete | YES       | 2.5 days |
| **Legal Protections**    | ❌ Missing    | YES       | 2 days   |
| **Core Reports**         | ❌ Missing    | YES       | 4.5 days |

**Total work**: 18 days (2-3 weeks, 2 engineers)

---

## Top 5 Blockers for Launch

### 🔴 BLOCKER #1: No GST Rate Calculation

**Problem**: Can't file GSTR-1 (Indian tax return)  
**Impact**: Legal non-compliance, audit risk  
**Fix**: Add gstRate per invoice item + TaxCalculationService  
**Time**: 4 days

### 🔴 BLOCKER #2: No Payment Status on Invoices

**Problem**: Can't track receivables (who owes money)  
**Impact**: Can't follow up, cash flow invisible  
**Fix**: Add paidAmount + paymentStatus fields  
**Time**: 3 days

### 🔴 BLOCKER #3: Repair Parts Don't Deduct from Stock

**Problem**: Inventory numbers lie ("20 batteries" but only 15 available)  
**Impact**: Stock outs surprise customers, reports broken  
**Fix**: Create StockLedger OUT when part added to repair  
**Time**: 2.5 days

### 🟡 BLOCKER #4: No Legal Consent Capture

**Problem**: No proof customer knew about data loss risk, warranty limits  
**Impact**: Disputes have no legal footprint  
**Fix**: Add consent checkboxes to job card  
**Time**: 1 day

### 🟡 BLOCKER #5: No Reports for Business Ops

**Problem**: Shop owner blind on daily revenue, who owes money, stock value  
**Impact**: Can't run business without spreadsheets  
**Fix**: 3 core reports (daily sales, receivables aging, inventory valuation)  
**Time**: 4.5 days

---

## What NOT to Change

- ✅ Job card module — solid, don't touch
- ✅ Auth/tenant isolation — secure, don't touch
- ✅ WhatsApp integration — working, defer advanced features
- ✅ Multi-tenant DB layout — correct, leave as is

---

## Phased Fix Plan

### WEEK 1 (GST + Payments)

```
MON-TUE: Add gstRate per item + TaxCalcService
WED: Implement GSTR-1 report endpoint
THU: Add invoice.paidAmount tracking
FRI: Test end-to-end invoice payment flow
```

**Outcome**: Can file GST returns, track receivables

### WEEK 2 (Inventory + Safety)

```
MON: Fix repair parts stock deduction
TUE: Add StockValidationService (prevent negative)
WED: Link IMEI to invoice items
THU: Add job card consent + warranty fields
FRI: Test negative stock prevention
```

**Outcome**: Inventory accurate, legal protection in place

### WEEK 3 (Reports + Polish)

```
MON-TUE: Implement 3 core reports
WED-THU: Frontend UI for new fields
FRI: QA & final testing
```

**Outcome**: Ready for first pilot shop

---

## Go / No-Go Criteria

### ✅ BEFORE LAUNCH - All Required

- [ ] Job card → Repair → Stock deduction works
- [ ] Invoice created → Can collect payment → paidAmount updates
- [ ] GSTR-1 report generates without errors (use sample data)
- [ ] Receivables aging shows correct outstanding
- [ ] Receipt prevents payment > balance due
- [ ] Cannot sell 10 units when only 5 in stock
- [ ] Daily sales dashboard works
- [ ] Consent checkboxes show on job card

### ⏰ AFTER LAUNCH - Can Add in Phase-2

- Advanced GST features (GSTR-3B, cross-state tracking)
- Analytics & charts
- Loyalty programs
- Booking/scheduling
- Multi-shop consolidation
- POS kiosk

---

## Why This Matters

### Without these fixes:

- ❌ Cannot file GST returns → Penalties + audit risk
- ❌ Cannot track who owes money → Chasing customers blind
- ❌ Cannot prove customer consent → Liability on disputes
- ❌ Inventory doesn't match reality → Lost sales
- ❌ No business reports → Flying blind on P&L

### With these fixes:

- ✅ Full GST compliance, ready for auditor
- ✅ Clear receivables, can prioritize collection
- ✅ Legal protection, clear T&Cs with customers
- ✅ Accurate inventory, customer trust
- ✅ Daily business visibility, data-driven decisions

---

## Risk if Deployed Without Fixes

| Risk                  | Severity    | Likelihood                        |
| --------------------- | ----------- | --------------------------------- |
| GST audit             | 🔴 Critical | 90% (if filed incorrectly)        |
| Inventory mismatch    | 🔴 Critical | 95% (will happen within 1 week)   |
| Payment tracking loss | 🟡 High     | 100% (unavoidable)                |
| Customer disputes     | 🟡 High     | 80% (no legal proof)              |
| Reports unavailable   | 🟡 High     | 100% (will need them immediately) |

---

## Recommendation

🚀 **DO NOT LAUNCH WITHOUT THESE 5 BLOCKERS FIXED**

- Current readiness: ~60%
- Minimum for MVP: ~90%
- Achievable in 2-3 weeks
- Worth the wait to avoid legal + operational pain later

**Better to delay 3 weeks than face GST penalties for the next 5 years**

---

**Next Step**: Assign 2 engineers to Week-1 tasks (GST + Payments)
