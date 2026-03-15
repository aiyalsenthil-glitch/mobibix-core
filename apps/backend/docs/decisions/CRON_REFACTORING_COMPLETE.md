# WhatsApp Cron Refactoring - Database-Driven Pattern ✅

## 🎯 Objective

Refactor WhatsApp cron jobs to follow a clean, database-driven architecture using `WhatsAppAutomation` and `CustomerReminder` models.

## ❌ OLD PATTERN (Legacy)

```
┌────────────────┐
│  Cron Job      │ @Cron('0 6 * * *')
│  (whatsapp)    │
└────────┬───────┘
         │ ❌ Direct call
         ↓
┌────────────────────┐
│ WhatsAppSender     │ sendTemplateMessage()
│ (Meta API)         │
└────────────────────┘
```

**Problems:**

- ❌ Hardcoded template names (`WhatsAppTemplates.PAYMENT_DUE`)
- ❌ Direct WhatsApp sending from cron
- ❌ Legacy flags (`member.paymentReminderSent`)
- ❌ Hardcoded limits (50 members per tenant)
- ❌ No admin control
- ❌ No deduplication
- ❌ No plan enforcement

## ✅ NEW PATTERN (Database-Driven)

```
┌────────────────┐
│  Cron Job      │ @Cron('0 6 * * *')
│  (automation)  │
└────────┬───────┘
         │ ✅ Read rules
         ↓
┌─────────────────────┐
│ WhatsAppAutomation  │ enabled = true
│ (Database Rules)    │ templateKey, offsetDays, triggerType
└─────────┬───────────┘
          │ ✅ Create reminders
          ↓
┌─────────────────────┐
│ CustomerReminder    │ status = SCHEDULED
│ (Queue)             │ scheduledAt, templateKey
└─────────┬───────────┘
          │ ⏰ Processed every 5 minutes
          ↓
┌─────────────────────┐
│ WhatsAppReminders   │ processScheduledReminders()
│ Service             │
└─────────┬───────────┘
          │ ✅ Send via service
          ↓
┌─────────────────────┐
│ WhatsAppSender      │ sendTemplateMessage()
│ (Meta API)          │
└─────────────────────┘
```

**Benefits:**

- ✅ Admin controls automations via UI
- ✅ Plan restrictions enforced automatically
- ✅ Proper deduplication
- ✅ Clean separation of concerns
- ✅ No hardcoded values
- ✅ Retry-friendly (no blocking flags)

---

## 📝 Refactoring Changes

### File: `src/modules/whatsapp/whatsapp.cron.ts`

#### Before (Legacy):

```typescript
@Cron('0 6 * * *')
async sendPaymentDueReminders() {
  const settings = await this.prisma.whatsAppSetting.findMany({
    where: { enabled: true },
  });

  // ❌ Direct sending
  const result = await this.sender.sendTemplateMessage(
    tenantId,
    WhatsAppFeature.PAYMENT_DUE,
    phone,
    WhatsAppTemplates.PAYMENT_DUE, // ❌ Hardcoded
    [amount, dueDate],
  );

  // ❌ Legacy flag
  await this.prisma.member.update({
    where: { id: member.id },
    data: { paymentReminderSent: true },
  });
}
```

#### After (Database-Driven):

```typescript
@Cron('0 6 * * *')
async createRemindersFromAutomations() {
  // 1️⃣ Read automation rules
  const automations = await this.prisma.whatsAppAutomation.findMany({
    where: { enabled: true },
  });

  // 2️⃣ Process each rule
  for (const automation of automations) {
    // 3️⃣ Find eligible customers
    const entities = await this.findEligibleEntities(
      tenantId,
      automation,
    );

    // 4️⃣ Create reminder entries (NOT send)
    for (const entity of entities) {
      await this.createReminderIfNotExists(
        tenantId,
        entity.customerId,
        automation,
      );
    }
  }
}
```

---

## 🔑 Key Features

### 1. Database-Driven Rules

```typescript
// WhatsAppAutomation defines the rules
{
  enabled: true,
  moduleType: 'GYM',
  templateKey: 'PAYMENT_DUE',
  triggerType: 'DATE',
  offsetDays: 1, // 1 day before due date
}
```

### 2. Plan Enforcement

```typescript
const plan = tenant.subscription[0].plan;
const planRule = WHATSAPP_PLAN_RULES[plan.name];

// Check if feature is allowed
if (!planRule?.enabled) {
  skipped++;
  continue;
}
```

### 3. Deduplication

```typescript
const existing = await this.prisma.customerReminder.findFirst({
  where: {
    tenantId,
    customerId,
    triggerType: automation.triggerType,
    scheduledAt: { gte: dayStart, lte: dayEnd },
    status: { in: ['SCHEDULED', 'SENT'] },
  },
});

if (existing) {
  return false; // Skip duplicate
}
```

### 4. Flexible Trigger Types

```typescript
switch (automation.triggerType) {
  case 'DATE':
    // Payment due reminders
    return this.prisma.member.findMany({
      where: {
        paymentDueDate: { gte: targetDate, lte: endDate },
        isActive: true,
      },
    });

  case 'AFTER_INVOICE':
    // Reminders after invoice creation
    return this.prisma.invoice.findMany({
      where: {
        createdAt: { gte: targetDate, lte: endDate },
        customerId: { not: null },
      },
    });

  case 'AFTER_JOB':
    // Reminders after job completion
    return this.prisma.jobCard.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: { gte: targetDate, lte: endDate },
      },
    });
}
```

---

## 🚀 Workflow Example

### Scenario: Payment Due Reminder

**1. Admin Creates Automation** (via UI)

```sql
INSERT INTO "WhatsAppAutomation" (
  "moduleType", "templateKey", "triggerType",
  "offsetDays", "enabled"
) VALUES (
  'GYM', 'PAYMENT_DUE', 'DATE',
  1, true
);
```

**2. Cron Runs Daily at 6 AM**

```typescript
// whatsapp.cron.ts
@Cron('0 6 * * *')
async createRemindersFromAutomations() {
  // Reads automation, finds members with payment due tomorrow
  // Creates CustomerReminder entries
}
```

**3. CustomerReminder Created**

```sql
INSERT INTO "CustomerReminder" (
  "tenantId", "customerId", "triggerType",
  "templateKey", "status", "scheduledAt"
) VALUES (
  'tenant_123', 'member_456', 'DATE',
  'PAYMENT_DUE', 'SCHEDULED', '2025-01-26 09:00:00'
);
```

**4. Reminder Processor Runs Every 5 Minutes**

```typescript
// whatsapp-reminders.cron.ts
@Cron(CronExpression.EVERY_5_MINUTES)
async processScheduledReminders() {
  // Finds SCHEDULED reminders where scheduledAt <= now
  // Calls WhatsAppRemindersService
}
```

**5. Service Sends WhatsApp**

```typescript
// whatsapp-reminders.service.ts
async processScheduledReminders() {
  const reminders = await this.prisma.customerReminder.findMany({
    where: {
      status: 'SCHEDULED',
      scheduledAt: { lte: new Date() },
    },
  });

  for (const reminder of reminders) {
    await this.whatsAppSender.sendTemplateMessage(
      reminder.tenantId,
      WhatsAppFeature.PAYMENT_DUE,
      phone,
      reminder.templateKey,
      parameters,
    );

    // Update status
    await this.prisma.customerReminder.update({
      where: { id: reminder.id },
      data: { status: 'SENT' },
    });
  }
}
```

---

## 📊 Data Flow Diagram

```
Admin UI
   │
   │ Creates/Edits
   ↓
┌─────────────────────┐
│ WhatsAppAutomation  │
│ ┌─────────────────┐ │
│ │ enabled: true   │ │
│ │ templateKey     │ │
│ │ triggerType     │ │
│ │ offsetDays      │ │
│ └─────────────────┘ │
└─────────────────────┘
           ↓
    Daily Cron Job
    (6 AM IST)
           ↓
┌─────────────────────┐
│ CustomerReminder    │
│ ┌─────────────────┐ │
│ │ status:         │ │
│ │   SCHEDULED     │ │
│ │ scheduledAt     │ │
│ │ templateKey     │ │
│ └─────────────────┘ │
└─────────────────────┘
           ↓
   Processor Cron
   (Every 5 min)
           ↓
┌─────────────────────┐
│ WhatsAppSender      │
│ ┌─────────────────┐ │
│ │ Meta Cloud API  │ │
│ │ Send Message    │ │
│ └─────────────────┘ │
└─────────────────────┘
           ↓
    Update Status
    (SENT/FAILED)
```

---

## ✅ Refactoring Checklist

- [x] Remove direct `WhatsAppSender` calls from cron
- [x] Remove hardcoded template names
- [x] Add `WhatsAppAutomation` integration
- [x] Add `CustomerReminder` creation logic
- [x] Add deduplication check (tenantId + customerId + triggerType + date)
- [x] Add plan/feature validation
- [x] Support multiple trigger types (DATE, AFTER_INVOICE, AFTER_JOB)
- [x] Preserve existing reminder processor cron
- [ ] Remove legacy flags (`paymentReminderSent`) - After testing
- [ ] Test end-to-end flow
- [ ] Monitor production

---

## 🧪 Testing Guide

### 1. Enable Automation

```sql
INSERT INTO "WhatsAppAutomation" (
  id, "moduleType", "templateKey", "triggerType",
  "offsetDays", "enabled", "createdAt", "updatedAt"
) VALUES (
  gen_random_uuid(), 'GYM', 'PAYMENT_DUE', 'DATE',
  1, true, NOW(), NOW()
);
```

### 2. Create Test Member

```sql
UPDATE "Member"
SET "paymentDueDate" = NOW() + INTERVAL '1 day'
WHERE "tenantId" = 'your_tenant_id'
LIMIT 1;
```

### 3. Run Cron Manually (Dev)

```typescript
// In NestJS console or API endpoint
await whatsAppCron.createRemindersFromAutomations();
```

### 4. Verify CustomerReminder Created

```sql
SELECT * FROM "CustomerReminder"
WHERE "status" = 'SCHEDULED'
ORDER BY "createdAt" DESC
LIMIT 10;
```

### 5. Wait for Processor (or run manually)

```typescript
await whatsAppRemindersService.processScheduledReminders();
```

### 6. Verify Message Sent

```sql
SELECT * FROM "WhatsAppLog"
WHERE "status" = 'SENT'
ORDER BY "createdAt" DESC
LIMIT 10;
```

---

## 🔄 Migration Notes

### Before (Legacy System)

- Direct sending from cron
- Uses `member.paymentReminderSent` flag
- Hardcoded 50 member limit
- No admin control

### After (Database-Driven)

- Cron creates `CustomerReminder` entries
- No blocking flags (proper retry)
- No hardcoded limits
- Full admin control via `WhatsAppAutomation`

### Backward Compatibility

- Old cron code completely replaced
- No migration needed (tables already exist)
- Legacy flags can be deprecated later
- Existing reminder processor unchanged

---

## 🎉 Summary

**What Changed:**

- ✅ Refactored `whatsapp.cron.ts` to create `CustomerReminder` entries
- ✅ Removed direct `WhatsAppSender` calls
- ✅ Removed hardcoded template names
- ✅ Added `WhatsAppAutomation` integration
- ✅ Added deduplication logic
- ✅ Added plan/feature enforcement
- ✅ Support for multiple trigger types

**What Stayed:**

- ✅ Existing `whatsapp-reminders.cron.ts` unchanged (correct pattern)
- ✅ Existing `WhatsAppRemindersService` unchanged
- ✅ Existing `WhatsAppSender` unchanged
- ✅ Existing database schema unchanged

**Next Steps:**

1. Test automation creation via admin UI
2. Test reminder creation by cron
3. Test reminder processing and sending
4. Monitor production logs
5. Remove legacy flags after stable
