# WhatsApp Template Versioning System

## The Problem You Had

You were confused because:

1. **Template Key** (WELCOME, PAYMENT_DUE) should be IMMUTABLE - it identifies what the template is for
2. **Meta Template Name** (welcome_v1, welcome_v2) can have MULTIPLE versions
3. The old unique constraint `@@unique([moduleType, templateKey])` prevented you from having multiple versions

## The Solution - New Architecture

### Database Schema (UPDATED)

```prisma
model WhatsAppTemplate {
  id               String   @id @default(uuid())
  moduleType       String   // GYM, MOBILESHOP
  templateKey      String   // WELCOME, PAYMENT_DUE, EXPIRY (IMMUTABLE - identifies purpose)
  metaTemplateName String   // "welcome_v1", "welcome_v2", "welcome_v3" (MUTABLE - each version unique)
  category         String   // UTILITY or MARKETING
  feature          String   // WELCOME, PAYMENT_DUE, EXPIRY, REMINDER
  language         String   // en, ta, hi
  status           String   // ACTIVE or DISABLED
  isDefault        Boolean  // Which version is the DEFAULT for this templateKey
  createdAt        DateTime
  updatedAt        DateTime

  @@unique([moduleType, metaTemplateName])  // NEW: metaTemplateName must be unique (can't duplicate Meta template names)
  @@index([moduleType, templateKey])         // NEW: allows querying all versions
}
```

**Key Changes:**

- ✅ `@@unique([moduleType, templateKey])` → **REMOVED** (was blocking versioning)
- ✅ `@@unique([moduleType, metaTemplateName])` → **ADDED** (ensures no duplicate Meta template names)
- ✅ `@@index([moduleType, templateKey])` → **ADDED** (find all versions of a template)
- ✅ `isDefault: Boolean` → **ADDED** (track which version is in use)

## How It Works - The Workflow

### Scenario: You have a WELCOME template and want to create versions

**Step 1: Create v1 (Initial)**

```
Create Template:
- Module Type: GYM
- Template Key: WELCOME          ← IMMUTABLE
- Meta Template Name: welcome_v1  ← Created in Meta WhatsApp first
- Variables: ${memberName}, ${startDate}
- isDefault: true                 ← Use this version
```

**Step 2: Create v2 (with different variables)**

```
Create Template:
- Module Type: GYM
- Template Key: WELCOME           ← SAME as v1 (same purpose)
- Meta Template Name: welcome_v2  ← Different Meta template (created in Meta)
- Variables: ${memberName}, ${phone}, ${planName}  ← Different variables!
- isDefault: false                ← Don't use yet
```

**Step 3: Switch to v2**

```
Update v1: isDefault = false
Update v2: isDefault = true
Now automations use welcome_v2
```

### Key Rules

1. **Template Key** = Purpose (WELCOME, PAYMENT_DUE)
   - Must stay the same across versions
   - Can't change it

2. **Meta Template Name** = Actual WhatsApp template
   - Must be unique (no duplicates)
   - Each version gets its own Meta template name (v1, v2, v3)
   - Must exist in Meta WhatsApp account

3. **Variables** = Embedded in Meta template
   - Different versions can have different variables
   - Extracted from Meta template content
   - Can't be changed in app (change in Meta, then import)

4. **isDefault** = Active version
   - Only one version per template key can be default
   - Automations use the default version
   - Can switch versions without losing automations

## Frontend UI Changes

### Create Template Dialog

```
Module Type: [GYM / MOBILESHOP] ← Select first
Template Key: [WELCOME / PAYMENT_DUE] ← What is this template for?
Meta Template Name: [welcome_v1] ← Must match Meta
Category, Feature, Language, Status, Variables
Create Button → Creates new version
```

### Edit Template Dialog

```
View Version Info:
- Template Key: WELCOME (can't change)
- Current Meta Name: welcome_v1
- Can update: Status, Category, Language
- Cannot update: Template Key, Variables
```

### Templates List

```
WELCOME
  ├─ welcome_v1 (DEFAULT) [Active]
  ├─ welcome_v2 [Active]
  └─ welcome_v3 [Disabled]

PAYMENT_DUE
  └─ payment_reminder_v1 (DEFAULT) [Active]
```

## API Endpoints (Backend)

```typescript
// Create new template version
POST /api/whatsapp/templates
{
  moduleType: "GYM",
  templateKey: "WELCOME",
  metaTemplateName: "welcome_v2",
  category: "UTILITY",
  feature: "WELCOME",
  language: "en",
  status: "ACTIVE"
}

// List all versions of a template key
GET /api/whatsapp/templates?templateKey=WELCOME

// Set as default
PATCH /api/whatsapp/templates/:id/set-default

// Update version details (not key/variables)
PATCH /api/whatsapp/templates/:id
{
  status: "DISABLED",
  category: "MARKETING"
}
```

## Database Queries

```sql
-- Find all versions of WELCOME template for GYM
SELECT * FROM "WhatsAppTemplate"
WHERE "moduleType" = 'GYM' AND "templateKey" = 'WELCOME'
ORDER BY "createdAt" DESC;

-- Find the default version
SELECT * FROM "WhatsAppTemplate"
WHERE "moduleType" = 'GYM' AND "templateKey" = 'WELCOME' AND "isDefault" = true;

-- Find template by Meta name (used when receiving webhook)
SELECT * FROM "WhatsAppTemplate"
WHERE "metaTemplateName" = 'welcome_v1';
```

## Migration Path (What Changed in DB)

```sql
-- Remove old unique constraint
DROP CONSTRAINT "WhatsAppTemplate_moduleType_templateKey_key";

-- Add new unique constraint
ADD CONSTRAINT "WhatsAppTemplate_moduleType_metaTemplateName_key"
    UNIQUE ("moduleType", "metaTemplateName");

-- Add new index
CREATE INDEX "WhatsAppTemplate_moduleType_templateKey_idx"
    ON "WhatsAppTemplate"("moduleType", "templateKey");

-- Add new column
ALTER TABLE "WhatsAppTemplate"
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;
```

## FAQ

**Q: Can I delete a template version?**
A: Not via UI (for now). Delete via database with care. If it's the default version, set another to default first.

**Q: What if I change variables in Meta?**
A: Create a new version with new meta template name. The app reads variables from Meta when you send messages.

**Q: Can I revert to an old version?**
A: Yes! Set `isDefault = true` on the old version, set `false` on current.

**Q: Do automations switch with versions?**
A: They reference `templateKey`, not `metaTemplateName`. So:

- Automation → WELCOME (template key)
- Uses → whichever WELCOME version has `isDefault = true`
- If you change default, automation automatically uses new version

**Q: What about API compatibility?**
A: `templateKey` stays the same across versions, so API calls like `/templates/WELCOME` still work.
