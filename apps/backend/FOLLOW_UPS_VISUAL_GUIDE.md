# Follow-Ups Module - Visual & Flow Reference

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                  (mobibix-web - React/Vue)                   │
└──────────┬──────────────────────────────────────────────────┘
           │ HTTP + JWT
           ↓
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER                                  │
│  FollowUpsController (@UseGuards(JwtAuthGuard))             │
│  ├─ POST   /follow-ups              (create)                 │
│  ├─ PATCH  /follow-ups/{id}         (update)                 │
│  ├─ PATCH  /follow-ups/{id}/status  (change status)          │
│  ├─ GET    /follow-ups/my           (list assigned)          │
│  └─ GET    /follow-ups/all          (list all - owner)       │
└──────────┬──────────────────────────────────────────────────┘
           │ Service calls
           ↓
┌─────────────────────────────────────────────────────────────┐
│                   SERVICE LAYER                              │
│        FollowUpsService (Business Logic)                     │
│                                                               │
│  ├─ createFollowUp()                                         │
│  │  └─ Validates: role, customer exists, followUpAt         │
│  │                                                            │
│  ├─ updateFollowUp()                                         │
│  │  └─ Permission: ensureCanManageFollowUp()                │
│  │  └─ Validation: assertStatusTransition()                 │
│  │                                                            │
│  ├─ updateStatus()                                           │
│  │  └─ PENDING → DONE or CANCELLED only                     │
│  │                                                            │
│  ├─ listMyFollowUps()                                        │
│  │  └─ Scoped: assigned to userId                           │
│  │  └─ Optional: Bucket filtering, create alerts            │
│  │                                                            │
│  └─ listAllFollowUps()                                       │
│     └─ OWNER role only (403 for others)                     │
└──────────┬──────────────────────────────────────────────────┘
           │ Prisma queries
           ↓
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE LAYER                              │
│           PostgreSQL + Prisma ORM                            │
│                                                               │
│  CustomerFollowUp:                                           │
│  ├─ id (CUID)                                               │
│  ├─ customerId (FK Customer)                                │
│  ├─ tenantId (FK Tenant) ← Isolation key                    │
│  ├─ type (enum: CALL, WHATSAPP, VISIT, EMAIL, SMS)         │
│  ├─ purpose (enum: SALE, SERVICE, PAYMENT, ...)            │
│  ├─ status (enum: PENDING, DONE, CANCELLED)                │
│  ├─ followUpAt (DateTime)                                   │
│  ├─ assignedToUserId (FK User)                             │
│  ├─ shopId (FK Shop - optional)                            │
│  └─ note (Text - optional)                                 │
│                                                              │
│  + CreatedAt, UpdatedAt, DeletedAt                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Request/Response Flow

### Create Follow-Up Flow

```
Client Request:
┌────────────────────────────────────┐
│ POST /api/core/follow-ups          │
│ Authorization: Bearer {JWT}         │
│ {                                   │
│   customerId: "cust-123",           │
│   type: "CALL",                     │
│   purpose: "SALE",                  │
│   followUpAt: "2026-02-15T14:30Z"   │
│ }                                   │
└────────────┬───────────────────────┘
             │
             ↓
Controller:
┌────────────────────────────────────┐
│ 1. Extract JWT: tenantId, userId   │
│ 2. Extract role from JWT           │
│ 3. Validate DTO (class-validator)  │
│ 4. Call service                    │
└────────────┬───────────────────────┘
             │
             ↓
Service:
┌────────────────────────────────────┐
│ 1. Permission check (OWNER/STAFF)  │
│ 2. Find customer in DB             │
│ 3. Resolve assignee:               │
│    - OWNER: use provided userId    │
│    - STAFF: use current userId     │
│ 4. Create in DB with tenantId      │
│ 5. Return created object           │
└────────────┬───────────────────────┘
             │
             ↓
Database:
┌────────────────────────────────────┐
│ INSERT INTO CustomerFollowUp        │
│   tenantId, customerId, type, ...  │
│ VALUES (...)                       │
│ RETURNING *                        │
└────────────┬───────────────────────┘
             │
             ↓
Response:
┌────────────────────────────────────┐
│ 201 Created                        │
│ {                                   │
│   id: "fu-abc123",                  │
│   customerId: "cust-123",           │
│   tenantId: "tenant-456",           │
│   type: "CALL",                     │
│   status: "PENDING",                │
│   followUpAt: "2026-02-15T14:30Z",  │
│   assignedToUser: {                 │
│     id: "user-789",                 │
│     fullName: "John Doe"            │
│   },                                │
│   createdAt: "2026-01-28T..."       │
│ }                                   │
└────────────────────────────────────┘
```

---

## Status Transition Diagram

```
┌─────────────┐
│   CREATE    │
└──────┬──────┘
       │
       ↓
┌──────────────────────────────────────────┐
│         PENDING (Active Task)            │
│  - Can be assigned or reassigned         │
│  - Can be updated (note, type, date)     │
│  - Appears in task lists                 │
└──────┬──────────────────────────┬────────┘
       │                          │
       │ updateStatus('DONE')     │ updateStatus('CANCELLED')
       ↓                          ↓
┌──────────────────┐    ┌────────────────────┐
│      DONE        │    │    CANCELLED       │
│ (Task Complete)  │    │ (Task Aborted)     │
│  Terminal State  │    │  Terminal State    │
└──────────────────┘    └────────────────────┘
```

---

## Permission Matrix - Visual

```
                       OWNER       STAFF
                    ┌──────┐    ┌─────────┐
Create Follow-Up    │  ✅  │    │   ✅    │
                    └──────┘    └─────────┘
                 Can assign     Auto-assigns
                 to anyone      to self only

                    ┌──────┐    ┌─────────┐
View Own            │  ✅  │    │   ✅    │
                    └──────┘    └─────────┘

                    ┌──────┐    ┌─────────┐
View All            │  ✅  │    │   ❌    │
(/all endpoint)     └──────┘    └─────────┘
                                  (403)

                    ┌──────┐    ┌─────────┐
Update Own          │  ✅  │    │   ✅    │
                    └──────┘    └─────────┘

                    ┌──────┐    ┌─────────┐
Update Others'      │  ✅  │    │   ❌    │
                    └──────┘    └─────────┘
                                  (403)
```

---

## Task Bucket Calculations

```
Current Time: 2026-01-28 14:00:00 UTC

TODAY Bucket:
┌────────────────────────────────────────────────┐
│ 2026-01-28 00:00:00  →  2026-01-28 23:59:59   │
│ (Within 24h, PENDING only)                     │
│ Example: followUpAt = 2026-01-28 18:00:00 ✅  │
│ Example: followUpAt = 2026-01-29 10:00:00 ❌  │
└────────────────────────────────────────────────┘

OVERDUE Bucket:
┌────────────────────────────────────────────────┐
│ followUpAt < 2026-01-28 14:00:00              │
│ (Past due, PENDING only)                       │
│ Example: followUpAt = 2026-01-28 10:00:00 ✅  │
│ Example: followUpAt = 2026-01-27 15:00:00 ✅  │
│ Example: followUpAt = 2026-01-28 15:00:00 ❌  │
└────────────────────────────────────────────────┘

UPCOMING Bucket:
┌────────────────────────────────────────────────┐
│ followUpAt > 2026-01-28 23:59:59              │
│ (After today, PENDING only)                    │
│ Example: followUpAt = 2026-01-29 10:00:00 ✅  │
│ Example: followUpAt = 2026-02-15 14:30:00 ✅  │
│ Example: followUpAt = 2026-01-28 18:00:00 ❌  │
└────────────────────────────────────────────────┘
```

---

## Data Isolation Layers

```
┌─────────────────────────────────────────────────────┐
│                   TENANT ISOLATION                   │
│ (All queries include tenantId - NO cross-tenant)    │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Tenant A: "gym-elite-123"                      │ │
│  │                                                 │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │ Shop A1: "Main Location"                 │ │ │
│  │  │ ├─ Follow-up 1 (John → Staff)            │ │ │
│  │  │ ├─ Follow-up 2 (Jane → Staff)            │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  │                                                 │ │
│  │  ┌──────────────────────────────────────────┐ │ │
│  │  │ Shop A2: "Branch Location"               │ │ │
│  │  │ ├─ Follow-up 3 (Mike → Staff)            │ │ │
│  │  └──────────────────────────────────────────┘ │ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ Tenant B: "gym-pro-456"                        │ │
│  │ (CANNOT see Tenant A's follow-ups)             │ │
│  │ ├─ Shop B1: "HQ"                               │ │
│  │ │ ├─ Follow-up 4 (Sarah → Staff)              │ │
│  │ └─────────────────────────────────────────────│ │
│  └────────────────────────────────────────────────┘ │
│                                                      │
│  WHERE tenantId = 'gym-elite-123'                   │
│  ✅ Returns only Tenant A's data                    │
│                                                      │
│  WHERE tenantId = 'gym-pro-456'                     │
│  ✅ Returns only Tenant B's data                    │
│                                                      │
│  WHERE tenantId = 'gym-elite-123' AND tenantId = 'gym-pro-456'
│  ✅ Returns nothing (safe)                          │
└─────────────────────────────────────────────────────┘
```

---

## Typical Workflow Timeline

```
Day 1: Staff creates follow-ups
┌─────────────────────────────────┐
│ MONDAY 14:00                     │
│ POST /api/follow-ups             │
│ ├─ Customer: John Smith          │
│ ├─ Type: CALL                    │
│ ├─ Purpose: SALE FOLLOW-UP       │
│ ├─ Scheduled: WEDNESDAY 10:00    │
│ ├─ Assigned: Self                │
│ └─ Status: PENDING               │
└─────────────────────────────────┘
                │
                ↓
Day 2: Task appears in TODAY bucket (if due today)
┌─────────────────────────────────┐
│ TUESDAY                          │
│ GET /follow-ups/my?bucket=today  │
│ └─ Task not shown (scheduled     │
│    for tomorrow)                 │
└─────────────────────────────────┘
                │
                ↓
Day 3: Task appears in TODAY bucket
┌─────────────────────────────────┐
│ WEDNESDAY 09:00                  │
│ GET /follow-ups/my?bucket=today  │
│ └─ "Call John Smith - SALE FU"   │
│    Status: PENDING               │
│    Due: 10:00 today              │
└─────────────────────────────────┘
                │
                ↓
Day 3: Staff completes task
┌─────────────────────────────────┐
│ WEDNESDAY 10:30                  │
│ PATCH /follow-ups/{id}/status    │
│ { "status": "DONE" }             │
│ └─ Task marked complete          │
└─────────────────────────────────┘
                │
                ↓
Task no longer appears in lists
┌─────────────────────────────────┐
│ WEDNESDAY 11:00                  │
│ GET /follow-ups/my?bucket=today  │
│ └─ Task not shown (DONE)         │
│                                  │
│ GET /follow-ups/my?status=DONE   │
│ └─ "Call John Smith - SALE FU"   │
│    Status: DONE                  │
│    Completed: WEDNESDAY 10:30    │
└─────────────────────────────────┘
```

---

## DTO Type Structure

```
CreateFollowUpDto
├─ customerId: string (required)
├─ shopId?: string (optional)
├─ type: enum (required)
│  ├─ CALL
│  ├─ WHATSAPP
│  ├─ VISIT
│  ├─ EMAIL
│  └─ SMS
├─ purpose: enum (required)
│  ├─ SALE
│  ├─ SERVICE
│  ├─ PAYMENT
│  ├─ FEEDBACK
│  ├─ RETENTION
│  └─ OTHER
├─ note?: string (optional)
├─ followUpAt: string (ISO, required)
├─ assignedToUserId?: string (optional, staff ignored)
└─ notifyOnDue?: boolean (optional)

UpdateFollowUpDto (all fields optional)
├─ type?: enum
├─ purpose?: enum
├─ note?: string
├─ followUpAt?: string
├─ assignedToUserId?: string | null
├─ shopId?: string | null
└─ status?: enum (DONE | CANCELLED)

FollowUpQueryDto (all optional)
├─ bucket?: enum (TODAY | OVERDUE | UPCOMING)
├─ status?: enum (PENDING | DONE | CANCELLED)
├─ shopId?: string
└─ assignedToUserId?: string (owner GET /all only)
```

---

## Database Query Examples

### Find all follow-ups due in next 24 hours

```sql
SELECT * FROM "CustomerFollowUp"
WHERE "tenantId" = 'gym-elite-123'
  AND status = 'PENDING'
  AND "followUpAt" >= NOW()
  AND "followUpAt" <= NOW() + INTERVAL '1 day'
ORDER BY "followUpAt" ASC;
```

### Find overdue follow-ups assigned to user

```sql
SELECT * FROM "CustomerFollowUp"
WHERE "tenantId" = 'gym-elite-123'
  AND "assignedToUserId" = 'user-789'
  AND status = 'PENDING'
  AND "followUpAt" < NOW()
ORDER BY "followUpAt" ASC;
```

### Find all follow-ups for a customer

```sql
SELECT * FROM "CustomerFollowUp"
WHERE "tenantId" = 'gym-elite-123'
  AND "customerId" = 'cust-john-smith'
ORDER BY "followUpAt" DESC;
```

### Count pending vs completed

```sql
SELECT status, COUNT(*) as count
FROM "CustomerFollowUp"
WHERE "tenantId" = 'gym-elite-123'
GROUP BY status;
```

---

## Error Codes & Messages

| Code | Condition                 | Message                                          |
| ---- | ------------------------- | ------------------------------------------------ |
| 400  | Invalid DTO               | Validation failed: [field]                       |
| 400  | Invalid status transition | Only pending follow-ups can be updated           |
| 401  | Missing JWT               | Unauthorized                                     |
| 403  | Insufficient role         | Cannot access this resource (OWNER only)         |
| 403  | Wrong assignee            | Cannot manage follow-up assigned to someone else |
| 404  | Not found                 | Follow-up not found                              |
| 404  | Customer not found        | Customer does not exist                          |
| 500  | Database error            | Internal server error                            |

---

**Visual Reference Complete** ✅
