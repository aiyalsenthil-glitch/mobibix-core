# CORE CRM → MobiBix Integration Strategy

## 🎯 Overview

This document outlines the complete integration of the CORE CRM system (Customer Timeline, Follow-ups, WhatsApp, Dashboard) into MobiBix (mobile repair shop app) following strict separation of concerns.

**Key Principle:** MobiBix consumes CORE services; CORE never imports MobiBix.

---

## 🏗️ Architecture

### Module Dependency Graph

```
┌──────────────────────────────────────────────────────────┐
│  MOBIBIX APP                                             │
│  (apps/backend/src/modules/mobibix/)                     │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  MobiBix.Module imports:                                 │
│  ├─ @core/crm-dashboard (read KPIs)                      │
│  ├─ @core/follow-ups (CRUD + consume APIs)               │
│  ├─ @core/whatsapp (call services, don't own)            │
│  └─ @core/customers (shared entity, already used)        │
│                                                          │
│  MobiBix owns:                                           │
│  ├─ JobCard (create, update, status)                     │
│  ├─ IMEI (track mobile devices)                          │
│  ├─ JobCardTimeline (tech-specific, internal)            │
│  └─ MobiBixInvoice (extends @core/sales)                 │
│                                                          │
└──────────────────────────────────────────────────────────┘
                        ▲
                        │ Imports (one-way dependency)
                        │
┌──────────────────────────────────────────────────────────┐
│  CORE CRM                                                │
│  (apps/backend/src/core/)                                │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Core.Module provides:                                   │
│  ├─ CrmDashboardService (KPIs)                           │
│  ├─ FollowUpsService (task CRUD)                         │
│  ├─ CustomerTimelineService (read-only aggregation)      │
│  ├─ WhatsAppSender (send + log)                          │
│  ├─ CustmomerService (shared entity)                     │
│  └─ [Controllers for all above]                          │
│                                                          │
│  Core NEVER imports MobiBix ✅                            │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 Integration Checklist

### A. CRM Dashboard Integration

- [ ] Create MobiBix dashboard screen component
- [ ] Call CORE `/api/core/crm-dashboard?preset=LAST_30_DAYS`
- [ ] Extract 5 KPI groups from response
- [ ] Build widget layout (6 widgets)
- [ ] Add date range preset selector
- [ ] Wire shopId filter (optional)

### B. Follow-ups Integration

- [ ] Create "My Follow-ups" dashboard widget
- [ ] Call CORE `/api/core/follow-ups/my` endpoint
- [ ] Display due today / overdue / pending buckets
- [ ] Add "Create Follow-up" modal
- [ ] Wire form to CORE `POST /api/core/follow-ups`
- [ ] Add link to open customer profile

### C. Customer Timeline Integration

- [ ] Create CustomerTimeline reusable component
- [ ] Call CORE `/api/core/customer-timeline/{customerId}`
- [ ] Add source filter (JOB, INVOICE, CRM, WHATSAPP)
- [ ] Embed timeline in:
  - Customer detail screen
  - Job Card detail screen
  - Invoice detail screen

### D. WhatsApp Integration

- [ ] Job Card "Send Update" button
  - Calls CORE service via API
  - Pre-filled message template (job status)
- [ ] Invoice "Send Payment Reminder" button
  - Calls CORE service via API
  - Pre-filled message template (invoice details)
- [ ] Both must log to WhatsAppLog automatically

### E. Event Wiring (Optional but Recommended)

- [ ] Job Card Created → Emit event
- [ ] Job Status Updated → Emit event
- [ ] Invoice Created → Emit event
- [ ] Event handler calls CORE APIs to update timeline

---

## 🔌 API Integration Points

### 1. CRM Dashboard KPIs

**Endpoint:**

```
GET /api/core/crm-dashboard
Query: ?preset=LAST_30_DAYS&shopId=cluxy123
Auth: JWT Bearer
```

**Response:**

```json
{
  "customers": { total, active, inactive, newCustomers, repeatRate },
  "followUps": { dueToday, overdue, pending, completedThisWeek },
  "financials": { totalOutstanding, highValueCustomers[] },
  "loyalty": { pointsIssued, redeemed, balance, activeCustomers },
  "whatsapp": { totalSent, successful, failed, successRate, last7Days[] },
  "dateRange": { startDate, endDate, preset },
  "generatedAt": "2024-01-15T..."
}
```

**Usage in MobiBix:**

```typescript
// MobiBix Home Screen
const response = await fetch('/api/core/crm-dashboard?preset=LAST_30_DAYS', {
  headers: { Authorization: `Bearer ${jwtToken}` }
});

const dashboard = await response.json();

// Render 6 widgets
<DashboardWidget title="Total Customers" value={dashboard.customers.total} />
<DashboardWidget title="Outstanding" value={formatCurrency(dashboard.financials.totalOutstanding)} />
// ... etc
```

---

### 2. Follow-ups CRUD

**Endpoints:**

- `GET /api/core/follow-ups/my` - List my follow-ups
- `POST /api/core/follow-ups` - Create follow-up
- `PATCH /api/core/follow-ups/{id}` - Update follow-up
- `PATCH /api/core/follow-ups/{id}/status` - Change status

**Usage in MobiBix:**

```typescript
// Create follow-up from Job Card
const createFollowUp = async (customerId: string, purpose: string) => {
  const response = await fetch('/api/core/follow-ups', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwtToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      customerId,
      type: 'GENERAL',
      purpose,
      followUpAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      assignedToUserId: currentUserId
    })
  });
  return response.json();
};

// In Job Card detail page
<Button onClick={() => showCreateFollowUpModal(jobCard.customerId)}>
  Add Follow-up
</Button>
```

---

### 3. Customer Timeline

**Endpoint:**

```
GET /api/core/customer-timeline/{customerId}
Query: ?source=JOB,INVOICE,CRM,WHATSAPP
Auth: JWT Bearer
```

**Response:**

```json
{
  "items": [
    {
      "id": "cluxy123",
      "customerId": "cluabc456",
      "type": "JOB_CARD_CREATED",
      "title": "iPhone 13 Screen Repair",
      "description": "Job #JC-2024-001",
      "timestamp": "2024-01-15T10:30:00Z",
      "source": "JOB",
      "relatedId": "jobcard-xyz",
      "metadata": { jobStatus: "IN_PROGRESS", ... }
    },
    // ... more entries
  ],
  "totalCount": 42,
  "filtered": { job: 15, invoice: 10, crm: 12, whatsapp: 5 }
}
```

**Usage in MobiBix:**

```typescript
// Customer Profile → Timeline Tab
const CustomerTimeline = ({ customerId, source = 'ALL' }) => {
  const [timeline, setTimeline] = useState([]);

  useEffect(() => {
    fetch(`/api/core/customer-timeline/${customerId}?source=${source}`, {
      headers: { Authorization: `Bearer ${jwtToken}` }
    })
    .then(r => r.json())
    .then(data => setTimeline(data.items));
  }, [customerId, source]);

  return (
    <div>
      {timeline.map(item => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};
```

---

### 4. WhatsApp Send API

**Endpoint:**

```
POST /api/modules/whatsapp/send
Auth: JWT Bearer
```

**Request Body:**

```json
{
  "customerId": "cluabc456",
  "phone": "+918123456789",
  "message": "Your repair is ready for pickup!",
  "messageType": "TEXT",
  "channel": "WHATSAPP",
  "source": "JOB_READY",
  "sourceId": "jobcard-xyz"
}
```

**Usage in MobiBix:**

```typescript
// Job Card detail → "Send Ready Notification" button
const sendJobReadyNotification = async (jobCard) => {
  const response = await fetch('/api/modules/whatsapp/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwtToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      customerId: jobCard.customerId,
      phone: jobCard.customer.phone,
      message: `Your device is ready! Job #${jobCard.jobNumber}`,
      source: 'JOB_READY',
      sourceId: jobCard.id,
    }),
  });
  return response.json();
};
```

---

## 📊 MobiBix Dashboard Widgets

### Widget 1: Quick Stats (Top Row)

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Total         │  │  Outstanding    │  │  New Customers  │
│  Customers     │  │  Invoices       │  │  (Last 30d)     │
│  1,250         │  │  ₹1,25,000      │  │  42              │
└─────────────────┘  └─────────────────┘  └─────────────────┘
From: dashboard.customers.total
     dashboard.financials.totalOutstanding
     dashboard.customers.newCustomers.last30Days
```

### Widget 2: Follow-ups (Second Row, Left)

```
┌──────────────────────────────┐
│  My Follow-ups               │
├──────────────────────────────┤
│  Due Today: 15               │
│  Overdue: 8  🔴              │
│  Pending: 42                 │
├──────────────────────────────┤
│  [View All] [Create]         │
└──────────────────────────────┘
From: dashboard.followUps + /api/core/follow-ups/my
```

### Widget 3: High-Value Customers (Second Row, Right)

```
┌──────────────────────────────────────┐
│  Top Customers                       │
├──────────────────────────────────────┤
│ 1. ABC Ltd          ₹2,50,000        │
│ 2. XYZ Corp         ₹1,80,000        │
│ 3. ...              ...              │
├──────────────────────────────────────┤
│  [View All]                          │
└──────────────────────────────────────┘
From: dashboard.financials.highValueCustomers
```

### Widget 4: WhatsApp Success Rate

```
┌──────────────────────────────┐
│  WhatsApp Delivery           │
├──────────────────────────────┤
│  Success Rate: 95%           │
│  Sent: 500                   │
│  Failed: 25                  │
├──────────────────────────────┤
│  [View Logs]                 │
└──────────────────────────────┘
From: dashboard.whatsapp
```

### Widget 5: Loyalty Points

```
┌──────────────────────────────┐
│  Loyalty Program             │
├──────────────────────────────┤
│  Points Issued: 15,000       │
│  Redeemed: 8,500             │
│  Balance: 6,500              │
│  Active: 320 customers       │
└──────────────────────────────┘
From: dashboard.loyalty
```

### Widget 6: Date Range Selector

```
┌──────────────────────────────┐
│  📅 Period                   │
├──────────────────────────────┤
│ ○ Today                      │
│ ○ Last 7 Days                │
│ ● Last 30 Days (default)     │
│ ○ Last 90 Days               │
│ ○ This Month                 │
│ ○ Custom...                  │
└──────────────────────────────┘
Query: ?preset=LAST_30_DAYS
```

---

## 🛠️ Implementation Steps

### Phase 1: Infrastructure (Day 1)

**Goal:** Wire up API calls, no UI yet

1. Create `src/modules/mobibix/services/crm-integration.service.ts`

   ```typescript
   @Injectable()
   export class CrmIntegrationService {
     constructor(private http: HttpClient) {}

     async getDashboardMetrics(
       tenantId,
       preset = 'LAST_30_DAYS',
       shopId?: string,
     ) {
       return this.http
         .get('/api/core/crm-dashboard', {
           params: { preset, ...(shopId && { shopId }) },
         })
         .toPromise();
     }

     async getMyFollowUps() {
       return this.http.get('/api/core/follow-ups/my').toPromise();
     }

     async getCustomerTimeline(customerId, source = 'ALL') {
       return this.http
         .get(`/api/core/customer-timeline/${customerId}`, {
           params: { source },
         })
         .toPromise();
     }

     async sendWhatsAppMessage(data) {
       return this.http.post('/api/modules/whatsapp/send', data).toPromise();
     }
   }
   ```

2. Register service in `mobibix.module.ts`

3. Create HTTP interceptor for error handling

### Phase 2: Dashboard Screen (Day 2-3)

**Goal:** Display CRM KPIs in MobiBix home screen

1. Create `mobibix-home.component.ts`
2. Create 6 dashboard widgets
3. Add date range selector
4. Wire `CrmIntegrationService` calls
5. Add loading/error states

### Phase 3: Follow-ups Widget (Day 3-4)

**Goal:** Show follow-ups + create modal

1. Create `follow-ups-widget.component.ts`
2. Display due/overdue/pending buckets
3. Create "Add Follow-up" modal
4. Wire to CORE API endpoints

### Phase 4: Timeline Integration (Day 4-5)

**Goal:** Embed timeline in customer/job/invoice screens

1. Create reusable `customer-timeline.component.ts`
2. Add source filter dropdown
3. Integrate into:
   - Customer profile screen
   - Job card detail screen
   - Invoice detail screen

### Phase 5: WhatsApp Actions (Day 5-6)

**Goal:** Send messages from MobiBix events

1. Add "Send Update" button to Job Card detail
2. Add "Send Invoice" button to Invoice detail
3. Pre-fill message templates
4. Handle responses + toast notifications

---

## 🔄 Event-Driven Wiring (Optional Advanced)

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

    // Emit event for CRM to listen
    this.eventEmitter.emit('job_card.created', {
      jobCardId: jobCard.id,
      customerId: jobCard.customerId,
      description: jobCard.description,
    });

    return jobCard;
  }

  async updateJobStatus(jobCardId, newStatus) {
    const jobCard = await this.prisma.jobCard.update({
      where: { id: jobCardId },
      data: { status: newStatus },
    });

    // Emit event
    this.eventEmitter.emit('job_card.status_changed', {
      jobCardId,
      customerId: jobCard.customerId,
      newStatus,
      jobNumber: jobCard.jobNumber,
    });

    return jobCard;
  }
}

// core/crm/listeners/mobibix-events.listener.ts
@Injectable()
export class MobiBixEventListener {
  constructor(private crmIntegration: CrmIntegrationService) {}

  @OnEvent('job_card.created')
  async handleJobCardCreated(data) {
    // Optional: Create follow-up reminder
    // Optional: Send welcome WhatsApp
    // Timeline updated automatically via CustomerTimeline
  }

  @OnEvent('job_card.status_changed')
  async handleJobStatusChanged(data) {
    if (data.newStatus === 'READY') {
      // Optional: Auto-send "ready for pickup" WhatsApp
    }
  }
}
```

---

## ✅ Constraints Checklist

- ✅ MobiBix does NOT re-implement CRM logic
- ✅ MobiBix ONLY consumes CORE APIs/services
- ✅ CRM controllers stay in CORE
- ✅ CORE never imports MobiBix
- ✅ CustomerId is the single link
- ✅ No CRM tables duplicated in MobiBix
- ✅ No CRM state stored in MobiBix
- ✅ TenantId/shopId always respected
- ✅ Role-based permissions enforced

---

## 📚 Related Documentation

- [CRM Dashboard Implementation](CRM_DASHBOARD_IMPLEMENTATION.md)
- [Follow-ups Module](../../core/follow-ups/FOLLOW_UPS_IMPLEMENTATION.md)
- [Customer Timeline](../../core/customers/CUSTOMER_TIMELINE.md)
- [WhatsApp Module](../../modules/whatsapp/WHATSAPP_REMINDERS_IMPLEMENTATION.md)

---

**Next Steps:**

1. Review this integration strategy
2. Create `CrmIntegrationService` (Phase 1)
3. Build dashboard screen (Phase 2)
4. Incrementally add features

**Questions?** Check the constraint rules and API endpoints above.
