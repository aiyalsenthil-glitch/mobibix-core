# WhatsApp Reminders - Visual & Sequence Guide

---

## System Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        SCHEDULED JOB                             │
│             WhatsAppRemindersCron.processReminders()            │
│                   @Cron(EVERY_5_MINUTES)                        │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ↓
┌──────────────────────────────────────────────────────────────────┐
│                  WhatsAppRemindersService                        │
│              .processScheduledReminders()                        │
│  ┌─ Query SCHEDULED reminders (scheduledAt <= now)            │
│  ├─ Batch: 100 per run                                         │
│  └─ For each: processSingleReminder()                          │
└──────────────────────┬───────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        ↓              ↓              ↓
   ┌─────────┐   ┌──────────┐   ┌─────────┐
   │ Load    │   │ WhatsApp │   │ Prisma  │
   │Customer │   │Sender    │   │Service  │
   └─────────┘   └──────────┘   └─────────┘
        │              │              │
        └──────────────┼──────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │ Database (PostgreSQL)        │
        ├─ CustomerReminder (read/upd)│
        ├─ WhatsAppLog (write logs)   │
        ├─ WhatsAppSetting (check)    │
        ├─ Customer (phone)           │
        └─ Tenant (billing checks)    │
        └──────────────────────────────┘
```

---

## Processing Sequence (Single Reminder)

```
START: CustomerReminder { id, customerId, templateKey, scheduledAt }
│
├─ 1️⃣ Check Tenant WhatsApp Setting
│     ├─ Query: WhatsAppSetting.findUnique(tenantId)
│     ├─ If disabled → Status: SKIPPED ✋
│     └─ If enabled → Continue ✅
│
├─ 2️⃣ Resolve Customer Phone
│     ├─ Phone exists?
│     ├─ If null → Status: FAILED ❌
│     └─ If exists → Continue ✅
│
├─ 3️⃣ Validate Phone Format
│     ├─ toWhatsAppPhone(phone)
│     ├─ If invalid → Status: FAILED ❌
│     └─ If valid → Continue ✅
│
├─ 4️⃣ Build Template Parameters
│     ├─ Create { customerName, ... }
│     ├─ Add context (triggerType, triggerValue)
│     └─ Convert to array format
│
├─ 5️⃣ Send via WhatsApp API
│     ├─ Call: WhatsAppSender.sendTemplateMessage()
│     ├─ Returns: { success, error?, skipped? }
│     └─ Three outcomes:
│          a) success=true → Status: SENT ✅
│          b) success=false → Status: FAILED ❌
│          c) skipped=true → Status: SKIPPED ✋
│
├─ 6️⃣ Update in Database
│     ├─ Set status: SENT | FAILED | SKIPPED
│     ├─ If SENT: set sentAt = now
│     └─ If FAILED: set failureReason
│
└─ 7️⃣ Log Attempt
      ├─ Create WhatsAppLog entry
      ├─ Record: status, error (if any)
      └─ Continue (don't crash on log failure)

END: CustomerReminder status updated, logged
```

---

## Status Transition Diagram

```
      ┌─────────────────┐
      │  CREATED (NEW)  │
      │ (via API/job)   │
      └────────┬────────┘
               │
               ↓
      ┌─────────────────┐
      │    SCHEDULED    │◄───┐ (Waiting for scheduledAt)
      │ (Waiting to run)│    │
      └────────┬────────┘    │
               │             │ Cron Job
               │        ┌────┴────────────┐
               │        │ Found SCHEDULED │
               │        │  scheduledAt<=now
               │        └────────┬────────┘
               │                 │
               ├────────────────→ Processing
               │
        ┌──────┴────────────────┬──────────────┐
        │                       │              │
        ↓                       ↓              ↓
   ┌─────────┐            ┌──────────┐   ┌──────────┐
   │  SENT   │            │  FAILED  │   │ SKIPPED  │
   │(Success)│            │  (Error) │   │(Blocked) │
   └─────────┘            └──────────┘   └──────────┘
   Terminal State         Terminal State  Terminal State
   sentAt=now         failureReason=msg
```

---

## Cron Job Lifecycle

```
┌─────────────────────────────────────┐
│ Time: 14:00:00 (Example)            │
│ Cron fires: @EVERY_5_MINUTES        │
└────────────┬────────────────────────┘
             │
             ↓
    ┌─────────────────────┐
    │ Job starts          │
    │ Logger: "Starting..."
    └────────┬────────────┘
             │
             ↓
    ┌─────────────────────────────────┐
    │ Query reminders                 │
    │ WHERE status = 'SCHEDULED'      │
    │   AND scheduledAt <= 14:00:00   │
    │   AND channel = 'WHATSAPP'      │
    │ LIMIT 100                       │
    │ Result: 23 reminders found      │
    └────────┬────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │ Process reminders (loop)               │
    │ Reminder 1 → Check phone → Send → SENT │
    │ Reminder 2 → Check phone → Send → SENT │
    │ Reminder 3 → No phone → FAILED         │
    │ ... 20 more ...                        │
    │ Success: 20 sent, 2 failed, 1 skipped  │
    └────────┬────────────────────────────────┘
             │
             ↓
    ┌───────────────────────────┐
    │ Job completes             │
    │ Logger: "Processed 23"    │
    │ Return: {                 │
    │   success: true,          │
    │   reminderIds: [...],     │
    │   count: 23               │
    │ }                         │
    └───────────────────────────┘
             │
             ↓
    ┌─────────────────────────────────┐
    │ Job waits 5 minutes             │
    │ Time: 14:05:00 (fires again)    │
    └─────────────────────────────────┘
```

---

## Error Scenario: Phone Validation Fails

```
Input: Reminder with customerId='cust-jane'

Step 1: Load customer
        → { id: 'cust-jane', phone: null }

Step 2: Check phone exists?
        → phone = null ❌

Step 3: FAILED path
        ├─ Status: FAILED
        ├─ Error reason: "Customer phone number not found"
        ├─ Log: {
        │   tenantId: 'tenant-1',
        │   memberId: 'cust-jane',
        │   phone: 'UNKNOWN',
        │   type: 'REMINDER',
        │   status: 'FAILED',
        │   error: 'Customer phone number not found'
        │ }
        └─ Continue to next reminder ✅

Result: Reminder marked FAILED, logged, no crash ✅
```

---

## Idempotency Guarantee (Crash Scenario)

```
Scenario: Job crashes after processing reminder 15/23

Timeline:
─────────────────────────────────────────────

Time: 14:00:00
├─ Job starts
├─ Query: 23 SCHEDULED reminders
├─ Process 1-15 → Update all to SENT/FAILED
├─ Process 16 → Send API call OK ✅
├─ [CRASH] Job process dies! 💥
└─ Reminders 17-23 still SCHEDULED

Time: 14:05:00 (Next run)
├─ Job starts (restarted by supervisor)
├─ Query SCHEDULED where scheduledAt <= 14:05
│  └─ Returns: Reminders 17-23 (16 already SENT) ✅
├─ Process 17-23 (not 16 again)
└─ Complete successfully

Result: No duplicate sends ✅
────────────────────────────────────
Why?
- Reminders 1-15: Already SENT, status != SCHEDULED
- Reminder 16: Already SENT, status != SCHEDULED
- Query filters: WHERE status = 'SCHEDULED'
- Unprocessed stay SCHEDULED until next run
```

---

## Batch Processing Diagram

```
┌────────────────────────────────────────┐
│ Cron Run at 14:00:00                   │
│ Total pending: 127 SCHEDULED reminders │
└────────┬─────────────────────────────┬─┘
         │                             │
         ↓                             ↓
    ┌──────────────┐          ┌──────────────┐
    │ Batch 1 (100)│          │ Batch 2 (27) │
    │ Take: LIMIT  │          │ Next run:    │
    │      100     │          │ 14:05:00     │
    └──────┬───────┘          └──────────────┘
           │
      ┌────┴─────────────────────────┐
      │ Process 100 reminders:       │
      ├─ 87 SENT ✅                  │
      ├─ 10 FAILED ❌                │
      ├─ 3 SKIPPED ⏭️               │
      └──────────────────────────────┘

Next run: 14:05:00
├─ Query: 27 + new ones if created
└─ Process Batch 2
```

---

## WhatsAppLog Schema

```
┌─────────────────────────────────────┐
│ WhatsAppLog Entry                   │
├─────────────────────────────────────┤
│ id: "log-abc123"                    │
│ tenantId: "mobibix-1"               │
│ memberId: "customer-456"            │
│ phone: "+919876543210"              │
│ type: "REMINDER"                    │
│ status: "SUCCESS"                   │
│ error: null                         │
│ createdAt: 2026-01-28T14:00:30Z    │
└─────────────────────────────────────┘
```

---

## Database State Timeline

```
┌──────────────────────────────────────────┐
│ BEFORE: 14:00:00                         │
├──────────────────────────────────────────┤
│ Reminder-1: status=SCHEDULED,            │
│            scheduledAt=2026-01-28T14:00  │
│ Reminder-2: status=SCHEDULED,            │
│            scheduledAt=2026-01-28T14:00  │
│ Reminder-3: status=SCHEDULED,            │
│            scheduledAt=2026-01-28T14:05  │
└──────────────────────────────────────────┘
                    │
                    ↓ (Cron processes 1 & 2)
┌──────────────────────────────────────────┐
│ AFTER: 14:00:45                          │
├──────────────────────────────────────────┤
│ Reminder-1: status=SENT,                 │
│            sentAt=2026-01-28T14:00:30    │
│ Reminder-2: status=FAILED,               │
│            failureReason="Phone invalid" │
│ Reminder-3: status=SCHEDULED,            │
│            scheduledAt=2026-01-28T14:05  │
└──────────────────────────────────────────┘
```

---

## Failure Rate Example (Dashboard)

```
Last 24 Hours:

Total Attempts: 1,247
├─ SUCCESS: 1,180 (94.6%) ✅
├─ FAILED:    45 (3.6%) ❌
└─ SKIPPED:   22 (1.8%) ⏭️

Failure Breakdown:
├─ "Phone invalid":           15
├─ "API timeout":            12
├─ "Tenant disabled":          8
├─ "Feature not in plan":      5
├─ "Phone number not found":   5
└─ "Other":                    0

Trending: ↑ Success ✅
```

---

## Manual Retry Flow

```
User: "Retry failed reminders from last 24h"

Request:
  POST /api/admin/reminders/retry
  { tenantId: "mobibix-1", limit: 10 }

Service:
  ├─ Query FAILED reminders
  │  WHERE updatedAt >= NOW() - 24h
  │  LIMIT 10
  ├─ Reset to SCHEDULED
  │  SET status='SCHEDULED'
  │  SET failureReason=NULL
  │  SET scheduledAt=NOW()
  └─ Return count

Result: 10 reminders reset for immediate retry

Next Cron Run (5 minutes):
  ├─ Query SCHEDULED (includes retried ones)
  └─ Attempt again

Outcome: [Progress shown in logs]
```

---

**Visual Guide Complete** ✅
