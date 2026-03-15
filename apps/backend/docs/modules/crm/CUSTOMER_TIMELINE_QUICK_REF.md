# Customer Timeline - Quick Reference

## API Endpoints

### Get Timeline

```
GET /api/crm/timeline/:customerId
Query: tenantId, page, pageSize, sources, types, startDate, endDate, shopId, sortOrder
```

### Get Stats

```
GET /api/crm/timeline/:customerId/stats
Query: tenantId
```

## Timeline Sources (9)

| Source    | Icon | Activities                                               | Model              |
| --------- | ---- | -------------------------------------------------------- | ------------------ |
| INVOICE   | 🧾   | INVOICE_CREATED, INVOICE_PAID, INVOICE_CREDIT            | Invoice            |
| JOB       | 🔧   | JOB_CREATED, JOB_STATUS_CHANGED, JOB_DELIVERED           | JobCard            |
| RECEIPT   | 💰   | PAYMENT_RECEIVED, RECEIPT_CREATED                        | Receipt            |
| QUOTATION | 📋   | QUOTATION_CREATED, QUOTATION_SENT, QUOTATION_ACCEPTED    | Quotation          |
| FOLLOW_UP | 📞   | FOLLOWUP_CREATED, FOLLOWUP_COMPLETED, FOLLOWUP_CANCELLED | CustomerFollowUp   |
| REMINDER  | 🔔   | REMINDER_SENT, REMINDER_FAILED                           | CustomerReminder   |
| WHATSAPP  | 💬   | WHATSAPP_SENT, WHATSAPP_FAILED, WHATSAPP_DELIVERED       | WhatsAppLog        |
| LOYALTY   | ⭐   | LOYALTY_EARNED, LOYALTY_REDEEMED                         | LoyaltyTransaction |
| ALERT     | ℹ️   | ALERT_CREATED, ALERT_RESOLVED                            | CustomerAlert      |

## Response Structure

```typescript
{
  items: [{
    id: string;               // Unique: "source-type-refId"
    type: TimelineActivityType;
    source: TimelineSource;
    title: string;            // e.g. "Invoice #INV-001 Created"
    description: string;      // Details
    icon: string;             // Emoji icon
    referenceId: string;      // Original record ID
    referenceType: string;    // Model name
    referenceUrl?: string;    // Frontend link
    amount?: number;          // If monetary
    status?: string;          // If applicable
    createdAt: Date;          // Activity timestamp
    shopName?: string;
    metadata?: Record<string, any>;
  }],
  total: number,
  page: number,
  pageSize: number,
  hasMore: boolean
}
```

## Filter Examples

### By Source

```
?sources=INVOICE,JOB
```

### By Type

```
?types=INVOICE_PAID,JOB_DELIVERED
```

### By Date Range

```
?startDate=2026-01-01&endDate=2026-01-31
```

### By Shop

```
?shopId=shop-main
```

### Pagination

```
?page=2&pageSize=50
```

## Usage Pattern

```typescript
// Fetch timeline
const response = await fetch(
  `/api/crm/timeline/${customerId}?` +
    `tenantId=${tenantId}&` +
    `page=1&pageSize=20&` +
    `sources=INVOICE,JOB`,
);
const { items, total, hasMore } = await response.json();

// Display items
items.forEach((item) => {
  console.log(`${item.icon} ${item.title} - ${item.description}`);
});
```

## Performance

- **Parallel Queries**: All sources queried simultaneously
- **Typical Response**: 25-35ms
- **Max Page Size**: 100 items
- **Suitable For**: Up to 1000 activities per customer
- **Optimization**: Use source/type filters to reduce load

## Key Files

```
src/timeline/
  ├── timeline.enum.ts                     # Source & Type enums
  ├── dto/timeline.dto.ts                  # DTOs
  ├── customer-timeline.service.ts         # Aggregation logic
  ├── customer-timeline.controller.ts      # REST endpoints
  └── customer-timeline.module.ts          # NestJS module
```

## Activity Type Icons

| Type                 | Icon | Example                      |
| -------------------- | ---- | ---------------------------- |
| Invoice Created      | 🧾   | "Invoice #INV-001 Created"   |
| Invoice Paid         | ✅   | "Invoice #INV-001 Paid"      |
| Job Created          | 🔧   | "Job Card #JC-001 Created"   |
| Job Delivered        | ✅   | "Job #JC-001 Delivered"      |
| Payment Received     | 💰   | "Payment of ₹5,000 received" |
| Quotation Created    | 📋   | "Quote #QT-001 sent"         |
| Follow-up (Call)     | 📞   | "Called customer"            |
| Follow-up (WhatsApp) | 💬   | "WhatsApp follow-up"         |
| Follow-up (Visit)    | 👤   | "In-person visit"            |
| Follow-up (Email)    | 📧   | "Email sent"                 |
| Follow-up (SMS)      | 📱   | "SMS sent"                   |
| Reminder Sent        | 🔔   | "Payment reminder sent"      |
| WhatsApp Sent        | 💬   | "WhatsApp message sent"      |
| Loyalty Earned       | ⭐   | "+100 points earned"         |
| Loyalty Redeemed     | 🎁   | "-50 points redeemed"        |
| Alert (Info)         | ℹ️   | "Customer info alert"        |
| Alert (Warning)      | ⚠️   | "Payment overdue"            |
| Alert (Critical)     | 🔴   | "Account suspended"          |

## Integration Steps

1. **Import Module** in `app.module.ts`:

```typescript
import { CustomerTimelineModule } from './timeline/customer-timeline.module';

@Module({
  imports: [
    // ... other modules
    CustomerTimelineModule,
  ],
})
```

2. **Add Auth Guard** (optional):

```typescript
@Controller('api/crm/timeline')
@UseGuards(JwtAuthGuard)
export class CustomerTimelineController {}
```

3. **Test Endpoint**:

```bash
curl "http://localhost_REPLACED:3000/api/crm/timeline/cust-123?tenantId=tenant-1"
```

## Adding New Source

1. Add enum to `TimelineSource` and `TimelineActivityType`
2. Create `getNewSourceActivities()` method in service
3. Add to `Promise.all()` in `getCustomerTimeline()`
4. Aggregate with existing activities

## Stats Response

```typescript
{
  totalInvoices: 12,
  totalJobs: 8,
  totalFollowUps: 5,
  loyaltyPoints: 450,
  lastInvoiceDate: "2026-01-28T10:30:00Z",
  lastInvoiceAmount: 15000,
  lastJobDate: "2026-01-27T15:00:00Z",
  lastJobStatus: "IN_PROGRESS"
}
```

---

**Documentation**: See [CUSTOMER_TIMELINE_IMPLEMENTATION.md](CUSTOMER_TIMELINE_IMPLEMENTATION.md) for complete details
