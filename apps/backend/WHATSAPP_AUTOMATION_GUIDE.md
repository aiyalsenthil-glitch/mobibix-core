# WhatsApp Automation Setup Guide

## 🎯 How to Configure Multiple Automations

### Step 1: Access Automations Page

Navigate to: `http://localhost_REPLACED:3002/automations` (WhatsApp Master app)

### Step 2: Select Module

Choose either:

- **Gym SaaS** - For gym member automations
- **MobileShop** - For sales/service automations

### Step 3: Click "New Automation" Button

Located in top-right corner

### Step 4: Configure Automation

#### For GYM Module - Common Scenarios:

**Scenario 1: New Member Welcome**

- Trigger Type: `New member welcome` (AFTER_INVOICE)
- Template: `WELCOME`
- Offset Days: `0` (send immediately after invoice)
- Enabled: ✓

**Scenario 2: Payment Reminder (3 days before due)**

- Trigger Type: `Membership / Payment due` (DATE)
- Template: `PAYMENT_DUE`
- Offset Days: `-3` (3 days before paymentDueDate)
- Enabled: ✓

**Scenario 3: Membership Expiry Alert (3 days before)**

- Trigger Type: `Membership / Payment due` (DATE)
- Template: `EXPIRY`
- Offset Days: `-3` (3 days before membershipEndAt)
- Enabled: ✓

**Scenario 4: Membership Expired (on expiry date)**

- Trigger Type: `Membership / Payment due` (DATE)
- Template: `EXPIRY`
- Offset Days: `0` (on membershipEndAt)
- Enabled: ✓

**Scenario 5: Membership Expired (1 day after expiry)**

- Trigger Type: `Membership / Payment due` (DATE)
- Template: `EXPIRY`
- Offset Days: `1` (1 day after membershipEndAt)
- Enabled: ✓

**Scenario 6: Renewal Success**

- Trigger Type: `New member welcome` (AFTER_INVOICE)
- Template: `REMINDER` (or create RENEWAL template)
- Offset Days: `0`
- Enabled: ✓

### Step 5: Click "Create"

---

## 📋 Template Requirements

For automations to work, you need **ACTIVE** templates in the Templates page:

### Required Template Keys (GYM):

- `WELCOME` - New member welcome message
- `PAYMENT_DUE` - Payment due reminder
- `EXPIRY` - Membership expiry alert
- `REMINDER` - General reminder (can be used for renewal)

### How to Create Templates:

1. Go to `/templates` page
2. Click "New Template"
3. Fill in:
   - Module: `GYM`
   - Template Key: `WELCOME` (or other)
   - Meta Template Name: Your WhatsApp template name from Meta
   - Category: `UTILITY` or `MARKETING`
   - Feature: Select appropriate feature
   - Status: `ACTIVE` ✓

---

## 🔍 How Multiple Automations Work

### Backend Logic:

**Cron runs daily at 6 AM:**

1. Reads all **enabled** `WhatsAppAutomation` records
2. For each automation:
   - Finds eligible members based on `triggerType` + `offsetDays`
   - Creates `CustomerReminder` entries (SCHEDULED status)
   - Checks for duplicates (same tenant, member, template, date)
3. Skips if already exists

**Reminder processor runs every 5 minutes:**

1. Finds `CustomerReminder` where `status = SCHEDULED` and `scheduledAt <= now`
2. Sends WhatsApp message via Meta API
3. Updates status to `SENT` or `FAILED`

### Trigger Type Behavior:

| Trigger Type                       | What it does                                               | Date Field Used                            |
| ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------ |
| `DATE` with `PAYMENT_DUE` template | Finds members where `paymentDueDate` = today + offsetDays  | `member.paymentDueDate`                    |
| `DATE` with `EXPIRY` template      | Finds members where `membershipEndAt` = today + offsetDays | `member.membershipEndAt`                   |
| `AFTER_INVOICE`                    | Finds invoices created today + offsetDays                  | `invoice.createdAt`                        |
| `AFTER_JOB`                        | Finds job cards delivered today + offsetDays               | `jobCard.updatedAt` where status=DELIVERED |

### Offset Days Examples:

- `-3` = 3 days **before** the date
- `0` = **on** the date
- `1` = 1 day **after** the date
- `7` = 7 days **after** the date

---

## 🐛 Troubleshooting

### "No automations configured" showing:

1. Check if backend is running: `npm run start:dev`
2. Check browser console for errors (F12)
3. Verify `localStorage.getItem("moduleType")` matches selected module
4. Try hard refresh: Ctrl+Shift+R

### Automation created but not showing:

1. Check if you're on the correct module (GYM vs MOBILESHOP)
2. Refresh the page
3. Check browser console for API errors
4. Verify backend response: Check `/whatsapp/automations/GYM` endpoint

### "Automation already exists" error:

You're trying to create a duplicate. The system prevents:

- Same `moduleType` + `triggerType` + `templateKey` + `offsetDays`

To create multiple DATE automations:

- Use **different templates** (PAYMENT_DUE vs EXPIRY)
- Or use **different offset days** (-3 vs 0 vs 1)

### Template not showing in dropdown:

1. Go to `/templates` page
2. Check if template exists for your module (GYM or MOBILESHOP)
3. Verify `status = ACTIVE`
4. Check `moduleType` matches selected module

### Messages not sending:

1. Check if automation is **Enabled** (green button)
2. Verify cron is running (check backend logs at 6 AM)
3. Check if members have valid phone numbers
4. Verify WhatsApp phone number is configured in `/phone-numbers`
5. Check logs in `/logs` page for errors

---

## 📊 Testing Automations

### Quick Test:

1. Create a test member with:
   - `paymentDueDate` = tomorrow
   - `membershipEndAt` = 3 days from now
2. Create automation:
   - Trigger: DATE
   - Template: PAYMENT_DUE
   - Offset: 1 (tomorrow)
3. Wait for cron to run at 6 AM (or manually trigger in backend)
4. Check `/reminders` page for SCHEDULED entries
5. Wait for reminder processor (every 5 minutes)
6. Check `/logs` page for SENT status

### Manual Testing (Development):

```bash
# In backend terminal
# Run cron manually (in NestJS controller or cron service)
# Or wait for scheduled time
```

---

## 🎨 UI Features

### Automation Card Shows:

- **Trigger label** (e.g., "Membership / Payment due")
- **Template & Offset** (e.g., "PAYMENT_DUE, -3 days")
- **Description** of what the trigger does
- **Enabled/Disabled** toggle button
- **Edit** button to modify template/offset
- **Created date**

### Visual Indicators:

- **Green left border** = Enabled automation
- **Gray left border** = Disabled automation
- **Green button** = Currently enabled (click to disable)
- **Gray button** = Currently disabled (click to enable)

### Create Form Fields:

1. **Trigger Type** - Dropdown with module-specific options
2. **Template** - Dropdown with ACTIVE templates only
3. **Offset Days** - Number input (negative for "before", positive for "after")
4. **Enabled** - Checkbox (default: checked)

---

## 📝 Example Setup: Complete Gym Workflow

```
1. New Member Welcome (immediate)
   - Trigger: AFTER_INVOICE
   - Template: WELCOME
   - Offset: 0

2. Payment Reminder (3 days before due)
   - Trigger: DATE
   - Template: PAYMENT_DUE
   - Offset: -3

3. Payment Reminder (1 day before due)
   - Trigger: DATE
   - Template: PAYMENT_DUE
   - Offset: -1

4. Membership Expiry Alert (7 days before)
   - Trigger: DATE
   - Template: EXPIRY
   - Offset: -7

5. Membership Expiry Alert (3 days before)
   - Trigger: DATE
   - Template: EXPIRY
   - Offset: -3

6. Membership Expired (on date)
   - Trigger: DATE
   - Template: EXPIRY
   - Offset: 0

7. Renewal Reminder (2 days after expiry)
   - Trigger: DATE
   - Template: REMINDER
   - Offset: 2
```

All these automations will work **simultaneously** because they have different template/offset combinations! 🎉
