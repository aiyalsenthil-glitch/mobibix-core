# WhatsApp Message History & Webhook Integration - Complete Setup

## Overview

You now have a complete message logging, webhook integration, and history tracking system for WhatsApp messages. This allows you to:

- Track message delivery status in real-time (PENDING → SENT → DELIVERED → READ)
- View detailed message history with timestamps
- Retry failed messages
- See error details for debugging

---

## What Was Implemented

### 1. **Database Schema Updates** ✅

**File:** `apps/backend/prisma/schema.prisma`

Updated `WhatsAppLog` model with enhanced tracking:

```prisma
model WhatsAppLog {
  id          String   @id @default(uuid())
  tenantId    String
  memberId    String?
  phone       String
  type        String   // WELCOME, PAYMENT_DUE, EXPIRY, etc.
  status      String   // PENDING, SENT, DELIVERED, READ, FAILED
  error       String?  // Error message if status = FAILED
  messageId   String?  // Meta message ID for webhook tracking
  metadata    Json?    // Template variables, etc.
  sentAt      DateTime @default(now())
  updatedAt   DateTime @default(now()) @updatedAt
  deliveredAt DateTime? // When message was delivered
  readAt      DateTime? // When message was read

  @@index([tenantId, sentAt])
  @@index([tenantId, status])
  @@index([messageId]) // For webhook lookups
}
```

**Migration:** `20250129120808_add_whatsapp_log_message_tracking` - Applied successfully

### 2. **Backend Enhancements** ✅

#### a) WhatsAppLogger Service

**File:** `apps/backend/src/modules/whatsapp/whatsapp.logger.ts`

**New Methods:**

- `log()` - Create log entry with full metadata
- `updateStatus()` - Update message status after webhook events
- `updateMessageId()` - Store Meta messageId when sent

#### b) WhatsAppSender

**File:** `apps/backend/src/modules/whatsapp/whatsapp.sender.ts`

**Changes:**

- Now returns `messageId` from Meta API response
- Captures and stores `messageId` for webhook tracking
- Full status flow: API request → SENT + messageId

#### c) WhatsApp Controller

**File:** `apps/backend/src/modules/whatsapp/whatsapp.controller.ts`

**Fixed POST /whatsapp/send Endpoint:**

```
1. Create log with PENDING status
2. Call WhatsAppSender.sendTemplateMessage()
3. Update log with:
   - messageId (if success)
   - Status SENT/FAILED
   - Error details (if failure)
4. Return complete log entry
```

**Existing Endpoints:**

- `GET /whatsapp/logs/:tenantId` - List message history
- `POST /whatsapp/logs/:logId/retry` - Retry failed message

#### d) Webhook Handler

**File:** `apps/backend/src/modules/whatsapp/whatsapp.webhook.controller.ts`

**POST /webhook/whatsapp Enhancement:**

```
Meta sends webhook events:
- sent: Message sent to Meta servers
- delivered: Message reached recipient phone
- read: Recipient opened message
- failed: Delivery failed

Controller:
1. Parse webhook payload
2. Find log entry by messageId
3. Update status + timestamps
4. Error handling for delivery failures
```

**Webhook Event Mapping:**
| Meta Status | DB Status | Field Updated |
|-------------|-----------|---------------|
| sent | SENT | - |
| delivered | DELIVERED | deliveredAt |
| read | READ | readAt |
| failed | FAILED | error |

### 3. **Frontend Message History Page** ✅

**File:** `apps/whatsapp-master/app/logs/page.tsx`

**Features:**

- **Real-time Updates:** Auto-refresh every 5 seconds (toggleable)
- **Status Visualization:**
  - ⏳ PENDING - Queued for sending
  - ✓ SENT - Sent to Meta
  - ✓✓ DELIVERED - Reached phone
  - ✓✓ READ - Recipient opened
  - ✗ FAILED - Failed to deliver

- **Status Stats Card:** Shows count for each status
- **Filters:**
  - Status filter (PENDING, SENT, DELIVERED, READ, FAILED)
  - Type filter (WELCOME, PAYMENT_DUE, EXPIRY, REMINDER)
  - Date range filters

- **Message Table Columns:**
  - Phone number
  - Message type
  - Current status with icon
  - Sent timestamp
  - Delivered timestamp
  - Read timestamp
  - Actions (view error, retry)

- **Actions:**
  - 📋 View error details (expandable error panel)
  - 🔄 Retry failed messages (FAILED status only)

- **Auto-refresh Toggle:** Keep live view of message status updates

### 4. **Type Updates** ✅

**File:** `apps/whatsapp-master/lib/types.ts`

Updated `WhatsAppLog` interface:

```typescript
export interface WhatsAppLog {
  id: string;
  tenantId: string;
  memberId?: string;
  phone: string;
  type: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  error?: string;
  messageId?: string;
  metadata?: Record<string, any>;
  sentAt: Date;
  updatedAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
}
```

---

## How It Works

### Message Sending Flow

```
1. User clicks "Send Test" in Playground or automation triggers
   ↓
2. POST /whatsapp/send {tenantId, templateId, phone}
   ↓
3. Create WhatsAppLog with status: PENDING
   ↓
4. Call WhatsAppSender.sendTemplateMessage()
   ↓
5. Send to Meta API
   ↓
6. Get messageId from response
   ↓
7. Update log: status=SENT, messageId=<id>
   ↓
8. Return log entry to frontend
```

### Webhook Status Updates Flow

```
Meta detects status change → Sends webhook
   ↓
POST /webhook/whatsapp with message status
   ↓
Controller parses event
   ↓
Finds log by messageId
   ↓
Updates log:
  - status → DELIVERED/READ/FAILED
  - deliveredAt/readAt timestamp
  - error (if failed)
   ↓
Frontend auto-refreshes (every 5s)
   ↓
User sees updated status in Message History
```

---

## Using Message History

### 1. **View Message History**

- Navigate to `/logs` route
- See all messages sent from your gym/tenant
- Auto-refreshes every 5 seconds (toggleable)

### 2. **Filter Messages**

- Filter by Status (PENDING, SENT, DELIVERED, READ, FAILED)
- Filter by Type (WELCOME, PAYMENT_DUE, EXPIRY, REMINDER)
- Filter by Date Range (From/To)

### 3. **Check Delivery Status**

- **PENDING:** Message waiting to be sent
- **SENT:** Sent to Meta, awaiting delivery
- **DELIVERED:** Reached recipient's phone
- **READ:** Recipient opened the message
- **FAILED:** Delivery failed - see error details

### 4. **View Error Details**

- Click 📋 icon on failed message
- See full error message from Meta
- Includes error codes and descriptions

### 5. **Retry Failed Message**

- Click 🔄 icon on FAILED message
- Message will be re-queued for sending
- Status updates automatically

---

## Environment Requirements

### Backend

- `WHATSAPP_VERIFY_TOKEN` - For webhook verification
- `WHATSAPP_ACCESS_TOKEN` - Meta API token
- `WHATSAPP_API_VERSION` - Meta API version (v22.0 recommended)

### Webhook Setup (Meta WhatsApp Cloud API)

1. Go to Meta Business Platform
2. Configure webhook URL: `https://your-domain/webhook/whatsapp`
3. Set verify token: `WHATSAPP_VERIFY_TOKEN`
4. Subscribe to events: `message_status`
5. Grant required permissions

---

## Database Queries (Examples)

### Get all failed messages

```sql
SELECT * FROM "WhatsAppLog"
WHERE status = 'FAILED'
ORDER BY sentAt DESC;
```

### Get undelivered messages (older than 1 hour)

```sql
SELECT * FROM "WhatsAppLog"
WHERE status IN ('PENDING', 'SENT')
AND sentAt < NOW() - INTERVAL '1 hour'
ORDER BY sentAt ASC;
```

### Get delivery statistics

```sql
SELECT status, COUNT(*) as count
FROM "WhatsAppLog"
GROUP BY status;
```

---

## API Endpoints

### Get Message History

```
GET /whatsapp/logs/:tenantId
Response: Array of WhatsAppLog
```

### Send Message

```
POST /whatsapp/send
Body: {
  tenantId: string,
  phone: string,
  templateId: string,
  parameters?: string[]
}
Response: WhatsAppLog with status PENDING/SENT/FAILED
```

### Retry Message

```
POST /whatsapp/logs/:logId/retry
Response: Updated WhatsAppLog
```

### Webhook (Meta → Your Server)

```
POST /webhook/whatsapp
Body: {
  entry: [{
    changes: [{
      value: {
        statuses: [{
          id: "wamid...",
          status: "sent|delivered|read|failed",
          timestamp: "...",
          errors?: [{...}]
        }]
      }
    }]
  }]
}
```

---

## What to Test

### 1. **Send Test Message**

- Go to `/templates` → Template Playground
- Select Module, Tenant, Template, Phone
- Click "Send Test Message"
- Check `/logs` - should see PENDING → SENT status

### 2. **Monitor Live Updates**

- Send message
- Watch status change in real-time (auto-refresh)
- Should see: PENDING → SENT → DELIVERED → READ

### 3. **Error Handling**

- Send to invalid phone number
- Should see FAILED status
- Click 📋 to view error details
- Click 🔄 to retry

### 4. **Webhook Integration**

- Configure Meta webhook
- Send message through automation or playground
- Meta should send webhook events
- Status in `/logs` should update automatically

### 5. **Filter & Search**

- Use filters to find specific messages
- Test date range filtering
- Verify auto-refresh works

---

## Files Modified

| File                                                               | Changes                                     |
| ------------------------------------------------------------------ | ------------------------------------------- |
| `apps/backend/prisma/schema.prisma`                                | Enhanced WhatsAppLog model                  |
| `apps/backend/src/modules/whatsapp/whatsapp.logger.ts`             | Added updateStatus, updateMessageId methods |
| `apps/backend/src/modules/whatsapp/whatsapp.sender.ts`             | Return messageId from API                   |
| `apps/backend/src/modules/whatsapp/whatsapp.controller.ts`         | Fixed send endpoint to call sender          |
| `apps/backend/src/modules/whatsapp/whatsapp.webhook.controller.ts` | Implemented webhook handler                 |
| `apps/whatsapp-master/app/logs/page.tsx`                           | Complete rewrite with new features          |
| `apps/whatsapp-master/lib/types.ts`                                | Updated WhatsAppLog interface               |

---

## Next Steps

1. **Test the system:**
   - Use Template Playground to send test messages
   - Watch status updates in Message History
   - Verify webhook integration with Meta

2. **Monitor in production:**
   - Check `/logs` regularly for failed messages
   - Use error details to debug delivery issues
   - Track delivery rates by message type

3. **Integrate automations:**
   - Reminders and scheduled messages will now be tracked
   - Status updates automatic via webhooks
   - Retry mechanism for transient failures

4. **Setup alerts (optional):**
   - Monitor FAILED messages
   - Email or notification on high failure rate
   - Analytics on delivery times

---

## Troubleshooting

### Messages show SENT but never DELIVERED

- Check webhook URL is publicly accessible
- Verify webhook token in Meta dashboard
- Check that messageId is being captured

### FAILED status with no error message

- Check Meta API credentials
- Verify phone number is in E.164 format (+country code)
- Check subscription status

### Auto-refresh not working

- Enable "Auto-refresh" checkbox at top
- Check network tab for failed requests
- Verify JWT token is valid

### High failure rate

- Check recipient phone numbers
- Verify WhatsApp Business Account quality rating
- Check template approval status in Meta

---

## Summary

✅ **Complete message tracking system implemented**

- Real-time status updates via webhooks
- Message history with filters
- Error tracking and retry mechanism
- Auto-refresh UI for live monitoring

🎯 **Key Features:**

- PENDING → SENT → DELIVERED → READ status flow
- Webhook integration with Meta
- Detailed error messages
- Message retry functionality
- Date filtering and analytics

🚀 **Ready to use** - Test with Template Playground first!
