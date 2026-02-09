# WhatsApp Multi-Phone Number System - Complete Implementation

## 🎯 Overview

The WhatsApp Multi-Phone Number System allows tenants to configure **multiple WhatsApp business phone numbers** and use them dynamically based on **message purpose** (reminders, billing, marketing, etc.).

### Key Features

- ✅ **Multiple phones per tenant** - Each tenant can register multiple WhatsApp Business numbers
- ✅ **Purpose-based routing** - Different message types use different phone numbers automatically
- ✅ **Smart fallback** - Falls back to default phone if purpose-specific number not found
- ✅ **Validation & safety** - Ensures tenants always have a default active phone
- ✅ **SaaS-safe** - All configuration stored in database, no hardcoded credentials
- ✅ **Admin UI** - Complete management interface for phone numbers

---

## 📊 Database Schema

### WhatsAppPhoneNumberPurpose Enum

```prisma
enum WhatsAppPhoneNumberPurpose {
  REMINDER  // For membership expiry, attendance reminders
  BILLING   // For payment due, invoice notifications
  MARKETING // For promotions, campaigns
  DEFAULT   // Fallback for all other messages
}
```

### WhatsAppPhoneNumber Model

```prisma
model WhatsAppPhoneNumber {
  id            String                     @id @default(uuid())
  tenantId      String                     // FK to Tenant
  phoneNumber   String                     // E.164 format (e.g., +1234567890)
  phoneNumberId String                     // Meta Phone Number ID
  wabaId        String                     // WhatsApp Business Account ID
  purpose       WhatsAppPhoneNumberPurpose @default(DEFAULT)
  qualityRating String?                    // Meta quality rating (HIGH/MEDIUM/LOW)
  isDefault     Boolean                    @default(false)
  isActive      Boolean                    @default(true)
  createdAt     DateTime                   @default(now())
  updatedAt     DateTime                   @updatedAt

  @@unique([tenantId, phoneNumberId])
  @@index([tenantId, isActive])
  @@index([tenantId, purpose])
}
```

**Migration:** `20260129065306_add_whatsapp_phone_numbers`

---

## 🔄 Phone Number Resolution Flow

### 1. Message Purpose Mapping

```typescript
// WhatsAppSender.mapFeatureToPurpose()
WELCOME      → DEFAULT
PAYMENT_DUE  → BILLING
EXPIRY       → REMINDER
REMINDER     → REMINDER
```

### 2. Resolution Algorithm

```
1. Try to find: tenantId + purpose + isActive=true
   ├─ Found? → Use this phone
   └─ Not found? → Go to step 2

2. Fallback: tenantId + isDefault=true + isActive=true
   ├─ Found? → Use default phone
   └─ Not found? → Block send, log error
```

### 3. Validation Checks

```
✓ WhatsAppSetting.enabled = true?
✓ Phone number exists and isActive?
✓ Subscription plan allows feature?
✓ Member count within limits?
```

---

## 🏗️ Architecture Components

### Backend Service Layer

**File:** `apps/backend/src/modules/whatsapp/phone-numbers/whatsapp-phone-numbers.service.ts`

#### Key Methods:

```typescript
// Smart resolution with fallback
getPhoneNumberForPurpose(tenantId: string, purpose: WhatsAppPhoneNumberPurpose)

// CRUD operations
listPhoneNumbers(tenantId: string)
createPhoneNumber(data: CreatePhoneNumberDto)
updatePhoneNumber(id: string, data: UpdatePhoneNumberDto)
deletePhoneNumber(id: string)

// Safety check
ensureDefaultExists(tenantId: string): Promise<boolean>
```

#### Business Rules:

- ✅ Only **one** `isDefault=true` per tenant (auto-unsets others when setting new default)
- ✅ Cannot delete last phone number (must have at least one)
- ✅ When deleting default phone, automatically promotes another to default
- ✅ Purpose-specific lookup with automatic fallback to default

---

### Backend API Layer

**File:** `apps/backend/src/modules/whatsapp/phone-numbers/whatsapp-phone-numbers.controller.ts`

#### Endpoints:

```http
GET    /api/whatsapp/phone-numbers/:tenantId  # List all phones for tenant
POST   /api/whatsapp/phone-numbers/:tenantId  # Create new phone
PATCH  /api/whatsapp/phone-numbers/:id        # Update phone settings
DELETE /api/whatsapp/phone-numbers/:id        # Delete phone
```

#### Security:

- ✅ JWT authentication required
- ✅ Tenant-scoped access control (admin or tenant owner only)
- ✅ Validation of tenant ownership before operations

---

### WhatsApp Sender Integration

**File:** `apps/backend/src/modules/whatsapp/whatsapp.sender.ts`

#### Changes Made:

```diff
- private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
+ // Removed hardcoded phone number

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: WhatsAppLogger,
+   private readonly phoneNumbersService: WhatsAppPhoneNumbersService,
  ) {}

  async sendTemplateMessage(...) {
+   // 1. Check if WhatsApp enabled
+   const setting = await this.prisma.whatsAppSetting.findUnique({ ... });
+   if (!setting?.enabled) return { skipped: true };
+
+   // 2. Resolve phone number dynamically
+   const purpose = this.mapFeatureToPurpose(feature);
+   const phoneConfig = await this.phoneNumbersService.getPhoneNumberForPurpose(tenantId, purpose);
+
+   // 3. Validate active
+   if (!phoneConfig.isActive) return { skipped: true };

-   const url = `.../${this.phoneNumberId}/messages`;
+   const url = `.../${phoneConfig.phoneNumberId}/messages`;
  }
```

---

### Frontend Admin UI

**File:** `apps/whatsapp-master/app/phone-numbers/page.tsx`

#### Features:

- ✅ **Table view** - Lists all phones with purpose, status, quality rating
- ✅ **Add phone dialog** - Input phone number, Meta IDs, purpose, default flag
- ✅ **Enable/disable toggle** - Activate or deactivate phones per row
- ✅ **Set as default** - Change which phone is default
- ✅ **Delete with validation** - Prevents deleting only phone
- ✅ **Tenant selector** - Admin users can manage any tenant's phones
- ✅ **Warning banner** - Shows alert if no default phone exists
- ✅ **Quality badges** - Visual indicators for Meta quality ratings

#### Color Coding:

```
Purpose Badges:
- REMINDER  → Blue
- BILLING   → Green
- MARKETING → Purple
- DEFAULT   → Gray

Quality Badges:
- HIGH   → Green
- MEDIUM → Yellow
- LOW    → Red
```

---

## 🚀 Migration Guide

### Step 1: Apply Database Migration

```bash
cd apps/backend
npx prisma migrate dev --name add_whatsapp_phone_numbers
npx prisma generate
```

### Step 2: Seed Existing Tenants (Optional)

```bash
# Edit prisma/seed-phone-numbers.ts with your Meta credentials
npx ts-node prisma/seed-phone-numbers.ts
```

### Step 3: Update Environment Variables

```bash
# .env - Comment out deprecated variables
# WHATSAPP_PHONE_NUMBER_ID=123456789  # ❌ DEPRECATED - now in DB
WHATSAPP_ACCESS_TOKEN=your_token_here  # ✅ Keep - platform secret
```

### Step 4: Configure Phone Numbers via UI

1. Navigate to **http://localhost_REPLACED:3002/phone-numbers**
2. Select tenant (if admin)
3. Click **"Add Phone Number"**
4. Fill in details from Meta Business Manager:
   - Phone Number: `+1234567890` (E.164 format)
   - Phone Number ID: From Meta dashboard
   - WABA ID: WhatsApp Business Account ID
   - Purpose: Select appropriate purpose
   - Is Default: Check if this should be fallback
5. Click **"Add Phone Number"**

---

## 🔒 Security & Validation

### Tenant Isolation

- All queries scoped by `tenantId`
- Admin users can access all tenants
- Regular users only access their own tenant
- Controller validates tenant ownership before operations

### Data Integrity

- Unique constraint: `(tenantId, phoneNumberId)` - prevents duplicate registrations
- At least one default phone per tenant (enforced by service layer)
- Cannot delete last phone number
- Auto-promotes new default when deleting current default

### Active Phone Checks

```typescript
// Before sending any message:
1. Check WhatsAppSetting.enabled = true
2. Resolve phone number (purpose → default fallback)
3. Check phone.isActive = true
4. If any check fails → log BLOCKED, skip send
```

---

## 📝 Example Usage

### Scenario 1: Send Payment Reminder

```typescript
// Backend automatically resolves to BILLING phone
await whatsappSender.sendTemplateMessage(
  tenantId,
  'PAYMENT_DUE', // ← Maps to BILLING purpose
  '+1234567890',
  'payment_reminder',
  ['John Doe', '$50'],
);

// Resolution:
// 1. Look for tenantId + purpose=BILLING + isActive=true
// 2. If not found, use tenantId + isDefault=true + isActive=true
// 3. Send via Meta API using resolved phoneNumberId
```

### Scenario 2: Configure Multiple Phones

```typescript
// Create BILLING phone
POST /api/whatsapp/phone-numbers/tenant123
{
  "phoneNumber": "+1234567890",
  "phoneNumberId": "meta_id_1",
  "wabaId": "waba_123",
  "purpose": "BILLING",
  "isDefault": false
}

// Create MARKETING phone
POST /api/whatsapp/phone-numbers/tenant123
{
  "phoneNumber": "+0987654321",
  "phoneNumberId": "meta_id_2",
  "wabaId": "waba_123",
  "purpose": "MARKETING",
  "isDefault": false
}

// Create DEFAULT fallback
POST /api/whatsapp/phone-numbers/tenant123
{
  "phoneNumber": "+1122334455",
  "phoneNumberId": "meta_id_3",
  "wabaId": "waba_123",
  "purpose": "DEFAULT",
  "isDefault": true  // ← Fallback for all other messages
}
```

---

## 🐛 Troubleshooting

### Problem: Messages not sending

**Check:**

1. ✅ WhatsAppSetting.enabled = true?
2. ✅ At least one phone number registered?
3. ✅ Default phone exists and isActive = true?
4. ✅ Subscription plan allows WhatsApp feature?

### Problem: "No active phone number found"

**Solution:**

1. Go to `/phone-numbers` page
2. Check if any phone has `isDefault = true` and `isActive = true`
3. If not, create one or enable existing default

### Problem: Wrong phone number being used

**Debug:**

1. Check `WhatsAppLog` table - see which phone was resolved
2. Verify purpose mapping: `mapFeatureToPurpose()`
3. Check if purpose-specific phone exists and is active
4. If not, it will fall back to default

### Problem: Cannot delete phone number

**Reason:**

- Cannot delete last phone (must have at least one)
- System prevents orphaning tenants

**Solution:**

- Add another phone first
- Then delete the unwanted one

---

## 📊 Monitoring & Logs

### WhatsAppLog Entries

```typescript
// Successful send
{
  tenantId: "tenant123",
  phone: "+1234567890",
  type: "PAYMENT_DUE",
  status: "SENT",
  // Resolved phone info logged internally
}

// Blocked send (no active phone)
{
  tenantId: "tenant123",
  phone: "+1234567890",
  type: "REMINDER",
  status: "BLOCKED",
  error: "No active phone number found for purpose REMINDER"
}
```

### Admin Monitoring

- Quality ratings automatically synced from Meta (stored in `qualityRating` field)
- Low quality phones should be investigated
- Consider disabling low-quality phones and switching to alternatives

---

## 🎯 Future Enhancements

### Planned Features:

- [ ] **Auto-sync quality ratings** - Periodic job to fetch from Meta API
- [ ] **Usage analytics** - Track sends per phone number
- [ ] **Cost allocation** - Track messaging costs per purpose/phone
- [ ] **Rate limiting** - Per-phone rate limits from Meta
- [ ] **Webhooks** - Status updates, delivery reports per phone
- [ ] **Multi-region support** - Different phones for different countries

---

## ✅ Checklist: Implementation Complete

- [x] Database schema with enum and model
- [x] Migration applied (`20260129065306_add_whatsapp_phone_numbers`)
- [x] Service layer with business logic
- [x] REST API controller with authentication
- [x] Module registration and dependency injection
- [x] WhatsAppSender integration with dynamic resolution
- [x] Validation rules (enabled check, active check)
- [x] Frontend admin UI (/phone-numbers)
- [x] Settings page link to phone management
- [x] Seed script for existing tenants
- [x] Documentation (this file)

---

## 📚 Related Files

### Backend

- `apps/backend/prisma/schema.prisma` - Database models
- `apps/backend/src/modules/whatsapp/phone-numbers/whatsapp-phone-numbers.service.ts` - Business logic
- `apps/backend/src/modules/whatsapp/phone-numbers/whatsapp-phone-numbers.controller.ts` - API endpoints
- `apps/backend/src/modules/whatsapp/whatsapp.sender.ts` - Message sending with dynamic phone resolution
- `apps/backend/src/modules/whatsapp/whatsapp.module.ts` - Module registration

### Frontend

- `apps/whatsapp-master/app/phone-numbers/page.tsx` - Admin UI for phone management
- `apps/whatsapp-master/app/settings/page.tsx` - Link to phone management

### Utilities

- `apps/backend/prisma/seed-phone-numbers.ts` - Migration helper script

---

## 🤝 Support

For issues or questions:

1. Check troubleshooting section above
2. Review `WhatsAppLog` entries for error details
3. Verify Meta WhatsApp Business credentials
4. Ensure phone numbers are in E.164 format (+countrycode + number)

---

**Last Updated:** January 29, 2025  
**Migration ID:** `20260129065306_add_whatsapp_phone_numbers`
