# Module-Wise Subscription Implementation

## Overview

This document describes the implementation of module-wise subscriptions in the Gym SaaS backend. The system now supports multiple independent subscription states per tenant, one for each module (GYM, MOBILE_SHOP).

## Architecture Changes

### 1. Database Schema Updates

**File**: `prisma/schema.prisma`

The `TenantSubscription` model was extended with:

- `module: ModuleType @default(MOBILE_SHOP)` - Specifies which module this subscription covers
- `@@unique([tenantId, module])` - Enforces one ACTIVE/TRIAL subscription per tenant per module
- `@@index([module])` - Optimizes queries by module type

**Backward Compatibility**: All existing subscriptions default to `MOBILE_SHOP` module, maintaining compatibility with single-module deployments.

### 2. Subscription Service Updates

**File**: `src/core/billing/subscriptions/subscriptions.service.ts`

All subscription methods now accept an optional `module` parameter (defaults to `MOBILE_SHOP`):

#### Critical Methods Updated:

1. **`assignTrialSubscription(tenantId, planId, module = 'MOBILE_SHOP')`**
   - Creates trial subscriptions with module awareness
   - Used during tenant creation (TenantService)

2. **`buyPlan(tenantId, planId, module = 'MOBILE_SHOP')`**
   - Handles paid plan purchases per module
   - Queries current subscriptions filtered by module
   - Respects ACTIVE/TRIAL/SCHEDULED hierarchy per module

3. **`getCurrentActiveSubscription(tenantId, module = 'MOBILE_SHOP')`**
   - Returns the active or trial subscription for the requested module
   - Promotes SCHEDULED → ACTIVE when time reaches
   - Prefers ACTIVE over TRIAL
   - All module-specific queries now include `module` filter

4. **`getUpcomingSubscription(tenantId, module = 'MOBILE_SHOP')`**
   - Fetches next scheduled subscription for the module

5. **`getActiveSubscriptionByTenant(tenantId, module = 'MOBILE_SHOP')`**
   - Retrieves ACTIVE subscription for a module

6. **`getSubscriptionByTenant(tenantId, module = 'MOBILE_SHOP')`**
   - Gets most recent subscription (any status) for a module

7. **`canAddMember(tenantId, module = 'MOBILE_SHOP')`**
   - Checks member limit against module-specific subscription

#### Additional Methods:

- **`extendTrial(tenantId, extraDays, module = 'MOBILE_SHOP')`** - Module-aware trial extension
- **`changePlan(tenantId, planName, module = 'MOBILE_SHOP')`** - Module-specific plan changes
- **`changeStatus(tenantId, status, module = 'MOBILE_SHOP')`** - Module-specific status updates
- **`upgradeSubscription(tenantId, planId, module = 'MOBILE_SHOP')`** - Module-aware upgrades

### 3. Authentication & Authorization Updates

#### TenantStatusGuard (src/core/tenant/guards/tenant-status.guard.ts)

- Extracts module from request context (query or body, defaults to `MOBILE_SHOP`)
- Validates subscriptions PER MODULE instead of globally
- Responses now module-specific:
  - `SUBSCRIPTION_EXPIRED` - No active/trial subscription for requested module
  - `SUBSCRIPTION_NOT_STARTED` - Only SCHEDULED subscription exists for module

#### SubscriptionGuard (src/core/billing/guards/subscription.guard.ts)

- Updated to extract module from request context
- Attaches module-aware subscription info to request

### 4. Controller Updates

#### Subscriptions Controller (src/core/billing/subscriptions/subscriptions.controller.ts)

- `/billing/subscription/current` - Accepts `?module=GYM|MOBILE_SHOP` query parameter
- Returns subscription info for requested module

#### Plans Controller (src/core/billing/plans/plans.controller.ts)

- `/plans/available` - Accepts `?module` query parameter
- Returns upgrade info based on module-specific subscription

#### Admin Controller (src/core/admin/admin.controller.ts)

- All subscription management endpoints accept optional `module` in body
- Admin can manage subscriptions per module independently

### 5. DTO Updates

**File**: `src/core/billing/subscriptions/dto/assign-subscription.dto.ts`

```typescript
export class AssignSubscriptionDto {
  tenantId: string;
  planId: string;

  @IsEnum(ModuleType)
  @IsOptional()
  module?: ModuleType = ModuleType.MOBILE_SHOP;
}
```

### 6. Payment Integration

**Files Updated**:

- `src/core/billing/payments/payments.webhook.controller.ts` - `buyPlan()` call updated
- `src/core/billing/payments/payments.verify.controller.ts` - `upgradeSubscription()` call updated

Both now pass `'MOBILE_SHOP'` explicitly to support module-aware processing.

## Usage Examples

### Creating a Tenant (Auto-assigned Trial)

```typescript
// TenantService.create() automatically assigns:
await this.subscriptionsService.assignTrialSubscription(
  tenant.id,
  trialPlan.id,
  'MOBILE_SHOP', // Default for all new tenants
);
```

### Checking Module-Specific Subscription

```typescript
// Frontend request
GET /billing/subscription/current?module=GYM

// Service call
const subscription = await this.subscriptionsService.getCurrentActiveSubscription(
  tenantId,
  'GYM'  // Get GYM module subscription
);
```

### Purchasing a Plan for a Module

```typescript
// Admin or payment processor
POST /billing/subscriptions/assign
{
  "tenantId": "...",
  "planId": "...",
  "module": "GYM"  // Purchase GYM plan
}
```

### Extending Trial for a Module

```typescript
// Admin operation
PATCH /admin/tenants/{tenantId}/extend-trial
{
  "extraDays": 7,
  "module": "GYM"  // Extend GYM trial only
}
```

## Multi-Tenant, Multi-Module Example

A single tenant can now have:

- **MOBILE_SHOP module**: ACTIVE subscription to "Premium" plan (expires 2025-12-31)
- **GYM module**: TRIAL subscription to "Starter" plan (expires 2025-02-14)

Both subscriptions coexist independently. Requests to different modules see different subscription states.

## Guard Behavior

### TenantStatusGuard Decision Tree

```
1. Extract module from request (default: MOBILE_SHOP)
2. Query ACTIVE subscription for (tenantId, module)
   ✓ ACTIVE → Allow request
   ✗ Continue to step 3
3. Query TRIAL subscription for (tenantId, module)
   ✓ TRIAL → Allow request
   ✗ Continue to step 4
4. Query SCHEDULED subscription for (tenantId, module)
   ✓ SCHEDULED → Deny with "SUBSCRIPTION_NOT_STARTED"
   ✗ Deny with "SUBSCRIPTION_EXPIRED"
```

## Backward Compatibility

- All existing code that doesn't pass `module` parameter defaults to `MOBILE_SHOP`
- Existing subscriptions remain functional without migration
- Migration to add `module` field: Already applied (schema updated, database up-to-date)
- No breaking changes to API contracts (module is optional everywhere)

## Files Modified

### Schema

- `prisma/schema.prisma` - TenantSubscription model

### Services

- `src/core/billing/subscriptions/subscriptions.service.ts` - All subscription methods
- `src/core/billing/plans/plans.service.ts` - getPlansWithUpgradeInfo()
- `src/core/tenant/tenant.service.ts` - Trial subscription assignment

### Controllers

- `src/core/billing/subscriptions/subscriptions.controller.ts` - Add module query param
- `src/core/billing/plans/plans.controller.ts` - Add module query param
- `src/core/admin/admin.controller.ts` - Admin endpoints with optional module
- `src/core/billing/payments/payments.webhook.controller.ts` - Module param
- `src/core/billing/payments/payments.verify.controller.ts` - Module param

### Guards

- `src/core/tenant/guards/tenant-status.guard.ts` - Module-aware validation
- `src/core/billing/guards/subscription.guard.ts` - Module extraction

### DTOs

- `src/core/billing/subscriptions/dto/assign-subscription.dto.ts` - Module field

## Testing Recommendations

### 1. Trial Subscription

- Create tenant → Should have MOBILE_SHOP TRIAL (14 days)
- No GYM subscription should exist initially

### 2. Module Independence

- Assign GYM plan → Tenant should have MOBILE_SHOP TRIAL + GYM ACTIVE
- Verify queries return correct subscriptions per module

### 3. Unique Constraint

- Try to create two ACTIVE subscriptions for same tenant+module
- Should fail with unique constraint violation

### 4. Guard Validation

- Request with MOBILE_SHOP module → Allow (trial exists)
- Request with GYM module → Deny if only MOBILE_SHOP subscription exists

### 5. Admin Operations

- Extend MOBILE_SHOP trial independently from GYM
- Change GYM plan without affecting MOBILE_SHOP subscription

## Future Enhancements

1. **Module-Specific Features**: Extend `PlanFeature` to be module-specific
2. **Module Provisioning**: Auto-create subscriptions for new modules
3. **Module Upsell**: Separate pricing/plans per module
4. **Usage Tracking**: Track module-specific feature usage

## Migration Notes

No data migration required. The `module` field defaults to `MOBILE_SHOP` for all existing subscriptions, maintaining current behavior.

If migrating to Prisma with drift detected:

```bash
# Schema already includes module field
# Database status is up-to-date
# No SQL migration needed
npx prisma db push  # If needed to sync
npx prisma generate # Regenerate Prisma Client types
```
