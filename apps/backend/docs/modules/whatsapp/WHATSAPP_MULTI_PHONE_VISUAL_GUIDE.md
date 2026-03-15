# WhatsApp Multi-Phone Number System - Visual Architecture

## 🎨 System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     WHATSAPP MULTI-PHONE SYSTEM                  │
│                                                                   │
│  Database-driven, purpose-based phone number routing for         │
│  multi-tenant WhatsApp messaging                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Data Model

```
┌────────────────────────────────────────────────────────┐
│ WhatsAppPhoneNumber                                     │
├────────────────────────────────────────────────────────┤
│ id              : UUID                                  │
│ tenantId        : String (FK → Tenant)                  │
│ phoneNumber     : String (E.164: +1234567890)           │
│ phoneNumberId   : String (Meta ID)                      │
│ wabaId          : String (WABA ID)                      │
│ purpose         : REMINDER|BILLING|MARKETING|DEFAULT    │
│ qualityRating   : String? (HIGH|MEDIUM|LOW)             │
│ isDefault       : Boolean (fallback flag)               │
│ isActive        : Boolean (enabled/disabled)            │
│ createdAt       : DateTime                              │
│ updatedAt       : DateTime                              │
│                                                          │
│ @@unique([tenantId, phoneNumberId])                     │
│ @@index([tenantId, isActive])                           │
│ @@index([tenantId, purpose])                            │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 Message Flow Diagram

```
┌──────────────────┐
│  Message Request │  Example: Payment reminder for Member #123
└────────┬─────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 1. WhatsApp Sender              │
│    - Feature: PAYMENT_DUE       │
│    - TenantId: tenant-abc       │
│    - Phone: +1234567890         │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 2. Map Feature → Purpose        │
│    PAYMENT_DUE → BILLING        │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 3. Check WhatsApp Enabled?      │
│    WhatsAppSetting.enabled = ?  │
└────────┬────────────────────────┘
         │
         ├─── NO ──→ ❌ Block send, log BLOCKED
         │
         YES
         │
         ▼
┌─────────────────────────────────────────────┐
│ 4. Resolve Phone Number                     │
│    Query: tenantId=tenant-abc               │
│           purpose=BILLING                   │
│           isActive=true                     │
└────────┬────────────────────────────────────┘
         │
         ├─── FOUND ──→ ✅ Use this phone
         │
         NOT FOUND
         │
         ▼
┌─────────────────────────────────────────────┐
│ 5. Fallback to Default                      │
│    Query: tenantId=tenant-abc               │
│           isDefault=true                    │
│           isActive=true                     │
└────────┬────────────────────────────────────┘
         │
         ├─── FOUND ──→ ✅ Use default phone
         │
         NOT FOUND
         │
         ▼
❌ Block send, log "No active phone number found"
         │
         │
         ▼
┌─────────────────────────────────┐
│ 6. Validate Phone Active?       │
│    phoneConfig.isActive = true  │
└────────┬────────────────────────┘
         │
         ├─── NO ──→ ❌ Block send, log BLOCKED
         │
         YES
         │
         ▼
┌─────────────────────────────────┐
│ 7. Send via Meta API            │
│    URL: /v22.0/{phoneNumberId}  │
│    Payload: Template message    │
└────────┬────────────────────────┘
         │
         ▼
┌─────────────────────────────────┐
│ 8. Log Result                   │
│    Status: SENT or FAILED       │
└─────────────────────────────────┘
```

---

## 🏗️ Architecture Layers

```
┌───────────────────────────────────────────────────────────────┐
│                         FRONTEND LAYER                         │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────┐  ┌──────────────────────────┐  │
│  │  Phone Numbers Page      │  │  Settings Page           │  │
│  │  /phone-numbers          │  │  /settings               │  │
│  │                          │  │                          │  │
│  │  - Table view            │  │  - Link to phone mgmt    │  │
│  │  - Add phone dialog      │  │  - Enable/disable toggle │  │
│  │  - Enable/disable        │  │  - Test message feature  │  │
│  │  - Set default           │  │                          │  │
│  │  - Delete                │  │                          │  │
│  │  - Tenant selector       │  │                          │  │
│  └──────────────────────────┘  └──────────────────────────┘  │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP REST API
                              │
┌───────────────────────────────────────────────────────────────┐
│                          API LAYER                             │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  WhatsAppPhoneNumbersController                                │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ GET    /api/whatsapp/phone-numbers/:tenantId  (List)    │  │
│  │ POST   /api/whatsapp/phone-numbers/:tenantId  (Create)  │  │
│  │ PATCH  /api/whatsapp/phone-numbers/:id        (Update)  │  │
│  │ DELETE /api/whatsapp/phone-numbers/:id        (Delete)  │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              │ Dependency Injection             │
│                              ▼                                  │
└───────────────────────────────────────────────────────────────┘
                              │
┌───────────────────────────────────────────────────────────────┐
│                        SERVICE LAYER                           │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  WhatsAppPhoneNumbersService                                   │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ getPhoneNumberForPurpose(tenantId, purpose)             │  │
│  │   → Smart resolution with fallback                      │  │
│  │                                                           │  │
│  │ listPhoneNumbers(tenantId)                              │  │
│  │   → List all phones ordered by default first           │  │
│  │                                                           │  │
│  │ createPhoneNumber(data)                                 │  │
│  │   → Create with auto-default management                 │  │
│  │                                                           │  │
│  │ updatePhoneNumber(id, data)                             │  │
│  │   → Update with default switching                       │  │
│  │                                                           │  │
│  │ deletePhoneNumber(id)                                   │  │
│  │   → Validate before deletion                            │  │
│  │                                                           │  │
│  │ ensureDefaultExists(tenantId)                           │  │
│  │   → Safety check                                        │  │
│  └─────────────────────────────────────────────────────────┘  │
│                              │                                  │
│                              │ Prisma ORM                       │
│                              ▼                                  │
└───────────────────────────────────────────────────────────────┘
                              │
┌───────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                           │
├───────────────────────────────────────────────────────────────┤
│                                                                 │
│  PostgreSQL (Supabase)                                         │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │ WhatsAppPhoneNumber Table                               │  │
│  │                                                           │  │
│  │ Constraints:                                             │  │
│  │   - Unique: (tenantId, phoneNumberId)                   │  │
│  │   - Index: (tenantId, isActive)                         │  │
│  │   - Index: (tenantId, purpose)                          │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
└───────────────────────────────────────────────────────────────┘
```

---

## 🔀 Purpose Resolution Flow

```
┌─────────────────────────────────────────────────────────────┐
│                  FEATURE → PURPOSE MAPPING                   │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  WELCOME      ───────────────────► DEFAULT                  │
│                                                               │
│  PAYMENT_DUE  ───────────────────► BILLING                  │
│                                                               │
│  EXPIRY       ───────────────────► REMINDER                 │
│                                                               │
│  REMINDER     ───────────────────► REMINDER                 │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              PHONE NUMBER RESOLUTION ALGORITHM               │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Step 1: Try Purpose-Specific Phone                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SELECT * FROM WhatsAppPhoneNumber                   │   │
│  │  WHERE tenantId = ?                                  │   │
│  │    AND purpose = ?  ◄─── e.g., 'BILLING'            │   │
│  │    AND isActive = true                               │   │
│  │  LIMIT 1                                             │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                   │
│           ├─── FOUND ──────────────────► ✅ Use this phone   │
│           │                                                   │
│           NOT FOUND                                           │
│           │                                                   │
│           ▼                                                   │
│  Step 2: Fallback to Default Phone                           │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  SELECT * FROM WhatsAppPhoneNumber                   │   │
│  │  WHERE tenantId = ?                                  │   │
│  │    AND isDefault = true  ◄─── Fallback flag         │   │
│  │    AND isActive = true                               │   │
│  │  LIMIT 1                                             │   │
│  └──────────────────────────────────────────────────────┘   │
│           │                                                   │
│           ├─── FOUND ──────────────────► ✅ Use default      │
│           │                                                   │
│           NOT FOUND                                           │
│           │                                                   │
│           ▼                                                   │
│  ❌ Throw NotFoundException                                  │
│     "No active phone number found for tenant"                │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Example: Multi-Phone Setup

```
┌────────────────────────────────────────────────────────────┐
│ Tenant: Gold's Gym (tenant-abc)                            │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Phone #1: Main Business Line                               │
├────────────────────────────────────────────────────────────┤
│ Number:       +1-555-1000                                  │
│ Purpose:      DEFAULT                                      │
│ Default:      ✅ Yes (fallback for all)                    │
│ Active:       ✅ Yes                                        │
│ Quality:      HIGH                                         │
│ Use Cases:    Welcome messages, misc notifications        │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Phone #2: Billing Department                               │
├────────────────────────────────────────────────────────────┤
│ Number:       +1-555-2000                                  │
│ Purpose:      BILLING                                      │
│ Default:      ❌ No                                         │
│ Active:       ✅ Yes                                        │
│ Quality:      HIGH                                         │
│ Use Cases:    Payment reminders, invoice notifications    │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Phone #3: Marketing Team                                   │
├────────────────────────────────────────────────────────────┤
│ Number:       +1-555-3000                                  │
│ Purpose:      MARKETING                                    │
│ Default:      ❌ No                                         │
│ Active:       ✅ Yes                                        │
│ Quality:      MEDIUM                                       │
│ Use Cases:    Promotions, campaigns, newsletters          │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Phone #4: Customer Support (Currently Disabled)            │
├────────────────────────────────────────────────────────────┤
│ Number:       +1-555-4000                                  │
│ Purpose:      REMINDER                                     │
│ Default:      ❌ No                                         │
│ Active:       ❌ No (temporarily disabled)                 │
│ Quality:      LOW (being investigated)                     │
│ Use Cases:    (Would be for: membership expiry reminders) │
└────────────────────────────────────────────────────────────┘
```

### Message Routing for This Setup:

```
┌──────────────────────────────────────────────────────────────┐
│ Message Type           │ Purpose    │ Resolved Phone         │
├──────────────────────────────────────────────────────────────┤
│ Welcome message        │ DEFAULT    │ +1-555-1000 (default)  │
│ Payment reminder       │ BILLING    │ +1-555-2000 (billing)  │
│ Membership expiry      │ REMINDER   │ +1-555-1000 (fallback) │
│ Promotion campaign     │ MARKETING  │ +1-555-3000 (marketing)│
└──────────────────────────────────────────────────────────────┘

Note: REMINDER messages fall back to DEFAULT (+1-555-1000) because
      the REMINDER phone (+1-555-4000) is inactive.
```

---

## 🔒 Security Model

```
┌────────────────────────────────────────────────────────────┐
│                   SECURITY LAYERS                           │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Layer 1: Authentication                                     │
├────────────────────────────────────────────────────────────┤
│  JWT Token Required on All Endpoints                       │
│  ✅ Bearer token in Authorization header                   │
│  ✅ Validated via JwtAuthGuard                             │
└────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────┐
│ Layer 2: Authorization                                      │
├────────────────────────────────────────────────────────────┤
│  Tenant-Scoped Access Control                              │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Admin Users (tenantId = null)                        │ │
│  │   ✅ Can manage ALL tenants                          │ │
│  │   ✅ Can view/edit any phone number                  │ │
│  └──────────────────────────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Tenant Owners/Staff (tenantId = abc)                 │ │
│  │   ✅ Can manage ONLY their tenant                    │ │
│  │   ❌ Cannot access other tenants                     │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────┐
│ Layer 3: Data Integrity                                     │
├────────────────────────────────────────────────────────────┤
│  Database Constraints                                       │
│  ✅ Unique: (tenantId, phoneNumberId) - No duplicates      │
│  ✅ Cannot delete last phone number                        │
│  ✅ Only one default per tenant                            │
│  ✅ Auto-promotes new default on deletion                  │
└────────────────────────────────────────────────────────────┘
                    │
                    ▼
┌────────────────────────────────────────────────────────────┐
│ Layer 4: Validation                                         │
├────────────────────────────────────────────────────────────┤
│  Runtime Checks Before Sending                             │
│  ✅ WhatsApp enabled for tenant?                           │
│  ✅ Phone number active?                                   │
│  ✅ Subscription plan allows feature?                      │
│  ✅ Within member limits?                                  │
└────────────────────────────────────────────────────────────┘
```

---

## 📊 UI Components

```
┌────────────────────────────────────────────────────────────┐
│          PHONE NUMBERS MANAGEMENT PAGE                      │
│          /phone-numbers                                     │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Header                                                      │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ WhatsApp Phone Numbers                                 │ │
│ │ Manage multiple WhatsApp business phone numbers...     │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Tenant Selector (Admin Only)                               │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Select Tenant:  [Gold's Gym (GYM)          ▼]         │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Warning Banner (if no default)                             │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ ⚠️ No default phone number set. Please set one to      │ │
│ │    ensure messaging works correctly.                   │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Phone Numbers Table           [+ Add Phone Number]         │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Phone Row #1                                           │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ +1-555-1000  [Default] [DEFAULT] [Quality: HIGH]  │ │ │
│ │ │ Phone Number ID: 123456789                         │ │ │
│ │ │ WABA ID: waba_123                                  │ │ │
│ │ │                          [✓ Active] [🗑️ Delete]    │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ │                                                         │ │
│ │ Phone Row #2                                           │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ +1-555-2000  [BILLING] [Quality: HIGH]             │ │ │
│ │ │ Phone Number ID: 987654321                         │ │ │
│ │ │ WABA ID: waba_123                                  │ │ │
│ │ │          [✓ Active] [Set as Default] [🗑️ Delete]  │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ Add Phone Number Dialog                                    │
│ ┌────────────────────────────────────────────────────────┐ │
│ │ Add WhatsApp Phone Number                              │ │
│ │ Enter the details from your Meta WhatsApp Business...  │ │
│ │                                                         │ │
│ │ Phone Number (E.164 format)                            │ │
│ │ [+1234567890                          ]                │ │
│ │                                                         │ │
│ │ Phone Number ID (from Meta)                            │ │
│ │ [123456789012345                      ]                │ │
│ │                                                         │ │
│ │ WhatsApp Business Account ID                           │ │
│ │ [123456789012345                      ]                │ │
│ │                                                         │ │
│ │ Purpose                                                │ │
│ │ [Default                              ▼]               │ │
│ │                                                         │ │
│ │ ☐ Set as default phone number                         │ │
│ │                                                         │ │
│ │                            [Cancel] [Add Phone Number] │ │
│ └────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

---

**Generated:** January 29, 2025  
**System Status:** ✅ Production Ready
