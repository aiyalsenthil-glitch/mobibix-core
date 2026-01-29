# WhatsApp Reminders Automation - Implementation Guide

**Date**: January 28, 2026  
**Status**: ✅ Complete  
**Location**: `src/modules/whatsapp/`

---

## Overview

An automated WhatsApp reminder system that finds pending `CustomerReminder` records and sends templated messages via WhatsApp API on schedule. Designed for fault tolerance, idempotency, and comprehensive logging.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│  WhatsAppRemindersCron (Every 5 minutes)        │
│  @Cron(CronExpression.EVERY_5_MINUTES)          │
└──────────────┬──────────────────────────────────┘
               │ Calls
               ↓
┌─────────────────────────────────────────────────┐
│  WhatsAppRemindersService                       │
│  - processScheduledReminders()                  │
│  - processSingleReminder()                      │
│  - buildTemplateParameters()                    │
│  - retryFailedReminders()                       │
└──────────────┬──────────────────────────────────┘
               │ Uses
               ├─ WhatsAppSender (send via API)
               ├─ WhatsAppLogger (log to DB)
               ├─ PrismaService (data access)
               └─ toWhatsAppPhone (format phone)
               │ Reads/Writes
               ↓
┌─────────────────────────────────────────────────┐
│  Database (Prisma)                              │
│  - CustomerReminder (read SCHEDULED, update)   │
│  - WhatsAppLog (write attempt logs)            │
│  - WhatsAppSetting (check tenant enable)       │
│  - Customer (resolve phone)                    │
│  - Tenant (billing checks)                     │
└─────────────────────────────────────────────────┘
```

---

## Processing Flow

### High-Level Flow

```
1. Cron Job Triggered (every 5 minutes)
        ↓
2. Query: Find SCHEDULED reminders where scheduledAt <= NOW
        ↓
3. For each reminder in batch (limit 100):
        ├─ Lock DB: Update status SCHEDULED → PROCESSING (optional)
        ├─ Resolve customer phone
        ├─ Check tenant WhatsApp enabled
        ├─ Build template parameters
        ├─ Send via WhatsAppSender
        ├─ Update status: SENT or FAILED
        └─ Log attempt in WhatsAppLog
        ↓
4. Return summary of processed reminders
```

### Detailed Processing for Single Reminder

```
Input: CustomerReminder {
  id, tenantId, customerId, templateKey,
  triggerType, triggerValue, channel, status, scheduledAt
}

Step 1: Verify tenant WhatsApp enabled
  ├─ Query: WhatsAppSetting.findUnique(tenantId)
  ├─ If disabled → Mark as SKIPPED, return early
  └─ If enabled → Continue

Step 2: Resolve customer phone
  ├─ Query: Customer.phone (already loaded)
  ├─ If null → Mark as FAILED, log error
  └─ If exists → Continue

Step 3: Validate phone format
  ├─ Convert to WhatsApp format: toWhatsAppPhone(phone)
  ├─ If invalid → Mark as FAILED, log error
  └─ If valid → Continue

Step 4: Build template parameters
  ├─ Create object: { customerName, ... }
  ├─ Add context based on triggerType
  └─ Convert to array format for WhatsApp API

Step 5: Send message
  ├─ Call: WhatsAppSender.sendTemplateMessage()
  │ (Handles subscription checks internally)
  ├─ Returns: { success, error?, skipped? }
  └─ Handle three cases:
      a) skipped=true → Mark as SKIPPED
      b) success=true → Mark as SENT, set sentAt
      c) success=false → Mark as FAILED, store error

Step 6: Log attempt
  ├─ Call: WhatsAppLogger.log()
  ├─ Record: tenantId, customerId, phone, status, error
  └─ Continue (don't crash on log failure)

Output: Status updated, log created
```

---

## Database Schema

### CustomerReminder Fields

```
id: string (CUID)
tenantId: string (FK)
customerId: string (FK)
triggerType: enum (DATE | AFTER_INVOICE | AFTER_JOB)
triggerValue: string (date or days)
channel: enum (WHATSAPP | IN_APP | EMAIL | SMS)
templateKey: string (maps to WhatsApp template name)
status: enum (SCHEDULED | SENT | FAILED | SKIPPED)
scheduledAt: DateTime
sentAt: DateTime (null until sent)
failureReason: string (null unless FAILED)
```

### WhatsAppLog Fields

```
id: string (CUID)
tenantId: string
memberId: string (customer ID)
phone: string
type: string ('REMINDER' for reminders)
status: string ('SUCCESS' | 'FAILED' | 'SKIPPED')
error: string (null if successful)
createdAt: DateTime (auto)
```

### WhatsAppSetting Fields

```
id: string
tenantId: string (unique)
enabled: boolean (whether WhatsApp is active)
provider: string ('META')
createdAt: DateTime
updatedAt: DateTime
```

---

## Error Handling Strategy

### Graceful Degradation

**Principle**: Don't crash the job. Log errors and continue.

```typescript
// ✅ Good: Catch per-reminder errors, continue
for (const reminder of reminders) {
  try {
    await processSingleReminder(reminder);
  } catch (err) {
    this.logger.error(`Failed: ${reminder.id}`, err.message);
    // Continue to next reminder
  }
}

// ❌ Bad: One error crashes entire job
for (const reminder of reminders) {
  await processSingleReminder(reminder); // Throws → crashes
}
```

### Error Categories

| Error                    | Handling       | Status  | Logged  |
| ------------------------ | -------------- | ------- | ------- |
| Phone number null        | Mark FAILED    | FAILED  | ✅ Yes  |
| Invalid phone format     | Mark FAILED    | FAILED  | ✅ Yes  |
| Tenant WhatsApp disabled | Mark SKIPPED   | SKIPPED | ✅ Yes  |
| Plan/feature limit       | Mark SKIPPED   | SKIPPED | ✅ Yes  |
| API timeout              | Mark FAILED    | FAILED  | ✅ Yes  |
| API error (4xx/5xx)      | Mark FAILED    | FAILED  | ✅ Yes  |
| DB error                 | Propagate, log | N/A     | ✅ Yes  |
| Log failure              | Warn, continue | N/A     | ⚠️ Warn |

### Retry Policy

**Manual Retry Only** (no auto-retry in cron):

```typescript
// Owner/admin can retry failed reminders
await remindersService.retryFailedReminders(tenantId, limit: 10);

// Conditions for retry:
// - Original status: FAILED
// - Updated in last 24h (temporary failure assumption)
// - Reset to SCHEDULED with scheduledAt = now
```

---

## Idempotency Guarantee

### Problem

If the cron job crashes mid-way, we must not send duplicate reminders.

### Solution

1. **Immediate Status Update**: Update reminder to SENT/FAILED immediately after API call
2. **Query Filter**: Next job run queries only `status: SCHEDULED`
3. **DB Transaction** (optional): Use transaction to atomically send + update

### Example: Safe Processing

```typescript
// 1. Query only SCHEDULED reminders
const reminders = await prisma.customerReminder.findMany({
  where: { status: 'SCHEDULED', channel: 'WHATSAPP' },
});

// 2. For each, IMMEDIATELY update status
for (const reminder of reminders) {
  try {
    const result = await sendViaWhatsApp(reminder);

    // 3. Update to SENT/FAILED synchronously
    await prisma.customerReminder.update({
      where: { id: reminder.id },
      data: { status: result.success ? 'SENT' : 'FAILED' },
    });
  } catch (err) {
    // Mark as FAILED even if exception
    await prisma.customerReminder.update({
      where: { id: reminder.id },
      data: { status: 'FAILED', failureReason: err.message },
    });
  }
}

// If job crashes here:
// - Already-processed reminders stay SENT/FAILED
// - Unprocessed reminders remain SCHEDULED
// - Next job run will only process the remaining SCHEDULED ones
// ✅ Result: No duplicates sent
```

---

## Logging Strategy

### WhatsAppLog Entry Format

```typescript
{
  tenantId: "tenant-123",
  memberId: "customer-456",      // Customer ID
  phone: "+91 98765 43210",       // Formatted phone
  type: "REMINDER",               // Fixed value for reminders
  status: "SUCCESS" | "FAILED" | "SKIPPED",
  error: null | "Phone number not found" | "API error: timeout"
}
```

### Log Examples

**Successful Send**:

```json
{
  "tenantId": "mobibix-tenant-1",
  "memberId": "customer-john-doe",
  "phone": "+919876543210",
  "type": "REMINDER",
  "status": "SUCCESS",
  "error": null,
  "createdAt": "2026-01-28T14:05:00Z"
}
```

**Failed - Phone Invalid**:

```json
{
  "tenantId": "mobibix-tenant-1",
  "memberId": "customer-jane",
  "phone": "invalid-phone",
  "type": "REMINDER",
  "status": "FAILED",
  "error": "Invalid phone number format",
  "createdAt": "2026-01-28T14:10:00Z"
}
```

**Skipped - Feature Blocked**:

```json
{
  "tenantId": "mobibix-tenant-1",
  "memberId": "customer-mike",
  "phone": "+919876543211",
  "type": "REMINDER",
  "status": "SKIPPED",
  "error": "Blocked by subscription plan",
  "createdAt": "2026-01-28T14:15:00Z"
}
```

### Query Logs

```sql
-- Find all reminder attempts for a tenant
SELECT * FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND "tenantId" = 'mobibix-tenant-1'
ORDER BY "createdAt" DESC;

-- Count successes vs failures
SELECT status, COUNT(*) FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND "tenantId" = 'mobibix-tenant-1'
GROUP BY status;

-- Find failed reminders (last 24h)
SELECT * FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND status = 'FAILED'
  AND "createdAt" >= NOW() - INTERVAL '1 day'
ORDER BY "createdAt" DESC;
```

---

## Service Methods

### processScheduledReminders()

```typescript
async processScheduledReminders(): Promise<ProcessReminderResult> {
  // Finds SCHEDULED reminders where scheduledAt <= now
  // Processes up to 100 at a time
  // Returns { success, error?, reminderIds }
}
```

**Called by**: WhatsAppRemindersCron (every 5 minutes)  
**Returns**: ProcessReminderResult  
**Side effects**:

- Updates CustomerReminder status
- Writes WhatsAppLog entries

### processSingleReminder()

```typescript
private async processSingleReminder(reminder: any): Promise<void> {
  // Handles: phone validation, template build, API call, status update, logging
  // Throws on unrecoverable errors
}
```

**Called by**: processScheduledReminders()  
**Side effects**: Same as above

### retryFailedReminders()

```typescript
async retryFailedReminders(tenantId: string, limit: number = 10): Promise<number> {
  // Resets FAILED reminders (from last 24h) to SCHEDULED
  // Returns count of reminders reset for retry
}
```

**Called by**: Manual admin operation (or external job)  
**Parameters**:

- `tenantId`: Only retry for this tenant
- `limit`: Max reminders to retry at once

---

## Cron Configuration

### Current Schedule

```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async processReminders() { ... }
```

**Frequency**: Every 5 minutes  
**Rationale**:

- Frequent enough for timely delivery
- Not too frequent to overload DB
- Allows manual triggers between runs

### Alternative Schedules

```typescript
// Every 1 minute (for high-volume scenarios)
@Cron(CronExpression.EVERY_MINUTE)

// Every hour at :00 (simple)
@Cron('0 * * * *')

// Every day at 8 AM (batch processing)
@Cron('0 8 * * *')
```

---

## Integration with Customer Reminder Creation

### When Reminders Are Created

Reminders can be created via:

1. **Admin API**: `POST /api/reminders` (manual creation)
2. **Automated Rules**: Background job based on invoice/job dates
3. **Manual**: Direct DB insert

### Required Fields on Creation

```typescript
const reminder: CreateReminderDto = {
  customerId: 'cust-123',
  tenantId: 'tenant-456',
  triggerType: 'AFTER_INVOICE',
  triggerValue: '2', // 2 days after invoice
  channel: 'WHATSAPP',
  templateKey: 'payment_due_reminder', // Maps to WhatsApp template
  // scheduledAt will be calculated by system
};
```

### Template Mapping

Customer sets `templateKey` (string identifier). System maps to WhatsApp template name:

```typescript
// Example mapping (in future)
const REMINDER_TEMPLATES = {
  payment_due_reminder: 'payment_due_notice_util_v1',
  service_due_reminder: 'service_reminder_v2',
  follow_up_reminder: 'follow_up_message_v1',
  loyalty_promo: 'loyalty_discount_offer_v1',
};
```

---

## Use Cases

### 1. Payment Due Reminder

```
Trigger: AFTER_INVOICE + 2 days
Channel: WHATSAPP
Template: payment_due_reminder
Message: "Hi {name}, your payment is due in 2 days. Amount: {amount}"
Status Path: SCHEDULED → SENT
```

### 2. Service Due Reminder

```
Trigger: DATE + 2026-02-01
Channel: WHATSAPP
Template: service_due_reminder
Message: "Hi {name}, your service is due on 2026-02-01"
Status Path: SCHEDULED → SENT
```

### 3. Follow-Up Reminder

```
Trigger: AFTER_JOB + 7 days
Channel: WHATSAPP
Template: follow_up_reminder
Message: "Hi {name}, how was your service experience?"
Status Path: SCHEDULED → SENT
```

### 4. Loyalty Promo

```
Trigger: DATE + 2026-02-14 (Valentine's Day)
Channel: WHATSAPP
Template: loyalty_promo
Message: "Hi {name}, enjoy 20% off this Valentine's Day!"
Status Path: SCHEDULED → SENT
```

---

## Monitoring & Debugging

### Check Pending Reminders

```sql
SELECT id, customerId, templateKey, scheduledAt, status
FROM "CustomerReminder"
WHERE status = 'SCHEDULED'
  AND channel = 'WHATSAPP'
ORDER BY scheduledAt ASC;
```

### Check Reminder Status

```sql
SELECT status, COUNT(*) as count
FROM "CustomerReminder"
WHERE channel = 'WHATSAPP'
GROUP BY status;
```

### Recent Failures

```sql
SELECT id, customerId, failureReason, updatedAt
FROM "CustomerReminder"
WHERE status = 'FAILED'
  AND channel = 'WHATSAPP'
  AND updatedAt >= NOW() - INTERVAL '1 hour'
ORDER BY updatedAt DESC;
```

### Send Statistics (Last 24h)

```sql
SELECT status, COUNT(*) as attempts
FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND "createdAt" >= NOW() - INTERVAL '1 day'
GROUP BY status;
```

---

## Deployment Checklist

- [ ] Service implementation: whatsapp-reminders.service.ts ✅
- [ ] Cron job: whatsapp-reminders.cron.ts ✅
- [ ] Module registration: whatsapp.module.ts ✅
- [ ] Error handling: Try/catch per reminder ✅
- [ ] Logging: WhatsAppLog entries ✅
- [ ] Idempotency: Status-based filtering ✅
- [ ] Test: Manual trigger with sample reminders
- [ ] Monitor: Set up alerts for FAILED status
- [ ] Documentation: ✅ This guide
- [ ] Runbook: Document retry process

---

## Constraints Respected

✅ **Tenant WhatsApp enable/disable**: Checked before sending  
✅ **No hardcoded templates**: Uses `templateKey` from DB  
✅ **Failure resilience**: Try/catch per reminder, job won't crash  
✅ **Logging every attempt**: WhatsAppLog entry for each  
✅ **Idempotency**: Status-filtered queries prevent duplicates  
✅ **No customer mutation**: Only read phone, don't modify records

---

## Future Enhancements

1. **Auto-Retry**: Failed reminders auto-retry in 1 hour
2. **Template Versioning**: Support template versioning
3. **Batching**: Send bulk requests instead of one-by-one
4. **Webhook Delivery**: Confirm delivery via WhatsApp webhook
5. **Analytics**: Dashboard for send rates, failures, etc.
6. **A/B Testing**: Test different message variants
7. **Opt-Out**: Allow customers to unsubscribe from reminders

---

## Code Files

| File                            | Purpose             |
| ------------------------------- | ------------------- |
| `whatsapp-reminders.service.ts` | Business logic      |
| `whatsapp-reminders.cron.ts`    | Scheduled job       |
| `whatsapp.module.ts`            | Module registration |

---

**Implementation Complete** ✅
