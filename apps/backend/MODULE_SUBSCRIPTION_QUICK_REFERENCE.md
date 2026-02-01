# Module-Wise Subscriptions: Quick Reference

## Key Points

✅ **One subscription per tenant per module** (GYM, MOBILE_SHOP)
✅ **Backward compatible** - defaults to MOBILE_SHOP
✅ **Independent states** - GYM can be ACTIVE while MOBILE_SHOP is TRIAL
✅ **Guard-enforced** - TenantStatusGuard validates per module

## API Patterns

### Query Current Subscription

```bash
GET /billing/subscription/current?module=GYM
GET /billing/subscription/current  # Defaults to MOBILE_SHOP
```

### Get Available Plans

```bash
GET /plans/available?module=GYM
```

### Admin: Manage Subscriptions

```bash
GET    /admin/tenants/{id}/subscription?module=GYM
PATCH  /admin/tenants/{id}/extend-trial
       { "extraDays": 7, "module": "GYM" }
PATCH  /admin/tenants/{id}/plan
       { "planName": "Premium", "module": "GYM" }
```

## Service Method Signatures

```typescript
// All methods accept optional module (defaults to MOBILE_SHOP)
assignTrialSubscription(tenantId, planId, module?)
buyPlan(tenantId, planId, module?)
getCurrentActiveSubscription(tenantId, module?)
getUpcomingSubscription(tenantId, module?)
getActiveSubscriptionByTenant(tenantId, module?)
getSubscriptionByTenant(tenantId, module?)
canAddMember(tenantId, module?)
extendTrial(tenantId, extraDays, module?)
changePlan(tenantId, planName, module?)
changeStatus(tenantId, status, module?)
upgradeSubscription(tenantId, planId, module?)
```

## Guard Behavior

**TenantStatusGuard** (validates all non-POST /tenant requests):

- Extracts `module` from query or body (defaults to MOBILE_SHOP)
- Checks if tenant has ACTIVE or TRIAL subscription for that module
- Throws `SUBSCRIPTION_EXPIRED` if not found

**SubscriptionGuard** (informational, no blocking):

- Attaches subscription info to request object
- Respects module parameter like TenantStatusGuard

## Examples

### Frontend: Check GYM Subscription

```typescript
const module = 'GYM';
const response = await fetch(`/billing/subscription/current?module=${module}`, {
  headers: { Authorization: `Bearer ${token}` },
});
const subscription = await response.json();
// subscription = { plan: 'Premium', daysLeft: 45, ... }
```

### Backend: Create Multi-Module Subscription

```typescript
// Tenant now has both:
// 1. MOBILE_SHOP TRIAL (auto-created)
// 2. GYM ACTIVE (manually assigned)

await this.subscriptionsService.assignTrialSubscription(
  tenantId,
  trialPlanId,
  'MOBILE_SHOP', // Auto-assigned at signup
);

await this.subscriptionsService.buyPlan(
  tenantId,
  gymPlanId,
  'GYM', // Assign GYM plan
);
```

## Common Pitfalls

❌ **Don't**: Call subscription methods without module (assumes MOBILE_SHOP)
✅ **Do**: Explicitly pass module when context requires it

❌ **Don't**: Assume global subscription state
✅ **Do**: Query subscriptions per module

❌ **Don't**: Mix modules in same subscription
✅ **Do**: Create independent subscriptions per module

## Database Queries

```sql
-- Get all subscriptions for a tenant
SELECT * FROM "TenantSubscription" WHERE "tenantId" = '...';

-- Get GYM subscription (enforced UNIQUE)
SELECT * FROM "TenantSubscription"
WHERE "tenantId" = '...' AND "module" = 'GYM';

-- Get ACTIVE for all modules
SELECT * FROM "TenantSubscription"
WHERE "tenantId" = '...' AND status = 'ACTIVE';
```

## Testing

```typescript
// Test multi-module independence
const gymSub = await service.getCurrentActiveSubscription(id, 'GYM');
const shopSub = await service.getCurrentActiveSubscription(id, 'MOBILE_SHOP');

expect(gymSub.plan.name).toBe('Premium'); // GYM subscription
expect(shopSub.plan.name).toBe('Starter'); // MOBILE_SHOP subscription
expect(gymSub.id).not.toBe(shopSub.id); // Different records
```

## Migration Path (If Needed)

If you need to create subscriptions for a new module:

```typescript
// For each tenant, create new module subscription
const existingTrial = await service.getCurrentActiveSubscription(
  tenantId,
  'MOBILE_SHOP',
);

// Create matching subscription for new module
await service.assignTrialSubscription(
  tenantId,
  existingTrial.planId,
  'NEW_MODULE', // New module
);
```
