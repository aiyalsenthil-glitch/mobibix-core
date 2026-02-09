# WhatsApp Multi-Phone Numbers - Quick Reference

## 🎯 What Changed?

WhatsApp phone numbers are now **stored in the database** per tenant with **purpose-based routing**. No more hardcoded `WHATSAPP_PHONE_NUMBER_ID` in environment variables.

---

## 📊 Database

### New Table: `WhatsAppPhoneNumber`

```
- id (UUID)
- tenantId (FK to Tenant)
- phoneNumber (E.164 format: +1234567890)
- phoneNumberId (Meta Phone Number ID)
- wabaId (WhatsApp Business Account ID)
- purpose (REMINDER | BILLING | MARKETING | DEFAULT)
- qualityRating (HIGH | MEDIUM | LOW)
- isDefault (boolean) - fallback phone
- isActive (boolean) - enabled/disabled
```

### Key Constraint

- One `isDefault=true` per tenant (auto-managed)
- Cannot delete last phone number

---

## 🔄 How It Works

### 1. Message Type → Purpose Mapping

```
WELCOME message      → DEFAULT phone
PAYMENT_DUE message  → BILLING phone
EXPIRY message       → REMINDER phone
REMINDER message     → REMINDER phone
```

### 2. Phone Resolution

```
Try: Find active phone for specific purpose
  ↓ (if not found)
Fallback: Use default phone
  ↓ (if not found)
Block: Don't send, log error
```

### 3. Validation

```
✓ WhatsApp enabled for tenant?
✓ Active phone number exists?
✓ Subscription allows feature?
✓ Within member limits?
```

---

## 🚀 Admin UI

### Access

**URL:** `http://localhost_REPLACED:3002/phone-numbers`

### Features

- ✅ View all phone numbers for tenant
- ✅ Add new phone (phone number, Meta IDs, purpose)
- ✅ Enable/disable phones
- ✅ Set default phone
- ✅ Delete phones (with validation)
- ✅ Tenant selector (admin only)

### Adding a Phone

1. Click **"Add Phone Number"**
2. Enter:
   - **Phone Number:** `+1234567890` (E.164 format)
   - **Phone Number ID:** From Meta Business Manager
   - **WABA ID:** WhatsApp Business Account ID
   - **Purpose:** DEFAULT, REMINDER, BILLING, or MARKETING
   - **Is Default:** Check for fallback phone
3. Click **"Add Phone Number"**

---

## 🔧 API Endpoints

### List Phone Numbers

```http
GET /api/whatsapp/phone-numbers/:tenantId
Authorization: Bearer <JWT>
```

### Create Phone Number

```http
POST /api/whatsapp/phone-numbers/:tenantId
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "phoneNumber": "+1234567890",
  "phoneNumberId": "meta_id_123",
  "wabaId": "waba_123",
  "purpose": "BILLING",
  "isDefault": false
}
```

### Update Phone Number

```http
PATCH /api/whatsapp/phone-numbers/:id
Authorization: Bearer <JWT>
Content-Type: application/json

{
  "isActive": true,
  "isDefault": true,
  "purpose": "REMINDER"
}
```

### Delete Phone Number

```http
DELETE /api/whatsapp/phone-numbers/:id
Authorization: Bearer <JWT>
```

---

## 🛠️ Setup Instructions

### 1. Run Migration (Already Done)

```bash
cd apps/backend
npx prisma migrate dev --name add_whatsapp_phone_numbers
npx prisma generate
```

### 2. Seed Existing Tenants (Optional)

```bash
# Edit seed script with your Meta credentials
nano prisma/seed-phone-numbers.ts

# Run seed
npx ts-node prisma/seed-phone-numbers.ts
```

### 3. Update .env (Optional)

```bash
# Comment out deprecated variable
# WHATSAPP_PHONE_NUMBER_ID=123456789  # ❌ Deprecated
WHATSAPP_ACCESS_TOKEN=your_token      # ✅ Keep
```

### 4. Configure via UI

1. Go to `/phone-numbers`
2. Add at least one phone with `isDefault=true`
3. Add purpose-specific phones as needed

---

## 🐛 Common Issues

### ❌ "No active phone number found"

**Fix:** Add a default phone via `/phone-numbers` UI

### ❌ Messages going to wrong phone

**Debug:**

1. Check `WhatsAppLog` table for resolved phone
2. Verify purpose mapping in code
3. Ensure purpose-specific phone is active

### ❌ Cannot delete phone

**Reason:** Can't delete last/only phone
**Fix:** Add another phone first

---

## ✅ Quick Checklist

- [ ] Migration applied
- [ ] At least one default phone per tenant
- [ ] Environment variable cleaned (commented out `WHATSAPP_PHONE_NUMBER_ID`)
- [ ] Admin UI accessible at `/phone-numbers`
- [ ] Test sending with different purposes
- [ ] Monitor `WhatsAppLog` for resolution issues

---

## 📝 Example Setup

### Tenant: "Gold's Gym"

```
Phone 1:
- Number: +1-555-1000 (Main business line)
- Purpose: DEFAULT
- Default: ✅ Yes
- Active: ✅ Yes

Phone 2:
- Number: +1-555-2000 (Billing department)
- Purpose: BILLING
- Default: ❌ No
- Active: ✅ Yes

Phone 3:
- Number: +1-555-3000 (Marketing)
- Purpose: MARKETING
- Default: ❌ No
- Active: ✅ Yes
```

**Result:**

- Payment reminders → Use +1-555-2000 (BILLING)
- Membership expiry → Use +1-555-1000 (DEFAULT, falls back from REMINDER)
- Welcome messages → Use +1-555-1000 (DEFAULT)
- If +1-555-2000 disabled → Falls back to +1-555-1000

---

**Related Files:**

- Full docs: `WHATSAPP_MULTI_PHONE_IMPLEMENTATION.md`
- Seed script: `prisma/seed-phone-numbers.ts`
- Admin UI: `apps/whatsapp-master/app/phone-numbers/page.tsx`
