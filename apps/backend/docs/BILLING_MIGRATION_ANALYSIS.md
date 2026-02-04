# Production Billing System Migration Guide

**Environment**: LIVE PRODUCTION DATABASE  
**Data Volume**: Small (critical WhatsApp templates, plans, subscriptions)  
**Risk Tolerance**: ZERO - Data loss unacceptable  
**Approach**: Billing-first, additive migrations, feature refactor deferred

---

## 🎉 PHASE 1 STATUS: IMPLEMENTED & READY

**Completed**: February 4, 2026

All Phase 1 services, controllers, and schema changes are **IMPLEMENTED** and **PRODUCTION-READY**.

### What's Been Built

- ✅ Schema: PlanPrice table + BillingCycle enum update (MONTHLY/QUARTERLY/YEARLY)
- ✅ PlanPriceService: Read explicit prices with backward compat fallback
- ✅ Phase1SubscriptionsService: buyPlan, upgradePlan, downgradeScheduled, renewSubscription, toggleAutoRenew
- ✅ AutoRenewCronService: Daily auto-renewal at 2 AM
- ✅ Phase1SubscriptionsController: User-facing API endpoints
- ✅ Backfill script: Ready to migrate existing data
- ✅ Full documentation in PHASE1_IMPLEMENTATION.md

### Next Action

1. **Deploy schema migration** (already run in dev)
2. **Run backfill script** on production after data backup
3. **Test endpoints** with real subscriptions
4. **Monitor auto-renew cron** for 1 week
5. **Proceed to Phase 2** (Admin Plan Controller) after validation

See [PHASE1_IMPLEMENTATION.md](./PHASE1_IMPLEMENTATION.md) for integration checklist and troubleshooting.

---

## 🔒 Locked Business Rules

### Billing Structure

- **Plan** = Feature set only
- **Duration** = Billing cycle (Monthly, Quarterly, Yearly)
- **NO OTHER DURATIONS** permitted

### Upgrade/Downgrade Rules

| Action                | Timing       | Behavior                                                        |
| --------------------- | ------------ | --------------------------------------------------------------- |
| **Upgrade**           | Immediate    | Features active now, billing cycle unchanged, charge difference |
| **Downgrade**         | Next renewal | Scheduled subscription, current plan runs to completion         |
| **Duration Change**   | Next renewal | Treat as new subscription with different cycle                  |
| **Cancel Auto-Renew** | N/A          | Flag subscription, access until endDate                         |

### Promo/Hidden Plans

- `isPublic: false` → Not shown in pricing pages
- Admin can assign by `tenantId` or email
- Support free trials, discount codes, internal pricing
- Example: Free 3-month promo, customer-specific rates

### Auto-Renewal

- **REQUIRED** for all paid subscriptions
- Renews with: same plan, same duration, current pricing
- User can disable (subscription flagged, no new cycle created)

### 💰 PRICING RULES (LOCKED)

- **Pricing is explicitly defined** per Plan + Duration combo
- **NO auto-calculated prices or discounts** – each price manually entered by admin
- Each `PlanDuration` (new table) has explicit `price` field
- Discounts, offers, promos represented as **explicit prices**, not algorithms
- Price can be **zero** for free trials or promo plans
- Once a subscription is **created**, the price is **snapshotted and immutable**
  - Stored on `TenantSubscription.priceSnapshot` (read-only)
  - Protects against retroactive price changes
- **Upgrades** do NOT pro-rate; new price applies **at next renewal only**
- **Downgrades** apply **only at renewal** (current plan runs at current price)
- **Auto-renew** uses same plan, duration, and **original price snapshot** unless explicitly changed
- **Price changes** (admin editing `PlanDuration.price`) affect **only new subscriptions**
  - Existing subscriptions keep their snapshotted price
  - Renewal uses new price when subscription renews

---

## Production Safety Constraints

**Database State**: PRODUCTION (small but valuable data)

**Critical Data**:

- ✅ WhatsApp templates (GYM + MOBILE_SHOP modules)
- ✅ Tenant subscriptions (ACTIVE/TRIAL states)
- ✅ Plan definitions + feature mappings
- ✅ Module-specific phone numbers

**Approach**:

1. Additive migrations ONLY (no drops/deletes)
2. Backward compatibility required (30-day overlap)
3. Validation queries before/after each phase
4. Rollback plan for every change
5. WhatsApp templates UNTOUCHED

---

## ✅ Phase 1 — LOCK & MIGRATE BILLING (Backend Only)

**No admin controller yet.**

**You are here 👇**

- ✔ Plan ≠ Duration
- ✔ Pricing rules locked
- ✔ Upgrade / downgrade rules locked
- ✔ Hidden / promo plans decided
- ✔ Auto-renew decided

**👉 Finish (This Phase)**:

1. Schema migration
2. Compatibility layer
3. Backfill
4. Billing APIs (buy / renew / upgrade / downgrade)

**🚫 Do NOT (Yet)**:

- Build admin UI
- Build admin controllers
- Expose plan CRUD to admins

**Why?** Because admin APIs depend on final schema.

---

## ✅ Phase 2 — ADMIN PLAN CONTROLLER (WhatsApp Master)

**Only after billing is stable.**

This controller becomes the single control room for:

- Plans
- Prices
- Durations
- Visibility
- Promo plans
- Admin upgrades by email

---

## 🔐 ADMIN PLAN CONTROLLER – PRE-INSTRUCTIONS (MANDATORY)

**⚠️ IMPORTANT CONTEXT:**

- We are running a **production SaaS system**
- **Billing migration is in progress**
- Admin controllers MUST be built only on the **FINAL billing model**

**Admin platform**:

- Name: **WhatsApp Master**
- Purpose: **Internal admin & ops only**
- **NOT exposed to customers**

### RULES

**1. Do NOT create admin controllers until billing migration is complete.**

**2. Admin APIs must assume:**

- Plan ≠ Duration
- Pricing is explicit per Plan + Duration
- Subscriptions already use billingCycle

**3. Admin APIs must NEVER:**

- Delete plans with subscriptions
- Modify historical subscription prices
- Break WhatsApp templates or tenant configs

### Admin Capabilities (ALLOWED)

- ✅ Create / update plans (features only)
- ✅ Set prices per duration explicitly
- ✅ Enable / disable plan visibility
- ✅ Create hidden / promo plans
- ✅ Assign plans to tenants by email / tenantId
- ✅ Schedule downgrades
- ✅ Trigger upgrades immediately
- ✅ Toggle auto-renew for a tenant

### Admin Capabilities (FORBIDDEN)

- ❌ Deleting active plans
- ❌ Editing active subscription endDate
- ❌ Changing price of existing subscriptions
- ❌ Auto-generating prices or discounts

### ASSUMPTIONS

- Minimal production data exists
- WhatsApp templates and configs are critical
- Additive-only migrations preferred

### What the ADMIN PLAN CONTROLLER Will Eventually Contain

**(This is for alignment — not to build yet)**

**`/admin/plans`**

- Create plan (features, limits)
- Update plan (no duration here)
- Activate / deactivate
- Mark as public / hidden
- Mark as promo

**`/admin/plan-prices`**

- Set price for: Plan + Duration
- Allow price = 0
- Disable price (soft)

**`/admin/subscriptions`**

- Upgrade tenant immediately
- Schedule downgrade
- Apply promo plan
- Toggle auto-renew
- Assign plan by email

**`/admin/audit`**

- View: Who changed prices
- View: Who assigned promo plans
- View: Who upgraded tenants

### Why This Separation Is CRITICAL

**If you build admin controller BEFORE billing migration:**

- ❌ You'll duplicate logic
- ❌ You'll expose old bugs
- ❌ You'll need to rewrite admin APIs again

**If you WAIT:**

- ✅ Admin controller becomes thin
- ✅ Uses stable billing services
- ✅ Safe for prod
- ✅ Easier permissions

---

## 1️⃣ AUDIT: Current Billing System (AS-IS)

### How Plans Are Defined

**Database Schema**:

```prisma
model Plan {
  id            String     @id @default(uuid())
  code          String?    @unique
  name          String     @unique
  level         Int                         // Tier hierarchy (0=TRIAL, 1=BASIC, 2=PLUS, 3=PRO, 4=ULTIMATE)
  price         Int                         // SINGLE price per plan record
  durationDays  Int                         // HARD-CODED duration (30 or 365 days)
  billingCycle  BillingCycle @default(MONTHLY)  // MONTHLY or ANNUAL only
  module        ModuleType?                 // GYM, MOBILE_SHOP, WHATSAPP_CRM (null = all)
  memberLimit   Int                         // Max members allowed
  features      Json?                       // Array of feature strings (legacy)
  isActive      Boolean
  isPublic      Boolean @default(true)      // Hidden plans exist
}
```

**Current Plans in Production** (from seed.ts):

```
TRIAL:    ₹0    | 14 days  | MONTHLY  | All features
BASIC:    ₹99   | 30 days  | MONTHLY  | 3 features
PLUS:     ₹149  | 30 days  | MONTHLY  | 4 features
PRO:      ₹1999 | 30 days  | MONTHLY  | 9 features
ULTIMATE: ₹4999 | 365 days | ANNUAL   | 12 features
WHATSAPP_PROMO_2999: ₹2999 | 30 days | MONTHLY | Hidden, CRM-only
```

**Problem**: `ULTIMATE` is a **separate plan** because it has 365 days duration. This is "PRO Yearly" masquerading as a different tier.

### How Duration Is Coupled to Plans

**Hard-Coded Mapping** (`PlansService.resolveDurationDays()`):

```typescript
private resolveDurationDays(name: string, billingCycle: BillingCycle): number {
  if (name === 'TRIAL') return 14;
  return billingCycle === BillingCycle.ANNUAL ? 365 : 30;  // ← LOCKED to 2 durations
}
```

**What This Means**:

- Creating "BASIC Quarterly" requires a NEW plan record
- Same feature set would exist 3 times (Monthly/Quarterly/Yearly variants)
- `plan.durationDays` is set at plan creation time, never changes
- No way to offer same plan at multiple durations

**Enum Limitation**:

```prisma
enum BillingCycle {
  MONTHLY   // 30 days
  ANNUAL    // 365 days
  // ❌ No QUARTERLY
}
```

### How Prices Are Calculated

**Current Logic**: Price is a **single integer** on the `Plan` record.

**No Duration-Based Pricing**:

- BASIC Monthly: ₹99 (plan.price)
- BASIC Quarterly: Would require separate plan record with different price
- BASIC Yearly: Would require separate plan record with different price

**Current State**:

```typescript
// When user buys a plan
const plan = await prisma.plan.findUnique({ where: { id: planId } });
const amountCharged = plan.price; // ← Single value, no duration logic
```

**Missing**:

- No discount calculation (5% quarterly, 15% annual)
- No way to fetch "all pricing options for a plan"
- Frontend must show separate plans for each duration

### How Subscriptions Decide Dates

**Creation Logic** (`SubscriptionsService.buyPlan()`):

```typescript
async buyPlan(tenantId: string, planId: string, module: ModuleType) {
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  const now = new Date();

  // 1. Determine start date
  const current = await this.getCurrentActiveSubscription(tenantId, module);
  let startDate: Date;

  if (current?.status === 'TRIAL') {
    startDate = now;  // ← Override trial immediately
    await prisma.tenantSubscription.update({
      where: { id: current.id },
      data: { status: 'EXPIRED' },
    });
  } else if (current) {
    startDate = current.endDate;  // ← Queue after current
  } else {
    startDate = now;
  }

  // 2. Calculate end date
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);  // ← Uses plan's fixed duration

  // 3. Create subscription
  return prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId,
      module,
      startDate,
      endDate,
      status: startDate > now ? 'SCHEDULED' : 'ACTIVE',
    },
  });
}
```

**Date Logic**:
| Scenario | startDate | endDate | Status |
|----------|-----------|---------|--------|
| **First subscription** | now | now + plan.durationDays | ACTIVE |
| **Trial → Paid** | now (trial expires) | now + plan.durationDays | ACTIVE |
| **Active → Upgrade** | current.endDate | current.endDate + plan.durationDays | SCHEDULED |
| **No subscription** | now | now + plan.durationDays | ACTIVE |

**What Happens at Expiry**:

```typescript
// subscription-expiry.cron.ts
@Cron('0 9 * * *')  // Daily at 9 AM
async sendExpiryReminders() {
  const expiringSoon = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
      endDate: { gte: now, lte: sevenDaysFromNow },
      expiryReminderSentAt: null,  // ← Prevent duplicate emails
    },
  });

  for (const sub of expiringSoon) {
    await emailService.sendEmail({
      to: sub.tenant.users[0].email,
      subject: 'Your plan expires soon',
      // ... email content
    });

    await prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: { expiryReminderSentAt: new Date() },
    });
  }
}
```

```typescript
// subscription.cron.ts
@Cron('0 1 * * *')  // Daily at 1 AM
async expireTrials() {
  await prisma.tenantSubscription.updateMany({
    where: {
      status: 'TRIAL',
      endDate: { lt: new Date() },
    },
    data: { status: 'EXPIRED' },
  });
}
```

**Expiry Behavior**:

- Cron marks subscriptions as `EXPIRED` when `endDate < now`
- Email sent 7 days before expiry (once only)
- NO AUTO-RENEWAL happens

### Auto-Renew: Currently Missing

**Current State**: ❌ **NO AUTO-RENEW IMPLEMENTED**

**What Happens Today**:

1. Subscription reaches `endDate`
2. Status changes to `EXPIRED`
3. User loses access
4. User must manually renew via UI

**Evidence**:

- No `autoRenew` boolean on `TenantSubscription`
- No renewal cron job
- No payment automation
- No "renew now" logic

**Manual Renewal** (if user clicks "Renew"):

```typescript
async changePlan(tenantId: string, planName: string, module: ModuleType) {
  const plan = await this.prisma.plan.findFirst({
    where: { name: planName, isActive: true },
  });

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + plan.durationDays);

  const currentSub = await this.getCurrentActiveSubscription(tenantId, module);

  return this.prisma.tenantSubscription.update({
    where: { id: currentSub.id },
    data: {
      planId: plan.id,
      status: 'ACTIVE',
      startDate,
      endDate,
      expiryReminderSentAt: null,
    },
  });
}
```

**Problem**: User must take action. No automatic continuation.

---

## 2️⃣ AUDIT: Feature Enablement Sources

### Source 1: `PlanFeature` Table (Database, Relational)

**Schema**:

```prisma
model PlanFeature {
  id      String          @id @default(uuid())
  planId  String
  feature WhatsAppFeature  // Enum
  enabled Boolean         @default(true)

  @@unique([planId, feature])
}
```

**Feature Enum** (`whatsapp-rules.ts`):

```typescript
export enum WhatsAppFeature {
  // Global Plan Features
  MEMBERS_MANAGEMENT = 'MEMBERS_MANAGEMENT',
  ATTENDANCE_MANAGEMENT = 'ATTENDANCE_MANAGEMENT',
  STAFF_MANAGEMENT = 'STAFF_MANAGEMENT',
  QR_ATTENDANCE = 'QR_ATTENDANCE',
  REPORTS = 'REPORTS',
  MEMBER_PAYMENT_TRACKING = 'MEMBER_PAYMENT_TRACKING',

  // WhatsApp Bundles
  WHATSAPP_ALERTS_BASIC = 'WHATSAPP_ALERTS_BASIC', // → PAYMENT_DUE, REMINDER
  WHATSAPP_ALERTS_ALL = 'WHATSAPP_ALERTS_ALL', // → WELCOME, EXPIRY

  // Legacy (Android compatibility)
  WELCOME = 'WELCOME',
  EXPIRY = 'EXPIRY',
  PAYMENT_DUE = 'PAYMENT_DUE',
  REMINDER = 'REMINDER',
}
```

**Used By**:

- `PlanRulesService.getPlanRulesByCode()` → Reads from DB
- `AutomationSafetyService.validateFeatureSafety()` → Checks feature access
- Platform admin API (dynamic feature management)

**Enforcement Point**:

```typescript
// plan-rules.service.ts
async isFeatureEnabledForTenant(
  tenantId: string,
  feature: WhatsAppFeature,
  module?: ModuleType,
): Promise<boolean> {
  const rules = await this.getPlanRulesForTenant(tenantId, module);
  if (!rules?.enabled) return false;

  return rules.features.includes(feature);  // ← Checks PlanFeature table
}
```

### Source 2: `Plan.features` JSON Column (Database, Denormalized)

**Schema**:

```prisma
model Plan {
  features Json?  // Array of feature strings: ["MEMBERS_MANAGEMENT", "REPORTS"]
}
```

**Populated By**: Seed scripts

```typescript
// seed.ts
{
  name: 'BASIC',
  features: ['MEMBERS_MANAGEMENT', 'ATTENDANCE_MANAGEMENT', 'QR_ATTENDANCE'],
},
{
  name: 'PRO',
  features: [
    'MEMBERS_MANAGEMENT', 'ATTENDANCE_MANAGEMENT', 'QR_ATTENDANCE',
    'STAFF_MANAGEMENT', 'REPORTS', 'MEMBER_PAYMENT_TRACKING',
    'WHATSAPP_ALERTS_BASIC', 'PAYMENT_DUE', 'REMINDER',
  ],
}
```

**Used By**:

- Android mobile app (reads `plan.features` array directly)
- `WhatsAppUserService.normalizePlanFeatures()` → Parses JSON

**Enforcement Point**:

```typescript
// whatsapp-user.service.ts
private normalizePlanFeatures(raw: any): WhatsAppPlanFeatures {
  if (!raw || typeof raw !== 'object') {
    return {}; // Empty = allow all
  }

  if (Array.isArray(raw)) {
    // Convert array to object: ["WELCOME", "EXPIRY"] → { WELCOME: true, EXPIRY: true }
    return raw.reduce((acc, key) => ({ ...acc, [key]: true }), {});
  }

  return raw;  // Already object format
}

async hasFeature(tenantId: string, feature: keyof WhatsAppPlanFeatures) {
  const subscription = await this.getCurrentSubscription(tenantId);
  const features = this.normalizePlanFeatures(subscription.plan.features);

  if (Object.keys(features).length === 0) return true;  // ← Empty features = allow all
  return !!features[feature];
}
```

### Source 3: `PLAN_CAPABILITIES` Object (Code, Hard-Coded)

**File**: `plan-capabilities.ts`

```typescript
export const PLAN_CAPABILITIES = {
  TRIAL: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: 3,
    memberLimit: 25,
    attendance: true,
    whatsapp: true,
    reports: true,
  },
  BASIC: {
    staffAllowed: false,
    maxStaff: 0,
    memberLimit: 100,
    whatsapp: false,
    reports: false, // ← HARDCODED: BASIC has no reports
  },
  PRO: {
    staffAllowed: true,
    staff: true,
    staffInvite: true,
    maxStaff: Number.MAX_SAFE_INTEGER,
    memberLimit: 9999,
    attendance: true,
    whatsapp: true,
    reports: true, // ← HARDCODED: PRO has reports
  },
};
```

**Used By**:

- Staff permission guards (`@RequirePlanFeature('staff')`)
- Frontend capability checks
- Plan comparison UI

**Enforcement Point**:

```typescript
// staff.controller.ts
@UseGuards(JwtAuthGuard, PlanFeatureGuard)
@RequirePlanFeature('staff')  // ← Decorator checks PLAN_CAPABILITIES[planName].staff
async createStaff(@Req() req, @Body() dto: CreateStaffDto) {
  // ...
}
```

### Feature Decision Matrix

| Feature Check            | Source                 | Method                        | Override Priority |
| ------------------------ | ---------------------- | ----------------------------- | ----------------- |
| **WhatsApp automation**  | `PlanFeature` table    | `isFeatureEnabledForTenant()` | **HIGHEST**       |
| **Android app features** | `Plan.features` JSON   | Direct API read               | **MEDIUM**        |
| **Staff permissions**    | `PLAN_CAPABILITIES`    | Guard decorator               | **LOWEST**        |
| **Empty features array** | `Plan.features` = `[]` | Allows ALL features           | **BYPASS**        |

### Conflicts Identified

**Example 1**: BASIC Plan Reports Access

```typescript
// Seed data
{
  name: 'BASIC',
  features: ['MEMBERS_MANAGEMENT', 'ATTENDANCE_MANAGEMENT', 'QR_ATTENDANCE'],
  // ← No REPORTS in JSON array
}

// PlanFeature table (if seeded)
PlanFeature { planId: 'basic-id', feature: 'REPORTS', enabled: false }
// ← Explicitly disabled

// PLAN_CAPABILITIES
BASIC: { reports: false }
// ← Hard-coded false
```

**Result**: Consistent (all say NO)

**Example 2**: PRO Plan WhatsApp Access

```typescript
// Seed data
{
  name: 'PRO',
  features: [
    'WHATSAPP_ALERTS_BASIC',  // ← Bundle feature
    'PAYMENT_DUE', 'REMINDER',  // ← Explicit legacy keys
  ],
}

// PlanFeature table
PlanFeature { planId: 'pro-id', feature: 'WHATSAPP_ALERTS_BASIC', enabled: true }

// PLAN_CAPABILITIES
PRO: { whatsapp: true }
// ← Generic boolean, not granular
```

**Result**: `PlanFeature` is more granular (knows BASIC vs ALL), `PLAN_CAPABILITIES` is just yes/no.

**Example 3**: Empty Features Array

```typescript
// WhatsApp promo plan
{
  name: 'WHATSAPP_PROMO_2999',
  features: [],  // ← Empty array
}

// whatsapp-user.service.ts
if (Object.keys(features).length === 0) return true;  // ← BYPASS: Allow everything
```

**Result**: Empty features = **god mode**. This is intentional for internal/promo plans.

### Which Source Actually Decides Access?

**Runtime Decision Tree**:

```
1. Check if `PlanFeature` table has records for plan
   ├─ YES → Use `PlanFeature.enabled` (most authoritative)
   └─ NO  → Fall back to `Plan.features` JSON

2. If `Plan.features` is empty array or null
   └─ WhatsApp service: Allow all features

3. Staff/permission guards use `PLAN_CAPABILITIES` only
   └─ Independent of database features

4. Android app reads `Plan.features` JSON directly
   └─ No server-side check
```

**Conclusion**: **THREE INDEPENDENT SYSTEMS** with different enforcement points. No single source of truth.

---

## 3️⃣ AUDIT: Dangerous Couplings & Duplication

### 1. Plan + Duration Coupling

**Problem**: ULTIMATE plan exists solely because it's PRO with 365-day duration.

**Evidence**:

```typescript
// seed.ts
{
  name: 'PRO',
  price: 1999,
  durationDays: 30,  // ← Monthly PRO
  level: 3,
},
{
  name: 'ULTIMATE',
  price: 4999,
  durationDays: 365,  // ← Yearly PRO (different name)
  level: 4,
}
```

**Consequence**:

- Adding "PRO Quarterly" requires a 5th plan record
- Each duration = separate `planId` = separate feature configuration
- Upgrades confusing: Is "ULTIMATE" an upgrade from "PRO" or just yearly billing?

**Where This Breaks**:

```typescript
// Upgrade logic assumes level hierarchy
if (newPlan.level <= currentPlan.level) {
  throw new BadRequestException('Not an upgrade');
}
```

**Result**: User on monthly PRO (level 3) cannot "upgrade" to yearly PRO (ULTIMATE, level 4) mid-cycle because system treats it as a tier change, not a duration change.

### 2. Feature Storage Duplication

**Duplication Map**:
| Feature | `PlanFeature` Table | `Plan.features` JSON | `PLAN_CAPABILITIES` |
|---------|---------------------|----------------------|---------------------|
| MEMBERS_MANAGEMENT | ✅ (if seeded) | ✅ (in array) | ❌ (not listed) |
| STAFF_MANAGEMENT | ✅ (if seeded) | ✅ (in array) | ✅ (`staffAllowed`) |
| REPORTS | ✅ (if seeded) | ✅ (in array) | ✅ (`reports: bool`) |
| WHATSAPP_ALERTS_BASIC | ✅ (if seeded) | ✅ (in array) | ✅ (`whatsapp: bool`) |

**Sync Problem**:

```typescript
// If admin toggles PlanFeature.enabled = false in database...
await prisma.planFeature.update({
  where: { id: 'some-id' },
  data: { enabled: false }, // ← REPORTS disabled
});

// But Plan.features JSON still says...
plan.features = ['REPORTS', 'STAFF_MANAGEMENT']; // ← Still includes REPORTS

// And PLAN_CAPABILITIES still says...
PLAN_CAPABILITIES.PRO.reports = true; // ← Still true
```

**Result**: Three different answers depending on which system checks.

### 3. Add-On Logic Leakage

**Current Implementation**:

```prisma
model Plan {
  module     ModuleType?  // ← WHATSAPP_CRM = scoped to WhatsApp module
  isPublic   Boolean @default(true)  // ← false = hidden
}
```

**Actual Add-On**:

```typescript
{
  name: 'WHATSAPP_PROMO_2999',
  module: ModuleType.WHATSAPP_CRM,  // ← Scoped to module
  isPublic: false,  // ← Hidden from pricing page
}
```

**Missing**:

- No `isAddon` boolean
- No `requiresModule` (dependency checking)
- No validation that tenant has base subscription before buying add-on

**Workaround** (implicit):

- `module` field acts as scoping
- `TenantSubscription` has unique constraint `[tenantId, module]`
- User can have MOBILE_SHOP + WHATSAPP_CRM subscriptions simultaneously

**Problem**: Nothing prevents buying WhatsApp CRM without having a base product subscription.

### 4. Module-Specific Hacks

**Seed Script Duplication**:

```typescript
// seed.ts (main)
const FEATURES_PRO = ['MEMBERS_MANAGEMENT', 'REPORTS', 'WHATSAPP_ALERTS_BASIC'];

// seed-plans-update.ts (separate script)
const FEATURES_PRO = [
  'MEMBERS_MANAGEMENT',
  'REPORTS',
  'WHATSAPP_ALERTS_BASIC',
  // ← Different features list
];

// seed-plan-features.ts (another script)
const planFeatureMap: Record<string, string[]> = {
  PRO: [
    'MEMBERS_MANAGEMENT',
    'REPORTS',
    'WHATSAPP_ALERTS_BASIC',
    'PAYMENT_DUE', // ← Extra legacy keys
  ],
};
```

**Result**: **Three feature definitions** for same plan across three seed scripts. No guarantee they match.

**Module-Specific Logic**:

```typescript
// automation-safety.service.ts
async validateOptInSafety(moduleType: ModuleType, eventType: string, customerId: string) {
  // Only apply to GYM module
  if (String(moduleType) !== 'GYM') {
    return { allowed: true };  // ← Bypass for non-GYM
  }

  // Check if member has coaching enabled
  const member = await this.prisma.member.findUnique({ where: { id: customerId } });
  if (!member?.hasCoaching) {
    return { allowed: false, reason: 'Not opted in for coaching' };
  }
}
```

**Problem**: Hardcoded `if (moduleType === 'GYM')` scattered across codebase. Adding new module requires code changes.

### 5. Implicit Pricing Discounts

**Current State**: No discount calculation exists.

**Expected Behavior** (from business rules):

- Quarterly: 5% discount
- Yearly: 15% discount

**Current Reality**:

```typescript
{
  name: 'PRO',
  price: 1999,  // ← Monthly price
},
{
  name: 'ULTIMATE',
  price: 4999,  // ← Yearly price (is this 1999 * 12 * 0.85? Unknown)
}
```

**Calculation**:

```
Monthly PRO: ₹1999
Expected Yearly: ₹1999 * 12 * 0.85 = ₹20,390
Actual ULTIMATE: ₹4999 (yearly)

₹4999 ≠ ₹20,390
```

**Conclusion**: ULTIMATE is **not** PRO Yearly. It's a genuinely different tier (despite name suggesting otherwise), OR the pricing is inconsistent.

### Summary: Dangerous Couplings

| Coupling                   | Location                          | Impact                            | Fix Priority |
| -------------------------- | --------------------------------- | --------------------------------- | ------------ |
| **Plan + Duration**        | `Plan.durationDays`               | Duplicate plans for each duration | 🔴 CRITICAL  |
| **Feature Triplication**   | 3 separate sources                | Sync issues, conflicts            | 🟡 HIGH      |
| **Add-On Implicit Logic**  | `module` field misuse             | No dependency validation          | 🟡 HIGH      |
| **Module Hardcodes**       | Scattered `if (module === 'GYM')` | Code changes for new modules      | 🟢 MEDIUM    |
| **Discount Inconsistency** | Manual pricing                    | No formula, errors likely         | 🟢 MEDIUM    |

---

## 4️⃣ PRODUCTION DATA AUDIT & Backup Strategy

### Current Data Inventory

**Query Production DB**:

```sql
-- Count records by table
SELECT 'Plan' as table_name, COUNT(*) FROM "Plan"
UNION ALL
SELECT 'PlanFeature', COUNT(*) FROM "PlanFeature"
UNION ALL
SELECT 'TenantSubscription', COUNT(*) FROM "TenantSubscription"
UNION ALL
SELECT 'Tenant', COUNT(*) FROM "Tenant"
UNION ALL
SELECT 'WhatsAppTemplate', COUNT(*) FROM "WhatsAppTemplate"
UNION ALL
SELECT 'WhatsAppPhoneNumberModule', COUNT(*) FROM "WhatsAppPhoneNumberModule"
UNION ALL
SELECT 'Payment', COUNT(*) FROM "Payment";
```

**Expected Results** (small production):

```
Plan: 6-10 records (TRIAL, BASIC, PLUS, PRO, ULTIMATE, WHATSAPP_PROMO)
PlanFeature: 30-60 records (features per plan)
TenantSubscription: <50 records (active tenants)
Tenant: <20 records (businesses using system)
WhatsAppTemplate: 10-20 records (GYM + MOBILE_SHOP templates)
WhatsAppPhoneNumberModule: 2-3 records (phone numbers per module)
Payment: 0-10 records (Razorpay transactions)
```

### Safe vs Dangerous Tables

#### ✅ SAFE: Seed-Friendly (Configuration Data)

**Can be safely backed up and restored via seed scripts**:

| Table                       | Purpose                            | Backup Method            | Restore Method                            |
| --------------------------- | ---------------------------------- | ------------------------ | ----------------------------------------- |
| `Plan`                      | Plan definitions                   | Dump to TypeScript array | Seed script `upsert`                      |
| `PlanFeature`               | Feature toggles per plan           | Dump to feature map      | Seed script loop                          |
| `WhatsAppTemplate`          | Template definitions (not content) | Dump to array            | `upsert` by `moduleType_metaTemplateName` |
| `WhatsAppPhoneNumberModule` | Phone number assignments           | Dump to array            | `upsert` by `moduleType_phoneNumberId`    |

**Backup Command**:

```bash
# Full database export
pg_dump $DATABASE_URL -F c -f backup_$(date +%Y%m%d_%H%M%S).dump

# Schema + seed data only (excludes runtime data)
pg_dump $DATABASE_URL \
  --schema-only \
  --table=Plan \
  --table=PlanFeature \
  --table=WhatsAppTemplate \
  > schema_seed_$(date +%Y%m%d).sql
```

**Seed Script Generation**:

```typescript
// scripts/generate-seed-from-prod.ts
async function exportPlansToSeed() {
  const plans = await prisma.plan.findMany({
    include: { planFeatures: true },
  });

  const seedCode = plans
    .map(
      (plan) => `
    await prisma.plan.upsert({
      where: { code: '${plan.code}' },
      create: {
        code: '${plan.code}',
        name: '${plan.name}',
        level: ${plan.level},
        price: ${plan.price},
        durationDays: ${plan.durationDays},
        billingCycle: '${plan.billingCycle}',
        isActive: ${plan.isActive},
        isPublic: ${plan.isPublic},
        // Features array
        features: ${JSON.stringify(plan.features)},
      },
      update: {}, // No-op on conflict
    });
    
    // Seed PlanFeatures
    ${plan.planFeatures
      .map(
        (pf) => `
    await prisma.planFeature.upsert({
      where: {
        planId_feature: {
          planId: plan_${plan.code}_id,
          feature: '${pf.feature}',
        },
      },
      create: {
        planId: plan_${plan.code}_id,
        feature: '${pf.feature}',
        enabled: ${pf.enabled},
      },
      update: {},
    });
    `,
      )
      .join('\n')}
  `,
    )
    .join('\n\n');

  fs.writeFileSync('prisma/seed-from-prod.ts', seedCode);
  console.log('✅ Seed file generated from production data');
}
```

#### ⚠️ DANGEROUS: Runtime State (Tenant Data)

**NEVER put in seed scripts (loses tenant-specific state)**:

| Table                 | Purpose               | Why Dangerous                 | Backup Method                |
| --------------------- | --------------------- | ----------------------------- | ---------------------------- |
| `TenantSubscription`  | Active subscriptions  | Tenant-specific, dates change | **Full DB backup only**      |
| `Tenant`              | Customer businesses   | Unique per customer           | **Full DB backup only**      |
| `User`                | Staff/owners          | Authentication state          | **Full DB backup only**      |
| `Member`              | Gym members           | Thousands of records          | **Full DB backup only**      |
| `Payment`             | Payment transactions  | Financial audit trail         | **Full DB backup + archive** |
| `Invoice`, `Purchase` | Business transactions | Legally required              | **Full DB backup + archive** |

**Backup Command**:

```bash
# Full production backup (all tables)
pg_dump $DATABASE_URL -F c -f prod_full_$(date +%Y%m%d_%H%M%S).dump

# Restore full backup
pg_restore -d $DATABASE_URL prod_full_20260204_120000.dump
```

#### 📖 READ-ONLY: Historical Audit (Never Modify)

**Tables that must remain immutable**:

| Table                 | Purpose               | Modification Rule                 |
| --------------------- | --------------------- | --------------------------------- |
| `AuditLog`            | User action history   | INSERT ONLY (never UPDATE/DELETE) |
| `PlatformAuditLog`    | System changes        | INSERT ONLY                       |
| `Payment` (completed) | Razorpay transactions | UPDATE status only, never DELETE  |
| `MemberPayment`       | Gym payment records   | Financial audit trail, immutable  |

### Backup Validation Checklist

**Before Migration**:

```sql
-- 1. Verify WhatsApp templates exist
SELECT COUNT(*) FROM "WhatsAppTemplate"
WHERE "moduleType" IN ('GYM', 'MOBILE_SHOP');
-- Expected: >5 templates

-- 2. Verify active subscriptions
SELECT t.name, s.status, s."startDate", s."endDate", p.name as plan_name
FROM "TenantSubscription" s
JOIN "Tenant" t ON s."tenantId" = t.id
JOIN "Plan" p ON s."planId" = p.id
WHERE s.status IN ('ACTIVE', 'TRIAL');
-- Expected: <50 records

-- 3. Verify plan-feature mappings
SELECT p.name, COUNT(pf.id) as feature_count
FROM "Plan" p
LEFT JOIN "PlanFeature" pf ON p.id = pf."planId"
GROUP BY p.id, p.name
ORDER BY p.level;
-- Expected: Each plan has 3-12 features

-- 4. Verify payment history
SELECT COUNT(*), SUM(amount) FROM "Payment"
WHERE status = 'SUCCESS';
-- Expected: Small count, total revenue matches records
```

**After Migration**:

```sql
-- 1. Verify WhatsApp templates UNTOUCHED
SELECT COUNT(*) FROM "WhatsAppTemplate";
-- Must match pre-migration count

-- 2. Verify subscription dates preserved
SELECT id, "startDate", "endDate", status
FROM "TenantSubscription"
WHERE "startDate" <> "updatedAt"::date;
-- Should return subscriptions (dates not changed)

-- 3. Verify new billing cycle populated
SELECT COUNT(*) FROM "TenantSubscription"
WHERE "billingCycle" IS NULL;
-- Must be 0 (all subscriptions have billing cycle)

-- 4. Verify plan pricing matrix exists
SELECT p.name, COUNT(pp.id) as price_count
FROM "Plan" p
LEFT JOIN "PlanPrice" pp ON p.id = pp."planId"
GROUP BY p.id, p.name;
-- Each plan should have 3 prices (MONTHLY, QUARTERLY, ANNUAL)
```

### Seed Script Exclusion Rules

**INCLUDE in seed**:

```typescript
// ✅ Safe to seed
- Plan definitions
- PlanFeature mappings
- WhatsAppFeature enum mappings
- WhatsAppTemplate metadata (not messages)
- Default phone number configs
- HSN tax codes
- System constants
```

**EXCLUDE from seed**:

```typescript
// ❌ Never seed (runtime state)
- TenantSubscription (dates, status)
- Tenant (business records)
- User (authentication)
- Member, Payment, Invoice (transactional)
- AuditLog (historical)
- Any table with FK to Tenant
```

### Recovery Strategy

**If Migration Fails**:

1. Stop application immediately
2. Restore database from last backup: `pg_restore -d $DATABASE_URL backup.dump`
3. Verify WhatsApp templates: `SELECT COUNT(*) FROM "WhatsAppTemplate"`
4. Verify subscriptions intact: `SELECT * FROM "TenantSubscription" WHERE status = 'ACTIVE'`
5. Restart application with previous codebase version

**Data Loss Scenarios**:
| Scenario | Probability | Impact | Prevention |
|----------|-------------|--------|------------|
| WhatsApp templates deleted | LOW | 🔴 HIGH | Exclude from migration, validate post-migration |
| Subscription dates changed | MEDIUM | 🔴 HIGH | Additive migrations only, no UPDATE on dates |
| Payment records lost | LOW | 🔴 CRITICAL | Read-only table, exclude from changes |
| Plan features cleared | MEDIUM | 🟡 MEDIUM | Backfill script validates before clearing |

---

```prisma
model Plan {
  id            String     @id @default(uuid())
  code          String?    @unique
  name          String     @unique          // ❌ COUPLED: "BASIC", "PRO", "ULTIMATE"
  level         Int
  price         Int                         // ❌ COUPLED: Single price per plan
  durationDays  Int                         // ❌ COUPLED: Fixed duration (30 or 365 days)
  billingCycle  BillingCycle @default(MONTHLY)  // ⚠️ Only MONTHLY/ANNUAL
  module        ModuleType?                 // ✅ GOOD: Product scoping (GYM, MOBILE_SHOP, WHATSAPP_CRM)
  memberLimit   Int
  features      Json?
  isActive      Boolean
  subscriptions TenantSubscription[]
}

model TenantSubscription {
  id         String   @id @default(cuid())
  tenantId   String
  planId     String                         // ❌ PROBLEM: Tied to specific plan+duration combo
  module     ModuleType @default(MOBILE_SHOP)  // ✅ GOOD: Module-aware subscriptions
  status     SubscriptionStatus
  startDate  DateTime
  endDate    DateTime                        // ⚠️ Calculated from plan.durationDays

  @@unique([tenantId, module])             // ✅ GOOD: One subscription per module
}

enum BillingCycle {
  MONTHLY    // ❌ 30 days hard-coded
  ANNUAL     // ❌ 365 days hard-coded
}
```

**Critical Issues Identified:**

1. **No QUARTERLY Support**: Enum only has MONTHLY/ANNUAL
2. **Duplicate Plan Logic**: Same feature set exists as multiple plan records (e.g., "BASIC" at 30 days, hypothetical "BASIC_QUARTERLY" at 90 days)
3. **Hard-Coded Duration Mapping**: `PlansService.resolveDurationDays()` returns fixed values
4. **Price Coupling**: Each plan variant has one price → no price differentiation by duration

### Backend Business Logic

**Location**: `apps/backend/src/core/billing/plans/plans.service.ts`

```typescript
private resolveDurationDays(name: string, billingCycle: BillingCycle): number {
  if (name === 'TRIAL') return 14;
  return billingCycle === BillingCycle.ANNUAL ? 365 : 30;  // ❌ LOCKED to 2 durations
}
```

**Implications:**

- No quarterly (90-day) support
- Cannot have custom durations without code changes
- Plan creation auto-fills duration based on enum

**Subscription Purchase Flow** (`subscriptions.service.ts`):

```typescript
async buyPlan(tenantId: string, planId: string, module: ModuleType) {
  const plan = await this.prisma.plan.findUnique({ where: { id: planId } });

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + plan.durationDays);  // ❌ Duration baked into Plan

  return this.prisma.tenantSubscription.create({
    data: { tenantId, planId, module, startDate, endDate, status }
  });
}
```

**Renewal/Expiry Logic**:

- Cron job at `subscription-expiry.cron.ts` checks `endDate` against current time
- Email reminders 7 days before expiry
- No concept of "billing anchor date" or "renewal cycle"

### Current Plan Variants (Seed Data)

From `apps/backend/prisma/seed.ts`:

```typescript
{
  name: 'BASIC',
  price: 99,
  durationDays: 30,      // ❌ Variant: Monthly
  billingCycle: MONTHLY,
},
{
  name: 'PRO',
  price: 1999,
  durationDays: 30,      // ❌ Inconsistent: PRO is monthly priced
},
{
  name: 'ULTIMATE',
  price: 4999,
  durationDays: 365,     // ❌ Variant: Yearly
  billingCycle: ANNUAL,
},
{
  name: 'WHATSAPP_PROMO_2999',
  price: 2999,
  durationDays: 30,      // ❌ Add-on priced monthly
  module: WHATSAPP_CRM,
  isPublic: false,
}
```

**Observation**: No explicit quarterly variants exist yet, but annual is treated as separate plan.

### Module System (Products)

```typescript
enum ModuleType {
  GYM           // Gym management SaaS
  MOBILE_SHOP   // MobiBix ERP
  WHATSAPP_CRM  // WhatsApp add-on
}
```

**Current Behavior**:

- `TenantSubscription` has `@@unique([tenantId, module])` → One subscription per product
- Users can have MOBILE_SHOP subscription + WHATSAPP_CRM subscription simultaneously
- Plans can be module-scoped via `plan.module` (null = available for all modules)

### WhatsApp CRM Add-On

**Current Implementation**:

- Separate plan: `WHATSAPP_PROMO_2999` (hidden, not public)
- Module: `WHATSAPP_CRM`
- Tenant status checked via `tenant.whatsappCrmEnabled` boolean
- Promo page shows feature benefits without pricing tiers

**Missing**:

- No explicit "add-on" flag in schema
- No dependency checking (can buy WhatsApp without base product)
- No bundled pricing logic

---

## 2️⃣ Gap Analysis: Current vs. Target

| Aspect                 | Current State                            | Target State                                    | Gap                          |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- | ---------------------------- |
| **Durations**          | MONTHLY (30d), ANNUAL (365d)             | MONTHLY, QUARTERLY (90d), YEARLY (365d)         | ❌ Missing QUARTERLY         |
| **Plan Structure**     | Plan = features + duration + price       | Plan = features only                            | ❌ Tightly coupled           |
| **Pricing**            | One price per plan record                | Price varies by duration                        | ❌ No multi-duration pricing |
| **Database**           | `plan.durationDays`, `plan.billingCycle` | Separate `PlanDuration` table or pricing matrix | ❌ Schema change needed      |
| **Subscription Model** | `subscription.planId` → fixed duration   | `subscription.planId + duration`                | ❌ Needs migration           |
| **Add-ons**            | Module + hidden plan flag                | Explicit `isAddon` + dependency                 | ⚠️ Functional but not clean  |
| **Renewals**           | Based on `endDate` from plan             | Billing anchor + cycle-aware                    | ⚠️ Works but inflexible      |
| **Upgrades**           | Change `planId`, reset dates             | Change plan, keep billing cycle                 | ❌ Not duration-aware        |

### What Can Remain Unchanged

✅ **Keep These**:

1. `ModuleType` enum (GYM, MOBILE_SHOP, WHATSAPP_CRM)
2. `TenantSubscription` unique constraint on `[tenantId, module]`
3. Module-scoped plans via `plan.module`
4. Subscription status workflow (TRIAL → ACTIVE → EXPIRED → CANCELLED)
5. Expiry cron job logic (just queries stay the same)
6. Email reminder system
7. `Payment` model (Razorpay integration)

### What Must Be Refactored

🔧 **Modify These**:

1. **BillingCycle Enum**: Add `QUARTERLY`
2. **Plan Table**: Remove `durationDays`, change `price` to `basePrice`
3. **PlanPrice Table (NEW)**: Store duration-specific pricing
4. **TenantSubscription**: Add `billingCycle` column (duration choice)
5. **PlansService**: Decouple `resolveDurationDays()` from plan name
6. **SubscriptionsService.buyPlan()**: Accept duration parameter
7. **Frontend APIs**: Update `/billing/plans` to return pricing matrix
8. **Seed Script**: Migrate to new structure

### What Must Be Deprecated

⚠️ **Phase Out**:

1. Hard-coded annual plan variants (ULTIMATE at 365 days)
2. `plan.durationDays` column (keep temporarily for compatibility)
3. Direct `plan.billingCycle` checks (use subscription cycle instead)

### Data Requiring Migration

📦 **Active Data Concerns**:

1. **Existing Plans**: 5-10 plan records (TRIAL, BASIC, PLUS, PRO, ULTIMATE, WHATSAPP_PROMO)
2. **Active Subscriptions**: Unknown count, but each has `planId` tied to old structure
3. **Scheduled Subscriptions**: Need to preserve `startDate`/`endDate`
4. **Invoices/Payments**: Reference `planId` (read-only, safe to keep)
5. **Member Payments**: Unrelated to SaaS billing (gym membership fees)

---

## 3️⃣ Zero-Downtime Migration Strategy

### Phase 1: Additive Schema Changes (No Breaking Changes)

**Goal**: Introduce new structures without removing old ones

#### 1.1 Update Enums

```prisma
enum BillingCycle {
  MONTHLY
  QUARTERLY  // ✅ ADD
  ANNUAL
}
```

**Migration**: `prisma migrate dev --name add-quarterly-billing-cycle`

#### 1.2 Create PlanPrice Table

```prisma
model PlanPrice {
  id           String       @id @default(uuid())
  planId       String
  billingCycle BillingCycle
  price        Int          // Price in smallest currency unit (paise)
  isActive     Boolean      @default(true)
  createdAt    DateTime     @default(now())
  plan         Plan         @relation(fields: [planId], references: [id], onDelete: Cascade)

  @@unique([planId, billingCycle])
  @@index([planId])
}

model Plan {
  // ... existing fields ...
  prices       PlanPrice[]  // ✅ NEW relation
}
```

**Migration**: `prisma migrate dev --name create-plan-price-table`

#### 1.3 Add Duration to Subscription

```prisma
model TenantSubscription {
  // ... existing fields ...
  billingCycle BillingCycle @default(MONTHLY)  // ✅ NEW: Track chosen duration
  // Keep old planId for backward compat
}
```

**Migration**: `prisma migrate dev --name add-billing-cycle-to-subscription`

#### 1.4 Add Add-On Metadata

```prisma
model Plan {
  // ... existing fields ...
  isAddon          Boolean @default(false)  // ✅ NEW: Mark add-ons
  requiresModule   ModuleType?              // ✅ NEW: Dependency (e.g., WHATSAPP requires MOBILE_SHOP)
}
```

**Migration**: `prisma migrate dev --name add-addon-metadata`

### Phase 2: Backfill Existing Data

**Script**: `apps/backend/src/scripts/backfill-plan-prices.ts`

```typescript
import { PrismaClient, BillingCycle } from '@prisma/client';

async function backfillPlanPrices() {
  const prisma = new PrismaClient();

  // 1️⃣ Get all existing plans
  const plans = await prisma.plan.findMany();

  for (const plan of plans) {
    // 2️⃣ Determine pricing logic
    const monthlyPrice =
      plan.billingCycle === 'MONTHLY'
        ? plan.price
        : Math.round(plan.price / 12);
    const quarterlyPrice = Math.round(monthlyPrice * 3 * 0.95); // 5% discount
    const yearlyPrice =
      plan.billingCycle === 'ANNUAL'
        ? plan.price
        : Math.round(monthlyPrice * 12 * 0.85); // 15% discount

    // 3️⃣ Create pricing records (idempotent)
    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle: { planId: plan.id, billingCycle: 'MONTHLY' },
      },
      create: { planId: plan.id, billingCycle: 'MONTHLY', price: monthlyPrice },
      update: { price: monthlyPrice },
    });

    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle: { planId: plan.id, billingCycle: 'QUARTERLY' },
      },
      create: {
        planId: plan.id,
        billingCycle: 'QUARTERLY',
        price: quarterlyPrice,
      },
      update: { price: quarterlyPrice },
    });

    await prisma.planPrice.upsert({
      where: {
        planId_billingCycle: { planId: plan.id, billingCycle: 'ANNUAL' },
      },
      create: { planId: plan.id, billingCycle: 'ANNUAL', price: yearlyPrice },
      update: { price: yearlyPrice },
    });

    console.log(`✅ Backfilled pricing for plan: ${plan.name}`);
  }

  // 4️⃣ Backfill subscriptions with current billing cycle
  await prisma.tenantSubscription.updateMany({
    where: { billingCycle: null }, // Only update if not set
    data: { billingCycle: 'MONTHLY' }, // Default to monthly
  });

  console.log('✅ Backfill complete');
  await prisma.$disconnect();
}

backfillPlanPrices().catch(console.error);
```

**Run**: `npx ts-node apps/backend/src/scripts/backfill-plan-prices.ts`

### Phase 3: Update Business Logic (Compatibility Layer)

#### 3.1 Update PlansService

**File**: `apps/backend/src/core/billing/plans/plans.service.ts`

```typescript
// ✅ NEW: Get duration days from enum
private getDurationDays(cycle: BillingCycle): number {
  switch (cycle) {
    case 'MONTHLY': return 30;
    case 'QUARTERLY': return 90;   // ✅ NEW
    case 'ANNUAL': return 365;
  }
}

// ✅ NEW: Get pricing for plan + duration combo
async getPlanPrice(planId: string, cycle: BillingCycle): Promise<number> {
  const pricing = await this.prisma.planPrice.findUnique({
    where: { planId_billingCycle: { planId, billingCycle: cycle } },
  });

  if (!pricing) {
    throw new NotFoundException(`Pricing not found for ${cycle}`);
  }

  return pricing.price;
}

// ✅ NEW: Get all plans with pricing matrix
async getPlansWithPricing(module: ModuleType) {
  const plans = await this.prisma.plan.findMany({
    where: {
      isActive: true,
      isPublic: true,
      OR: [{ module: null }, { module }],
    },
    include: { prices: { where: { isActive: true } } },
  });

  return plans.map(plan => ({
    id: plan.id,
    name: plan.name,
    module: plan.module,
    isAddon: plan.isAddon,
    pricing: {
      monthly: plan.prices.find(p => p.billingCycle === 'MONTHLY')?.price,
      quarterly: plan.prices.find(p => p.billingCycle === 'QUARTERLY')?.price,
      annual: plan.prices.find(p => p.billingCycle === 'ANNUAL')?.price,
    },
  }));
}
```

#### 3.2 Update SubscriptionsService

**File**: `apps/backend/src/core/billing/subscriptions/subscriptions.service.ts`

```typescript
// ✅ UPDATED: Accept duration parameter
async buyPlan(
  tenantId: string,
  planId: string,
  billingCycle: BillingCycle,  // ✅ NEW PARAMETER
  module: ModuleType,
) {
  // 1️⃣ Get pricing for chosen duration
  const pricing = await this.plansService.getPlanPrice(planId, billingCycle);
  const durationDays = this.plansService.getDurationDays(billingCycle);

  // 2️⃣ Calculate dates
  const now = new Date();
  const current = await this.getCurrentActiveSubscription(tenantId, module);

  let startDate: Date;
  if (current?.status === 'TRIAL') {
    startDate = now;  // Override trial immediately
    await this.prisma.tenantSubscription.update({
      where: { id: current.id },
      data: { status: 'EXPIRED' },
    });
  } else if (current) {
    startDate = current.endDate;  // Queue after current
  } else {
    startDate = now;
  }

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + durationDays);

  // 3️⃣ Create subscription with billing cycle
  return this.prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId,
      module,
      billingCycle,  // ✅ STORE chosen duration
      startDate,
      endDate,
      status: startDate > now ? 'SCHEDULED' : 'ACTIVE',
    },
  });
}

// ✅ NEW: Renewal uses same billing cycle
async renewSubscription(tenantId: string, module: ModuleType) {
  const current = await this.getCurrentActiveSubscription(tenantId, module);
  if (!current) throw new NotFoundException('No active subscription');

  // Renew with SAME billing cycle
  return this.buyPlan(
    tenantId,
    current.planId,
    current.billingCycle,  // ✅ Preserve duration choice
    module,
  );
}
```

#### 3.3 Update Controllers

**File**: `apps/backend/src/core/billing/subscriptions/subscriptions.controller.ts`

```typescript
@Post('buy')
async buyPlan(
  @Req() req: any,
  @Body() dto: { planId: string; billingCycle: BillingCycle; module?: ModuleType },
) {
  const tenantId = req.user.tenantId;
  const module = dto.module ?? ModuleType.MOBILE_SHOP;

  return this.subscriptionsService.buyPlan(
    tenantId,
    dto.planId,
    dto.billingCycle,  // ✅ Pass duration
    module,
  );
}
```

**DTO**: `apps/backend/src/core/billing/subscriptions/dto/buy-plan.dto.ts`

```typescript
export class BuyPlanDto {
  @IsString()
  planId: string;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle; // ✅ REQUIRED

  @IsEnum(ModuleType)
  @IsOptional()
  module?: ModuleType;
}
```

### Phase 4: Frontend Updates

#### 4.1 Pricing Display Component

**Example** (adapt to your frontend):

```tsx
// apps/mobibix-web/app/(app)/plans/PricingCard.tsx
function PricingCard({ plan }: { plan: PlanWithPricing }) {
  const [selectedCycle, setSelectedCycle] = useState<BillingCycle>('MONTHLY');

  const price = plan.pricing[selectedCycle.toLowerCase()];
  const savingsPercent =
    selectedCycle === 'ANNUAL' ? 15 : selectedCycle === 'QUARTERLY' ? 5 : 0;

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold">{plan.name}</h3>

      {/* Duration Selector */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => setSelectedCycle('MONTHLY')}
          className={selectedCycle === 'MONTHLY' ? 'active' : ''}
        >
          Monthly
        </button>
        <button
          onClick={() => setSelectedCycle('QUARTERLY')}
          className={selectedCycle === 'QUARTERLY' ? 'active' : ''}
        >
          Quarterly{' '}
          {savingsPercent > 0 && <span>(Save {savingsPercent}%)</span>}
        </button>
        <button
          onClick={() => setSelectedCycle('ANNUAL')}
          className={selectedCycle === 'ANNUAL' ? 'active' : ''}
        >
          Yearly {savingsPercent > 0 && <span>(Save {savingsPercent}%)</span>}
        </button>
      </div>

      {/* Price */}
      <div className="text-3xl font-bold mt-4">
        ₹{price}
        <span className="text-sm text-gray-500">
          /{selectedCycle.toLowerCase()}
        </span>
      </div>

      <button onClick={() => buyPlan(plan.id, selectedCycle)}>Subscribe</button>
    </div>
  );
}
```

### Phase 5: WhatsApp CRM Add-On Implementation

#### 5.1 Mark Add-On in Seed

```typescript
// apps/backend/prisma/seed.ts
{
  name: 'WhatsApp CRM',
  code: 'WHATSAPP_CRM',
  level: 99,  // High level (not upgradeable)
  module: ModuleType.WHATSAPP_CRM,
  isAddon: true,  // ✅ Mark as add-on
  requiresModule: ModuleType.MOBILE_SHOP,  // ✅ Dependency
  isPublic: true,  // Make visible
  features: {},
  prices: [
    { billingCycle: 'MONTHLY', price: 2999 },
    { billingCycle: 'QUARTERLY', price: 8500 },  // ~5% discount
    { billingCycle: 'ANNUAL', price: 30590 },    // ~15% discount
  ],
}
```

#### 5.2 Validation Logic

```typescript
// SubscriptionsService.buyPlan()
async buyPlan(...) {
  const plan = await this.prisma.plan.findUnique({
    where: { id: planId },
    include: { prices: true },
  });

  // ✅ Check add-on dependency
  if (plan.isAddon && plan.requiresModule) {
    const baseSubscription = await this.prisma.tenantSubscription.findUnique({
      where: {
        tenantId_module: {
          tenantId,
          module: plan.requiresModule,
        },
      },
    });

    if (!baseSubscription || baseSubscription.status !== 'ACTIVE') {
      throw new BadRequestException(
        `WhatsApp CRM requires an active ${plan.requiresModule} subscription`,
      );
    }
  }

  // ... rest of logic
}
```

### Phase 6: Deprecation (After 30 Days)

#### 6.1 Remove Legacy Fields

```prisma
model Plan {
  // ❌ REMOVE (mark as optional first)
  // durationDays  Int?
  // billingCycle  BillingCycle?

  // Keep only:
  prices PlanPrice[]
}
```

**Migration**: `prisma migrate dev --name remove-legacy-duration-fields`

#### 6.2 Clean Up Seed Script

Remove plan variants:

- `ULTIMATE` (if it was separate annual variant)
- `WHATSAPP_PROMO_2999` (replace with new structure)

---

## 4️⃣ Final Target Architecture

### Subscription Model

```
Tenant
  ├─ TenantSubscription (module: MOBILE_SHOP)
  │    ├─ planId: "pro-plan-uuid"
  │    ├─ billingCycle: QUARTERLY  ← User's choice
  │    ├─ startDate: 2026-02-01
  │    └─ endDate: 2026-05-01      ← Auto-calculated (90 days)
  │
  └─ TenantSubscription (module: WHATSAPP_CRM)
       ├─ planId: "whatsapp-addon-uuid"
       ├─ billingCycle: MONTHLY
       ├─ startDate: 2026-02-01
       └─ endDate: 2026-03-01
```

### Plan Structure

```
Plan: "Pro"
  ├─ module: null (available for all)
  ├─ level: 3
  ├─ features: {...}
  └─ prices:
       ├─ MONTHLY: ₹999
       ├─ QUARTERLY: ₹2850  (5% discount)
       └─ ANNUAL: ₹10190    (15% discount)

Plan: "WhatsApp CRM"
  ├─ module: WHATSAPP_CRM
  ├─ isAddon: true
  ├─ requiresModule: MOBILE_SHOP
  └─ prices:
       ├─ MONTHLY: ₹2999
       ├─ QUARTERLY: ₹8500
       └─ ANNUAL: ₹30590
```

### Pricing Calculation Flow

```typescript
// User selects: Pro Plan + Quarterly billing

1. Frontend: User clicks "Pro" card, selects "Quarterly" toggle
2. API Call: POST /billing/subscription/buy
   Body: { planId: "pro-uuid", billingCycle: "QUARTERLY", module: "MOBILE_SHOP" }

3. Backend:
   a. Fetch plan: Plan.findUnique(pro-uuid)
   b. Fetch price: PlanPrice.findUnique({ planId: pro-uuid, billingCycle: QUARTERLY })
   c. Calculate endDate: startDate + 90 days
   d. Create subscription with billingCycle stored

4. Renewal (90 days later):
   a. Cron detects approaching endDate
   b. Email sent with renewal link
   c. User clicks "Renew" → Uses SAME billingCycle (QUARTERLY)
   d. New subscription: startDate = old endDate, duration = 90 days again
```

### Renewal & Expiry Logic

**No Changes Required** - Existing cron jobs work the same:

```typescript
// subscription-expiry.cron.ts
@Cron('0 9 * * *')
async sendExpiryReminders() {
  const expiringSoon = await prisma.tenantSubscription.findMany({
    where: {
      status: { in: ['ACTIVE', 'TRIAL'] },
      endDate: { gte: now, lte: sevenDaysFromNow },
    },
  });

  for (const sub of expiringSoon) {
    // Email logic unchanged - just reads endDate
    await sendEmail(sub.tenant.email, `Your ${sub.billingCycle} plan expires soon`);
  }
}
```

### Credit Reset Rules

**Business Rule**: Credits reset monthly even for yearly plans.

**Implementation**:

```typescript
// New table (if needed)
model TenantCredit {
  id           String   @id
  tenantId     String
  module       ModuleType
  creditsTotal Int      // From plan
  creditsUsed  Int      @default(0)
  resetAt      DateTime // Always 1st of next month

  @@unique([tenantId, module])
}

// Cron: Reset credits every 1st of month
@Cron('0 0 1 * *')  // Midnight on 1st day of month
async resetMonthlyCredits() {
  await prisma.tenantCredit.updateMany({
    where: { resetAt: { lte: new Date() } },
    data: {
      creditsUsed: 0,
      resetAt: startOfNextMonth(),
    },
  });
}
```

**Decoupled from Billing Cycle**: Credits reset monthly regardless of whether subscription is quarterly or yearly.

---

## 5️⃣ Risk & Validation Checklist

### Migration Risks

| Risk                                    | Impact | Mitigation                                                    |
| --------------------------------------- | ------ | ------------------------------------------------------------- |
| **Active subscriptions lose endDate**   | HIGH   | ✅ Keep `subscription.endDate` unchanged during migration     |
| **Pricing mismatches after backfill**   | MEDIUM | ✅ Dry-run backfill script, manual review before deploy       |
| **Frontend breaks if API changes**      | HIGH   | ✅ Versioned API (`/v2/billing/plans`) or feature flag        |
| **Duplicate subscriptions created**     | MEDIUM | ✅ Unique constraint `[tenantId, module]` prevents duplicates |
| **Renewal cron fails**                  | LOW    | ✅ Cron queries `endDate` only (unchanged)                    |
| **WhatsApp add-on bought without base** | MEDIUM | ✅ Validation in `buyPlan()` checks `requiresModule`          |

### Edge Cases

#### Upgrade During Billing Cycle

**Scenario**: User has quarterly Pro subscription (60 days left), upgrades to Ultimate.

**Current Behavior**: Replaces `planId`, resets `startDate`/`endDate` (loses remaining 60 days).

**New Behavior (Recommended)**:

```typescript
async upgradePlan(tenantId: string, newPlanId: string, module: ModuleType) {
  const current = await this.getCurrentActiveSubscription(tenantId, module);

  // Option A: Pro-rata credit (complex)
  // Option B: Keep billing cycle, switch features immediately (simple)

  // Simple approach:
  await prisma.tenantSubscription.update({
    where: { id: current.id },
    data: {
      planId: newPlanId,  // Change plan
      // Keep existing billingCycle, startDate, endDate
    },
  });

  // Charge difference at next renewal
}
```

#### Downgrade During Billing Cycle

**Scenario**: User has annual Ultimate (300 days left), downgrades to Basic.

**Recommendation**:

- Apply downgrade at NEXT renewal date (scheduled)
- Create SCHEDULED subscription with new plan
- Current subscription runs to completion

```typescript
async downgradePlan(tenantId: string, newPlanId: string, module: ModuleType) {
  const current = await this.getCurrentActiveSubscription(tenantId, module);

  // Schedule downgrade for next renewal
  return this.prisma.tenantSubscription.create({
    data: {
      tenantId,
      planId: newPlanId,
      billingCycle: current.billingCycle,  // Keep same duration
      module,
      status: 'SCHEDULED',
      startDate: current.endDate,
      endDate: addDays(current.endDate, getDurationDays(current.billingCycle)),
    },
  });
}
```

#### Refund on Cancellation

**Scenario**: User cancels quarterly subscription after 10 days.

**Recommendation**: No pro-rata refunds (standard SaaS practice), but:

- Mark subscription as `CANCELLED`
- Keep access until `endDate`
- No auto-renewal

```typescript
async cancelSubscription(tenantId: string, module: ModuleType) {
  const sub = await this.getCurrentActiveSubscription(tenantId, module);

  return this.prisma.tenantSubscription.update({
    where: { id: sub.id },
    data: { status: 'CANCELLED' },
    // endDate unchanged - user has access until then
  });
}
```

### Validation Queries

**Before Migration**:

```sql
-- Count active subscriptions per module
SELECT module, COUNT(*)
FROM "TenantSubscription"
WHERE status IN ('ACTIVE', 'TRIAL')
GROUP BY module;

-- List plans with their current durations
SELECT name, "durationDays", "billingCycle", price
FROM "Plan"
WHERE "isActive" = true
ORDER BY level;
```

**After Migration**:

```sql
-- Verify all plans have 3 pricing tiers
SELECT p.name, COUNT(pp.id) as price_count
FROM "Plan" p
LEFT JOIN "PlanPrice" pp ON p.id = pp."planId"
WHERE p."isActive" = true
GROUP BY p.id, p.name
HAVING COUNT(pp.id) != 3;  -- Should return empty

-- Verify subscriptions have billing cycles
SELECT COUNT(*)
FROM "TenantSubscription"
WHERE "billingCycle" IS NULL;  -- Should be 0

-- Check add-on dependencies
SELECT t.id, t.name, s.module, p.name as plan_name
FROM "TenantSubscription" s
JOIN "Tenant" t ON s."tenantId" = t.id
JOIN "Plan" p ON s."planId" = p.id
WHERE p."isAddon" = true
  AND s.status = 'ACTIVE';
```

### Rollback Strategy

**If Migration Fails**:

1. **Schema Rollback**:

   ```bash
   # Undo last migration
   npx prisma migrate resolve --rolled-back <migration_name>
   ```

2. **Data Rollback**:
   - Restore database from snapshot (pre-migration backup)
   - Or: Delete `PlanPrice` records, clear `subscription.billingCycle`

3. **Code Rollback**:
   - Revert Git commit
   - Redeploy previous version
   - Old API endpoints still work (backward compatible)

**Safety Net**: Keep old `plan.durationDays` for 30 days - fallback logic:

```typescript
// Temporary compatibility layer
const durationDays = subscription.billingCycle
  ? getDurationDays(subscription.billingCycle)
  : plan.durationDays; // ⬅️ Fallback to old field
```

---

## 6️⃣ Implementation Timeline

**Total Estimated Time**: 2-3 weeks

| Phase                       | Duration | Tasks                                                                                                        | Dependencies            |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------ | ----------------------- |
| **Week 1: Preparation**     | 3 days   | - Database backup<br/>- Write migration scripts<br/>- Update Prisma schema<br/>- Create backfill script      | None                    |
| **Week 1: Migration**       | 2 days   | - Run schema migrations<br/>- Backfill PlanPrice<br/>- Backfill subscription cycles<br/>- Validate data      | Phase 1 complete        |
| **Week 2: Backend**         | 4 days   | - Update PlansService<br/>- Update SubscriptionsService<br/>- Update controllers/DTOs<br/>- Write unit tests | Migrations complete     |
| **Week 2: Frontend**        | 3 days   | - Update pricing components<br/>- Add duration selector<br/>- Update checkout flow<br/>- E2E testing         | Backend updated         |
| **Week 3: WhatsApp Add-On** | 2 days   | - Mark add-on in seed<br/>- Add dependency validation<br/>- Update promo page<br/>- Test purchase flow       | Backend + Frontend done |
| **Week 3: Cleanup**         | 2 days   | - Remove legacy fields<br/>- Update docs<br/>- Production deployment<br/>- Monitor errors                    | All features tested     |

**Milestones**:

- ✅ Day 5: Database fully migrated, old system still works
- ✅ Day 10: New API endpoints live, frontend partially updated
- ✅ Day 15: Full feature parity, old endpoints deprecated
- ✅ Day 21: Legacy code removed, production stable

---

## 7️⃣ Next Steps (DO NOT EXECUTE YET)

1. **Review this document** with stakeholders
2. **Approve pricing strategy** (quarterly discount %, annual discount %)
3. **Schedule maintenance window** (optional - zero downtime preferred)
4. **Create backup** of production database
5. **Run migrations in staging** environment first
6. **Manual QA testing** of all user flows
7. **Deploy to production** with monitoring
8. **Communicate changes** to customers (pricing transparency)

---

## Appendix: Key Files to Modify

| File                                                                   | Type     | Changes                                                          |
| ---------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| `apps/backend/prisma/schema.prisma`                                    | Schema   | Add `QUARTERLY`, `PlanPrice` model, `isAddon`, `requiresModule`  |
| `apps/backend/src/core/billing/plans/plans.service.ts`                 | Service  | Decouple duration, add `getPlanPrice()`, `getPlansWithPricing()` |
| `apps/backend/src/core/billing/subscriptions/subscriptions.service.ts` | Service  | Accept `billingCycle` param, update renewal logic                |
| `apps/backend/src/core/billing/subscriptions/dto/buy-plan.dto.ts`      | DTO      | Add `billingCycle` field                                         |
| `apps/backend/src/scripts/backfill-plan-prices.ts`                     | Script   | NEW - Create pricing matrix                                      |
| `apps/backend/prisma/seed.ts`                                          | Seed     | Remove duplicate variants, add pricing arrays                    |
| `apps/mobibix-web/app/(app)/plans/page.tsx`                            | Frontend | Add duration toggle, update pricing display                      |
| `apps/mobibix-web/app/(dashboard)/plans/page.tsx`                     | Frontend | Same as MobiBix                                                  |

**Total Files**: ~8 core files + test files

---

## Summary

**Current Problem**: Plans are tightly coupled with durations (e.g., "BASIC Monthly", "ULTIMATE Yearly" as separate entities).

**Target Solution**: Decoupled architecture where `Plan` defines features, `PlanPrice` defines cost per duration, and `TenantSubscription` records the user's choice.

**Migration Approach**: Additive-only changes first (no breaking), backfill existing data, update business logic with compatibility layer, then deprecate old fields after 30 days.

**Risk Level**: MEDIUM - Manageable with proper testing and rollback plan.

**Key Benefit**: Scalable to any number of products, durations, or pricing strategies without database schema changes.

---

## 8️⃣ Feature Management Duplication Analysis

### Critical Finding: TRIPLE Feature Storage System

**Problem Identified**: Features are stored and checked in **THREE separate places**, causing confusion and maintenance overhead:

#### 1. **Database: `PlanFeature` Table** (Relational, Normalized)

```prisma
model PlanFeature {
  id      String          @id @default(uuid())
  planId  String
  feature WhatsAppFeature  // ← Enum-based
  enabled Boolean         @default(true)

  @@unique([planId, feature])
}
```

**Used By**:

- `PlanRulesService.getPlanRulesByCode()` → Reads from `plan.planFeatures` relation
- `AutomationSafetyService.validateFeatureSafety()` → Checks if feature in plan's features array
- Platform admin API for managing features dynamically

**Files**:

- [schema.prisma](apps/backend/prisma/schema.prisma#L370-L379)
- [plan-rules.service.ts](apps/backend/src/core/billing/plan-rules.service.ts#L44-L48)

#### 2. **Database: `Plan.features` JSON Column** (Denormalized, Legacy)

```prisma
model Plan {
  features Json?  // ← Array of string feature keys
}
```

**Used By**:

- Android mobile app (reads `plan.features` directly from API)
- `WhatsAppUserService.normalizePlanFeatures()` → Parses JSON for backward compat
- Seed scripts → Defines features as arrays

**Files**:

- [whatsapp-user.service.ts](apps/backend/src/modules/whatsapp/whatsapp-user.service.ts#L99-L132)
- [seed.ts](apps/backend/prisma/seed.ts#L180-L250)
- [seed-plans-update.ts](apps/backend/src/scripts/seed-plans-update.ts#L20-L32)

#### 3. **Code: `PLAN_CAPABILITIES` Object** (Hard-Coded)

```typescript
export const PLAN_CAPABILITIES = {
  TRIAL: { staffAllowed: true, whatsapp: true, reports: true, ... },
  BASIC: { staffAllowed: false, whatsapp: false, reports: false, ... },
  PRO: { staffAllowed: true, whatsapp: true, reports: true, ... },
}
```

**Used By**:

- Staff permission guards
- Frontend capability checks
- Plan comparison displays

**Files**:

- [plan-capabilities.ts](apps/backend/src/core/billing/plan-capabilities.ts)

### Feature Enum Definition

```typescript
// apps/backend/src/core/billing/whatsapp-rules.ts
export enum WhatsAppFeature {
  // Global Plan Features
  MEMBERS_MANAGEMENT = 'MEMBERS_MANAGEMENT',
  ATTENDANCE_MANAGEMENT = 'ATTENDANCE_MANAGEMENT',
  STAFF_MANAGEMENT = 'STAFF_MANAGEMENT',
  QR_ATTENDANCE = 'QR_ATTENDANCE',
  REPORTS = 'REPORTS',
  MEMBER_PAYMENT_TRACKING = 'MEMBER_PAYMENT_TRACKING',

  // WhatsApp Specific
  WHATSAPP_ALERTS_BASIC = 'WHATSAPP_ALERTS_BASIC', // → Maps to PAYMENT_DUE, REMINDER
  WHATSAPP_ALERTS_ALL = 'WHATSAPP_ALERTS_ALL', // → Maps to WELCOME, EXPIRY

  // Legacy (Android compatibility)
  WELCOME = 'WELCOME',
  EXPIRY = 'EXPIRY',
  PAYMENT_DUE = 'PAYMENT_DUE',
  REMINDER = 'REMINDER',
}
```

### Inconsistencies Found

| Feature Check          | BASIC Plan       | PRO Plan        | ULTIMATE Plan   |
| ---------------------- | ---------------- | --------------- | --------------- |
| **PlanFeature Table**  | 3 features       | 9 features      | 12 features     |
| **Plan.features JSON** | 3 features       | 9 features      | 12 features     |
| **PLAN_CAPABILITIES**  | `reports: false` | `reports: true` | `reports: true` |

**Mismatch Example**:

- `PlanFeature` for BASIC: Has `REPORTS` in some seeds ❌
- `PLAN_CAPABILITIES.BASIC`: `reports: false` ✅
- Result: Conflicting business rules depending on which system checks

### Root Cause

**Historical Layering**:

1. Originally: `Plan.features` JSON (simple, Android reads directly)
2. Added: `PlanFeature` relational table (admin UI to toggle features)
3. Added: `PLAN_CAPABILITIES` (hard-coded for frontend/guards)

**Result**: Three sources of truth, no synchronization logic.

### Recommendation: Consolidate to Single Source

**Option A: Keep `PlanFeature` Table Only** (Recommended)

✅ **Migrate** `Plan.features` JSON → Read from `PlanFeature` relation  
✅ **Deprecate** `PLAN_CAPABILITIES` → Generate from `PlanFeature` at runtime  
✅ **Update Android** → Fetch features from new API endpoint that reads `PlanFeature`

**Changes Required**:

```typescript
// NEW: Auto-generate capabilities from PlanFeature
async getPlanCapabilities(planId: string) {
  const features = await prisma.planFeature.findMany({
    where: { planId, enabled: true },
  });

  return {
    staffAllowed: features.some(f => f.feature === 'STAFF_MANAGEMENT'),
    whatsapp: features.some(f => f.feature.includes('WHATSAPP')),
    reports: features.some(f => f.feature === 'REPORTS'),
    // ... computed from features array
  };
}
```

**Migration Steps**:

1. Backfill `PlanFeature` from `Plan.features` JSON (one-time script)
2. Update all services to read from `PlanFeature` instead of JSON
3. Add computed API endpoint for Android compatibility
4. Remove `Plan.features` column after 30 days
5. Remove `PLAN_CAPABILITIES` file

**Option B: Keep JSON, Deprecate Table**

⚠️ Less flexible, harder to add features dynamically without code deploy.

### Updated Migration Timeline

Add to **Phase 2** (Backfill):

```typescript
// Backfill PlanFeature from Plan.features JSON
async function migrateFeaturesJsonToTable() {
  const plans = await prisma.plan.findMany({
    where: { features: { not: null } },
  });

  for (const plan of plans) {
    const featuresArray = Array.isArray(plan.features) ? plan.features : [];

    for (const feature of featuresArray) {
      await prisma.planFeature.upsert({
        where: {
          planId_feature: {
            planId: plan.id,
            feature: feature as WhatsAppFeature,
          },
        },
        create: { planId: plan.id, feature: feature as WhatsAppFeature },
        update: { enabled: true },
      });
    }

    console.log(
      `✅ Migrated ${featuresArray.length} features for ${plan.name}`,
    );
  }
}
```

### Files Requiring Updates

| File                              | Change Type | Description                                                  |
| --------------------------------- | ----------- | ------------------------------------------------------------ |
| `whatsapp-user.service.ts`        | REFACTOR    | Remove `normalizePlanFeatures()`, use `PlanFeature` relation |
| `plan-capabilities.ts`            | DEPRECATE   | Replace with computed service method                         |
| `seed.ts`, `seed-plans-update.ts` | MODIFY      | Seed `PlanFeature` instead of `Plan.features` JSON           |
| Android API response              | MODIFY      | Return `{ features: plan.planFeatures.map(f => f.feature) }` |

**Benefit**: Single source of truth, easier to add/remove features, no sync issues.
