# Feature Flag System - Usage Guide

## Overview

The feature flag system allows dynamic enabling/disabling of features without code deployments. Supports:
- **Global flags**: Apply to all tenants
- **Tenant flags**: Apply to specific tenants (overrides global)
- **Shop flags**: Apply to specific shops (overrides tenant and global)
- **Premium gating**: Automatically disable premium features for non-premium tenants
- **Gradual rollout**: Enable features for percentage of users (0-100%)
- **Caching**: 5-minute cache for performance

## Quick Start

### 1. Protect a Route with Feature Flag

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { RequireFeature, FeatureFlag, FeatureFlagGuard, JwtAuthGuard } from '@common/features';

@Controller('whatsapp')
@UseGuards(JwtAuthGuard) // Ensure user is authenticated
export class WhatsAppController {
  
  @Get('send-reminder')
  @UseGuards(FeatureFlagGuard) // Add guard
  @RequireFeature(FeatureFlag.WHATSAPP_REMINDERS) // Specify required feature
  async sendReminder() {
    // This method only executes if WHATSAPP_REMINDERS is enabled
    // for the authenticated user's tenant/shop
    return { message: 'Reminder sent' };
  }
}
```

### 2. Check Feature in Service Logic

```typescript
import { Injectable } from '@nestjs/common';
import { FeatureFlagService, FeatureFlag } from '@common/features';

@Injectable()
export class BillingService {
  constructor(private featureFlagService: FeatureFlagService) {}

  async calculatePrice(tenantId: string, shopId: string) {
    // Check if advanced pricing is enabled
    const hasAdvancedPricing = await this.featureFlagService.isFeatureEnabled(
      FeatureFlag.ADVANCED_PRICING,
      tenantId,
      shopId,
    );

    if (hasAdvancedPricing) {
      return this.calculateAdvancedPrice();
    } else {
      return this.calculateBasicPrice();
    }
  }
}
```

### 3. Set Feature Flags Programmatically

```typescript
import { FeatureFlagService, FeatureFlag, FeatureFlagScope } from '@common/features';

// Disable feature globally
await featureFlagService.setFeatureFlag({
  flag: FeatureFlag.AI_SUGGESTIONS,
  enabled: false,
  scope: FeatureFlagScope.GLOBAL,
});

// Enable feature for specific tenant
await featureFlagService.setFeatureFlag({
  flag: FeatureFlag.CUSTOMER_SEGMENTATION,
  enabled: true,
  scope: FeatureFlagScope.TENANT,
  tenantId: 'tenant-abc-123',
});

// Enable feature for specific shop with 50% rollout
await featureFlagService.setFeatureFlag({
  flag: FeatureFlag.STOCK_TRANSFER,
  enabled: true,
  scope: FeatureFlagScope.SHOP,
  tenantId: 'tenant-abc-123',
  shopId: 'shop-xyz-789',
  rolloutPercentage: 50, // Only 50% of requests will see this enabled
});
```

### 4. Get All Feature Flags for Tenant

```typescript
const flags = await featureFlagService.getFeatureFlagsForTenant('tenant-abc-123');

console.log(flags);
// {
//   whatsapp_reminders: true,
//   whatsapp_automations: true,
//   whatsapp_broadcasts: false,
//   serialized_inventory: true,
//   ...
// }
```

### 5. Delete Feature Flag (Revert to Default)

```typescript
await featureFlagService.deleteFeatureFlag(
  FeatureFlag.WHATSAPP_REMINDERS,
  FeatureFlagScope.TENANT,
  'tenant-abc-123',
);
```

## Available Features

### WhatsApp Features
- `WHATSAPP_REMINDERS` - Payment reminders via WhatsApp (default: enabled)
- `WHATSAPP_AUTOMATIONS` - Automated WhatsApp flows (default: enabled)
- `WHATSAPP_BROADCASTS` - Bulk WhatsApp broadcasts (default: disabled, beta)

### Inventory Features
- `SERIALIZED_INVENTORY` - IMEI/Serial number tracking (default: enabled)
- `LOW_STOCK_ALERTS` - Automatic low stock alerts (default: enabled)
- `STOCK_TRANSFER` - Inter-shop stock transfers (default: disabled, coming soon)

### Billing Features
- `GST_BILLING` - GST invoice generation (default: enabled)
- `LOYALTY_POINTS` - Customer loyalty program (default: enabled)
- `ADVANCED_PRICING` - Dynamic pricing rules (default: disabled, **premium**)

### CRM Features
- `CUSTOMER_FOLLOW_UPS` - Follow-up reminders (default: enabled)
- `CUSTOMER_SEGMENTATION` - Customer segmentation (default: disabled, **premium**, coming soon)

### Job Card Features
- `WARRANTY_JOBS` - Warranty job tracking (default: enabled)
- `JOB_CARD_TEMPLATES` - Custom job card templates (default: disabled, coming soon)

### Analytics Features
- `ADVANCED_REPORTS` - Advanced analytics (default: enabled)
- `EXPORT_TO_EXCEL` - Excel export functionality (default: enabled)

### Experimental Features
- `AI_SUGGESTIONS` - AI-powered suggestions (default: disabled, **premium**)
- `VOICE_COMMANDS` - Voice command interface (default: disabled, **premium**)

**Premium features** are automatically disabled for tenants on basic/free plans.

## Feature Flag Priority

When checking if a feature is enabled, the system checks in this order (most specific wins):

1. **Shop-level override** (if shopId provided)
2. **Tenant-level override** (if tenantId provided)
3. **Global override**
4. **Default value** (from constants)

Example:
```
Global: WHATSAPP_REMINDERS = false
Tenant: WHATSAPP_REMINDERS = true
Shop: WHATSAPP_REMINDERS = false

Result for shop: false (shop override wins)
Result for tenant (no shop context): true (tenant override wins)
Result for different tenant: false (global override applies)
```

## Gradual Rollout

Enable features for a percentage of requests:

```typescript
await featureFlagService.setFeatureFlag({
  flag: FeatureFlag.AI_SUGGESTIONS,
  enabled: true,
  scope: FeatureFlagScope.GLOBAL,
  rolloutPercentage: 25, // Enable for 25% of users
});
```

**Note**: Current implementation uses random percentage. For production, consider using deterministic hashing based on tenantId/userId to ensure consistency (same user always sees same result).

## Caching

- Feature flag checks are cached for **5 minutes**
- Cache is automatically invalidated when flags are updated/deleted
- Manual cache clear: `featureFlagService.clearCache()`

## Database Schema

```prisma
model FeatureFlag {
  id                 String            @id @default(cuid())
  flag               String            // FeatureFlag enum value
  enabled            Boolean           @default(true)
  scope              FeatureFlagScope  // GLOBAL, TENANT, SHOP
  tenantId           String?
  shopId             String?
  rolloutPercentage  Int?              // 0-100
  metadata           Json?             // Additional config
  
  @@unique([flag, scope, tenantId, shopId])
}
```

## Migration

Run migration to create FeatureFlag table:

```bash
cd apps/backend
npx prisma migrate dev --name add_feature_flags
```

## Testing

Feature flags are mocked in tests:

```typescript
import { FeatureFlagService } from '@common/features';

// Mock in test
const mockFeatureFlagService = {
  isFeatureEnabled: jest.fn().mockResolvedValue(true),
};

// Use in test module
TestingModule.createTestingModule({
  providers: [
    { provide: FeatureFlagService, useValue: mockFeatureFlagService },
  ],
});
```

## Admin API

Feature flag management endpoints (to be implemented):

```
POST   /api/admin/feature-flags     - Create/update feature flag
GET    /api/admin/feature-flags     - List all feature flags
DELETE /api/admin/feature-flags/:id - Delete feature flag
```

## Best Practices

1. **Always set defaults**: Define sensible defaults in `DEFAULT_FEATURE_FLAGS`
2. **Document beta features**: Add to `BETA_FEATURES` set for visibility
3. **Gate premium features**: Add to `PREMIUM_FEATURES` set for automatic plan checking
4. **Use guards for routes**: Prefer `@RequireFeature()` guard over manual checks
5. **Cache aware**: Remember 5-minute cache when testing flag changes
6. **Gradual rollouts**: Use percentage-based rollout for risky features
7. **Monitor usage**: Track which features are used in analytics

## Troubleshooting

**Feature not disabled even after setting flag:**
- Check cache (5-minute TTL), wait or call `clearCache()`
- Verify scope hierarchy (shop > tenant > global > default)
- Check if feature is in `PREMIUM_FEATURES` (plan restriction may override)

**Guard throws "feature not enabled" error:**
- Ensure user has `tenantId` in JWT payload (from `JwtAuthGuard`)
- Verify feature flag is set correctly in database
- Check default value in `DEFAULT_FEATURE_FLAGS`

**Premium feature not working:**
- Check tenant's plan in TenantSubscription table
- Ensure plan value is 'premium' or 'business' (case-sensitive)
- Adjust `checkTenantPlan()` logic if using different plan names
