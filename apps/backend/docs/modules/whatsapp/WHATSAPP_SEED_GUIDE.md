# WhatsApp Seed Script Documentation

## Overview

The WhatsApp seed script initializes WhatsApp configuration for all tenants in the database. It is **idempotent**, meaning you can run it multiple times without creating duplicates.

## What Gets Seeded

### 1. WhatsAppSetting (Per Tenant)

- **enabled**: `false` (disabled by default, enable in UI)
- **provider**: `"META"`
- **defaultLanguage**: `"en"`
- **dailyLimit**: `100` messages/day
- **testPhone**: `null` (set via Settings UI)
- **marketingOptInRequired**: `true`

**Upsert Key**: `tenantId` (unique per tenant)

### 2. WhatsAppTemplate (3 Templates Per Tenant)

| Template Key | Meta Name                     | Feature     | Category | Language | Status |
| ------------ | ----------------------------- | ----------- | -------- | -------- | ------ |
| WELCOME      | welcome_message_v1            | WELCOME     | UTILITY  | en       | ACTIVE |
| PAYMENT_DUE  | payment_due_reminder_v1       | PAYMENT_DUE | UTILITY  | en       | ACTIVE |
| EXPIRY       | membership_expiry_reminder_v1 | EXPIRY      | UTILITY  | en       | ACTIVE |

**Upsert Key**: `(tenantId, templateKey)` (unique combination)

### 3. WhatsAppAutomation (3 Automations Per Tenant)

| Trigger Type  | Template Key | Offset Days | Enabled |
| ------------- | ------------ | ----------- | ------- |
| DATE          | EXPIRY       | -3          | true    |
| AFTER_INVOICE | PAYMENT_DUE  | 2           | true    |
| AFTER_JOB     | WELCOME      | 0           | true    |

**Upsert Key**: `(tenantId, triggerType)` (one automation per trigger type)

## Running the Seed

### Prerequisites

1. Backend app must be set up and dependencies installed
2. Database must be initialized with Prisma migrations
3. At least one tenant must exist in the database

### Run Seed

```bash
cd apps/backend
npm run seed
```

### Example Output

```
✅ Plans seeded
🌱 Seeding HSN Data...
✅ Seeded 1199 HSN codes

🌱 Seeding WhatsApp configuration...
✅ WhatsApp configuration seeded
   Settings created: 2
   Templates seeded: 6
   Automations seeded: 6
```

## Safety Features

✅ **Idempotent**: Run multiple times without duplication
✅ **No Hardcoded IDs**: Loops all tenants automatically
✅ **Preserves Existing Data**: Uses conditional creation, doesn't overwrite
✅ **No Enum Violations**: All values match Prisma schema enums
✅ **No Foreign Key Errors**: Validates tenant existence

## Troubleshooting

### No tenants found error

```
⚠️  No tenants found. Skipping WhatsApp seed.
Tip: Create a tenant first, then run: npm run seed
```

**Solution**: Create a tenant via the admin API or UI first.

### Database connection error

```
Error: ECONNREFUSED - PostgreSQL connection failed
```

**Solution**: Ensure:

1. `.env` file exists at `apps/backend/.env`
2. `DATABASE_URL` is correctly configured
3. PostgreSQL server is running

### Prisma migration error

```
Error: "Tables do not exist"
```

**Solution**: Run migrations first:

```bash
npx prisma migrate deploy
```

## Customizing Seed Data

To modify seed values, edit `apps/backend/prisma/seed.ts`:

### Change Daily Limit

```typescript
dailyLimit: 100, // Change to your desired limit
```

### Change Default Language

```typescript
defaultLanguage: 'en', // Change to 'ta' or 'hi'
```

### Add More Templates

```typescript
const templates = [
  // ... existing templates
  {
    templateKey: 'CUSTOM',
    metaTemplateName: 'custom_template_v1',
    category: 'MARKETING',
    feature: 'REMINDER',
    language: 'en',
    status: 'ACTIVE',
  },
];
```

## Next Steps After Seeding

1. **Enable WhatsApp**:
   - Navigate to `/admin-master/settings`
   - Toggle "Enable WhatsApp" to `true`

2. **Verify Templates**:
   - Go to `/admin-master/templates`
   - Confirm 3 templates are visible

3. **Configure Automations**:
   - Go to `/admin-master/automations`
   - Review trigger-based rules

4. **Test Integration**:
   - Set testPhone in Settings
   - Send test message from Send screen
   - Check Logs for delivery status

## API Integration

The seed script uses direct Prisma operations. Backend API must implement:

- `GET /whatsapp/settings/{tenantId}` - Fetch settings
- `PUT /whatsapp/settings/{tenantId}` - Update settings
- `GET /whatsapp/templates/{tenantId}` - List templates
- `POST /whatsapp/templates/{tenantId}` - Create template
- `PATCH /whatsapp/templates/{templateId}` - Update template
- `GET /whatsapp/automations/{tenantId}` - List automations
- `POST /whatsapp/automations/{tenantId}` - Create automation

## Performance Notes

- Seed time: < 1 second per tenant
- No bulk operations: Uses individual upserts for safety
- Database indexes: All unique fields are indexed

## Related Files

- Schema: `apps/backend/prisma/schema.prisma`
- Seed Script: `apps/backend/prisma/seed.ts`
- Frontend UI: `apps/admin-master/app/`
- API Integration: `apps/backend/src/modules/whatsapp-admin/`
