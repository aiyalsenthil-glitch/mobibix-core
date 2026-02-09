# Template Versioning - Quick Reference

## The Question You Had

> "i add template (with variables), i link to template key? or template key → edit existing template with new variables new template name? create template what the use? what i need is from meta i update templates or create templates like v1, v2, v3..."

## The Answer (SOLVED ✅)

You can now create **multiple versions** of the same template!

```
WELCOME (Template Key = Purpose)
  ├─ welcome_v1 (Meta Template Name = Actual template in Meta WhatsApp)
  ├─ welcome_v2 (with different variables)
  └─ welcome_v3 (with different variables again)

PAYMENT_DUE (Template Key = Purpose)
  ├─ payment_due_v1
  └─ payment_due_v2
```

## 3-Step Workflow

### Step 1: Create in Meta WhatsApp

```
Go to Meta WhatsApp > Templates > Create
  Name: welcome_v1
  Variables: {{1}} memberName, {{2}} startDate
  Save
```

### Step 2: Register in App

```
App > Templates > Create Version
  Module Type: GYM
  Template Key: WELCOME (what it's for)
  Meta Template Name: welcome_v1 (from Meta)
  Variables: Select memberName, startDate
  Create
```

### Step 3: Create More Versions (Optional)

```
Meta WhatsApp:
  Name: welcome_v2
  Variables: {{1}} memberName, {{2}} phone, {{3}} planName
  Save

App:
  Template Key: WELCOME (SAME)
  Meta Template Name: welcome_v2 (DIFFERENT)
  Variables: Select memberName, phone, planName
  Create
```

## Key Differences

|                    | Template Key        | Meta Template Name     |
| ------------------ | ------------------- | ---------------------- |
| **What is it?**    | Purpose             | Version                |
| **Example**        | WELCOME             | welcome_v1             |
| **Can repeat?**    | ✅ Yes (v1, v2, v3) | ❌ No (must be unique) |
| **Where defined?** | In this app         | In Meta WhatsApp       |
| **Can change?**    | ❌ No               | ❌ No                  |
| **What for?**      | Identify template   | Identify which version |

## Common Tasks

### Create new version with different variables

```
1. Create new template in Meta WhatsApp (name: welcome_v2)
2. Add in App with same Template Key, different Meta Template Name
3. Select different variables
4. Done! Both versions now available
```

### Switch between versions

```
1. When sending message, use whichever version you want
2. When creating automation, it uses the default version
3. To change default: Edit v1 set default=false, Edit v2 set default=true
```

### See all versions of a template

```
In Templates list, look for rows with same Template Key:
  WELCOME
  ├─ welcome_v1
  ├─ welcome_v2
  └─ welcome_v3
```

## What Changed

### Database

```
Before: ❌ Could only have 1 version per Template Key
After:  ✅ Can have unlimited versions per Template Key
```

### Frontend

```
Before: Confusing (Template Key looked like it was the name)
After:  Clear (Template Key = purpose, Meta Name = version)
```

### How Automations Work

```
Automation: Send WELCOME (references Template Key, not specific version)
Uses: Whatever WELCOME version has isDefault=true
Switch versions: Change isDefault, automation automatically uses new version
```

## Real-World Example

**Scenario:** You keep updating welcome message, want to A/B test variables

```
Version 1 (Current):
  welcome_v1 → ${memberName}, ${startDate}

Version 2 (New):
  welcome_v2 → ${memberName}, ${phone}, ${planName}

Version 3 (Another try):
  welcome_v3 → ${memberName}, ${email}, ${plan}, ${price}

All 3 are in the system. Switch between them:
  Set v2 as default → start using v2
  Set v3 as default → switch to v3
  Set v1 as default → revert to original

Automations always use whichever is default!
```

## FAQ

**Q: Why two names?**
A: Template Key identifies WHAT (WELCOME), Meta Name identifies WHICH version (v1, v2, v3)

**Q: Can I change variables after creating?**
A: No. Create new version with different variables, then switch.

**Q: Do automations need updating?**
A: No. They reference Template Key (WELCOME). They use default version automatically.

**Q: Can I delete old versions?**
A: Yes, but keep the default one. You can disable it instead of delete.

**Q: How many versions can I have?**
A: Unlimited. Create as many as you need.

## Before vs After

### BEFORE (Confusing)

```
Create Template:
  - Template Key: ??? (Is this the name? The version?)
  - Couldn't have multiple versions
  - Confused about what goes in Meta vs App
```

### AFTER (Clear)

```
Create Template Version:
  - Template Key: WELCOME (This is what it's for)
  - Meta Template Name: welcome_v1 (This is in Meta WhatsApp)
  - Variables: (Based on what's in Meta template)
  - Can create v1, v2, v3 easily
  - Clear workflow
```

## Test It

1. Go to app > Templates
2. Click "Create Version"
3. Select Module: GYM
4. Template Key: WELCOME
5. Meta Template Name: welcome_v1
6. Fill other fields
7. Create
8. Create another with same key, different meta name
9. See both in the list!

---

**More details?** See `TEMPLATE_VERSIONING_GUIDE.md` or `TEMPLATE_VERSIONING_IMPLEMENTATION.md`
