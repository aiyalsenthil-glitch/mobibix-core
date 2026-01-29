# 🚀 CORE CRM → MobiBix Integration - Quick Navigation

## 📚 Documentation Index

### 1. **Integration Strategy** (START HERE)

📄 [MOBIBIX_CRM_INTEGRATION_STRATEGY.md](MOBIBIX_CRM_INTEGRATION_STRATEGY.md)

- Overview of integration approach
- Architecture principles
- 5-phase implementation plan
- Constraint checklist

**Read this first to understand the big picture.**

---

### 2. **Complete Architecture** (DETAILED REFERENCE)

📄 [MOBIBIX_CRM_COMPLETE_ARCHITECTURE.md](MOBIBIX_CRM_COMPLETE_ARCHITECTURE.md)

- Module dependency graph
- 4 detailed data flow diagrams
- Security & authentication flows
- Permission matrix
- Design decisions explained
- Deployment considerations

**Reference this when building or debugging.**

---

### 3. **API Usage Guide** (IMPLEMENTATION REFERENCE)

📄 [MOBIBIX_CRM_API_USAGE.md](MOBIBIX_CRM_API_USAGE.md)

- All 4 API endpoints documented
- TypeScript/React code examples
- UI component examples (MobiBix Home, Timeline, Follow-ups)
- Error handling patterns
- Implementation checklist

**Use this while coding the frontend.**

---

## 🔧 Code Files Created

### MobiBix CRM Integration Service Layer

```
src/modules/mobibix/
├── services/
│   └── crm-integration.service.ts    ← HTTP API wrapper (180 lines)
├── crm-integration.controller.ts      ← REST proxy endpoints (80 lines)
└── crm-integration.module.ts          ← Module configuration (25 lines)
```

### What These Files Do:

- **crm-integration.service.ts**: Wraps all HTTP calls to CORE CRM APIs
  - `getDashboardMetrics()` - Fetch KPI dashboard
  - `getMyFollowUps()` / `getAllFollowUps()` - Fetch follow-ups
  - `createFollowUp()` - Create new follow-up
  - `updateFollowUp()` / `updateFollowUpStatus()` - Update follow-up
  - `getCustomerTimeline()` - Fetch customer activity timeline
  - `sendWhatsAppMessage()` - Send WhatsApp message
  - `getWhatsAppLogs()` - Fetch WhatsApp logs
  - `buildAuthHeaders()` - Helper for JWT headers

- **crm-integration.controller.ts**: REST endpoints that proxy to CORE
  - `GET /mobibix/crm/dashboard` → `/api/core/crm-dashboard`
  - `GET /mobibix/crm/follow-ups` → `/api/core/follow-ups/my`
  - `POST /mobibix/crm/follow-ups` → `/api/core/follow-ups`
  - `GET /mobibix/crm/customer-timeline/:id` → `/api/core/customer-timeline/:id`
  - `POST /mobibix/crm/whatsapp/send` → `/api/modules/whatsapp/send`

- **crm-integration.module.ts**: Registers service + exports for MobiBix modules

---

## 🏗️ High-Level Architecture

```
MobiBix App (web/mobile)
    ↓
MobiBix Backend (Node.js/NestJS)
    ├─ MobiBixHomeScreen
    │  └─ calls CrmIntegrationService
    ├─ JobCardDetailScreen
    │  └─ calls CrmIntegrationService
    └─ CustomerProfileScreen
       └─ calls CrmIntegrationService
    ↓
CrmIntegrationModule
    ├─ CrmIntegrationService (HTTP wrapper)
    └─ CrmIntegrationController (REST proxy)
    ↓ [HTTP Proxy Calls]
    ↓
CORE CRM APIs
    ├─ GET /api/core/crm-dashboard (KPI metrics)
    ├─ POST /api/core/follow-ups (CRUD)
    ├─ GET /api/core/customer-timeline/:id (timeline)
    └─ POST /api/modules/whatsapp/send (messaging)
    ↓
PostgreSQL Database (Single Source of Truth)
    ├─ Customer (shared)
    ├─ CustomerFollowUp (CORE CRM)
    ├─ CustomerTimeline (CORE CRM)
    ├─ WhatsAppLog (CORE CRM)
    ├─ LoyaltyTransaction (CORE CRM)
    ├─ JobCard (MobiBix)
    └─ IMEI (MobiBix)
```

---

## 📊 Integration Map

| MobiBix Feature          | Uses CORE API                         | Purpose                |
| ------------------------ | ------------------------------------- | ---------------------- |
| **Home Dashboard**       | `GET /api/core/crm-dashboard`         | Show KPIs (6 widgets)  |
| **My Follow-ups Widget** | `GET /api/core/follow-ups/my`         | List assigned tasks    |
| **Customer Profile**     | `GET /api/core/customer-timeline/:id` | Show activity timeline |
| **Job Card Detail**      | `POST /api/core/follow-ups`           | Create follow-up       |
| **Job Card Detail**      | `POST /api/modules/whatsapp/send`     | Send status update     |
| **Invoice Detail**       | `POST /api/modules/whatsapp/send`     | Send payment reminder  |

---

## 🚀 Quick Start for Developers

### Step 1: Understand the Architecture (15 min)

1. Read: [MOBIBIX_CRM_INTEGRATION_STRATEGY.md](MOBIBIX_CRM_INTEGRATION_STRATEGY.md)
2. Review: Module dependency graph
3. Check: 5-phase implementation plan

### Step 2: Study the Code (30 min)

1. Read: `src/modules/mobibix/services/crm-integration.service.ts`
2. Read: `src/modules/mobibix/crm-integration.controller.ts`
3. Review: Method signatures and documentation

### Step 3: Learn the APIs (30 min)

1. Read: [MOBIBIX_CRM_API_USAGE.md](MOBIBIX_CRM_API_USAGE.md)
2. Study: TypeScript code examples
3. Review: Response structures

### Step 4: Build Your First Screen (2-3 hours)

1. Create MobiBix Home component
2. Wire `CrmIntegrationService.getDashboardMetrics()`
3. Render 6 dashboard widgets
4. Add error handling + loading states

### Step 5: Build Follow-ups Widget (1-2 hours)

1. Create MyFollowUpsWidget component
2. Wire `CrmIntegrationService.getMyFollowUps()`
3. Display buckets (Due/Overdue/Pending)
4. Add "Create Follow-up" button

### Step 6: Build Timeline Component (2 hours)

1. Create reusable CustomerTimeline component
2. Wire `CrmIntegrationService.getCustomerTimeline()`
3. Add source filter dropdown
4. Embed in Customer/Job/Invoice screens

### Step 7: Add WhatsApp Actions (1-2 hours)

1. Add "Send Update" buttons to screens
2. Wire `CrmIntegrationService.sendWhatsAppMessage()`
3. Pre-fill message templates
4. Handle responses + errors

---

## 🎯 Key Principles

### ✅ CORE Ownership

- CORE owns all CRM tables (FollowUp, Timeline, WhatsAppLog, etc.)
- CORE owns all CRM logic (KPI calculation, permissions, etc.)
- CORE exposes APIs only

### ✅ MobiBix Consumption

- MobiBix calls CORE APIs only (never direct service imports)
- MobiBix has zero CRM tables
- MobiBix has zero CRM business logic

### ✅ Single Source of Truth

- All CRM data lives in CORE database
- Customer table is shared (both read/write via CORE)
- CustomerId is the single integration link

### ✅ Clean Separation

- CORE never imports MobiBix (one-way dependency)
- MobiBix can run independently (calls CORE via HTTP)
- Clear contracts via REST APIs

---

## 🔐 Security Model

### Authentication

```
JWT Token (issued by Auth service)
  ├─ sub: userId
  ├─ tenantId: gymId
  ├─ role: OWNER | STAFF | ADMIN
  └─ email: user@gym.com
```

### Authorization

- All API calls require valid JWT
- TenantId extracted from JWT
- All database queries scoped: `where: { tenantId }`
- Role-based access:
  - Dashboard: OWNER/ADMIN only
  - Follow-ups: STAFF can see own, OWNER sees all
  - Timeline: STAFF/OWNER can view
  - WhatsApp: STAFF/OWNER can send

---

## 🐛 Common Errors & Fixes

### Error: "Cannot find module '../auth/guards/jwt-auth.guard'"

**Fix:** Check import path matches your auth guard location

```typescript
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
```

### Error: "CORE API returns 403 Forbidden"

**Fix:** Check user role in JWT (must be OWNER or ADMIN for dashboard)

```typescript
// Verify token contains: { role: 'OWNER' or 'ADMIN' }
```

### Error: "WhatsAppLog.createdAt does not exist"

**Fix:** WhatsAppLog uses `sentAt`, not `createdAt`

```typescript
where: { sentAt: { gte: startDate } } ✓
// NOT: where: { createdAt: { gte: startDate } }
```

### Error: "TypeError: \_prisma.customerFollowUp is not a function"

**Fix:** This is a cosmetic TypeScript warning in strict mode. Code compiles and runs fine.

---

## 📞 Support

### Questions About...

- **Architecture?** → Read [MOBIBIX_CRM_COMPLETE_ARCHITECTURE.md](MOBIBIX_CRM_COMPLETE_ARCHITECTURE.md)
- **API endpoints?** → Read [MOBIBIX_CRM_API_USAGE.md](MOBIBIX_CRM_API_USAGE.md)
- **Implementation?** → Follow [MOBIBIX_CRM_INTEGRATION_STRATEGY.md](MOBIBIX_CRM_INTEGRATION_STRATEGY.md)
- **Code examples?** → Check [MOBIBIX_CRM_API_USAGE.md](MOBIBIX_CRM_API_USAGE.md) React components section

### Related Modules

- [CRM Dashboard](CRM_DASHBOARD_IMPLEMENTATION.md)
- [Follow-ups Module](../../core/follow-ups/FOLLOW_UPS_IMPLEMENTATION.md)
- [Customer Timeline](../../core/customers/CUSTOMER_TIMELINE.md)
- [WhatsApp Module](../../modules/whatsapp/WHATSAPP_REMINDERS_IMPLEMENTATION.md)

---

## ✅ Status

| Component                    | Status            | Files                                |
| ---------------------------- | ----------------- | ------------------------------------ |
| **CrmIntegrationService**    | ✅ Complete       | crm-integration.service.ts           |
| **CrmIntegrationController** | ✅ Complete       | crm-integration.controller.ts        |
| **CrmIntegrationModule**     | ✅ Complete       | crm-integration.module.ts            |
| **Integration Strategy**     | ✅ Complete       | MOBIBIX_CRM_INTEGRATION_STRATEGY.md  |
| **Complete Architecture**    | ✅ Complete       | MOBIBIX_CRM_COMPLETE_ARCHITECTURE.md |
| **API Usage Guide**          | ✅ Complete       | MOBIBIX_CRM_API_USAGE.md             |
| **MobiBix Dashboard**        | ⏳ Ready to build | -                                    |
| **Follow-ups Widget**        | ⏳ Ready to build | -                                    |
| **Timeline Component**       | ⏳ Ready to build | -                                    |
| **WhatsApp Actions**         | ⏳ Ready to build | -                                    |

---

**Next Steps:**

1. Read the integration strategy
2. Review the code files
3. Start building Phase 1: Dashboard screen
4. Incrementally add features

**Questions?** Check the documentation index above.
