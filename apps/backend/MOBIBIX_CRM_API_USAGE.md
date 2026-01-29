# MobiBix ↔ CORE CRM API Integration Guide

## 📋 Overview

This guide shows how MobiBix (mobile repair app) calls CORE CRM APIs for:

1. Dashboard KPIs
2. Follow-ups CRUD
3. Customer Timeline
4. WhatsApp messages

**Key Principle:** MobiBix is a consumer, not an owner. All CRM logic stays in CORE.

---

## 🔌 API Endpoints Reference

### 1. CRM Dashboard Metrics

**MobiBix Endpoint:**

```
GET /mobibix/crm/dashboard
Query: ?preset=LAST_30_DAYS&shopId=cluxy123
Auth: Bearer {jwt}
```

**Proxies to CORE:**

```
GET /api/core/crm-dashboard
```

**Example Request (TypeScript/React):**

```typescript
const fetchDashboard = async (preset = 'LAST_30_DAYS', shopId?: string) => {
  const response = await fetch('/mobibix/crm/dashboard', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    params: { preset, shopId },
  });

  return response.json();
};

// Usage
const dashboard = await fetchDashboard('LAST_30_DAYS');
console.log(dashboard.customers.total); // 1250
console.log(dashboard.financials.totalOutstanding); // 125000
console.log(dashboard.whatsapp.successRate); // 95
```

**Response Structure:**

```typescript
{
  customers: {
    total: number;
    active: number;
    inactive: number;
    newCustomers: {
      (last7Days, last30Days);
    }
    repeatCustomers: number;
    repeatRate: number;
  }
  followUps: {
    dueToday: number;
    overdue: number;
    pending: number;
    completedThisWeek: number;
  }
  financials: {
    totalOutstanding: number;
    highValueCustomers: [
      { customerId, customerName, totalSpent, invoiceCount, lastInvoiceDate },
    ];
  }
  loyalty: {
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    netPointsBalance: number;
    activeCustomersWithPoints: number;
  }
  whatsapp: {
    totalSent: number;
    successful: number;
    failed: number;
    successRate: number;
    last7Days: [{ date, sent, successful }];
  }
  dateRange: {
    (startDate, endDate, preset);
  }
  generatedAt: string;
}
```

---

### 2. Follow-ups Management

#### A. Get My Follow-ups

**MobiBix Endpoint:**

```
GET /mobibix/crm/follow-ups
Auth: Bearer {jwt}
```

**Example Request:**

```typescript
const fetchMyFollowUps = async () => {
  const response = await fetch('/mobibix/crm/follow-ups', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.json();
};

// Usage: Display in "My Follow-ups" widget
const followUps = await fetchMyFollowUps();
console.log(followUps[0].purpose); // "Check repair status"
console.log(followUps[0].followUpAt); // "2024-01-18T10:00:00Z"
console.log(followUps[0].status); // "PENDING"
```

**Response:**

```typescript
[
  {
    id: string;
    customerId: string;
    type: 'PHONE_CALL' | 'EMAIL' | 'VISIT' | 'GENERAL';
    purpose: string;
    followUpAt: string; // ISO date
    status: 'PENDING' | 'DONE' | 'CANCELLED';
    assignedToUserId?: string;
    assignedToUser?: { id, name, email };
    customer: { id, name, phone, email };
    createdAt: string;
    updatedAt: string;
  }
  // ...
]
```

#### B. Create Follow-up (from Job Card)

**MobiBix Endpoint:**

```
POST /mobibix/crm/follow-ups
Auth: Bearer {jwt}
Body: { customerId, type, purpose, followUpAt, assignedToUserId, shopId }
```

**Example Request:**

```typescript
const createFollowUp = async (jobCard, scheduledDays = 3) => {
  // Called when staff clicks "Add Follow-up" on Job Card detail

  const followUpDate = new Date();
  followUpDate.setDate(followUpDate.getDate() + scheduledDays);

  const response = await fetch('/mobibix/crm/follow-ups', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId: jobCard.customerId,
      type: 'PHONE_CALL',
      purpose: `Check on repair: ${jobCard.deviceModel} - Job #${jobCard.jobNumber}`,
      followUpAt: followUpDate.toISOString(),
      assignedToUserId: currentUserId,
      shopId: jobCard.shopId
    })
  });

  const newFollowUp = await response.json();
  console.log(`Follow-up created: ${newFollowUp.id}`);
  return newFollowUp;
};

// Usage in Job Card detail page
<Button onClick={() => createFollowUp(jobCard)}>
  Add Follow-up
</Button>
```

#### C. Update Follow-up Status

**MobiBix Endpoint:**

```
PATCH /mobibix/crm/follow-ups/{id}
Auth: Bearer {jwt}
Body: { status: 'PENDING' | 'DONE' | 'CANCELLED' }
```

**Example Request:**

```typescript
const markFollowUpDone = async (followUpId) => {
  const response = await fetch(`/mobibix/crm/follow-ups/${followUpId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status: 'DONE' })
  });

  return response.json();
};

// Usage: Clicked "Mark Done" on follow-up widget
<Button onClick={() => markFollowUpDone(followUp.id)}>
  ✓ Mark Done
</Button>
```

---

### 3. Customer Timeline

**MobiBix Endpoint:**

```
GET /mobibix/crm/customer-timeline/{customerId}
Query: ?source=JOB,INVOICE,CRM,WHATSAPP (optional filter)
Auth: Bearer {jwt}
```

**Example Request:**

```typescript
const fetchCustomerTimeline = async (customerId, source = 'ALL') => {
  const params = source !== 'ALL' ? `?source=${source}` : '';
  const response = await fetch(
    `/mobibix/crm/customer-timeline/${customerId}${params}`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );
  return response.json();
};

// Usage 1: Embedded in Customer Profile
const timeline = await fetchCustomerTimeline('cluabc456');
{timeline.items.map(item => (
  <TimelineItem key={item.id} item={item} />
))}

// Usage 2: Filtered to show only job-related events
const jobTimeline = await fetchCustomerTimeline('cluabc456', 'JOB');

// Usage 3: Show all sources (default)
const allEvents = await fetchCustomerTimeline('cluabc456');
```

**Response:**

```typescript
{
  items: [
    {
      id: string;
      customerId: string;
      type: string;  // e.g., 'JOB_CARD_CREATED', 'INVOICE_PAID', 'FOLLOW_UP_COMPLETED'
      title: string;
      description: string;
      timestamp: string; // ISO date
      source: 'JOB' | 'INVOICE' | 'CRM' | 'WHATSAPP';
      relatedId: string; // jobCardId or invoiceId
      metadata: Record<string, any>; // context data
    },
    // ... more items
  ],
  totalCount: number;
  filtered: {
    job: number;
    invoice: number;
    crm: number;
    whatsapp: number;
  };
}
```

**UI Pattern:**

```tsx
const CustomerTimeline = ({ customerId }) => {
  const [timeline, setTimeline] = useState([]);
  const [sourceFilter, setSourceFilter] = useState('ALL');

  useEffect(() => {
    fetchCustomerTimeline(customerId, sourceFilter).then(setTimeline);
  }, [customerId, sourceFilter]);

  return (
    <div>
      <Select value={sourceFilter} onChange={setSourceFilter}>
        <Option value="ALL">All Events</Option>
        <Option value="JOB">Job Cards Only</Option>
        <Option value="INVOICE">Invoices Only</Option>
        <Option value="CRM">Follow-ups Only</Option>
        <Option value="WHATSAPP">WhatsApp Messages</Option>
      </Select>

      {timeline.items.map((item) => (
        <TimelineEntry key={item.id}>
          <TimelineIcon source={item.source} />
          <TimelineContent>
            <h4>{item.title}</h4>
            <p>{item.description}</p>
            <time>{formatDate(item.timestamp)}</time>
          </TimelineContent>
        </TimelineEntry>
      ))}
    </div>
  );
};
```

---

### 4. WhatsApp Message Sending

**MobiBix Endpoint:**

```
POST /mobibix/crm/whatsapp/send
Auth: Bearer {jwt}
Body: { customerId, phone, message, source, sourceId }
```

**Example Request 1: Job Ready Notification**

```typescript
const sendJobReadyNotification = async (jobCard) => {
  const response = await fetch('/mobibix/crm/whatsapp/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId: jobCard.customerId,
      phone: jobCard.customer.phone,
      message: `Your ${jobCard.deviceModel} is ready for pickup! Job #${jobCard.jobNumber}`,
      source: 'JOB_READY',
      sourceId: jobCard.id
    })
  });

  const result = await response.json();
  console.log(`WhatsApp sent: ${result.messageId}`);
  return result;
};

// Usage: In Job Card detail screen
<Button onClick={() => sendJobReadyNotification(jobCard)}>
  📱 Send "Ready" WhatsApp
</Button>
```

**Example Request 2: Invoice Payment Reminder**

```typescript
const sendInvoiceReminder = async (invoice) => {
  const response = await fetch('/mobibix/crm/whatsapp/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId: invoice.customerId,
      phone: invoice.customer.phone,
      message: `Reminder: Your invoice INV-${invoice.invoiceNumber} for ₹${invoice.totalAmount} is due. Please arrange payment.`,
      source: 'INVOICE_REMINDER',
      sourceId: invoice.id
    })
  });

  return response.json();
};

// Usage: In Invoice detail screen
<Button onClick={() => sendInvoiceReminder(invoice)}>
  💳 Send Payment Reminder
</Button>
```

**Response:**

```typescript
{
  success: true;
  messageId: string;
  status: 'QUEUED' | 'SENT' | 'FAILED';
  phone: string;
  sentAt: string; // ISO date
  error?: string; // if status === FAILED
}
```

---

## 🎨 UI Component Examples

### MobiBix Home Screen Layout

```tsx
import { CrmIntegrationService } from './services/crm-integration.service';

const MobiBixHome = () => {
  const [dashboard, setDashboard] = useState(null);
  const crmIntegration = useService(CrmIntegrationService);

  useEffect(() => {
    // Fetch dashboard on mount
    crmIntegration.getDashboardMetrics('LAST_30_DAYS').then(setDashboard);
  }, []);

  if (!dashboard) return <LoadingSpinner />;

  return (
    <Page title="MobiBix Home">
      {/* Row 1: Key Metrics */}
      <MetricRow>
        <MetricCard
          title="Total Customers"
          value={dashboard.customers.total}
          trend={dashboard.customers.newCustomers.last7Days}
          trendLabel="New (7d)"
        />
        <MetricCard
          title="Outstanding"
          value={formatCurrency(dashboard.financials.totalOutstanding)}
          color="alert"
        />
        <MetricCard
          title="Follow-ups Due"
          value={dashboard.followUps.dueToday}
          badge={
            dashboard.followUps.overdue > 0
              ? `${dashboard.followUps.overdue} overdue`
              : ''
          }
          color={dashboard.followUps.overdue > 0 ? 'warning' : 'success'}
        />
      </MetricRow>

      {/* Row 2: Widgets */}
      <WidgetRow>
        <MyFollowUpsWidget /> {/* Calls /mobibix/crm/follow-ups */}
        <TopCustomersWidget
          customers={dashboard.financials.highValueCustomers}
        />
      </WidgetRow>

      {/* Row 3: WhatsApp Stats */}
      <WidgetRow>
        <WhatsAppStatsWidget
          successRate={dashboard.whatsapp.successRate}
          last7Days={dashboard.whatsapp.last7Days}
        />
        <LoyaltyWidget
          balance={dashboard.loyalty.netPointsBalance}
          activeCustomers={dashboard.loyalty.activeCustomersWithPoints}
        />
      </WidgetRow>

      {/* Date Range Selector (refreshes all above) */}
      <DateRangeSelector />
    </Page>
  );
};
```

### My Follow-ups Widget

```tsx
const MyFollowUpsWidget = () => {
  const [followUps, setFollowUps] = useState([]);
  const crmIntegration = useService(CrmIntegrationService);

  useEffect(() => {
    crmIntegration.getMyFollowUps().then(setFollowUps);
  }, []);

  const dueToday = followUps.filter((f) => isTodayDate(f.followUpAt));
  const overdue = followUps.filter((f) => isPastDate(f.followUpAt));
  const upcoming = followUps.filter((f) => isFutureDate(f.followUpAt));

  return (
    <Widget title="My Follow-ups">
      <Bucket
        label="Due Today"
        count={dueToday.length}
        items={dueToday}
        color="blue"
      />
      <Bucket
        label="Overdue"
        count={overdue.length}
        items={overdue}
        color="red"
      />
      <Bucket
        label="Upcoming"
        count={upcoming.length}
        items={upcoming}
        color="gray"
      />

      <Button onClick={() => showCreateFollowUpModal()} icon="plus">
        New Follow-up
      </Button>
    </Widget>
  );
};

// Bucket Component
const Bucket = ({ label, count, items, color }) => (
  <div className={`bucket bucket-${color}`}>
    <h4>
      {label} ({count})
    </h4>
    <ul>
      {items.slice(0, 3).map((item) => (
        <li key={item.id}>
          <span>{item.customer.name}</span>
          <small>{item.purpose}</small>
          <Button size="small" onClick={() => markFollowUpDone(item.id)}>
            ✓
          </Button>
        </li>
      ))}
    </ul>
  </div>
);
```

### Customer Timeline Component

```tsx
const CustomerTimeline = ({ customerId }) => {
  const [timeline, setTimeline] = useState(null);
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const crmIntegration = useService(CrmIntegrationService);

  useEffect(() => {
    const params = sourceFilter === 'ALL' ? '' : sourceFilter;
    crmIntegration.getCustomerTimeline(customerId, params).then(setTimeline);
  }, [customerId, sourceFilter]);

  if (!timeline) return <LoadingSpinner />;

  const sourceOptions = [
    { value: 'ALL', label: 'All Events' },
    { value: 'JOB', label: `Job Cards (${timeline.filtered.job})` },
    { value: 'INVOICE', label: `Invoices (${timeline.filtered.invoice})` },
    { value: 'CRM', label: `Follow-ups (${timeline.filtered.crm})` },
    { value: 'WHATSAPP', label: `Messages (${timeline.filtered.whatsapp})` },
  ];

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h3>Activity Timeline</h3>
        <Select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          options={sourceOptions}
        />
      </div>

      <div className="timeline">
        {timeline.items.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
};

const TimelineItem = ({ item }) => {
  const sourceIcon = {
    JOB: '🔧',
    INVOICE: '🧾',
    CRM: '📋',
    WHATSAPP: '💬',
  }[item.source];

  return (
    <div className={`timeline-item source-${item.source.toLowerCase()}`}>
      <div className="timeline-icon">{sourceIcon}</div>
      <div className="timeline-content">
        <h5>{item.title}</h5>
        <p>{item.description}</p>
        {item.metadata && (
          <details>
            <summary>Details</summary>
            <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
          </details>
        )}
        <time>{formatRelativeDate(item.timestamp)}</time>
      </div>
    </div>
  );
};
```

---

## 🔄 Event-Driven Wiring (Advanced)

For automatic CRM updates when MobiBix events occur:

```typescript
// mobibix/job-cards/job-card.service.ts
@Injectable()
export class JobCardService {
  constructor(
    private prisma: PrismaService,
    private crmIntegration: CrmIntegrationService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createJobCard(data) {
    const jobCard = await this.prisma.jobCard.create({ data });

    // Emit domain event
    this.eventEmitter.emit('job_card.created', {
      jobCardId: jobCard.id,
      customerId: jobCard.customerId,
      jobNumber: jobCard.jobNumber,
      deviceModel: jobCard.deviceModel,
    });

    return jobCard;
  }

  async updateJobStatus(jobCardId, newStatus) {
    const jobCard = await this.prisma.jobCard.update({
      where: { id: jobCardId },
      data: { status: newStatus },
    });

    this.eventEmitter.emit('job_card.status_changed', {
      jobCardId,
      customerId: jobCard.customerId,
      newStatus,
      jobNumber: jobCard.jobNumber,
    });

    return jobCard;
  }
}

// Listen for events and call CRM APIs
@Injectable()
export class CrmEventListener {
  constructor(private crmIntegration: CrmIntegrationService) {}

  @OnEvent('job_card.created')
  async onJobCardCreated(data) {
    // Optional: Auto-send "Job received" WhatsApp
    // (Requires separate headers/auth context)
  }

  @OnEvent('job_card.status_changed')
  async onJobStatusChanged(data) {
    if (data.newStatus === 'READY') {
      // Optional: Auto-send "Device ready" WhatsApp
      // or create follow-up reminder
    }
  }
}
```

---

## ✅ Implementation Checklist

- [ ] Install `CrmIntegrationModule` in MobiBix app
- [ ] Create MobiBix home screen with dashboard widgets
- [ ] Create "My Follow-ups" widget
- [ ] Create CustomerTimeline component
- [ ] Wire "Add Follow-up" modal to create endpoint
- [ ] Add WhatsApp buttons to Job Card detail
- [ ] Add WhatsApp buttons to Invoice detail
- [ ] Style timeline filter selector
- [ ] Test all API calls
- [ ] Add error handling/toast notifications
- [ ] Add loading states to all widgets

---

## 🐛 Error Handling Pattern

```typescript
const fetchWithErrorHandling = async (apiCall) => {
  try {
    const result = await apiCall();
    return { data: result, error: null };
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    return { data: null, error: errorMsg };
  }
};

// Usage
const { data: dashboard, error } = await fetchWithErrorHandling(() =>
  crmIntegration.getDashboardMetrics()
);

if (error) {
  showErrorToast(`Failed to load dashboard: ${error}`);
  return <ErrorState />;
}

return <Dashboard data={dashboard} />;
```

---

**Next Steps:**

1. Implement CrmIntegrationService
2. Build MobiBix home screen with 6 widgets
3. Create Follow-ups widget
4. Integrate Timeline component
5. Wire WhatsApp actions
6. Test end-to-end
