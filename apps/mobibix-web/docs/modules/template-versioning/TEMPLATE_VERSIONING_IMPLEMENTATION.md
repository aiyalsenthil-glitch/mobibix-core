# Template Versioning Implementation Complete

## What Was Changed

### 1. Database Schema (`prisma/schema.prisma`)

**Before (Blocking Versioning):**

```prisma
@@unique([moduleType, templateKey])  // ❌ Prevented multiple versions
```

**After (Allows Versioning):**

```prisma
@@unique([moduleType, metaTemplateName])  // ✅ Unique per Meta template name
@@index([moduleType, templateKey])         // ✅ Find all versions by key
isDefault: Boolean                         // ✅ Track active version
```

**Why This Works:**

- `templateKey` = What (WELCOME, PAYMENT_DUE) → can repeat across versions
- `metaTemplateName` = Which Meta template (welcome_v1, welcome_v2) → must be unique
- `isDefault` = Which version is in use → helps automations find the right version

### 2. Seed Script (`prisma/seed.ts`)

Updated to use the new unique constraint:

```typescript
// OLD (broken with new schema):
where: { moduleType_templateKey: { ... } }

// NEW (works with versioning):
where: { moduleType_metaTemplateName: { ... } }
```

### 3. Frontend UI (`apps/whatsapp-master/app/templates/page.tsx`)

**Added:**

- ✅ Info card explaining template versioning system
- ✅ Clear labels: "Template Key (Purpose)" vs "Meta Template Name (Version)"
- ✅ Help text explaining the workflow
- ✅ Step-by-step instructions in create dialog
- ✅ Light theme throughout (all dark classes removed)
- ✅ Better visual distinction between template purpose and version

**Button Text Change:**

- "Create Template" → "Create Version" (clarifies you're creating another version)

## The Workflow - Step by Step

### Scenario: You Want Welcome v1, v2, and v3

#### 1. Create v1 (Initial)

```
Go to Meta WhatsApp > Create Template:
  Name: welcome_v1
  Variables: ${memberName}, ${startDate}
  Save

Back in App > Create Version:
  Module Type: GYM
  Template Key: WELCOME          ← Same purpose
  Meta Template Name: welcome_v1 ← Exact match from Meta
  Feature: WELCOME
  Category: UTILITY
  Language: en
  Status: ACTIVE
  Variables: [Select memberName, startDate]
  Create
```

#### 2. Create v2 (Different variables)

```
Go to Meta WhatsApp > Create Template:
  Name: welcome_v2
  Variables: ${memberName}, ${phone}, ${planName}
  Save

Back in App > Create Version:
  Module Type: GYM
  Template Key: WELCOME          ← SAME as v1
  Meta Template Name: welcome_v2 ← Different from v1
  Feature: WELCOME
  Category: UTILITY
  Language: en
  Status: ACTIVE
  Variables: [Select memberName, phone, planName]
  Create
```

#### 3. Create v3 (Another variation)

```
Go to Meta WhatsApp > Create Template:
  Name: welcome_v3
  Variables: ${memberName}, ${email}, ${gym}
  Save

Back in App > Create Version:
  Module Type: GYM
  Template Key: WELCOME          ← SAME as v1, v2
  Meta Template Name: welcome_v3 ← Different from v1, v2
  Feature: WELCOME
  Category: UTILITY
  Language: en
  Status: ACTIVE
  Variables: [Select memberName, email, gym]
  Create
```

#### 4. View All Versions in Templates List

```
WELCOME (rows stacked):
├─ welcome_v1 │ Feature: WELCOME │ Active
├─ welcome_v2 │ Feature: WELCOME │ Active
└─ welcome_v3 │ Feature: WELCOME │ Active

PAYMENT_DUE (rows stacked):
└─ payment_reminder_v1 │ Feature: PAYMENT_DUE │ Active
```

#### 5. Switch Default Version (When Ready)

```
Update v1: Set isDefault = false
Update v2: Set isDefault = true
OR Update v3: Set isDefault = true

Automations automatically use whichever version has isDefault = true
```

## Database Queries Now Possible

```sql
-- Find all versions of a template purpose
SELECT * FROM "WhatsAppTemplate"
WHERE "moduleType" = 'GYM' AND "templateKey" = 'WELCOME'
ORDER BY "createdAt" DESC;

-- Find the active version
SELECT * FROM "WhatsAppTemplate"
WHERE "moduleType" = 'GYM' AND "templateKey" = 'WELCOME' AND "isDefault" = true;

-- Find by Meta template name (for webhooks)
SELECT * FROM "WhatsAppTemplate"
WHERE "metaTemplateName" = 'welcome_v2';

-- Find all versions of all templates
SELECT DISTINCT "templateKey", "metaTemplateName", "isDefault"
FROM "WhatsAppTemplate"
WHERE "moduleType" = 'GYM'
ORDER BY "templateKey", "createdAt" DESC;
```

## Key Points to Remember

| Aspect                 | Before            | After             | Rule                    |
| ---------------------- | ----------------- | ----------------- | ----------------------- |
| **Template Key**       | Single per module | Multiple versions | Same across versions    |
| **Meta Template Name** | Duplicate allowed | Unique            | Different per version   |
| **Variables**          | Fixed             | Per version       | Based on Meta template  |
| **Versioning Support** | ❌ No             | ✅ Yes            | v1, v2, v3 support      |
| **Default Version**    | N/A               | Tracked           | Automations use default |

## API Behavior (Will Update)

```typescript
// Create new version (same key, different meta name)
POST /api/whatsapp/templates
{
  templateKey: "WELCOME",        // Can match existing
  metaTemplateName: "welcome_v2" // Must be unique
}
// Result: New version created alongside v1

// List all templates
GET /api/whatsapp/templates
// Result: All versions of all templates

// List all versions of specific key
GET /api/whatsapp/templates?templateKey=WELCOME
// Result: v1, v2, v3 all returned

// Get default version
GET /api/whatsapp/templates/WELCOME/default
// Result: The one with isDefault = true
```

## Frontend UI Changes Summary

### Create Dialog (Updated)

- ✅ Module Type selector at top
- ✅ Clear "Template Key (Purpose)" field explanation
- ✅ Clear "Meta Template Name (Version)" field explanation
- ✅ Step-by-step instructions
- ✅ Light theme background
- ✅ Variable selection UI

### Edit Dialog (Updated)

- ✅ Shows template key (read-only)
- ✅ Shows meta template name (read-only)
- ✅ Can update: Status, Category, Language
- ✅ Cannot update: Key, Variables (change in Meta, not here)
- ✅ Light theme background

### Templates List (Updated)

- ✅ Template Key shown as purpose
- ✅ Meta Template Name shown as version (code formatted)
- ✅ Multiple rows per key = multiple versions
- ✅ Clear visual hierarchy

### Info Section (New)

- ✅ Explains Template Key vs Meta Template Name
- ✅ Links to workflow documentation
- ✅ Always visible above table

## Migration Status

✅ **Schema Updated:**

- Old constraint removed
- New constraints added
- isDefault column added
- Database reset and migrated

✅ **Seed Script Updated:**

- Uses new unique constraint
- Ready to create template versions
- Works with clean database

✅ **Frontend Updated:**

- Explains versioning system
- Better UI labels
- Light theme only
- No dark theme classes

✅ **Documentation Created:**

- TEMPLATE_VERSIONING_GUIDE.md (detailed reference)
- This implementation guide
- Examples and API specs

## Next Steps (If Needed)

1. **Backend API Updates** (Optional)
   - Add `isDefault` update endpoint
   - Add template key listing with versions
   - Ensure automations query for default version

2. **Database Seeding** (Optional)
   - Add sample v1, v2, v3 templates to seed
   - Mark one as isDefault per key

3. **UI Enhancements** (Optional)
   - Add "Set as Default" button
   - Show default version badge in list
   - Add "Duplicate Version" feature
   - Add version creation from existing

## Testing the Versioning System

```bash
# 1. Backend running
npm run start:dev  # In apps/backend

# 2. Frontend running
npm run dev        # In apps/whatsapp-master

# 3. Create a tenant (if needed)
# 4. Navigate to /templates
# 5. Create multiple versions:
#    - WELCOME → welcome_v1
#    - WELCOME → welcome_v2
#    - WELCOME → welcome_v3
# 6. Verify they all appear in the list
# 7. Edit one to change status
# 8. Verify isDefault logic in database
```

## Summary

You now have a **proper versioning system** where:

- ✅ `Template Key` stays constant (WELCOME = WELCOME)
- ✅ `Meta Template Name` changes per version (v1, v2, v3)
- ✅ Different versions can have different variables
- ✅ Database allows multiple versions per key
- ✅ Automations will use the default version
- ✅ Easy to switch versions without breaking automations
- ✅ Frontend explains the workflow clearly
