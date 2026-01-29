# CORE CRM ↔ MobiBix Integration: Complete Architecture

## 🎯 Executive Summary

This document shows the complete architecture for integrating CORE CRM features into MobiBix while maintaining strict separation of concerns.

**Key Guarantees:**

- ✅ MobiBix ONLY consumes CORE APIs - never re-implements CRM logic
- ✅ CORE never imports MobiBix - clean one-way dependency
- ✅ All CRM state stays in CORE - MobiBix is read-only consumer
- ✅ CustomerId is the single integration point
- ✅ Zero data duplication between systems

---

## 🏗️ Module Dependency Architecture

```
┌─────────────────────────────────────────────────────────┐
│ MobiBix App Layer                                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  MobiBixHomeScreen                                      │
│  ├─ calls CrmIntegrationService.getDashboardMetrics()  │
│  ├─ calls CrmIntegrationService.getMyFollowUps()       │
│  └─ calls CrmIntegrationService.sendWhatsAppMessage()  │
│                                                         │
│  MobiBixJobCardScreen                                   │
│  ├─ calls CrmIntegrationService.getCustomerTimeline()  │
│  ├─ calls CrmIntegrationService.createFollowUp()       │
│  └─ calls CrmIntegrationService.sendWhatsAppMessage()  │
│                                                         │
│  MobiBixInvoiceScreen                                   │
│  ├─ calls CrmIntegrationService.getCustomerTimeline()  │
│  └─ calls CrmIntegrationService.sendWhatsAppMessage()  │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP Calls (REST)
                 │
┌────────────────┴────────────────────────────────────────┐
│ MobiBix CRM Integration Layer                           │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CrmIntegrationController                               │
│  └─ Routes MobiBix calls to CrmIntegrationService       │
│                                                         │
│  CrmIntegrationService                                  │
│  ├─ getDashboardMetrics() → calls CORE API              │
│  ├─ getMyFollowUps() → calls CORE API                   │
│  ├─ createFollowUp() → calls CORE API                   │
│  ├─ getCustomerTimeline() → calls CORE API              │
│  └─ sendWhatsAppMessage() → calls CORE API              │
│                                                         │
│  CrmIntegrationModule                                   │
│  └─ Registers CrmIntegrationService                     │
│                                                         │
└────────────────┬────────────────────────────────────────┘
                 │
                 │ HTTP Proxy Calls
                 │
┌────────────────┴────────────────────────────────────────┐
│ CORE CRM Layer (Authoritative)                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  CrmDashboardController                                 │
│  └─ GET /api/core/crm-dashboard                         │
│                                                         │
│  FollowUpsController                                    │
│  ├─ GET /api/core/follow-ups/my                         │
│  ├─ POST /api/core/follow-ups                           │
│  ├─ PATCH /api/core/follow-ups/:id                      │
│  └─ PATCH /api/core/follow-ups/:id/status               │
│                                                         │
│  CustomerTimelineController                             │
│  └─ GET /api/core/customer-timeline/:customerId         │
│                                                         │
│  WhatsAppController                                     │
│  └─ POST /api/modules/whatsapp/send                     │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ CORE Services (Business Logic)                  │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ • CrmDashboardService (KPI calculations)        │   │
│  │ • FollowUpsService (CRUD + permissions)         │   │
│  │ • CustomerTimelineService (aggregation)         │   │
│  │ • WhatsAppService (send + log)                  │   │
│  │ • CustomerService (shared entity)               │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │ CORE Database (Single Source of Truth)          │   │
│  ├─────────────────────────────────────────────────┤   │
│  │ Tables:                                         │   │
│  │ • Customer (shared with MobiBix)                │   │
│  │ • CustomerFollowUp (CRM exclusive)              │   │
│  │ • CustomerTimeline (CRM exclusive)              │   │
│  │ • WhatsAppLog (CRM exclusive)                   │   │
│  │ • LoyaltyTransaction (CRM exclusive)            │   │
│  │ • LoyaltyPoints (in Customer)                   │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🔄 Data Flow Diagrams

### Flow 1: MobiBix Fetching Dashboard KPIs

```
MobiBix UI
  │
  ├─ GET /mobibix/crm/dashboard?preset=LAST_30_DAYS
  │
  MobiBixCrmController.getDashboard()
  │
  ├─ Extracts JWT → builds headers
  │
  CrmIntegrationService.getDashboardMetrics(headers, preset)
  │
  ├─ HTTP GET /api/core/crm-dashboard?preset=LAST_30_DAYS
  │
  CORE CrmDashboardController.getDashboard()
  │
  ├─ JWT validation ✓
  ├─ Role check: OWNER/ADMIN ✓
  │
  CrmDashboardService.getDashboardMetrics(tenantId, query)
  │
  ├─ Promise.all([
  │    getCustomerMetrics(tenantId, startDate, endDate),
  │    getFollowUpMetrics(tenantId),
  │    getFinancialMetrics(tenantId),
  │    getLoyaltyMetrics(tenantId),
  │    getWhatsAppMetrics(tenantId)
  │  ])
  │
  ├─ Prisma queries ✓
  │
  ├─ Return aggregated { customers, followUps, financials, loyalty, whatsapp }
  │
  MobiBixCrmController.getDashboard() returns response
  │
  MobiBix UI renders 6 widgets ✓
```

### Flow 2: MobiBix Creating a Follow-up from Job Card

```
Job Card Detail Screen
  │
  ├─ Staff clicks "Add Follow-up" button
  │
  ├─ Modal pops up with form:
  │    - Type: PHONE_CALL
  │    - Purpose: "Check on repair status"
  │    - Assign to: (current user)
  │    - Schedule: 3 days from now
  │
  ├─ POST /mobibix/crm/follow-ups
  │    { customerId, type, purpose, followUpAt, assignedToUserId }
  │
  MobiBixCrmController.createFollowUp()
  │
  ├─ Extracts JWT → builds headers
  │
  CrmIntegrationService.createFollowUp(headers, data)
  │
  ├─ HTTP POST /api/core/follow-ups (with same data)
  │
  CORE FollowUpsController.createFollowUp()
  │
  ├─ JWT validation ✓
  ├─ TenantId extraction ✓
  │
  FollowUpsService.createFollowUp(tenantId, data)
  │
  ├─ Validate customerId exists ✓
  ├─ Create Prisma.followUp record ✓
  │
  ├─ Return { id, customerId, status: 'PENDING', ... }
  │
  MobiBix UI shows success toast ✓
  ├─ Refreshes "My Follow-ups" widget
  ├─ Timeline updated automatically (next time page loads)
```

### Flow 3: MobiBix Viewing Customer Timeline

```
Customer Profile Screen
  │
  ├─ Timeline tab is clicked
  │
  ├─ GET /mobibix/crm/customer-timeline/{customerId}?source=ALL
  │
  MobiBixCrmController.getCustomerTimeline()
  │
  CrmIntegrationService.getCustomerTimeline(headers, customerId, source)
  │
  ├─ HTTP GET /api/core/customer-timeline/{customerId}?source=ALL
  │
  CORE CustomerTimelineController.getTimeline()
  │
  ├─ JWT validation ✓
  ├─ TenantId extraction ✓
  │
  CustomerTimelineService.getTimeline(tenantId, customerId, source)
  │
  ├─ Query multiple tables:
  │    ├─ CustomerFollowUp.findMany() → source: CRM
  │    ├─ Invoice.findMany() → source: INVOICE
  │    ├─ WhatsAppLog.findMany() → source: WHATSAPP
  │    └─ (JobCard entries added by MobiBix timeline)
  │
  ├─ Aggregate + sort by timestamp DESC
  │
  ├─ Return {
  │    items: [
  │      { type: 'FOLLOW_UP_CREATED', source: 'CRM', timestamp, ... },
  │      { type: 'INVOICE_PAID', source: 'INVOICE', timestamp, ... },
  │      { type: 'WHATSAPP_SENT', source: 'WHATSAPP', timestamp, ... }
  │    ],
  │    totalCount: 42,
  │    filtered: { crm: 15, invoice: 10, whatsapp: 8, job: 9 }
  │  }
  │
  MobiBix UI renders timeline with filter buttons ✓
```

### Flow 4: MobiBix Sending Job Ready WhatsApp

```
Job Card Detail Screen
  │
  ├─ Staff clicks "📱 Send Ready Notification" button
  │
  ├─ POST /mobibix/crm/whatsapp/send
  │    {
  │      customerId,
  │      phone: "+918123456789",
  │      message: "Your iPhone is ready for pickup!",
  │      source: "JOB_READY",
  │      sourceId: jobCardId
  │    }
  │
  MobiBixCrmController.sendWhatsApp()
  │
  CrmIntegrationService.sendWhatsAppMessage(headers, data)
  │
  ├─ HTTP POST /api/modules/whatsapp/send (same payload)
  │
  CORE WhatsAppController.send()
  │
  ├─ JWT validation ✓
  ├─ TenantId extraction ✓
  │
  WhatsAppService.sendMessage(tenantId, data)
  │
  ├─ Check WhatsAppSetting.enabled ✓
  ├─ Check billing (feature: REMINDER) ✓
  │
  ├─ Call WhatsApp API ✓
  │
  ├─ Log to WhatsAppLog {
  │    tenantId, customerId, phone, status: SUCCESS,
  │    message, source: JOB_READY, sourceId,
  │    sentAt: now
  │  }
  │
  ├─ Return { success: true, status: 'SENT', sentAt, ... }
  │
  MobiBix UI shows success toast ✓
  └─ Message logged to CORE WhatsAppLog ✓
     (automatically appears in Customer Timeline)
```

---

## 📊 Integration Matrix

| Feature               | CORE Module             | MobiBix Usage        | Data Owner | Logic Owner              |
| --------------------- | ----------------------- | -------------------- | ---------- | ------------------------ |
| **Dashboard KPIs**    | crm-dashboard           | Read-only widget     | CORE       | CORE                     |
| **Follow-ups CRUD**   | follow-ups              | Create/Update/Status | CORE       | CORE                     |
| **Customer Timeline** | customer-timeline       | Embed in screens     | CORE       | CORE                     |
| **WhatsApp Send**     | whatsapp                | Trigger from events  | CORE       | CORE                     |
| **Job Cards**         | mobibix                 | Full CRUD            | MobiBix    | MobiBix                  |
| **IMEI Tracking**     | mobibix                 | Full CRUD            | MobiBix    | MobiBix                  |
| **Repair Invoices**   | mobibix (extends sales) | Full CRUD            | MobiBix    | MobiBix                  |
| **Customer**          | customers               | Shared read/write    | CORE       | CORE (MobiBix adds refs) |

---

## 🔐 Security & Permissions

### Authentication Flow

```
Client App (MobiBix)
  │
  ├─ User logs in with credentials
  │
  ├─ Receive JWT token {
  │    sub: userId,
  │    tenantId: gymId,
  │    role: OWNER | STAFF | ADMIN,
  │    email
  │  }
  │
  ├─ Store JWT in localStorage/sessionStorage
  │
  ├─ ALL API calls include Authorization header:
  │    Authorization: Bearer {jwt}
  │
  CORE API
  │
  ├─ JwtAuthGuard validates signature ✓
  ├─ Extracts tenantId from payload ✓
  │
  ├─ Role check (if required):
  │    if (role !== OWNER && role !== ADMIN) → 403 Forbidden
  │
  ├─ All Prisma queries scoped:
  │    where: { tenantId } ✓
  │
  ✓ Only user's tenant data visible
  ✓ No cross-tenant data leakage
```

### Permission Rules

| Endpoint                            | Required Role | Enforced At        |
| ----------------------------------- | ------------- | ------------------ |
| `/api/core/crm-dashboard`           | OWNER, ADMIN  | Controller guard   |
| `GET /api/core/follow-ups/my`       | STAFF, OWNER  | Service (only own) |
| `GET /api/core/follow-ups/all`      | OWNER         | Controller guard   |
| `POST /api/core/follow-ups`         | STAFF, OWNER  | Service validation |
| `GET /api/core/customer-timeline/*` | STAFF, OWNER  | Service scoped     |
| `POST /api/modules/whatsapp/send`   | STAFF, OWNER  | Service validation |

---

## 🔄 Event-Driven Integration (Optional)

For advanced scenarios where MobiBix events automatically trigger CRM updates:

```typescript
// MobiBix publishes domain events
JobCardService.createJobCard()
  └─ eventEmitter.emit('job_card.created', { jobCardId, customerId })

JobCardService.updateStatus(READY)
  └─ eventEmitter.emit('job_card.status_changed', { jobCardId, newStatus })

// CORE listens for events
@Injectable()
export class MobiBixEventListener {
  constructor(private eventEmitter: EventEmitter2) {
    this.eventEmitter.on('job_card.created', this.onJobCreated.bind(this));
  }

  async onJobCreated({ customerId, jobCardId }) {
    // Optional: Send welcome WhatsApp
    // Optional: Create follow-up reminder
    // Timeline updates automatically (CustomerTimeline aggregates all sources)
  }
}
```

**Prerequisites:**

- EventEmitter2 shared across modules
- MobiBix publishes events
- CORE listens (not required - polling also works)

---

## 📋 Files Created

### MobiBix CRM Integration

```
src/modules/mobibix/
├── services/
│   └── crm-integration.service.ts     ← HTTP abstraction layer
├── crm-integration.controller.ts      ← REST proxy endpoints
├── crm-integration.module.ts          ← Module registration
└── [other MobiBix modules]
```

### Documentation

```
apps/backend/
├── MOBIBIX_CRM_INTEGRATION_STRATEGY.md    ← This guide
├── MOBIBIX_CRM_API_USAGE.md               ← API usage examples
└── [other documentation]
```

---

## ✅ Implementation Checklist

### Phase 1: Infrastructure (Ready)

- [x] Create CrmIntegrationService
- [x] Create CrmIntegrationController
- [x] Create CrmIntegrationModule
- [x] Wire HttpModule dependency
- [x] Document API endpoints

### Phase 2: Dashboard (Ready to Implement)

- [ ] Create MobiBix Home Screen component
- [ ] Fetch dashboard metrics (6 widgets)
- [ ] Add date range selector
- [ ] Add error handling + loading states
- [ ] Style dashboard layout

### Phase 3: Follow-ups Widget (Ready to Implement)

- [ ] Create MyFollowUpsWidget component
- [ ] Display buckets (Due/Overdue/Pending)
- [ ] Create "Add Follow-up" modal
- [ ] Wire create endpoint
- [ ] Add mark-done functionality

### Phase 4: Timeline Integration (Ready to Implement)

- [ ] Create CustomerTimeline component
- [ ] Add source filter dropdown
- [ ] Integrate into Customer profile
- [ ] Integrate into Job Card detail
- [ ] Integrate into Invoice detail

### Phase 5: WhatsApp Actions (Ready to Implement)

- [ ] Add "Send Ready" button to Job Card detail
- [ ] Add "Send Invoice" button to Invoice detail
- [ ] Create message template system
- [ ] Handle responses + error states
- [ ] Show sent confirmation

---

## 🎯 Key Design Decisions

### 1. HTTP Proxy Pattern

**Decision:** MobiBix calls CORE via HTTP, not direct service injection
**Reason:**

- CORE and MobiBix are separate apps
- Services are not shared across app boundaries
- Clear separation allows independent scaling

### 2. CrmIntegrationService as Abstraction

**Decision:** Single service wraps all CORE API calls
**Reason:**

- Centralized error handling
- Easy to add logging/metrics
- Simple to mock in tests
- Consistent header management (JWT)

### 3. No CORE Imports in MobiBix

**Decision:** MobiBix never imports CORE modules
**Reason:**

- Prevents circular dependencies
- MobiBix can run independently
- CORE can be updated without MobiBix changes
- Clear contracts via REST APIs only

### 4. CustomerId as Integration Link

**Decision:** Only shared reference is customerId
**Reason:**

- MobiBix Job Cards link to Customers
- Customers in CORE own CRM data
- No need to duplicate follow-ups, timeline, etc.
- All CRM history queryable via customerId

---

## 🚀 Deployment Considerations

### Backend Deployment

1. Deploy CORE CRM modules first
2. Deploy MobiBix module (depends on CORE running)
3. Both share same database

### Frontend Deployment

1. MobiBix web/mobile apps call MobiBix backend
2. MobiBix backend proxies to CORE backend
3. No direct frontend→CORE calls (all via MobiBix)

### Database

- Single PostgreSQL database
- CORE and MobiBix tables co-exist
- Customer table is shared (foreign keys work)

---

## 📞 Support & Troubleshooting

### Issue: "Cannot find module '../auth/guards/jwt-auth.guard'"

**Solution:** Check import path matches your project structure

### Issue: "CORE API returns 403 Forbidden"

**Solution:** User role must be OWNER or ADMIN (check JWT payload)

### Issue: "Timeline shows no events"

**Solution:**

1. Verify customerId exists
2. Verify events were created in CORE
3. Check date range

### Issue: "WhatsApp message fails to send"

**Solution:**

1. Check WhatsAppSetting.enabled for tenant
2. Check billing feature REMINDER is enabled
3. Verify phone number format

---

## 📚 Related Documentation

- [CRM Dashboard Implementation](CRM_DASHBOARD_IMPLEMENTATION.md)
- [Follow-ups Module](../../core/follow-ups/FOLLOW_UPS_IMPLEMENTATION.md)
- [Customer Timeline](../../core/customers/CUSTOMER_TIMELINE.md)
- [WhatsApp Module](../../modules/whatsapp/WHATSAPP_REMINDERS_IMPLEMENTATION.md)

---

**Version:** 1.0.0  
**Last Updated:** January 2026  
**Status:** ✅ Architecture Complete, Ready for Implementation
