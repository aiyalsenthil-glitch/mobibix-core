# Follow-Up Task System Implementation

**Date**: January 28, 2026  
**Status**: ✅ Complete  
**Location**: `src/core/follow-ups/`

---

## Overview

A CRM follow-up task workflow system allowing staff to create, assign, and track customer follow-ups. Integrates with Customer Timeline and supports optional due date notifications.

---

## Architecture Decisions

### 1. **Service Layer Authority**

- **Decision**: All business logic in service; controller only handles HTTP + auth
- **Why**: Clean separation; reusable in scheduled jobs or other contexts
- **Example**: `createFollowUp()` handles role resolution, status defaults

### 2. **Role-Based Access Control**

- **OWNER**: Can create, view all, assign to any user, update any
- **STAFF**: Can create (assigned to themselves), view own, update own
- **Decision**: Enforced in service before DB access
- **Why**: Fail-fast; consistent with permissions.enum.ts

### 3. **Status Transitions**

```
PENDING → DONE
PENDING → CANCELLED
```

- **Decision**: Only PENDING can transition; prevents invalid state changes
- **Why**: Audit trail; simplifies business logic
- **Method**: `assertStatusTransition()` validates before update

### 4. **Task View Buckets**

- **Today**: followUpAt within 24h, PENDING status only
- **Overdue**: followUpAt < now, PENDING only (due now/past)
- **Upcoming**: followUpAt > end of today, PENDING only
- **Decision**: Frontend filters on read; no stored "bucket" field
- **Why**: Buckets are time-relative; computed on demand

### 5. **Assignee Resolution**

```typescript
OWNER + no assignee → uses own ID (defaults to assigner)
OWNER + assignee → uses specified ID
STAFF + own ID → allowed
STAFF + other ID → forbidden
```

- **Decision**: Explicit type safety in DTOs vs implicit defaults
- **Why**: Prevent accidental unassigned follow-ups; clarity for UI

### 6. **Optional Notifications**

- **Feature**: In-app alerts when follow-up due (past due time)
- **Implementation**: `createDueAlerts()` creates `CustomerAlert` records
- **Opt-in**: Only if `?notify=true` query param on GET /my
- **Decision**: Separate from reminders (no automation, template, scheduling)
- **Why**: Follow-ups are manual tasks; reminders are auto triggers

### 7. **No Customer Mutation**

- **Decision**: Follow-ups never modify Customer record
- **Why**: Keeps concerns separated; follow-ups are staff tasks, not customer data
- **Example**: "Payment collection" follow-up doesn't auto-update customer status

### 8. **Tenant + Shop Isolation**

- **tenantId**: Required, scopes all queries
- **shopId**: Optional, filters by shop (mobile repair shop context)
- **Decision**: All where clauses include tenantId
- **Why**: Multi-tenant safety; shop filtering for shop-specific staff

---

## API Endpoints

### Create Follow-Up

```
POST /api/core/follow-ups
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "customerId": "cust-123",
  "shopId": "shop-456",           // optional
  "type": "CALL|WHATSAPP|VISIT|EMAIL|SMS",
  "purpose": "SALE|SERVICE|PAYMENT|FEEDBACK|RETENTION|OTHER",
  "note": "Call to confirm appointment",
  "followUpAt": "2026-02-15T14:30:00Z",
  "assignedToUserId": "user-789",  // optional; defaults to requester
  "notifyOnDue": false             // optional
}

→ 201 { id, customerId, shopId, type, purpose, note, followUpAt, status, assignedToUser, customer, createdAt, ... }
```

### Update Follow-Up

```
PATCH /api/core/follow-ups/{followUpId}
Authorization: Bearer {jwt}

{
  "purpose": "PAYMENT",
  "note": "Updated note",
  "assignedToUserId": null,  // can clear
  "status": "DONE"            // triggers transition validation
}

→ 200 { ...updated follow-up }
```

### Update Status Only

```
PATCH /api/core/follow-ups/{followUpId}/status
Authorization: Bearer {jwt}

{ "status": "DONE" }

→ 200 { ...updated follow-up }
```

### List My Follow-Ups

```
GET /api/core/follow-ups/my?bucket=today&notify=true&shopId=shop-456
Authorization: Bearer {jwt}

Query params:
  - bucket: 'today' | 'overdue' | 'upcoming'  (optional)
  - status: 'PENDING' | 'DONE' | 'CANCELLED'  (optional)
  - shopId: string                             (optional)
  - notify: 'true' | 'false'                   (creates alerts for overdue)

→ 200 [ { ...follow-up }, ... ]
```

### List All Follow-Ups (OWNER only)

```
GET /api/core/follow-ups/all?bucket=today&assignedToUserId=user-789
Authorization: Bearer {jwt}

Query params: same as /my, plus:
  - assignedToUserId: string  (optional)

→ 200 [ { ...follow-up }, ... ]
→ 403 if STAFF role
```

---

## Type Safety

### DTOs

**CreateFollowUpDto**

```typescript
customerId: string (required)
shopId?: string
type: FollowUpType (enum)
purpose: FollowUpPurpose (enum)
note?: string
followUpAt: ISO date string (required)
assignedToUserId?: string
notifyOnDue?: boolean
```

**UpdateFollowUpDto**

```typescript
type?: FollowUpType
purpose?: FollowUpPurpose
note?: string
followUpAt?: ISO date string
assignedToUserId?: string | null  // null = clear
status?: FollowUpStatus
shopId?: string | null
```

**FollowUpQueryDto**

```typescript
bucket?: FollowUpBucket ('today' | 'overdue' | 'upcoming')
status?: FollowUpStatus ('PENDING' | 'DONE' | 'CANCELLED')
shopId?: string
assignedToUserId?: string  // only in /all endpoint
```

---

## Query Patterns

### Find Follow-ups Due Today

```typescript
const today = new Date();
const startOfDay = new Date(today);
startOfDay.setHours(0, 0, 0, 0);
const endOfDay = new Date(today);
endOfDay.setHours(23, 59, 59, 999);

const items = await prisma.customerFollowUp.findMany({
  where: {
    tenantId,
    assignedToUserId: userId,
    status: 'PENDING',
    followUpAt: { gte: startOfDay, lte: endOfDay },
  },
  orderBy: { followUpAt: 'asc' },
});
```

### Find Overdue

```typescript
const items = await prisma.customerFollowUp.findMany({
  where: {
    tenantId,
    status: 'PENDING',
    followUpAt: { lt: new Date() }, // past now
  },
});
```

### Find by Customer

```typescript
const items = await prisma.customerFollowUp.findMany({
  where: {
    tenantId,
    customerId,
  },
  include: {
    assignedToUser: { select: { id: true, fullName: true } },
    customer: { select: { name: true, phone: true } },
  },
});
```

---

## Status Rules

### Transition Rules

- **PENDING → DONE**: Allowed (staff marks as completed)
- **PENDING → CANCELLED**: Allowed (staff cancels)
- **DONE → X**: Forbidden (terminal state)
- **CANCELLED → X**: Forbidden (terminal state)

### Implementation

```typescript
private assertStatusTransition(current: FollowUpStatus, next: FollowUpStatus) {
  if (current === next) return; // idempotent
  if (current !== FollowUpStatus.PENDING) {
    throw new BadRequestException('Only pending follow-ups can be updated');
  }
  if (next !== FollowUpStatus.DONE && next !== FollowUpStatus.CANCELLED) {
    throw new BadRequestException('Invalid status transition');
  }
}
```

---

## Task List Behavior

### My Follow-Ups View

```
GET /api/core/follow-ups/my?bucket=today
```

- Returns ONLY follow-ups assigned to **current user**
- Scoped by tenantId
- Sorted by followUpAt ascending (earliest first)
- Optional bucket filtering (today, overdue, upcoming)

### Owner Dashboard View

```
GET /api/core/follow-ups/all?bucket=overdue
```

- Returns ALL follow-ups in tenant (any assignee)
- Allows filtering by assignedToUserId, shopId
- Use case: See which staff has overdue follow-ups

### Integration with Customer Timeline

- `CustomerTimelineService` queries follow-ups for a customer
- Adds FOLLOWUP_CREATED and FOLLOWUP_COMPLETED entries
- Reads from `CustomerFollowUp` FK to customer
- Does NOT modify follow-up status

---

## Permissions Enforcement

### Service Layer Checks

1. **createFollowUp**: Role → OWNER/STAFF allowed
2. **updateFollowUp**: `ensureCanManageFollowUp()` → only assignee or OWNER
3. **listMyFollowUps**: No explicit check; filtered by assigned userId
4. **listAllFollowUps**: Role check → OWNER only, else 403

### Controller Extracts

```typescript
const tenantId = req.user?.tenantId; // Set by JwtAuthGuard
const userId = req.user?.sub; // User ID from JWT
const role = req.user?.role as UserRole; // OWNER | STAFF | USER
```

---

## Optional In-App Notifications

### Feature: Create Alerts for Overdue Tasks

```typescript
GET /api/core/follow-ups/my?notify=true
```

Internally:

1. Fetches user's follow-ups
2. Filters items where `followUpAt <= now` and `status === PENDING`
3. For each: checks if `CustomerAlert` with same message exists
4. If not: creates new `CustomerAlert` with `severity: INFO`, `source: CUSTOM`
5. Returns the list

### Why Separate?

- Follow-ups are **manual staff tasks** (not auto-triggered)
- Reminders are **scheduled, template-based** (WhatsApp, email, SMS)
- Alerts are **real-time awareness** (in-app, optional)

---

## File Structure

```
src/core/follow-ups/
├── dto/
│   ├── create-follow-up.dto.ts        (POST input validation)
│   ├── update-follow-up.dto.ts        (PATCH input validation)
│   └── follow-up-query.dto.ts         (GET query params + bucket enum)
├── follow-ups.service.ts              (Business logic)
├── follow-ups.controller.ts           (HTTP + auth context)
└── follow-ups.module.ts               (NestJS module)
```

---

## Integration Checklist

- ✅ DTOs with enum validation (class-validator)
- ✅ Service business logic (no HTTP concerns)
- ✅ Role-based access control (OWNER vs STAFF)
- ✅ Status transition rules (PENDING → DONE/CANCELLED)
- ✅ Task view buckets (today, overdue, upcoming)
- ✅ Optional due notifications (creates CustomerAlert)
- ✅ No customer mutation
- ✅ Tenant isolation (tenantId in all queries)
- ✅ Customer Timeline compatibility (can query by customer)
- ✅ Module registration in CoreModule

---

## Future Enhancements

1. **Automated Reminders**: Schedule email/WhatsApp reminders for follow-ups (separate module)
2. **Batch Follow-Ups**: Create multiple follow-ups for a segment
3. **Follow-Up Templates**: Predefined follow-up types + notes for common workflows
4. **Reassignment History**: Audit trail of who assigned to whom
5. **SLA Tracking**: Flag follow-ups exceeding target response time
6. **Customer Segments**: Run follow-ups across cohorts of customers

---

## Testing Strategy

### Unit Tests (Service)

- Status transition validation
- Role-based access (OWNER → any, STAFF → own only)
- Bucket date calculations (today/overdue/upcoming)
- Assignee resolution logic

### Integration Tests (Controller + Service)

- POST create → 201 + follow-up record
- PATCH update → 200 + validation
- GET /my → lists assigned, filters bucket
- GET /all → OWNER only, 403 for STAFF
- 404 for non-existent follow-up
- 400 for invalid status transition

---

## Notes

- **No Hard Deletes**: Follow-ups are immutable once created; only status updates allowed
- **No Bulk Operations**: Create/update one at a time for clarity and audit
- **Customer Read-Only**: Follow-ups never trigger customer updates
- **Time Comparisons**: All dates in UTC (ISO strings); client responsible for timezone display
