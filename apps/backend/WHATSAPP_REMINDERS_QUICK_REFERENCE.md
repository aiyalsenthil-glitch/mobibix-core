# WhatsApp Reminders - Quick Reference

**Status**: ✅ Complete  
**Files**: 2 created, 1 updated in `src/modules/whatsapp/`

---

## File Locations

| File                                                 | Purpose                                 |
| ---------------------------------------------------- | --------------------------------------- |
| `src/modules/whatsapp/whatsapp-reminders.service.ts` | Service with reminder processing logic  |
| `src/modules/whatsapp/whatsapp-reminders.cron.ts`    | Scheduled job (every 5 minutes)         |
| `src/modules/whatsapp/whatsapp.module.ts`            | Updated to register reminder components |

---

## What It Does

Automatically sends WhatsApp messages to customers based on scheduled `CustomerReminder` records.

```
Every 5 minutes:
1. Find reminders with status=SCHEDULED and scheduledAt<=now
2. For each reminder:
   - Validate customer phone
   - Check tenant WhatsApp enabled
   - Send via WhatsApp API
   - Update status: SENT or FAILED
   - Log attempt in WhatsAppLog
```

---

## Service Methods

### Main Entry Point

```typescript
async processScheduledReminders(): Promise<ProcessReminderResult>
```

Called by: Cron job (every 5 minutes)  
Processes: Up to 100 reminders per run  
Returns: `{ success: boolean, error?: string, reminderIds: string[] }`

### Manual Retry

```typescript
async retryFailedReminders(tenantId: string, limit: number = 10): Promise<number>
```

Resets failed reminders from last 24h to SCHEDULED  
Returns: Count of reminders reset

### Get Stats

```typescript
async getReminderStats(tenantId: string): Promise<object>
```

Returns: Count by status (SCHEDULED, SENT, FAILED, SKIPPED)

---

## Processing Flow

```
┌─────────────────────────────┐
│ Cron Job (Every 5 minutes)  │
└─────────────┬───────────────┘
              │
              ↓
┌─────────────────────────────────────────┐
│ Query: Find SCHEDULED reminders due now │
└─────────────┬───────────────────────────┘
              │
              ↓
    ┌─────────────────┐
    │ For each reminder:
    │ 1. Check tenant WhatsApp enabled
    │ 2. Validate phone number
    │ 3. Build template params
    │ 4. Send via API
    │ 5. Update status (SENT/FAILED)
    │ 6. Log attempt
    └─────────────────┘
              │
              ↓
    ┌─────────────────┐
    │ Return summary
    └─────────────────┘
```

---

## Error Handling

| Situation                | Status                   | Logged                   |
| ------------------------ | ------------------------ | ------------------------ |
| Phone number null        | FAILED                   | ✅                       |
| Invalid phone format     | FAILED                   | ✅                       |
| Tenant WhatsApp disabled | SKIPPED                  | ✅                       |
| Subscription plan block  | SKIPPED                  | ✅                       |
| API error                | FAILED                   | ✅                       |
| Job crash                | Reminder stays SCHEDULED | ⏳ Next run processes it |

---

## Idempotency

**Problem**: Job crashes mid-way → duplicate sends?

**Solution**: Update status immediately after API call

- Only query `status: SCHEDULED` reminders
- Update to SENT/FAILED right after send
- If crash: unprocessed stay SCHEDULED, next run processes them
- **Result**: No duplicates sent ✅

---

## Use Cases

| Reminder Type | Trigger                | Template             | Example                         |
| ------------- | ---------------------- | -------------------- | ------------------------------- |
| Payment Due   | AFTER_INVOICE + 2 days | payment_due_reminder | "Your payment is due in 2 days" |
| Service Due   | DATE                   | service_due_reminder | "Your service is due on Feb 1"  |
| Follow-Up     | AFTER_JOB + 7 days     | follow_up_reminder   | "How was your service?"         |
| Promo         | DATE                   | loyalty_promo        | "20% off this Valentine's!"     |

---

## Logging Examples

### Success

```json
{
  "tenantId": "mobibix-1",
  "memberId": "customer-123",
  "phone": "+919876543210",
  "type": "REMINDER",
  "status": "SUCCESS",
  "error": null
}
```

### Failed - Phone Invalid

```json
{
  "tenantId": "mobibix-1",
  "memberId": "customer-456",
  "phone": "invalid",
  "type": "REMINDER",
  "status": "FAILED",
  "error": "Invalid phone number format"
}
```

### Skipped - Feature Blocked

```json
{
  "tenantId": "mobibix-1",
  "memberId": "customer-789",
  "phone": "+919876543211",
  "type": "REMINDER",
  "status": "SKIPPED",
  "error": "Blocked by subscription plan"
}
```

---

## Cron Schedule

```typescript
@Cron(CronExpression.EVERY_5_MINUTES)
async processReminders() { ... }
```

Runs: Every 5 minutes  
Batch size: 100 reminders per run  
Failures: Logged, don't crash job

---

## Monitoring Queries

### Pending reminders

```sql
SELECT * FROM "CustomerReminder"
WHERE status = 'SCHEDULED'
  AND channel = 'WHATSAPP'
ORDER BY scheduledAt ASC;
```

### Recent failures

```sql
SELECT * FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND status = 'FAILED'
  AND "createdAt" >= NOW() - INTERVAL '1 hour';
```

### Statistics

```sql
SELECT status, COUNT(*) FROM "WhatsAppLog"
WHERE type = 'REMINDER'
GROUP BY status;
```

---

## Integration Points

**Reads from**:

- `CustomerReminder` (query SCHEDULED)
- `Customer` (phone number)
- `WhatsAppSetting` (tenant enabled?)
- `TenantSubscription` (billing checks)

**Writes to**:

- `CustomerReminder` (update status, sentAt, failureReason)
- `WhatsAppLog` (log every attempt)

**Calls**:

- `WhatsAppSender.sendTemplateMessage()` (send API)
- `WhatsAppLogger.log()` (log attempt)

---

## Constraints Respected

✅ Respects tenant WhatsApp enable/disable setting  
✅ Does NOT hardcode templates (uses templateKey from DB)  
✅ Failures do NOT crash the job  
✅ Logs every attempt (success/failure/skipped)  
✅ Idempotent (no duplicate sends)  
✅ No customer record mutation  
✅ Graceful error handling per reminder

---

## Common Tasks

### Retry failed reminders manually

```typescript
const count = await remindersService.retryFailedReminders('tenant-123', 10);
console.log(`Reset ${count} failed reminders for retry`);
```

### Check pending count

```typescript
const stats = await remindersService.getReminderStats('tenant-123');
console.log(`Pending: ${stats.SCHEDULED}`);
```

### Find all reminders for a customer

```sql
SELECT * FROM "CustomerReminder"
WHERE customerId = 'customer-123'
  AND channel = 'WHATSAPP'
ORDER BY createdAt DESC;
```

---

## Deployment Checklist

- [x] Service: whatsapp-reminders.service.ts
- [x] Cron: whatsapp-reminders.cron.ts
- [x] Module: whatsapp.module.ts updated
- [x] Error handling
- [x] Logging
- [x] Idempotency
- [ ] Test with sample reminders
- [ ] Monitor for failures
- [ ] Document in runbook

---

## Reference

See **WHATSAPP_REMINDERS_IMPLEMENTATION.md** for:

- Detailed architecture
- Error handling strategy
- Logging strategy
- Use case examples
- Future enhancements
