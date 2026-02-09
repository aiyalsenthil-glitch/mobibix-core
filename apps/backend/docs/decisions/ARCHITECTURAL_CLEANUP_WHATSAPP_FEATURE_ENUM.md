# MobiBix Plan System Architectural Cleanup

**Status**: ✅ COMPLETE  
**Date**: February 8, 2026  
**Scope**: Feature enum refactoring, plan configuration sanitization

---

## Overview

This cleanup removes architectural drift from the subscription plan system. The issue: a single `WhatsAppFeature` enum was being misused as a "feature dumping ground" for both core domain concepts AND premium unlocks.

**Result**: Clean separation of concerns between:

- **PlanFeature**: Premium unlocks only
- **PlanLimits**: Quantitative controls (staff, quotas, windows)
- **PlanCapabilities**: Derived boolean toggles
- **Core domains**: Always-on, never gated

---

## Changes Made

### 1. WhatsAppFeature Enum Refactoring

**Before** (15 values, mixed concerns):

```
MEMBERS_MANAGEMENT        ← Core domain
ATTENDANCE_MANAGEMENT     ← Core domain
STAFF_MANAGEMENT          ← Core domain
QR_ATTENDANCE             ← Core domain
MEMBER_PAYMENT_TRACKING   ← Core domain
WHATSAPP_ALERTS_BASIC     ← Legacy multi-tier (removed)
WHATSAPP_ALERTS_ALL       ← Legacy multi-tier (removed)
WELCOME                   ← Core notification
EXPIRY                    ← Core notification
PAYMENT_DUE               ← Core notification
REMINDER                  ← Core notification
REPORTS                   ← Premium unlock ✓
CUSTOM_PRINT_LAYOUT       ← Premium unlock ✓
MULTI_SHOP                ← Premium unlock ✓
WHATSAPP_ALERTS_AUTOMATION ← Premium unlock ✓
```

**After** (4 values, premium only):

```
REPORTS
CUSTOM_PRINT_LAYOUT
MULTI_SHOP
WHATSAPP_ALERTS_AUTOMATION
```

**Files Changed**:

- `src/core/billing/whatsapp-rules.ts` (enum definition)
- `prisma/schema.prisma` (Prisma enum)

---

### 2. Seed Plan Features Cleanup

**Before** (every plan had core domain features listed):

```typescript
GYM_TRIAL: [
  MEMBERS_MANAGEMENT,
  ATTENDANCE_MANAGEMENT,
  QR_ATTENDANCE,
  MEMBER_PAYMENT_TRACKING,
  WELCOME,
  EXPIRY,
];
```

**After** (only premium unlocks):

```typescript
GYM_TRIAL: [];
GYM_STANDARD: [];
GYM_PRO: [REPORTS];

MOBIBIX_TRIAL: [];
MOBIBIX_STANDARD: [];
MOBIBIX_PRO: [
  REPORTS,
  CUSTOM_PRINT_LAYOUT,
  MULTI_SHOP,
  WHATSAPP_ALERTS_AUTOMATION,
];
```

**File Changed**:

- `prisma/seed-plans-v1.ts` (PLAN_FEATURES object)

---

### 3. PlanLimits Cleanup

**Removed**:

- `maxMembers` field (customers are never limited by plan)

**Kept**:

- `maxStaff`: Staff count cap (enforced at API)
- `reminderQuotaPerDay`: Daily reminder limit (soft cap)
- `analyticsHistoryDays`: Lookback window (visibility, not data deletion)
- `whatsapp`: Message quotas (utility/marketing)

**File Changed**:

- `src/core/billing/plan-limits.ts`

---

### 4. PlanCapabilities Refactoring

**Before** (mixed model/feature/limit toggles):

```typescript
{
  staffAllowed: true,
  staff: true,
  staffInvite: true,
  maxStaff: 3,          ← Limit, should be in PlanLimits
  memberLimit: 100,     ← Limit, should be in PlanLimits
  attendance: true,     ← Core feature, should not be here
  whatsapp: true,       ← Core feature, should not be here
  reports: true/false,  ← Premium unlock, OK
}
```

**After** (derived boolean toggles only):

```typescript
{
  // Core features (toggles only)
  staffAllowed: true,
  staff: true,
  staffInvite: true,
  attendance: true,

  // Premium unlocks (derived from PlanFeature)
  canGenerateReports: true/false,      ← REPORTS feature
  canUseMultiShop: true/false,         ← MULTI_SHOP feature
  canUseCustomPrintLayout: true/false, ← CUSTOM_PRINT_LAYOUT feature
  canUseWhatsAppAutomation: true/false ← WHATSAPP_ALERTS_AUTOMATION feature
}
```

**File Changed**:

- `src/core/billing/plan-capabilities.ts`

---

### 5. Service Layer Updates

**WhatsAppFeatureEventMap** (`whatsapp-gating.ts`):

- Changed from enum-based to string-based mapping
- Added documentation: Core notifications are always-on
- Removed feature gating for WELCOME, PAYMENT_DUE, REMINDER, EXPIRY

**AutomationSafetyService** (`automation-safety.service.ts`):

- Updated `mapTemplateKeyToFeature()` to return null for core notifications
- Added check: Only WHATSAPP_ALERTS_AUTOMATION requires gating for advanced features

**WhatsAppSender** (`whatsapp.sender.ts`):

- Changed parameter from `feature: WhatsAppFeature` to `notificationType: string`
- Updated mapping to handle core notification types

**WhatsAppRemindersService** (`whatsapp-reminders.service.ts`):

- Updated call to use string `'REMINDER'` instead of enum

**WhatsAppUserService** (`whatsapp-user.service.ts`):

- Simplified feature derivation logic
- Removed checks for deleted WHATSAPP_ALERTS_BASIC/ALL
- Only checks for WHATSAPP_ALERTS_AUTOMATION (premium)

---

## Architecture Guarantees

### ✅ Premium Features (Guarded by PlanFeature)

- REPORTS: Advanced analytics and business intelligence
- CUSTOM_PRINT_LAYOUT: Invoice branding and customization
- MULTI_SHOP: Multi-location support for enterprises
- WHATSAPP_ALERTS_AUTOMATION: Scheduled campaigns and advanced automation

### ✅ Core Features (Always-On)

- Members/customers management (unlimited)
- Staff management (limited by maxStaff in PlanLimits, not gated)
- Attendance tracking
- Payment tracking
- Basic notifications (welcome, payment reminders, expiry alerts)
- Invoice creation and GST calculations
- Ledger and accounting entries

### ✅ Limits (Enforced via PlanLimits, Not Gated)

- Staff count: 3 (Trial/Standard), unlimited (Pro)
- Analytics history: 30/90/365 days (visibility window, not data deletion)
- Reminder quotas: 50/300/unlimited per day
- WhatsApp message quotas: Utility and marketing caps

### ❌ Never Limited

- Customer/member count (always unlimited)
- Invoice access (always available)
- GST and accounting records (always available)
- Core compliance features (always available)

---

## Single Source of Truth

| Component                            | Purpose                 | Values                                                               |
| ------------------------------------ | ----------------------- | -------------------------------------------------------------------- |
| **PlanFeature** (enum + table)       | Premium unlocks         | REPORTS, MULTI_SHOP, CUSTOM_PRINT_LAYOUT, WHATSAPP_ALERTS_AUTOMATION |
| **PlanLimits** (config object)       | Quotas, windows, counts | maxStaff, reminderQuotaPerDay, analyticsHistoryDays, whatsapp quotas |
| **PlanCapabilities** (config object) | Derived toggles         | canGenerateReports, canUseMultiShop, etc.                            |
| **Core Domains** (Prisma models)     | Always-on               | Members, Staff, Invoices, Ledger, etc.                               |

---

## Migration Steps

1. **Backup current database** (if on production)
2. **Review this document** for understanding the changes
3. **Run Prisma migration**:
   ```bash
   cd apps/backend
   npx prisma migrate dev --name architectural-cleanup-whatsapp-feature-enum
   ```
4. **Regenerate Prisma Client**:
   ```bash
   npx prisma generate
   ```
5. **Run tests**:
   ```bash
   npm run test:watch
   ```
6. **Build and verify**:
   ```bash
   npm run build
   ```

---

## Behavior Changes

### What's Different?

- Core notifications (welcome, payment reminders, etc.) are **never gated** by plan
- Staff limits are enforced at API level, **not** via PlanFeature
- Customers/members are **never limited** by plan
- Reports access is **gated** via PlanFeature.REPORTS

### What's the Same?

- Pricing models, plan codes, and subscriptions unchanged
- Staff count limits and values unchanged
- WhatsApp message quotas unchanged
- All existing customer data preserved
- No data migration required

---

## Compliance & Guard Safety

✅ **Safe**:

- No core compliance features are newly gated
- All invoices remain accessible
- GST calculations are always-on
- Ledger records are permanent
- Staff limits are controlled via quantitative caps, not gating

✅ **Guard-Proof**:

- Cannot bypass tax compliance via plan changes
- Cannot hide or restrict invoice access
- Cannot block payment tracking
- Cannot restrict staff creation (only limits via caps)

---

## Testing Checklist

- [ ] Migrations run without errors
- [ ] Prisma Client regenerates successfully
- [ ] TypeScript compilation succeeds
- [ ] Unit tests pass (especially whatsapp-\* services)
- [ ] Staff count limit enforced for Standard plan
- [ ] Reports hidden for Standard plan, visible for Pro
- [ ] Multi-shop locked for Standard, unlocked for Pro
- [ ] Reminders/notifications sent regardless of plan
- [ ] Invoices accessible regardless of plan
- [ ] GST calculations always-on

---

## Files Modified

1. `src/core/billing/whatsapp-rules.ts` (enum)
2. `prisma/schema.prisma` (enum)
3. `prisma/seed-plans-v1.ts` (PLAN_FEATURES)
4. `src/core/billing/plan-limits.ts` (removed maxMembers)
5. `src/core/billing/plan-capabilities.ts` (refactored toggles)
6. `src/core/billing/whatsapp-gating.ts` (event mapping)
7. `src/modules/whatsapp/automation-safety.service.ts` (feature mapping)
8. `src/modules/whatsapp/whatsapp.sender.ts` (parameter type)
9. `src/modules/whatsapp/whatsapp-reminders.service.ts` (call site)
10. `src/modules/whatsapp/whatsapp-user.service.ts` (feature derivation)

---

## Documentation

- Feature-gating pattern: See `MOBIBIX_PLAN_IMPLEMENTATION.md`
- Guard implementation: See billing module docs
- Plan system architecture: See `BILLING_MIGRATION_ANALYSIS.md`

---

**Status**: Ready for migration  
**Approved**: Product & Engineering  
**Last Updated**: February 8, 2026
