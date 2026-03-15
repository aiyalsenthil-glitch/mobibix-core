# Template Versioning - Visual Guide

## The Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    META WHATSAPP (External)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ welcome_v1   │  │ welcome_v2   │  │ welcome_v3   │            │
│  │ Variables:   │  │ Variables:   │  │ Variables:   │            │
│  │ ${name}      │  │ ${name}      │  │ ${name}      │            │
│  │ ${startDate} │  │ ${phone}     │  │ ${email}     │            │
│  │              │  │ ${plan}      │  │ ${gym}       │            │
│  └──────────────┘  └──────────────┘  └──────────────┘            │
└─────────────────────────────────────────────────────────────────┘
         ↓ Register              ↓ Register              ↓ Register
┌─────────────────────────────────────────────────────────────────┐
│              YOUR APP DATABASE (WhatsAppTemplate)                │
├─────────────────────────────────────────────────────────────────┤
│ Template Key: WELCOME (IMMUTABLE - identifies purpose)            │
├──────────────────┬──────────────────┬──────────────────┐         │
│  welcome_v1      │  welcome_v2      │  welcome_v3      │         │
│  (v1)            │  (v2)            │  (v3)            │         │
├──────────────────┼──────────────────┼──────────────────┤         │
│ Meta Name:       │ Meta Name:       │ Meta Name:       │         │
│ welcome_v1       │ welcome_v2       │ welcome_v3       │         │
│                  │                  │                  │         │
│ Variables:       │ Variables:       │ Variables:       │         │
│ name, startDate  │ name, phone,     │ name, email,     │         │
│                  │ plan             │ gym              │         │
│                  │                  │                  │         │
│ Status: ACTIVE   │ Status: ACTIVE   │ Status: ACTIVE   │         │
│ IsDefault: true  │ IsDefault: false │ IsDefault: false │         │
└──────────────────┴──────────────────┴──────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
         ↓ Use (default version only)
┌─────────────────────────────────────────────────────────────────┐
│              AUTOMATIONS / MESSAGE SENDING                       │
│  Automation: Send WELCOME template when member joins             │
│  → Uses: WELCOME (the key)                                       │
│  → Resolves to: welcome_v1 (because isDefault=true)             │
│  → Sends: Using welcome_v1 variables                            │
└─────────────────────────────────────────────────────────────────┘
```

## Step-by-Step Flow

### Creating Version 1

```
STEP 1: Meta WhatsApp
┌─────────────────────────────────────┐
│ Create Template                     │
│ Name: welcome_v1                    │
│ Text: Hello {{1}}, your {{2}} is... │
│       {{1}} = memberName            │
│       {{2}} = startDate             │
│ Save                                │
└─────────────────────────────────────┘
           ↓
STEP 2: App
┌─────────────────────────────────────┐
│ Templates > Create Version           │
│ Template Key: WELCOME               │
│ Meta Template Name: welcome_v1      │
│ Variables: [✓] memberName           │
│            [✓] startDate            │
│ Status: ACTIVE                      │
│ Click: Create                       │
└─────────────────────────────────────┘
           ↓
STEP 3: Database
┌─────────────────────────────────────┐
│ WhatsAppTemplate {                  │
│   templateKey: "WELCOME",           │
│   metaTemplateName: "welcome_v1",   │
│   variables: ["memberName",         │
│              "startDate"],          │
│   isDefault: true                   │
│ }                                   │
└─────────────────────────────────────┘
```

### Creating Version 2

```
STEP 1: Meta WhatsApp
┌─────────────────────────────────────┐
│ Create Template                     │
│ Name: welcome_v2                    │
│ Text: Hi {{1}}, call {{2}} for      │
│       your {{3}} plan               │
│       {{1}} = memberName            │
│       {{2}} = phone                 │
│       {{3}} = planName              │
│ Save                                │
└─────────────────────────────────────┘
           ↓
STEP 2: App
┌─────────────────────────────────────┐
│ Templates > Create Version           │
│ Template Key: WELCOME    ← SAME KEY! │
│ Meta Template Name: welcome_v2      │
│ Variables: [✓] memberName           │
│            [✓] phone                │
│            [✓] planName             │
│ Status: ACTIVE                      │
│ Click: Create                       │
└─────────────────────────────────────┘
           ↓
STEP 3: Database
┌─────────────────────────────────────┐
│ WhatsAppTemplate {                  │
│   templateKey: "WELCOME",           │
│   metaTemplateName: "welcome_v2",   │
│   variables: ["memberName",         │
│              "phone",               │
│              "planName"],           │
│   isDefault: false                  │
│ }                                   │
│                                     │
│ Now have 2 versions:                │
│ v1 (isDefault: true)                │
│ v2 (isDefault: false)               │
└─────────────────────────────────────┘
```

### Switching to Version 2

```
STEP 1: Edit v1
┌─────────────────────────────────────┐
│ Edit Version: welcome_v1            │
│ isDefault: [✗] (uncheck)            │
│ Save                                │
└─────────────────────────────────────┘
           ↓
STEP 2: Edit v2
┌─────────────────────────────────────┐
│ Edit Version: welcome_v2            │
│ isDefault: [✓] (check)              │
│ Save                                │
└─────────────────────────────────────┘
           ↓
STEP 3: Automation Now Uses v2
┌─────────────────────────────────────┐
│ Automation: Send WELCOME             │
│ Resolves to: welcome_v2              │
│ (because isDefault is now v2)        │
│                                     │
│ Member joins                        │
│ → Send welcome_v2 message           │
│ → Use v2 variables                  │
│ → Result: "Hi [name], call          │
│   [phone] for your [plan] plan"     │
└─────────────────────────────────────┘
```

## Templates List View

```
┌────────────────────────────────────────────────────────────────┐
│ WhatsApp Templates                                              │
│ Manage message templates for WhatsApp                          │
│                                                                │
│ ℹ️  Template Versioning                                        │
│ • Template Key: The purpose (WELCOME, PAYMENT_DUE)            │
│ • Meta Template Name: The version (welcome_v1, welcome_v2)    │
│ • Workflow: Create in Meta, register in app                   │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ TEMPLATE NAME │ VERSION          │ FEATURE      │ STATUS    │ ACTION  │
├─────────────────────────────────────────────────────────────────────┤
│ WELCOME       │ welcome_v1       │ WELCOME      │ ACTIVE    │ Edit    │
│ WELCOME       │ welcome_v2       │ WELCOME      │ ACTIVE    │ Edit    │
│ WELCOME       │ welcome_v3       │ WELCOME      │ DISABLED  │ Edit    │
├─────────────────────────────────────────────────────────────────────┤
│ PAYMENT_DUE   │ payment_due_v1   │ PAYMENT_DUE  │ ACTIVE    │ Edit    │
├─────────────────────────────────────────────────────────────────────┤
│ EXPIRY        │ expiry_remind_v1 │ EXPIRY       │ ACTIVE    │ Edit    │
│ EXPIRY        │ expiry_remind_v2 │ EXPIRY       │ ACTIVE    │ Edit    │
└─────────────────────────────────────────────────────────────────────┘

Note: Multiple rows with same TEMPLATE NAME = Multiple versions
```

## Database Relationships

```
Automation Points To:
│
└──→ Template Key: "WELCOME"
     │
     ├──→ welcome_v1 (isDefault: true)  ← USES THIS
     │     - memberName, startDate
     │
     ├──→ welcome_v2 (isDefault: false)
     │     - memberName, phone, planName
     │
     └──→ welcome_v3 (isDefault: false)
           - memberName, email, gym

When sending message:
Automation "Send WELCOME"
  → Query: WHERE templateKey='WELCOME' AND isDefault=true
  → Result: welcome_v1
  → Send: "Hello [memberName], your [startDate] membership started!"
```

## Query Examples

```sql
-- Find all versions of WELCOME
SELECT templateKey, metaTemplateName, isDefault, status
FROM WhatsAppTemplate
WHERE templateKey = 'WELCOME'
ORDER BY createdAt DESC;

Result:
┌─────────────┬──────────────────┬──────────┬────────┐
│ templateKey │ metaTemplateName │ isDefault│ status │
├─────────────┼──────────────────┼──────────┼────────┤
│ WELCOME     │ welcome_v1       │ true     │ ACTIVE │
│ WELCOME     │ welcome_v2       │ false    │ ACTIVE │
│ WELCOME     │ welcome_v3       │ false    │ DISABLE│
└─────────────┴──────────────────┴──────────┴────────┘

-- Get the default version for automation
SELECT * FROM WhatsAppTemplate
WHERE templateKey = 'WELCOME' AND isDefault = true;

Result: welcome_v1 record

-- Find by Meta template name (for webhook matching)
SELECT * FROM WhatsAppTemplate
WHERE metaTemplateName = 'welcome_v2';

Result: v2 record
```

## Key Insight

```
    Template Key (IMMUTABLE)
            ↓
         WELCOME ← This is the PURPOSE
            ↓
    ┌───────┴──────────┐
    ↓                  ↓
welcome_v1          welcome_v2 ← These are VERSIONS
(variables:         (variables:
memberName,         memberName,
startDate)          phone,
                    planName)

Automation sends WELCOME
  → Looks up which version is default
  → Uses that version's variables
  → Sends message with correct data
```

## User Experience Flow

```
User's Mental Model:
"I have a WELCOME message"
"I created v1 with these variables"
"Now I want to try v2 with different variables"
"Both should be called WELCOME (same purpose)"
"But have different names (welcome_v1, welcome_v2)"
"Switch between them for testing"

What Happens:
1. v1 created (isDefault=true) → Automation uses v1
2. v2 created (isDefault=false) → Automation still uses v1
3. Change v2 isDefault=true, v1 isDefault=false → Automation now uses v2
4. Change v1 isDefault=true, v2 isDefault=false → Automation back to v1
5. Revert to v3? Change v3 isDefault=true → Automation uses v3

No automation changes needed!
```

---

**See Also:**

- `TEMPLATE_VERSIONING_QUICK_REF.md` - Quick reference
- `TEMPLATE_VERSIONING_GUIDE.md` - Complete guide
- `TEMPLATE_VERSIONING_IMPLEMENTATION.md` - Implementation details
