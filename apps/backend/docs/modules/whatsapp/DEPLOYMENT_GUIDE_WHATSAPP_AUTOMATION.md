# 🚀 WhatsApp Safe Automation - Deployment Guide

## ✅ Implementation Status

**ALL CODE COMPLETE** - Ready for database migration and testing

### Completed Components

- ✅ [whatsapp.cron.ts](src/modules/whatsapp/whatsapp.cron.ts) - Refactored to use EntityResolver + AutomationSafetyService
- ✅ [automation.controller.ts](src/modules/whatsapp/automation.controller.ts) - 7 API endpoints
- ✅ [automation.service.ts](src/modules/whatsapp/automation.service.ts) - Business logic with validation
- ✅ [automation-safety.service.ts](src/modules/whatsapp/automation-safety.service.ts) - 4-layer safety enforcement
- ✅ [entity-resolver.service.ts](src/modules/whatsapp/entity-resolver.service.ts) - GYM + MOBILE_SHOP resolvers
- ✅ [automation.dto.ts](src/modules/whatsapp/dto/automation.dto.ts) - DTOs for API
- ✅ [whatsapp.module.ts](src/modules/whatsapp/whatsapp.module.ts) - All services wired
- ✅ [schema.prisma](prisma/schema.prisma) - Extended with new fields

---

## 📋 Pre-Deployment Checklist

### 1. Database Credentials

```bash
# File: apps/backend/.env
# Ensure DATABASE_URL is valid

DATABASE_URL="postgresql://user:password@host:port/database?schema=public"
```

**Current Issue**: `P1000: Authentication failed against database server`

**Fix**: Update `.env` with correct Supabase credentials

### 2. Verify Prisma Schema Changes

```bash
cd apps/backend
```

Check these changes in `prisma/schema.prisma`:

```prisma
// ✅ Member model
model Member {
  // ... existing fields ...
  hasCoaching Boolean @default(false) // NEW - Opt-in for coaching
}

// ✅ WhatsAppAutomation model
model WhatsAppAutomation {
  id String @id @default(cuid())
  moduleType ModuleType // NEW
  eventType String // NEW
  templateKey String
  offsetDays Int
  enabled Boolean @default(true)
  conditions Json? // NEW
  description String? // NEW
  requiresOptIn Boolean @default(false) // NEW
  createdBy String? // NEW
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// ✅ ModuleType enum
enum ModuleType {
  GYM
  MOBILE_SHOP
}
```

---

## 🔧 Deployment Steps

### Step 1: Fix Database URL

```bash
# Edit apps/backend/.env
nano apps/backend/.env  # or your preferred editor
```

Update with valid credentials from Supabase dashboard.

### Step 2: Run Prisma Migration

```bash
cd apps/backend

# Generate migration from schema changes
npx dotenv-cli -e .env -- npx prisma migrate dev --name add_safe_whatsapp_automation

# This will:
# 1. Create migration SQL
# 2. Apply to database
# 3. Regenerate Prisma Client with new types
```

**Expected Output:**

```
✔ Generated Prisma Client
✔ Migration applied successfully
```

### Step 3: Remove Temporary Type Workarounds

After migration, these files will have temporary enum definitions. Replace them:

**Files to update:**

1. `src/modules/whatsapp/automation.controller.ts`
2. `src/modules/whatsapp/automation-safety.service.ts`
3. `src/modules/whatsapp/entity-resolver.service.ts`
4. `src/modules/whatsapp/dto/automation.dto.ts`

**Find and replace:**

```typescript
// REMOVE THIS:
// Temporary: Until Prisma migration runs, use local enum
// TODO: Replace with import { ModuleType } from '@prisma/client' after migration
enum ModuleType {
  GYM = 'GYM',
  MOBILE_SHOP = 'MOBILE_SHOP',
}

// REPLACE WITH:
import { ModuleType } from '@prisma/client';
```

Also remove `@ts-expect-error` comments for `hasCoaching` field.

### Step 4: Restart Backend

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start
```

### Step 5: Verify Module Registration

Check that `AutomationController` is registered in [whatsapp.module.ts](src/modules/whatsapp/whatsapp.module.ts):

```typescript
@Module({
  controllers: [
    // ... other controllers ...
    AutomationController, // ✅ Should be here
  ],
  providers: [
    // ... other providers ...
    AutomationService,
    AutomationSafetyService,
    EntityResolverService,
  ],
})
```

---

## 🧪 Testing

### Test 1: Verify API Availability

```bash
# Get event registry
curl http://localhost_REPLACED:3000/api/whatsapp/automations/registry \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Expected Response:**

```json
{
  "GYM": [
    "MEMBER_CREATED",
    "TRAINER_ASSIGNED",
    "MEMBERSHIP_EXPIRY",
    "PAYMENT_DUE",
    "COACHING_FOLLOWUP"
  ],
  "MOBILE_SHOP": [
    "JOB_CREATED",
    "JOB_COMPLETED",
    "INVOICE_CREATED",
    "PAYMENT_PENDING"
  ]
}
```

### Test 2: Create Welcome Automation

```bash
curl -X POST http://localhost_REPLACED:3000/api/whatsapp/automations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleType": "GYM",
    "eventType": "MEMBER_CREATED",
    "templateKey": "WELCOME",
    "offsetDays": 0,
    "enabled": true,
    "description": "Welcome new gym members"
  }'
```

### Test 3: Validate Safety Checks

```bash
curl -X POST http://localhost_REPLACED:3000/api/whatsapp/automations/validate \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "moduleType": "GYM",
    "eventType": "COACHING_FOLLOWUP",
    "templateKey": "COACHING_REMINDER",
    "tenantId": "YOUR_TENANT_ID",
    "requiresOptIn": true
  }'
```

### Test 4: Trigger Cron Manually (Dev Only)

Add temporary endpoint in [whatsapp.cron.ts](src/modules/whatsapp/whatsapp.cron.ts):

```typescript
import { Get } from '@nestjs/common';

export class WhatsAppCron {
  // ... existing code ...

  @Get('test-automation-cron')
  async testCron() {
    await this.createRemindersFromAutomations();
    return { message: 'Cron executed - check logs' };
  }
}
```

Then wire it in controller:

```bash
curl http://localhost_REPLACED:3000/test-automation-cron
```

**Check logs for:**

```
🚀 Starting safe automation reminder creation...
Found X enabled automations
Found Y entities for automation...
✅ Created safe reminder for customer...
```

### Test 5: Verify Opt-In Enforcement

```sql
-- In Prisma Studio or SQL client:

-- Enable coaching for test member
UPDATE "Member"
SET "hasCoaching" = true
WHERE id = 'test_member_id';

-- Run cron again - coaching automations should now create reminders
```

---

## 📊 Monitoring

### Key Metrics

1. **Automation Processing**
   - Check daily logs at 6 AM
   - Look for: `✅ Automation processing complete: X reminders created, Y skipped`

2. **Safety Check Failures**
   - Monitor warnings:
     - `⚠️ Template safety check failed...`
     - `⚠️ Feature safety check failed...`
     - `⚠️ Opt-in check failed...`

3. **CustomerReminder Growth**

   ```sql
   SELECT
     DATE(created_at) as date,
     COUNT(*) as reminders_created
   FROM "CustomerReminder"
   WHERE status = 'SCHEDULED'
   GROUP BY DATE(created_at)
   ORDER BY date DESC;
   ```

4. **Automation Statistics**
   ```bash
   curl http://localhost_REPLACED:3000/api/whatsapp/automations/statistics \
     -H "Authorization: Bearer YOUR_JWT_TOKEN"
   ```

---

## 🐛 Troubleshooting

### Issue: "ModuleType not found in @prisma/client"

**Cause**: Prisma migration not applied or Client not regenerated

**Fix**:

```bash
npx prisma generate
```

### Issue: "hasCoaching does not exist in type Member"

**Cause**: Prisma Client using old schema

**Fix**:

```bash
npx prisma migrate dev --name add_has_coaching
npx prisma generate
```

### Issue: No reminders created

**Checks**:

1. Are automations enabled? `SELECT * FROM "WhatsAppAutomation" WHERE enabled = true`
2. Are tenants enabled? `SELECT * FROM "WhatsAppSetting" WHERE enabled = true`
3. Check entity resolver logs: "Found X entities..."
4. Verify event types match: `MEMBER_CREATED`, not `member_created`

### Issue: Duplicate reminders

**Cause**: Deduplication logic not working

**Fix**: Check `scheduledAt` date alignment in `checkDuplicateReminder()`

### Issue: 401 Unauthorized on API calls

**Cause**: Invalid JWT token or JwtAuthGuard not working

**Fix**:

1. Verify JWT token is valid
2. Check JwtAuthGuard import path
3. Ensure `JwtModule` is imported in `WhatsAppModule`

---

## 🔒 Security Checklist

- [ ] All automation APIs require authentication
- [ ] Only UTILITY templates allowed (enforced in `validateTemplateSafety`)
- [ ] Plan features enforced (enforced in `validateFeatureSafety`)
- [ ] Opt-in required for coaching events (enforced in `validateOptInSafety`)
- [ ] Conditions JSON validated (dangerous operators blocked)
- [ ] Rate limiting on automation creation (TODO: Add if needed)

---

## 📚 Related Files

### Core Implementation

- [whatsapp.cron.ts](src/modules/whatsapp/whatsapp.cron.ts) - Main cron job
- [automation.service.ts](src/modules/whatsapp/automation.service.ts) - Business logic
- [automation-safety.service.ts](src/modules/whatsapp/automation-safety.service.ts) - Safety enforcement
- [entity-resolver.service.ts](src/modules/whatsapp/entity-resolver.service.ts) - Event → Entity mapping

### API Layer

- [automation.controller.ts](src/modules/whatsapp/automation.controller.ts) - REST endpoints
- [automation.dto.ts](src/modules/whatsapp/dto/automation.dto.ts) - Request/response DTOs

### Configuration

- [whatsapp.module.ts](src/modules/whatsapp/whatsapp.module.ts) - Module registration
- [schema.prisma](prisma/schema.prisma) - Database schema

### Documentation

- [WHATSAPP_SAFE_AUTOMATION_COMPLETE.md](WHATSAPP_SAFE_AUTOMATION_COMPLETE.md) - Full documentation

---

## ✅ Post-Deployment Verification

Run this checklist after deployment:

```bash
# 1. Check Prisma Client generation
npm run postinstall

# 2. Verify no TypeScript errors
npm run build

# 3. Check module registration
npm run start:dev
# Look for: "WhatsAppModule dependencies initialized"

# 4. Test API endpoints
curl http://localhost_REPLACED:3000/api/whatsapp/automations/registry

# 5. Verify cron schedule
# Check logs for: "Starting safe automation reminder creation..."
# (Should appear daily at 6 AM)

# 6. Test safety enforcement
# Create automation with MARKETING template → should fail
# Create automation without plan feature → should fail
# Create coaching automation without opt-in → should skip member
```

---

## 🎉 Success Criteria

✅ Prisma migration applied successfully  
✅ All TypeScript errors resolved  
✅ API endpoints return expected responses  
✅ Cron creates CustomerReminder entries  
✅ Safety checks enforce all rules  
✅ Opt-in enforcement works for coaching events  
✅ No duplicate reminders created  
✅ Logs show clear audit trail

---

**Last Updated**: January 30, 2026  
**Version**: 1.0.0  
**Status**: Ready for Database Migration
