# Follow-Ups Module Quick Reference

## File Locations

| File                                              | Purpose                                |
| ------------------------------------------------- | -------------------------------------- |
| `src/core/follow-ups/dto/create-follow-up.dto.ts` | POST input validation                  |
| `src/core/follow-ups/dto/update-follow-up.dto.ts` | PATCH input validation                 |
| `src/core/follow-ups/dto/follow-up-query.dto.ts`  | GET query params + FollowUpBucket enum |
| `src/core/follow-ups/follow-ups.service.ts`       | Business logic                         |
| `src/core/follow-ups/follow-ups.controller.ts`    | REST endpoints                         |
| `src/core/follow-ups/follow-ups.module.ts`        | NestJS module config                   |
| `src/core/core.module.ts`                         | FollowUpsModule imported here          |

---

## Core Enums

```typescript
// From Prisma schema (prisma/schema.prisma)
enum FollowUpType {
  CALL,
  WHATSAPP,
  VISIT,
  EMAIL,
  SMS,
}
enum FollowUpPurpose {
  SALE,
  SERVICE,
  PAYMENT,
  FEEDBACK,
  RETENTION,
  OTHER,
}
enum FollowUpStatus {
  PENDING,
  DONE,
  CANCELLED,
}

// In follow-up-query.dto.ts
enum FollowUpBucket {
  TODAY,
  OVERDUE,
  UPCOMING,
}
```

---

## Endpoint Matrix

| Method | Path                               | Auth        | Query                                        | Returns         |
| ------ | ---------------------------------- | ----------- | -------------------------------------------- | --------------- |
| POST   | `/api/core/follow-ups`             | JWT         | -                                            | 201 Follow-up   |
| PATCH  | `/api/core/follow-ups/{id}`        | JWT         | -                                            | 200 Follow-up   |
| PATCH  | `/api/core/follow-ups/{id}/status` | JWT         | -                                            | 200 Follow-up   |
| GET    | `/api/core/follow-ups/my`          | JWT         | ?bucket, ?status, ?shopId, ?notify           | 200 Follow-up[] |
| GET    | `/api/core/follow-ups/all`         | JWT (OWNER) | ?bucket, ?status, ?shopId, ?assignedToUserId | 200 Follow-up[] |

---

## Permission Rules

| Role  | Create                  | View My     | View All       | Update Own | Update Others |
| ----- | ----------------------- | ----------- | -------------- | ---------- | ------------- |
| OWNER | ✅ Can assign to anyone | ✅          | ✅ Can see all | ✅         | ✅            |
| STAFF | ✅ Only assigns to self | ✅ Only own | ❌ 403         | ✅         | ❌ 403        |

---

## Key Methods

### Service

- `createFollowUp(tenantId, userId, role, dto)` → Follow-up
- `updateFollowUp(tenantId, userId, followUpId, dto)` → Follow-up
- `updateStatus(tenantId, userId, followUpId, status)` → Follow-up
- `listMyFollowUps(tenantId, userId, query)` → Follow-up[]
- `listAllFollowUps(tenantId, role, query)` → Follow-up[]

### Controller

- `create(req, body)` → 201 Follow-up
- `update(req, id, body)` → 200 Follow-up
- `updateStatus(req, id, body)` → 200 Follow-up
- `listMy(req, query)` → 200 Follow-up[]
- `listAll(req, query)` → 200 Follow-up[]

---

## Status Transitions

```
PENDING ──→ DONE
    ├──→ CANCELLED

DONE (terminal)
CANCELLED (terminal)
```

Only PENDING status can transition.

---

## Query Bucket Behavior

### Today

- `followUpAt` within 24h from now
- Must be `PENDING` status
- Use: "My tasks for today"

### Overdue

- `followUpAt < now` (past due)
- Must be `PENDING` status
- Use: "Overdue tasks"

### Upcoming

- `followUpAt > end of today`
- Must be `PENDING` status
- Use: "Upcoming tasks"

---

## Code Examples

### Create Follow-Up

```typescript
// POST /api/core/follow-ups
const dto = {
  customerId: 'cust-123',
  type: 'CALL',
  purpose: 'SALE',
  note: 'Call to confirm interest',
  followUpAt: '2026-02-15T14:30:00Z',
  assignedToUserId: 'user-456', // OWNER assigns to others; STAFF auto-assigns to self
};

const followUp = await followUpsService.createFollowUp(
  req.user.tenantId,
  req.user.sub,
  req.user.role,
  dto,
);
// returns { id, customerId, type, purpose, status: 'PENDING', followUpAt, assignedToUser, ... }
```

### List My Follow-Ups Due Today

```typescript
// GET /api/core/follow-ups/my?bucket=today
const myTasks = await followUpsService.listMyFollowUps(
  req.user.tenantId,
  req.user.sub,
  { bucket: FollowUpBucket.TODAY },
);
// returns [ { ...follow-up1 }, { ...follow-up2 }, ... ] sorted by followUpAt
```

### Mark as Done

```typescript
// PATCH /api/core/follow-ups/{followUpId}/status
const updated = await followUpsService.updateStatus(
  req.user.tenantId,
  req.user.sub,
  'followup-123',
  FollowUpStatus.DONE,
);
// returns { ...follow-up, status: 'DONE' }
```

### List All (OWNER Dashboard)

```typescript
// GET /api/core/follow-ups/all?assignedToUserId=user-789
const allTasks = await followUpsService.listAllFollowUps(
  req.user.tenantId,
  req.user.role,
  { assignedToUserId: 'user-789' },
);
// Throws 403 if not OWNER role
// returns all follow-ups in tenant filtered by assignedToUserId
```

---

## Integration Points

### Timeline Integration

```typescript
// In CustomerTimelineService.buildTimelineForCustomer()
const followUps = await followUpsService.listAllFollowUps(
  tenantId,
  'OWNER', // use OWNER role to bypass permission check
  {}, // no filters, get all for customer
);

// Transform to timeline entries:
// FOLLOWUP_CREATED, FOLLOWUP_COMPLETED, etc.
```

### Exports

```typescript
// In follow-ups.module.ts
@Module({
  controllers: [FollowUpsController],
  providers: [FollowUpsService],
  exports: [FollowUpsService]
})
export class FollowUpsModule {}

// Can be imported in other modules:
// In core.module.ts:
@Module({
  imports: [FollowUpsModule, ...]
})
export class CoreModule {}
```

---

## TypeScript Notes

- Enum validation: `@IsEnum(FollowUpType as object)` (cast required for class-validator)
- ISO dates only: No Date objects in DTOs
- Enums imported from `@prisma/client` in service
- All where clauses include `tenantId` for safety
- Unsafe Prisma type warnings: ESLint set to `warn`, not `error` (code compiles)

---

## Common Mistakes

❌ **STAFF creates follow-up assigned to another user** → 403 in `ensureCanManageFollowUp()`  
✅ STAFF creates, defaults to self

❌ **Update follow-up with `status: 'INVALID'`** → 400 in `assertStatusTransition()`  
✅ Only `DONE` or `CANCELLED` allowed from `PENDING`

❌ **STAFF calls `GET /all`** → 403 permission check  
✅ Only OWNER can view all follow-ups

❌ **Create without `followUpAt`** → 400 validation error  
✅ Must include ISO date string

---

## Testing Queries

### Find all pending follow-ups for user

```sql
SELECT * FROM "CustomerFollowUp"
WHERE "tenantId" = 'tenant-123'
  AND "assignedToUserId" = 'user-456'
  AND status = 'PENDING'
ORDER BY "followUpAt" ASC;
```

### Find overdue

```sql
SELECT * FROM "CustomerFollowUp"
WHERE "tenantId" = 'tenant-123'
  AND status = 'PENDING'
  AND "followUpAt" < NOW()
ORDER BY "followUpAt" ASC;
```

### Follow-ups per customer

```sql
SELECT * FROM "CustomerFollowUp"
WHERE "tenantId" = 'tenant-123'
  AND "customerId" = 'cust-789'
ORDER BY "followUpAt" DESC;
```
