# WhatsApp Reminders - Integration & Testing Guide

**Date**: January 28, 2026  
**Status**: ✅ Ready for Integration  
**Next Steps**: Testing, Monitoring, Deployment

---

## Integration Points

### 1. Module Registration

**Already Done** ✅ in `src/modules/whatsapp/whatsapp.module.ts`:

```typescript
@Module({
  controllers: [WhatsAppWebhookController],
  imports: [ScheduleModule.forRoot()],
  providers: [
    PrismaService,
    WhatsAppSender,
    WhatsAppCron,
    WhatsAppLogger,
    WhatsAppRemindersService, // ← New
    WhatsAppRemindersCron, // ← New
  ],
  exports: [WhatsAppSender, WhatsAppRemindersService],
})
export class WhatsAppModule {}
```

### 2. Automatic Startup

The module uses NestJS `@Cron` decorator, so the job **automatically starts** when app boots:

```typescript
// In whatsapp-reminders.cron.ts
@Cron(CronExpression.EVERY_5_MINUTES)
async processReminders() { ... }
// ✅ No manual registration needed
```

### 3. Manual Injection (if needed)

To use service in other modules:

```typescript
// In some other module:
import { WhatsAppRemindersService } from './whatsapp/whatsapp-reminders.service';

@Injectable()
export class SomeOtherService {
  constructor(private remindersService: WhatsAppRemindersService) {}

  async doSomething() {
    // Can manually trigger
    const result = await this.remindersService.processScheduledReminders();
  }
}
```

---

## Testing Strategy

### Unit Tests for Service

```typescript
// File: src/modules/whatsapp/__tests__/whatsapp-reminders.service.spec.ts

describe('WhatsAppRemindersService', () => {
  let service: WhatsAppRemindersService;
  let prisma: PrismaService;
  let sender: WhatsAppSender;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WhatsAppRemindersService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: WhatsAppSender, useValue: mockSender },
        { provide: WhatsAppLogger, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<WhatsAppRemindersService>(WhatsAppRemindersService);
    prisma = module.get<PrismaService>(PrismaService);
    sender = module.get<WhatsAppSender>(WhatsAppSender);
  });

  describe('processScheduledReminders', () => {
    it('should process pending reminders', async () => {
      // Mock: 3 pending reminders
      jest.spyOn(prisma.customerReminder, 'findMany').mockResolvedValue([
        {
          id: 'rem-1',
          customerId: 'cust-123',
          tenantId: 'tenant-1',
          channel: 'WHATSAPP',
          status: 'SCHEDULED',
          templateKey: 'payment_due',
          scheduledAt: new Date(),
          // ... other fields
          customer: { id: 'cust-123', phone: '+919876543210' },
        },
        // ... 2 more
      ]);

      const result = await service.processScheduledReminders();

      expect(result.success).toBe(true);
      expect(result.reminderIds).toHaveLength(3);
    });

    it('should handle phone validation error', async () => {
      // Mock: reminder with null phone
      jest.spyOn(prisma.customerReminder, 'findMany').mockResolvedValue([
        {
          id: 'rem-1',
          customer: { id: 'cust-123', phone: null }, // ❌ Invalid
        },
      ]);

      jest.spyOn(prisma.customerReminder, 'update').mockResolvedValue({});

      const result = await service.processScheduledReminders();

      expect(prisma.customerReminder.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            failureReason: 'Customer phone number not found',
          }),
        }),
      );
    });

    it('should skip if tenant WhatsApp disabled', async () => {
      jest.spyOn(prisma.whatsAppSetting, 'findUnique').mockResolvedValue({
        tenantId: 'tenant-1',
        enabled: false, // ❌ Disabled
      });

      // Should mark as SKIPPED, not send
      expect(sender.sendTemplateMessage).not.toHaveBeenCalled();
    });

    it('should not crash on individual reminder error', async () => {
      // Mock: 2 reminders, second one throws
      jest
        .spyOn(prisma.customerReminder, 'findMany')
        .mockResolvedValue([
          { id: 'rem-1' /* valid */ },
          { id: 'rem-2' /* invalid */ },
        ]);

      // Second reminder throws
      jest
        .spyOn(service, 'processSingleReminder')
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Test error'));

      const result = await service.processScheduledReminders();

      // Job should complete, not crash
      expect(result.success).toBe(true);
      expect(result.reminderIds).toContain('rem-1');
      // rem-2 might be in error list or logged
    });

    it('should retry failed reminders', async () => {
      jest.spyOn(prisma.customerReminder, 'updateMany').mockResolvedValue({
        count: 5, // 5 reminders reset
      });

      const count = await service.retryFailedReminders('tenant-1', 10);

      expect(count).toBe(5);
      expect(prisma.customerReminder.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'FAILED',
            tenantId: 'tenant-1',
          }),
          data: expect.objectContaining({
            status: 'SCHEDULED',
            failureReason: null,
            scheduledAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('getReminderStats', () => {
    it('should return stats by status', async () => {
      jest.spyOn(prisma.customerReminder, 'groupBy').mockResolvedValue([
        { status: 'SCHEDULED', _count: { id: 10 } },
        { status: 'SENT', _count: { id: 85 } },
        { status: 'FAILED', _count: { id: 5 } },
      ]);

      const stats = await service.getReminderStats('tenant-1');

      expect(stats).toEqual({
        SCHEDULED: 10,
        SENT: 85,
        FAILED: 5,
      });
    });
  });
});
```

### Integration Tests

```typescript
// File: test/whatsapp-reminders.e2e-spec.ts

describe('WhatsApp Reminders Integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let remindersService: WhatsAppRemindersService;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule], // Full app
    }).compile();

    app = module.createNestApplication();
    await app.init();

    prisma = module.get<PrismaService>(PrismaService);
    remindersService = module.get<WhatsAppRemindersService>(
      WhatsAppRemindersService,
    );
  });

  afterAll(async () => {
    await app.close();
  });

  describe('End-to-End: Create & Send Reminder', () => {
    it('should create reminder and send when scheduled time arrives', async () => {
      // 1. Create a customer
      const customer = await prisma.customer.create({
        data: {
          name: 'Test Customer',
          phone: '+919876543210',
          tenantId: 'test-tenant',
          // ... other required fields
        },
      });

      // 2. Create a scheduled reminder (now)
      const reminder = await prisma.customerReminder.create({
        data: {
          customerId: customer.id,
          tenantId: 'test-tenant',
          channel: 'WHATSAPP',
          templateKey: 'payment_due_reminder',
          triggerType: 'DATE',
          triggerValue: new Date().toISOString().split('T')[0],
          status: 'SCHEDULED',
          scheduledAt: new Date(), // Now
        },
      });

      // 3. Manually trigger service (cron would do this)
      const result = await remindersService.processScheduledReminders();

      // 4. Assert
      expect(result.success).toBe(true);
      expect(result.reminderIds).toContain(reminder.id);

      // 5. Check DB: status should be updated
      const updated = await prisma.customerReminder.findUnique({
        where: { id: reminder.id },
      });

      expect(updated.status).toMatch(/SENT|FAILED|SKIPPED/); // One of these
      expect(updated.sentAt || updated.failureReason).toBeDefined();

      // 6. Check log: attempt should be logged
      const log = await prisma.whatsAppLog.findFirst({
        where: {
          type: 'REMINDER',
          memberId: customer.id,
        },
      });

      expect(log).toBeDefined();
      expect(log?.status).toMatch(/SUCCESS|FAILED|SKIPPED/);
    });

    it('should handle missing phone gracefully', async () => {
      const customer = await prisma.customer.create({
        data: {
          name: 'No Phone Customer',
          phone: null, // ❌ No phone
          tenantId: 'test-tenant',
        },
      });

      const reminder = await prisma.customerReminder.create({
        data: {
          customerId: customer.id,
          tenantId: 'test-tenant',
          channel: 'WHATSAPP',
          templateKey: 'test_template',
          triggerType: 'DATE',
          triggerValue: new Date().toISOString().split('T')[0],
          status: 'SCHEDULED',
          scheduledAt: new Date(),
        },
      });

      const result = await remindersService.processScheduledReminders();

      expect(result.success).toBe(true); // Job succeeds

      const updated = await prisma.customerReminder.findUnique({
        where: { id: reminder.id },
      });

      expect(updated.status).toBe('FAILED');
      expect(updated.failureReason).toContain('phone');
    });
  });

  describe('Idempotency', () => {
    it('should not send reminder twice', async () => {
      const reminder = await prisma.customerReminder.create({
        data: {
          customerId: 'some-customer',
          tenantId: 'test-tenant',
          channel: 'WHATSAPP',
          templateKey: 'test',
          triggerType: 'DATE',
          triggerValue: new Date().toISOString().split('T')[0],
          status: 'SCHEDULED',
          scheduledAt: new Date(),
        },
      });

      // First run
      const run1 = await remindersService.processScheduledReminders();
      expect(run1.reminderIds).toContain(reminder.id);

      // Second run (immediately)
      const run2 = await remindersService.processScheduledReminders();
      expect(run2.reminderIds).not.toContain(reminder.id);

      // Check log: only 1 entry (not 2)
      const logs = await prisma.whatsAppLog.findMany({
        where: {
          type: 'REMINDER',
          memberId: 'some-customer',
        },
      });

      expect(logs).toHaveLength(1);
    });
  });
});
```

---

## Manual Testing

### 1. Create Test Reminder (via Prisma)

```bash
# Open Prisma Studio
npx prisma studio

# Navigate to CustomerReminder table
# Create new record:
{
  "id": "test-rem-1",
  "tenantId": "test-tenant",
  "customerId": "test-cust-1",
  "channel": "WHATSAPP",
  "templateKey": "payment_due_reminder",
  "triggerType": "DATE",
  "triggerValue": "2026-01-28",
  "status": "SCHEDULED",
  "scheduledAt": "2026-01-28T14:00:00Z"
}
```

### 2. Monitor Job Execution

```bash
# Watch logs
npm run start:dev | grep -i reminder

# Expected output:
# [WhatsAppRemindersCron] Starting scheduled reminder processing...
# [WhatsAppRemindersCron] Found 1 pending WhatsApp reminders
# [WhatsAppRemindersCron] Processed 1 WhatsApp reminders
```

### 3. Check Results

```bash
# Via Prisma Studio:
# 1. Reminder status should change to SENT/FAILED/SKIPPED
# 2. sentAt or failureReason should be set
# 3. Check WhatsAppLog for entry with type='REMINDER'
```

### 4. Trigger Manually

```typescript
// In a test endpoint or directly in code:
import { WhatsAppRemindersService } from './whatsapp/whatsapp-reminders.service';

@Get('/admin/test-reminders')
async testReminders(
  @Inject(WhatsAppRemindersService) remindersService: WhatsAppRemindersService,
) {
  const result = await remindersService.processScheduledReminders();
  return result; // { success, reminderIds, error }
}
```

---

## Monitoring & Alerting

### Metrics to Track

```sql
-- Daily success rate
SELECT
  DATE(createdAt) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
  ROUND(100.0 * SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) / COUNT(*), 2) as success_rate
FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND createdAt >= NOW() - INTERVAL '7 days'
GROUP BY DATE(createdAt)
ORDER BY date DESC;

-- Failure analysis
SELECT
  error,
  COUNT(*) as count
FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND status = 'FAILED'
  AND createdAt >= NOW() - INTERVAL '24 hours'
GROUP BY error
ORDER BY count DESC;

-- Pending reminders (not yet sent)
SELECT COUNT(*) as pending
FROM "CustomerReminder"
WHERE status = 'SCHEDULED'
  AND channel = 'WHATSAPP'
  AND scheduledAt <= NOW();
```

### Alert Rules (Recommended)

```
IF pending_reminders > 100 for 15 minutes
  THEN alert("High pending reminders")

IF failure_rate > 10% in last hour
  THEN alert("High reminder failure rate")

IF no_reminders_processed in 30 minutes
  THEN alert("Reminder job may be stuck")
```

---

## Troubleshooting

### Problem: Reminders Not Sending

**Check 1**: Pending reminders exist?

```sql
SELECT COUNT(*) FROM "CustomerReminder"
WHERE status = 'SCHEDULED'
  AND channel = 'WHATSAPP'
  AND scheduledAt <= NOW();
```

**Check 2**: Logs show job is running?

```bash
npm run start:dev | grep "WhatsAppRemindersCron"
```

**Check 3**: WhatsApp enabled for tenant?

```sql
SELECT * FROM "WhatsAppSetting"
WHERE tenantId = 'your-tenant' AND enabled = true;
```

**Check 4**: Customer phone exists?

```sql
SELECT customerId, phone FROM "Customer"
WHERE id = 'your-customer';
```

**Check 5**: Recent failures?

```sql
SELECT * FROM "CustomerReminder"
WHERE status = 'FAILED'
  AND updatedAt >= NOW() - INTERVAL '1 hour'
ORDER BY updatedAt DESC;
```

### Problem: Job Running But Nothing Happening

**Cause 1**: No pending reminders (nothing due yet)

- Check: `scheduledAt <= NOW()` condition

**Cause 2**: Tenant WhatsApp disabled

- Fix: Enable in WhatsAppSetting

**Cause 3**: Job running but no logs

- Check: Logger is injected correctly

---

## Deployment Checklist

- [x] Code written: whatsapp-reminders.service.ts
- [x] Cron job written: whatsapp-reminders.cron.ts
- [x] Module updated: whatsapp.module.ts
- [x] Error handling: Graceful per-reminder
- [x] Logging: WhatsAppLog entries
- [x] Idempotency: Status-based queries
- [ ] Unit tests written
- [ ] E2E tests written
- [ ] Manual testing done
- [ ] Monitoring alerts configured
- [ ] Documentation complete ✅
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Tested in staging
- [ ] Deployed to production
- [ ] Monitoring active

---

## Production Runbook

### Daily Checks

```bash
# 1. Check recent failures
SELECT COUNT(*) as failures_24h
FROM "WhatsAppLog"
WHERE type = 'REMINDER' AND status = 'FAILED'
  AND createdAt >= NOW() - INTERVAL '24 hours';

# If > 10: Investigate failures

# 2. Check pending queue
SELECT COUNT(*) as pending
FROM "CustomerReminder"
WHERE status = 'SCHEDULED' AND scheduledAt <= NOW();

# If > 100: May indicate job issue

# 3. Check success rate
SELECT COUNT(*) as total,
       SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as success
FROM "WhatsAppLog"
WHERE type = 'REMINDER'
  AND createdAt >= NOW() - INTERVAL '24 hours';
```

### On Failure

1. Check logs: `npm run logs | grep reminder`
2. Check DB: Is WhatsApp enabled? Phone numbers valid?
3. Manual retry: `retryFailedReminders(tenantId)`
4. Alert team if failure rate > 10%

---

**Integration & Testing Guide Complete** ✅
