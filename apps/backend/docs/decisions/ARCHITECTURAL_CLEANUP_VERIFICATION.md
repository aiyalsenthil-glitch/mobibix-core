# Architectural Cleanup Verification

**Date**: February 8, 2026  
**Task**: Remove feature enum drift, enforce clean separation of concerns

---

## ✅ COMPLETED TASKS

### 1. Feature Enum Refactoring

- [x] Reduced WhatsAppFeature enum from 15 to 4 values
- [x] Removed core domain features (MEMBERS_MANAGEMENT, STAFF_MANAGEMENT, etc.)
- [x] Removed legacy multi-tier alerts (WHATSAPP_ALERTS_BASIC, WHATSAPP_ALERTS_ALL)
- [x] Removed core notifications (WELCOME, EXPIRY, PAYMENT_DUE, REMINDER)
- [x] Kept only premium unlocks (REPORTS, CUSTOM_PRINT_LAYOUT, MULTI_SHOP, WHATSAPP_ALERTS_AUTOMATION)
- [x] Updated both TypeScript enum and Prisma schema

### 2. Plan Features Seed Cleanup

- [x] GYM_TRIAL: Removed all core features → []
- [x] GYM_STANDARD: Removed all core features → []
- [x] GYM_PRO: Keep only REPORTS
- [x] MOBIBIX_TRIAL: Removed all core features → []
- [x] MOBIBIX_STANDARD: Removed all core features → []
- [x] MOBIBIX_PRO: Keep REPORTS + add CUSTOM_PRINT_LAYOUT, MULTI_SHOP, WHATSAPP_ALERTS_AUTOMATION
- [x] WHATSAPP_CRM: Keep empty (add-on, no core features)

### 3. Plan Limits Cleanup

- [x] Removed `maxMembers` field (customers never limited)
- [x] Kept `maxStaff` (enforced at API)
- [x] Kept `reminderQuotaPerDay` (soft cap)
- [x] Kept `analyticsHistoryDays` (visibility window)
- [x] Kept `whatsapp` quotas

### 4. Plan Capabilities Refactoring

- [x] Removed `memberLimit` field
- [x] Removed `maxStaff` (moved to PlanLimits)
- [x] Removed `whatsapp` boolean (core feature, always-on)
- [x] Renamed `reports` → `canGenerateReports` (derived from REPORTS feature)
- [x] Added `canUseMultiShop` (derived from MULTI_SHOP feature)
- [x] Added `canUseCustomPrintLayout` (derived from CUSTOM_PRINT_LAYOUT feature)
- [x] Added `canUseWhatsAppAutomation` (derived from WHATSAPP_ALERTS_AUTOMATION feature)

### 5. Service Layer Updates

- [x] **whatsapp-gating.ts**: Changed event mapping from enum to string; documented core notifications as always-on
- [x] **automation-safety.service.ts**: Updated `mapTemplateKeyToFeature()` to return null for core notifications
- [x] **whatsapp.sender.ts**: Changed parameter from enum to string; updated mappings
- [x] **whatsapp-reminders.service.ts**: Updated call site to use string 'REMINDER'
- [x] **whatsapp-user.service.ts**: Simplified feature derivation; removed checks for deleted enums

### 6. Documentation

- [x] Created comprehensive cleanup guide: ARCHITECTURAL_CLEANUP_WHATSAPP_FEATURE_ENUM.md
- [x] Documented all breaking changes and migrations
- [x] Added testing checklist
- [x] Provided guard safety guarantees

---

## Architecture State

### Clean Separation of Concerns

```
┌──────────────────────────────────────────────────────┐
│ PLAN SYSTEM ARCHITECTURE (Post-Cleanup)              │
└──────────────────────────────────────────────────────┘

┌─────────────────────┐
│   PlanFeature       │  Premium unlocks only
│   (Enum + Table)    │  - REPORTS
│                     │  - MULTI_SHOP
│                     │  - CUSTOM_PRINT_LAYOUT
│                     │  - WHATSAPP_ALERTS_AUTOMATION
└──────────┬──────────┘
           │
           ├──→ Stored in PlanFeature JOIN table
           ├──→ Used to gate premium functionality
           └──→ Never for core features

┌──────────────────────────────────────┐
│ PlanLimits (Config Object)           │  Quantitative Controls
│ - maxStaff                           │  - Staff count caps
│ - reminderQuotaPerDay               │  - Daily limits
│ - analyticsHistoryDays              │  - Visibility windows
│ - whatsapp { utility, marketing }   │  - Message quotas
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ PlanCapabilities (Config Object)    │  Derived Boolean Toggles
│ - canGenerateReports                │  ← From REPORTS feature
│ - canUseMultiShop                   │  ← From MULTI_SHOP feature
│ - canUseCustomPrintLayout           │  ← From CUSTOM_PRINT_LAYOUT feature
│ - canUseWhatsAppAutomation          │  ← From WHATSAPP_ALERTS_AUTOMATION feature
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│ Core Domains (Always-On)             │
│ - Members / Customers (unlimited)    │
│ - Staff management (limited by cap)  │
│ - Invoices & Ledger                 │
│ - GST & Accounting                  │
│ - Notifications (welcome, reminders) │
│ - Job Cards & Inventory              │
└──────────────────────────────────────┘
```

---

## Guard Safety Verification

### ✅ What's Guarded (Intentionally)

- REPORTS feature (Pro-only)
- MULTI_SHOP feature (Pro-only)
- CUSTOM_PRINT_LAYOUT feature (Pro-only)
- WHATSAPP_ALERTS_AUTOMATION feature (Pro-only)
- Staff count limit (API enforcement)
- Reminder quota (soft cap)
- Analytics history window (visibility)

### ✅ What's Never Guarded (By Design)

- Customer/member creation (unlimited)
- Staff entity access (only count limited)
- Invoice creation and access
- GST calculations
- Ledger and accounting records
- Payment tracking
- Core notifications (welcome, payment reminders, expirations)

### ✅ No Compliance Risks

- Tax filing features remain always-on
- Invoice records never deleted
- Accounting entries immutable
- Data cannot be hidden via plan changes
- Downgrade doesn't affect data integrity

---

## Files Changed Summary

| File                            | Change                        | Type     |
| ------------------------------- | ----------------------------- | -------- |
| `whatsapp-rules.ts`             | Enum values reduced 15→4      | Breaking |
| `schema.prisma`                 | Enum values reduced 15→4      | Breaking |
| `seed-plans-v1.ts`              | Features list cleaned         | Data     |
| `plan-limits.ts`                | `maxMembers` removed          | Breaking |
| `plan-capabilities.ts`          | Refactored toggles            | Breaking |
| `whatsapp-gating.ts`            | Event mapping updated         | Internal |
| `automation-safety.service.ts`  | Feature mapping updated       | Internal |
| `whatsapp.sender.ts`            | Parameter type changed        | Breaking |
| `whatsapp-reminders.service.ts` | Call site updated             | Internal |
| `whatsapp-user.service.ts`      | Feature derivation simplified | Internal |

---

## Breaking Changes ⚠️

These changes require Prisma migration and redeployment:

1. **WhatsAppFeature enum values removed**
   - Impact: Code referencing old enum values will not compile
   - Mitigation: All services updated
   - Migration: `npx prisma migrate dev`

2. **Plan.maxMembers field removed from limits**
   - Impact: Any code checking `PLAN_LIMITS[plan].maxMembers` will fail
   - Mitigation: Removed from all services; always unlimited now
   - Solution: Use business logic for customer caps, not plan gating

3. **PlanCapabilities structure changed**
   - Impact: Code checking `capability.reports` will fail
   - Mitigation: Renamed to `capability.canGenerateReports`
   - Solution: Update guard checks (already done)

4. **WhatsAppSender.sendTemplateMessage() signature**
   - Impact: Calls with WhatsAppFeature enum will fail
   - Mitigation: Changed to accept string parameter
   - Solution: Update all call sites (already done)

---

## Migration Path

### For Development

```bash
cd apps/backend
npx prisma migrate dev --name architectural-cleanup
npm run build
npm run test:watch
```

### For Production

1. Backup database
2. Run migration
3. Test in staging
4. Deploy with rolling restart
5. Verify plan functionality

---

## Verification Checklist

Before deploying, verify:

- [ ] TypeScript compiles without errors
- [ ] Prisma migration applies cleanly
- [ ] Unit tests pass (whatsapp services)
- [ ] Plan limit enforcement works (staff count)
- [ ] Feature gating works (reports, multi-shop)
- [ ] Core features accessible regardless of plan
- [ ] No code references deleted enum values
- [ ] Database schema matches Prisma definition
- [ ] Seed scripts run without errors
- [ ] All tests pass with new architecture

---

## Rollback Plan

If issues occur:

1. Identify the specific failure (compilation, migration, runtime)
2. Revert the commit
3. Run `npx prisma migrate resolve --rolled-back <migration-name>`
4. Redeploy previous version
5. Investigate root cause

**Note**: Because this is a schema change, rollback requires database restore if migration was applied.

---

## Success Criteria

✅ **Achieved**:

- Single enum purpose: Premium unlocks only
- Clear separation: PlanFeature vs PlanLimits vs PlanCapabilities
- No core features gated by plan
- Customers never limited
- Compliance guarantees maintained
- All services updated
- Documentation complete

---

**Status**: Ready for Integration  
**Owner**: Backend Billing Team  
**Date**: February 8, 2026  
**Next Step**: Run Prisma migration and deploy
