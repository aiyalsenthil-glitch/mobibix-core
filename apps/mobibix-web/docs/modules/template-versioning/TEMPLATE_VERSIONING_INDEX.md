# Template Versioning System - Documentation Index

## Overview

The template versioning system allows you to create multiple versions (v1, v2, v3) of templates with different variables, then switch between them.

**Problem Solved:** You wanted to create templates like welcome_v1, welcome_v2, welcome_v3 - each with different variables. Now you can!

## Documentation Files

### 1. 📋 **TEMPLATE_VERSIONING_QUICK_REF.md**

**Best for:** Quick questions, common tasks, "how do I...?"

Contents:

- The answer to your original question
- 3-step workflow (Meta → App → Use)
- Key differences table
- Common tasks
- Real-world example
- FAQ

**Read this when:** You want a quick answer without all the details

---

### 2. 🎨 **TEMPLATE_VERSIONING_VISUAL.md**

**Best for:** Visual learners, understanding the architecture

Contents:

- Architecture diagram (Meta → App → Automation)
- Step-by-step flowcharts
- Templates list view example
- Database relationships diagram
- Query examples
- User experience flow

**Read this when:** You want to understand how it all fits together visually

---

### 3. 📖 **TEMPLATE_VERSIONING_GUIDE.md**

**Best for:** Comprehensive reference, technical details

Contents:

- Database schema explanation (before/after)
- Complete workflow with screenshots
- Key rules and constraints
- Frontend UI changes
- API endpoints (coming soon)
- Database query patterns
- Migration path
- FAQ with technical answers

**Read this when:** You need detailed technical information

---

### 4. 🔧 **TEMPLATE_VERSIONING_IMPLEMENTATION.md**

**Best for:** Understanding what changed, developers

Contents:

- What was changed (database, seed, frontend)
- Why it was changed
- Specific code changes
- Key points to remember
- API behavior
- Next steps (optional)
- Testing instructions

**Read this when:** You're implementing related features

---

### 5. 📝 **TEMPLATE_VERSIONING_COMPLETE_SUMMARY.md**

**Best for:** Overview of entire system, all changes in one place

Contents:

- Problem statement
- Solution overview
- All files changed with explanations
- Key concepts
- Before/after comparison
- Architecture diagram
- Database queries
- Status checklist
- Documentation files overview

**Read this when:** You want everything in one comprehensive summary

---

## Quick Navigation by Question

### "How do I use this?"

→ Start with **TEMPLATE_VERSIONING_QUICK_REF.md**
→ See Real-World Example section

### "How does it work?"

→ Start with **TEMPLATE_VERSIONING_VISUAL.md**
→ Look at Architecture Diagram

### "What changed in the code?"

→ Start with **TEMPLATE_VERSIONING_IMPLEMENTATION.md**
→ See Files Changed section

### "I need technical details"

→ Start with **TEMPLATE_VERSIONING_GUIDE.md**
→ See Database Schema or API sections

### "Give me the big picture"

→ Read **TEMPLATE_VERSIONING_COMPLETE_SUMMARY.md**

---

## The Concept in 30 Seconds

```
You can create multiple versions of the same template:

WELCOME (Template Key = Purpose)
├─ welcome_v1 (Meta Name = Version 1)
│  └─ Variables: memberName, startDate
├─ welcome_v2 (Meta Name = Version 2)
│  └─ Variables: memberName, phone, planName
└─ welcome_v3 (Meta Name = Version 3)
   └─ Variables: memberName, email, gym

Switch between versions by setting isDefault=true on the one you want.
Automations always use whichever version is marked as default.
```

## Key Files Modified

| File                     | Change                         | Why                              |
| ------------------------ | ------------------------------ | -------------------------------- |
| `prisma/schema.prisma`   | Changed unique constraint      | Enable multiple versions         |
| `prisma/seed.ts`         | Updated upsert logic           | Work with new constraint         |
| `app/templates/page.tsx` | Added UI guidance, fixed theme | Help users understand versioning |

## Current Status

✅ **Database:** Updated, migrated, clean
✅ **Backend:** Ready for versioning
✅ **Frontend:** Updated, documented, light theme
✅ **Build:** Passes without errors
✅ **Documentation:** Comprehensive, 5 guides

## Testing

```bash
# Verify everything
npm run build  # Frontend builds
npm run seed   # Seed script works

# Test versioning workflow
1. Go to /templates
2. Create Version: WELCOME → welcome_v1
3. Create Version: WELCOME → welcome_v2 (same key, different name)
4. See both in list
5. Edit one, toggle status
6. Check database for isDefault values
```

## What's Next?

Optional enhancements:

- [ ] Add "Set as Default" button in UI
- [ ] Show default version badge
- [ ] Add "Clone Version" feature
- [ ] Backend API for switching default
- [ ] Sample data with multiple versions

## Examples in Code

### Create v1

```typescript
Template Key: WELCOME
Meta Template Name: welcome_v1
Variables: memberName, startDate
isDefault: true
```

### Create v2

```typescript
Template Key: WELCOME    // SAME
Meta Template Name: welcome_v2  // DIFFERENT
Variables: memberName, phone, planName
isDefault: false
```

### Switch to v2

```typescript
// Edit v1
isDefault: false;

// Edit v2
isDefault: true;

// Automations now use v2 automatically
```

## Database Structure

```sql
WhatsAppTemplate {
  id: UUID
  moduleType: "GYM" | "MOBILESHOP"
  templateKey: "WELCOME" | "PAYMENT_DUE" | ...  // Purpose
  metaTemplateName: "welcome_v1" | "welcome_v2" | ...  // Version
  category: "UTILITY" | "MARKETING"
  feature: "WELCOME" | "PAYMENT_DUE" | ...
  language: "en" | "ta" | "hi"
  status: "ACTIVE" | "DISABLED"
  isDefault: boolean  // NEW: Marks active version
  createdAt: DateTime
  updatedAt: DateTime

  Unique Constraint: (moduleType, metaTemplateName)
  Index: (moduleType, templateKey)
}
```

## Common Operations

```sql
-- List all versions of WELCOME
SELECT * FROM WhatsAppTemplate
WHERE templateKey = 'WELCOME'
ORDER BY createdAt DESC;

-- Get the active version
SELECT * FROM WhatsAppTemplate
WHERE templateKey = 'WELCOME' AND isDefault = true;

-- Find by Meta name (for webhooks)
SELECT * FROM WhatsAppTemplate
WHERE metaTemplateName = 'welcome_v2';

-- Make v2 the default
UPDATE WhatsAppTemplate SET isDefault = false
WHERE templateKey = 'WELCOME' AND metaTemplateName = 'welcome_v1';
UPDATE WhatsAppTemplate SET isDefault = true
WHERE templateKey = 'WELCOME' AND metaTemplateName = 'welcome_v2';
```

## Architecture Summary

```
┌─ Meta WhatsApp
│  └─ welcome_v1, welcome_v2, welcome_v3
│     (Define templates with variables)
│
├─ Your App
│  └─ Template Management
│     ├─ Create versions (register Meta templates)
│     ├─ Manage versions (enable/disable)
│     └─ Set default (isDefault = true)
│
└─ Automations
   └─ Reference Template Key
      └─ Use Version with isDefault = true
         └─ Send Message
```

---

## How to Use This Documentation

1. **First Time?** → Read QUICK_REF.md
2. **Need Visuals?** → Check VISUAL.md
3. **Want Details?** → Read GUIDE.md
4. **Implementing?** → Check IMPLEMENTATION.md
5. **Need Everything?** → See COMPLETE_SUMMARY.md

## Questions Answered

✅ "How do I create multiple versions?"
→ QUICK_REF.md - 3-Step Workflow

✅ "What's the difference between Template Key and Meta Name?"
→ QUICK_REF.md - Key Differences table

✅ "How do automations use versions?"
→ VISUAL.md - Database Relationships

✅ "What changed in the code?"
→ IMPLEMENTATION.md - Files Changed section

✅ "Can I switch versions after creating?"
→ QUICK_REF.md - Common Tasks

---

**Start Reading:** Pick one guide based on what you need to understand!
