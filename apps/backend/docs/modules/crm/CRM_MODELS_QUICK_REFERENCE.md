# CRM Models - Quick Reference

## 4 New Models Added to Prisma Schema

### 1. **CustomerFollowUp** - Manual CRM Actions

Track calls, WhatsApp, visits, emails, SMS sent to customers.

```typescript
// Create follow-up
await prisma.customerFollowUp.create({
  data: {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    type: 'WHATSAPP', // CALL, WHATSAPP, VISIT, EMAIL, SMS
    purpose: 'PAYMENT', // SALE, SERVICE, PAYMENT, FEEDBACK, RETENTION, OTHER
    note: 'Send payment reminder',
    followUpAt: new Date('2026-02-15'),
    status: 'PENDING', // PENDING, DONE, CANCELLED
    assignedToUserId: 'user-1',
  },
});

// Get pending follow-ups
const pending = await prisma.customerFollowUp.findMany({
  where: { tenantId, status: 'PENDING', followUpAt: { lte: new Date() } },
  orderBy: { followUpAt: 'asc' },
});

// Mark complete
await prisma.customerFollowUp.update({
  where: { id: 'followup-1' },
  data: { status: 'DONE' },
});
```

**Fields**: id, tenantId, customerId, shopId?, type, purpose, note?, followUpAt, status, assignedToUserId?, createdAt, updatedAt  
**Relations**: Tenant, Customer (cascade), Shop?, User?  
**Indexes**: tenantId, customerId, shopId, assignedToUserId, followUpAt, status

---

### 2. **CustomerReminder** - Automated Notifications

Schedule WhatsApp, email, SMS, or in-app notifications based on dates or events.

```typescript
// Create reminder for 30 days after invoice
await prisma.customerReminder.create({
  data: {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    triggerType: 'AFTER_INVOICE', // DATE, AFTER_INVOICE, AFTER_JOB
    triggerValue: '30', // "2026-02-15" or "30" days
    channel: 'WHATSAPP', // WHATSAPP, IN_APP, EMAIL, SMS
    templateKey: 'SERVICE_REMINDER', // Custom template identifier
    status: 'SCHEDULED', // SCHEDULED, SENT, FAILED, SKIPPED
  },
});

// Get pending reminders to send (for cron job)
const pending = await prisma.customerReminder.findMany({
  where: {
    status: 'SCHEDULED',
    scheduledAt: { lte: new Date() },
  },
  include: { customer: true, tenant: true },
});

// Mark as sent
await prisma.customerReminder.update({
  where: { id: 'reminder-1' },
  data: { status: 'SENT', sentAt: new Date() },
});

// Mark as failed
await prisma.customerReminder.update({
  where: { id: 'reminder-1' },
  data: { status: 'FAILED', failureReason: 'WhatsApp API error' },
});
```

**Fields**: id, tenantId, customerId, triggerType, triggerValue, channel, templateKey, status, scheduledAt?, sentAt?, failureReason?, createdAt, updatedAt  
**Relations**: Tenant, Customer (cascade)  
**Indexes**: tenantId, customerId, status, scheduledAt

---

### 3. **LoyaltyTransaction** - Points Log

Track points earned (invoices, promotions) and redeemed. Immutable transaction log.

```typescript
// Award points for purchase
await prisma.loyaltyTransaction.create({
  data: {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    points: 500,
    source: 'INVOICE', // INVOICE, MANUAL, PROMOTION, REFERRAL, REDEMPTION
    referenceId: 'invoice-123', // Link to source
    note: '₹5000 purchase = 50 points',
  },
});

// Redeem points
await prisma.loyaltyTransaction.create({
  data: {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    points: -100, // Negative for redemption
    source: 'REDEMPTION',
    note: 'Redeemed 100 points for ₹1000 discount',
  },
});

// Get customer loyalty balance
const transactions = await prisma.loyaltyTransaction.findMany({
  where: { customerId: 'cust-1' },
});
const balance = transactions.reduce((sum, t) => sum + t.points, 0);

// Get transaction history
const history = await prisma.loyaltyTransaction.findMany({
  where: { customerId: 'cust-1' },
  orderBy: { createdAt: 'desc' },
});
```

**Fields**: id, tenantId, customerId, points (±), source, referenceId?, note?, createdAt  
**Relations**: Tenant, Customer (cascade)  
**Indexes**: tenantId, customerId, createdAt  
**Note**: Immutable (no updates), append-only log

---

### 4. **CustomerAlert** - Staff Notifications

Internal alerts for staff: overdue payments, high-value customers, repeat repairs, churn risk.

```typescript
// Create alert
await prisma.customerAlert.create({
  data: {
    tenantId: 'tenant-1',
    customerId: 'cust-1',
    severity: 'CRITICAL', // INFO, WARNING, CRITICAL
    message: 'Payment overdue by 45 days',
    source: 'OVERDUE', // OVERDUE, HIGH_VALUE, REPEAT_REPAIR, CHURN_RISK, INACTIVE, CUSTOM
  },
});

// Get active critical alerts
const critical = await prisma.customerAlert.findMany({
  where: {
    tenantId: 'tenant-1',
    severity: 'CRITICAL',
    resolved: false,
  },
  include: { customer: true },
  orderBy: { createdAt: 'desc' },
});

// Resolve alert
await prisma.customerAlert.update({
  where: { id: 'alert-1' },
  data: { resolved: true, resolvedAt: new Date() },
});

// Auto-generate overdue alerts (run daily)
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const overdueInvoices = await prisma.invoice.findMany({
  where: {
    tenantId,
    status: { not: 'PAID' },
    createdAt: { lte: thirtyDaysAgo },
  },
});

for (const invoice of overdueInvoices) {
  const existing = await prisma.customerAlert.findFirst({
    where: {
      tenantId,
      customerId: invoice.customerId,
      source: 'OVERDUE',
      resolved: false,
    },
  });

  if (!existing) {
    await prisma.customerAlert.create({
      data: {
        tenantId,
        customerId: invoice.customerId,
        severity: 'CRITICAL',
        message: `Payment overdue by 30+ days`,
        source: 'OVERDUE',
      },
    });
  }
}
```

**Fields**: id, tenantId, customerId, severity, message, source, resolved, resolvedAt?, createdAt  
**Relations**: Tenant, Customer (cascade)  
**Indexes**: tenantId, customerId, severity, resolved, createdAt

---

## Enums

### FollowUpType

```
CALL, WHATSAPP, VISIT, EMAIL, SMS
```

### FollowUpPurpose

```
SALE, SERVICE, PAYMENT, FEEDBACK, RETENTION, OTHER
```

### FollowUpStatus

```
PENDING, DONE, CANCELLED
```

### ReminderTriggerType

```
DATE (fixed date: "2026-02-15")
AFTER_INVOICE (days after: "30")
AFTER_JOB (days after: "7")
```

### ReminderChannel

```
WHATSAPP, IN_APP, EMAIL, SMS
```

### ReminderStatus

```
SCHEDULED, SENT, FAILED, SKIPPED
```

### LoyaltySource

```
INVOICE, MANUAL, PROMOTION, REFERRAL, REDEMPTION
```

### AlertSeverity

```
INFO, WARNING, CRITICAL
```

### AlertSource

```
OVERDUE, HIGH_VALUE, REPEAT_REPAIR, CHURN_RISK, INACTIVE, CUSTOM
```

---

## Relations Added to Existing Models

### Customer

```typescript
followUps: CustomerFollowUp[]              // 1:N
reminders: CustomerReminder[]              // 1:N
loyaltyTransactions: LoyaltyTransaction[]  // 1:N
alerts: CustomerAlert[]                    // 1:N
```

### Tenant

```typescript
customerFollowUps: CustomerFollowUp[]      // 1:N
customerReminders: CustomerReminder[]      // 1:N
loyaltyTransactions: LoyaltyTransaction[]  // 1:N
customerAlerts: CustomerAlert[]            // 1:N
```

### Shop

```typescript
followUps: CustomerFollowUp[]               // 1:N (optional)
```

### User

```typescript
assignedFollowUps: CustomerFollowUp[]       // 1:N (optional)
```

---

## Migration File

**File**: `20260128122316_add_crm_models_follow_ups_reminders_loyalty_alerts/migration.sql`

Creates:

- 8 new PostgreSQL ENUM types
- 4 new tables with proper indexes
- Foreign key relationships with cascading deletes
- Relationships to existing Tenant, Customer, Shop, User models

---

## Key Design Decisions

✅ **Works ONLY on Customer** (not Member)

- CRM is for business customers, not gym members
- Separate data models for different entity types

✅ **Multi-tenant everywhere**

- All models have tenantId
- No cross-tenant data leaks

✅ **Optional Shop association**

- FollowUp can link to specific shop (null = global follow-up)
- SetNull on shop delete (follow-up remains, shop ref cleared)

✅ **Assignable follow-ups**

- Follow-ups can be assigned to staff users
- User deletion clears assignment (SetNull)

✅ **Immutable loyalty log**

- Transactions are append-only (no updates)
- Provides audit trail
- Points can be ±

✅ **Cascading deletes on customer**

- Delete customer → all follow-ups, reminders, alerts deleted
- Maintains referential integrity

✅ **Status tracking**

- Follow-ups: PENDING → DONE/CANCELLED
- Reminders: SCHEDULED → SENT/FAILED/SKIPPED
- Alerts: resolved boolean + timestamp

✅ **Proper indexing**

- tenantId (tenant isolation)
- customerId (customer queries)
- status + dates (list queries, job scheduling)

---

## Common Service Methods

```typescript
// CustomerFollowUpService
createFollowUp(data)
getFollowUpsDue(tenantId)
getFollowUpsByCustomer(tenantId, customerId)
completeFollowUp(followUpId)
getFollowUpsByStaff(tenantId, userId)

// CustomerReminderService
createReminder(data)
getScheduledReminders() // For cron job
markAsSent(reminderId)
markAsFailed(reminderId, reason)

// LoyaltyService
awardPointsForInvoice(tenantId, customerId, amount, invoiceId)
redeemPoints(tenantId, customerId, points, reason)
getCustomerBalance(customerId)
getTransactionHistory(customerId)

// CustomerAlertService
createAlert(data)
getActiveAlerts(tenantId, severity?)
resolveAlert(alertId)
checkOverduePayments(tenantId) // Auto-generate
checkHighValueTransactions(tenantId, threshold)
```

---

## Testing Checklist

- [ ] Create CustomerFollowUp and verify cascade delete on customer delete
- [ ] Create CustomerReminder with DATE trigger
- [ ] Create CustomerReminder with AFTER_INVOICE trigger
- [ ] Mark reminder as SENT and verify sentAt timestamp
- [ ] Create loyalty transactions (positive and negative)
- [ ] Calculate loyalty balance correctly
- [ ] Create CustomerAlert with different severities
- [ ] Mark alert as resolved
- [ ] Verify tenant isolation (can't see other tenant's records)
- [ ] Verify shop deletion clears followUp.shopId (SetNull)
- [ ] Verify user deletion clears followUp.assignedToUserId (SetNull)
