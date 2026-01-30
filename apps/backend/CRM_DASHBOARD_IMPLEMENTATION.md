# CRM Dashboard Implementation Guide

## 📊 Overview

The CRM Dashboard provides comprehensive business intelligence for multi-tenant ERP systems. It aggregates key performance indicators (KPIs) across customer management, follow-ups, financials, loyalty programs, and WhatsApp communications.

**Module Location:** `src/core/crm-dashboard/`

---

## 🎯 Key Features

### 1. **Customer Metrics**

- Total customers count
- Active vs inactive customers (activity within last 90 days)
- New customers (last 7 and 30 days)
- Repeat customers (>1 invoice)
- Repeat rate percentage

### 2. **Follow-Up Metrics**

- Due today (PENDING status, scheduled for today)
- Overdue (PENDING status, past due date)
- Pending (PENDING status, future scheduled)
- Completed this week (DONE status, updated in last 7 days)

### 3. **Financial Metrics**

- Total outstanding amount (CREDIT status invoices)
- High-value customers (top 10 by total spend)
  - Customer ID and name
  - Total spent
  - Invoice count
  - Last invoice date

### 4. **Loyalty Metrics**

- Total points issued (positive transactions in date range)
- Total points redeemed (negative transactions in date range)
- Net points balance (issued - redeemed)
- Active customers with points (loyaltyPoints > 0)

### 5. **WhatsApp Metrics**

- Total messages sent (in date range)
- Successful deliveries
- Failed deliveries
- Success rate percentage
- Last 7 days trend (daily breakdown with sent/successful counts)

---

## 🏗️ Architecture

### Module Structure

```
src/core/crm-dashboard/
├── dto/
│   ├── dashboard-query.dto.ts    # Query parameters with date presets
│   └── dashboard-response.dto.ts # Response interfaces
├── crm-dashboard.service.ts      # KPI query logic
├── crm-dashboard.controller.ts   # REST endpoint
└── crm-dashboard.module.ts       # Module registration
```

### Database Models Used

- **Customer**: Base customer data, loyalty points
- **Invoice**: Financial transactions
- **CustomerFollowUp**: Follow-up tasks
- **LoyaltyTransaction**: Points issued/redeemed
- **WhatsAppLog**: Message delivery logs

---

## 🔌 API Endpoint

### GET `/api/core/crm-dashboard`

**Authentication:** JWT required (`@UseGuards(JwtAuthGuard)`)

**Authorization:** OWNER or ADMIN role only

**Query Parameters:**

| Parameter   | Type            | Required | Description                                      |
| ----------- | --------------- | -------- | ------------------------------------------------ |
| `preset`    | DateRangePreset | No       | Predefined date range (TODAY, LAST_7_DAYS, etc.) |
| `startDate` | ISO 8601 string | No       | Custom start date (use with preset=CUSTOM)       |
| `endDate`   | ISO 8601 string | No       | Custom end date (use with preset=CUSTOM)         |
| `shopId`    | string (CUID)   | No       | Filter by specific shop                          |

**Date Range Presets:**

- `TODAY` - Start and end of today
- `LAST_7_DAYS` - Last 7 days from now
- `LAST_30_DAYS` - Last 30 days from now (default)
- `LAST_90_DAYS` - Last 90 days from now
- `THIS_MONTH` - Current calendar month
- `LAST_MONTH` - Previous calendar month
- `CUSTOM` - Use `startDate` and `endDate` parameters

---

## 📥 Request Examples

### Example 1: Last 30 Days (Default)

```bash
GET /api/core/crm-dashboard
Authorization: Bearer <jwt_token>
```

### Example 2: This Month

```bash
GET /api/core/crm-dashboard?preset=THIS_MONTH
Authorization: Bearer <jwt_token>
```

### Example 3: Custom Date Range

```bash
GET /api/core/crm-dashboard?preset=CUSTOM&startDate=2024-01-01&endDate=2024-01-31
Authorization: Bearer <jwt_token>
```

### Example 4: Specific Shop, Last 7 Days

```bash
GET /api/core/crm-dashboard?preset=LAST_7_DAYS&shopId=cluxy123abc
Authorization: Bearer <jwt_token>
```

---

## 📤 Response Structure

```typescript
{
  "customers": {
    "total": 1250,
    "active": 850,
    "inactive": 400,
    "newCustomers": {
      "last7Days": 25,
      "last30Days": 120
    },
    "repeatCustomers": 450,
    "repeatRate": 36.00
  },
  "followUps": {
    "dueToday": 15,
    "overdue": 8,
    "pending": 42,
    "completedThisWeek": 35
  },
  "financials": {
    "totalOutstanding": 125000,
    "highValueCustomers": [
      {
        "customerId": "cluxy123",
        "customerName": "ABC Enterprises",
        "totalSpent": 250000,
        "invoiceCount": 45,
        "lastInvoiceDate": "2024-01-15T10:30:00.000Z"
      }
      // ... top 10 customers
    ]
  },
  "loyalty": {
    "totalPointsIssued": 15000,
    "totalPointsRedeemed": 8500,
    "netPointsBalance": 6500,
    "activeCustomersWithPoints": 320
  },
  "whatsapp": {
    "totalSent": 500,
    "successful": 475,
    "failed": 25,
    "successRate": 95.00,
    "last7Days": [
      {
        "date": "2024-01-10",
        "sent": 75,
        "successful": 72
      }
      // ... daily breakdown
    ]
  },
  "dateRange": {
    "startDate": "2023-12-15T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.999Z",
    "preset": "LAST_30_DAYS"
  },
  "generatedAt": "2024-01-15T14:30:00.000Z"
}
```

---

## ⚙️ Query Strategy

### Performance Optimizations

1. **Parallel Execution**: All 5 KPI groups fetched simultaneously via `Promise.all()`
2. **Aggregates Over Joins**: Uses Prisma `count()`, `aggregate()`, and `groupBy()` for fast queries
3. **Indexed Fields**: Leverages existing indexes on `tenantId`, `customerId`, `createdAt`, `status`
4. **Minimal Data Transfer**: Only selects required fields (e.g., `select: { id: true, name: true }`)
5. **Filtered Queries**: Null checks on optional fields (e.g., `customerId: { not: null }`)

### Customer Active Definition

A customer is considered **active** if they have at least one invoice within the last **90 days**.

```typescript
// Active customer logic
const ninetyDaysAgo = new Date();
ninetyDaysAgo.setDate(now.getDate() - 90);

const activeCustomerIds = await prisma.invoice.findMany({
  where: {
    tenantId,
    invoiceDate: { gte: ninetyDaysAgo },
  },
  select: { customerId: true },
  distinct: ['customerId'],
});
```

### Repeat Customer Definition

A customer is considered **repeat** if they have **more than 1 invoice** (all-time).

```typescript
// Repeat customer logic
const customerInvoiceCounts = await prisma.invoice.groupBy({
  by: ['customerId'],
  where: { tenantId },
  _count: { id: true },
  having: {
    id: { _count: { gt: 1 } },
  },
});
```

### Outstanding Amount Definition

Total outstanding = Sum of all invoices with `status = 'CREDIT'` (unpaid invoices).

```typescript
// Outstanding logic
const unpaidInvoices = await prisma.invoice.aggregate({
  where: {
    tenantId,
    status: 'CREDIT',
  },
  _sum: { totalAmount: true },
});
```

---

## 🛡️ Security & Permissions

### Role-Based Access

```typescript
// Only OWNER or ADMIN can access dashboard
if (role !== UserRole.OWNER && role !== UserRole.ADMIN) {
  throw new ForbiddenException(
    'Only Owners and Admins can access CRM dashboard',
  );
}
```

### Tenant Isolation

All queries automatically scoped to `req.user.tenantId` extracted from JWT. No cross-tenant data leakage.

```typescript
const tenantId = req.user.tenantId; // From JWT payload
// All Prisma queries include: where: { tenantId }
```

---

## 📊 Frontend Integration

### Chart Recommendations

1. **Customer Metrics**
   - **Card Grid**: Display total, active, inactive as metric cards
   - **Line Chart**: New customers trend (7-day vs 30-day)
   - **Pie Chart**: Active vs Inactive distribution
   - **Gauge**: Repeat rate percentage

2. **Follow-Up Metrics**
   - **Kanban Board**: Due today, Overdue, Pending columns
   - **Bar Chart**: Completed this week vs pending
   - **Badge**: Overdue count (red highlight)

3. **Financial Metrics**
   - **Metric Card**: Total outstanding amount
   - **Table**: High-value customers (sortable by total spent)
   - **Bar Chart**: Top 10 customers by revenue

4. **Loyalty Metrics**
   - **Stacked Bar**: Issued vs Redeemed points
   - **Metric Card**: Net balance
   - **Card**: Active customers with points

5. **WhatsApp Metrics**
   - **Line Chart**: 7-day delivery trend (sent vs successful)
   - **Donut Chart**: Success vs Failed distribution
   - **Metric Card**: Success rate percentage

### Sample React Component Structure

```typescript
interface DashboardProps {
  datePreset: DateRangePreset;
  shopId?: string;
}

function CrmDashboard({ datePreset, shopId }: DashboardProps) {
  const { data, loading, error } = useDashboard({ datePreset, shopId });

  return (
    <Grid>
      <CustomerMetricsCard data={data.customers} />
      <FollowUpMetricsCard data={data.followUps} />
      <FinancialMetricsCard data={data.financials} />
      <LoyaltyMetricsCard data={data.loyalty} />
      <WhatsAppMetricsCard data={data.whatsapp} />
    </Grid>
  );
}
```

---

## 🧪 Testing Recommendations

### Unit Tests (Service)

```typescript
describe('CrmDashboardService', () => {
  it('should calculate customer metrics correctly', async () => {
    // Mock Prisma responses
    const metrics = await service.getCustomerMetrics(tenantId, start, end);
    expect(metrics.total).toBe(100);
    expect(metrics.repeatRate).toBe(45.0);
  });

  it('should filter by shopId when provided', async () => {
    const metrics = await service.getDashboardMetrics(tenantId, {
      preset: DateRangePreset.LAST_30_DAYS,
      shopId: 'shop123',
    });
    // Verify Prisma was called with shopId filter
  });
});
```

### E2E Tests (Controller)

```typescript
describe('CRM Dashboard API', () => {
  it('should return 403 for STAFF role', async () => {
    const response = await request(app)
      .get('/api/core/crm-dashboard')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(response.status).toBe(403);
  });

  it('should return dashboard metrics for OWNER', async () => {
    const response = await request(app)
      .get('/api/core/crm-dashboard?preset=LAST_7_DAYS')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('customers');
    expect(response.body).toHaveProperty('followUps');
  });
});
```

---

## ⚠️ Known Limitations & Future Enhancements

### Current Limitations

1. **No Caching**: Dashboard queries run fresh every request (can be slow with large datasets)
2. **Fixed Active Window**: 90-day active definition is hardcoded
3. **No Export**: No CSV/PDF export functionality
4. **Limited Filtering**: Only shop-level filtering (no date range per metric)

### Recommended Enhancements

1. **Redis Caching**: Cache dashboard results for 5-10 minutes
2. **Scheduled Snapshots**: Pre-calculate daily snapshots for historical trends
3. **Configurable Thresholds**: Allow tenants to define "active customer" window
4. **Export API**: Generate CSV/Excel exports for reporting
5. **Drill-Down API**: Separate endpoints for detailed customer lists
6. **Real-Time Updates**: WebSocket notifications for follow-up changes

---

## 🐛 Troubleshooting

### Issue: "Only Owners and Admins can access CRM dashboard"

**Cause:** User role is STAFF or USER

**Solution:** Ensure JWT contains `role: "OWNER"` or `role: "ADMIN"`

### Issue: Empty metrics returned

**Cause:** No data in date range or tenant has no records

**Solution:**

1. Verify data exists in database for tenant
2. Try wider date range (e.g., `LAST_90_DAYS`)
3. Remove `shopId` filter to check all shops

### Issue: Slow query performance

**Cause:** Large dataset without indexes

**Solution:**

1. Ensure Prisma migrations have created indexes
2. Run `ANALYZE` on PostgreSQL tables
3. Consider implementing caching layer

---

## 📚 Related Documentation

- [Follow-Ups Module](FOLLOW_UPS_IMPLEMENTATION.md)
- [WhatsApp Reminders](WHATSAPP_REMINDERS_IMPLEMENTATION.md)
- [Customer Management](CUSTOMER_MANAGEMENT_IMPLEMENTATION.md)
- [Prisma Schema Reference](../prisma/schema.prisma)

---

## 📝 Module Registration

The CRM Dashboard module is registered in `CoreModule`:

```typescript
// src/core/core.module.ts
import { CrmDashboardModule } from './crm-dashboard/crm-dashboard.module';

@Module({
  imports: [
    // ... other modules
    CrmDashboardModule,
  ],
})
export class CoreModule {}
```

---

## ✅ Completion Checklist

- [x] Service with 9 KPI queries implemented
- [x] Controller with role-based access control
- [x] DTOs for query parameters and responses
- [x] Module registered in CoreModule
- [x] Date range presets (7 options)
- [x] Tenant isolation enforced
- [x] Performance optimizations (parallel queries, aggregates)
- [ ] Unit tests for service methods
- [ ] E2E tests for controller endpoint
- [ ] Frontend integration (separate repository)
- [ ] Caching layer (future enhancement)
- [ ] Export functionality (future enhancement)
