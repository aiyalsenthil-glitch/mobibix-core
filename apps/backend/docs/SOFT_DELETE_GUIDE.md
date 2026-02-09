# Soft Delete Implementation Guide

## Overview

Soft deletes archive records instead of permanently deleting them. This enables:

- ✅ Compliance (audit trails, data recovery)
- ✅ Business continuity (restore deleted records)
- ✅ Reporting on historical data
- ✅ Soft delete + deletedBy = audit trail

## Schema Changes

Added to all key models:

```prisma
deletedAt    DateTime?   // When deleted
deletedBy    String?     // Who deleted it (userId)
```

## Implementation Pattern

### 1. List Active Records (Exclude Deleted)

**Before:**

```typescript
const users = await this.prisma.user.findMany({
  where: { tenantId },
});
```

**After:**

```typescript
import { excludeDeleted } from '../soft-delete/soft-delete.helper';

const users = await this.prisma.user.findMany({
  where: {
    tenantId,
    ...excludeDeleted(), // Add this
  },
});
```

### 2. Soft Delete Record

**Before:**

```typescript
await this.prisma.user.delete({
  where: { id },
});
```

**After:**

```typescript
import { softDeleteData } from '../soft-delete/soft-delete.helper';

await this.prisma.user.update({
  where: { id },
  data: softDeleteData(req.user.id), // Pass userId
});
```

### 3. Restore Deleted Record

```typescript
import { restoreData } from '../soft-delete/soft-delete.helper';

async restoreUser(userId: string) {
  return this.prisma.user.update({
    where: { id: userId },
    data: restoreData(),
  });
}
```

### 4. Hard Delete (GDPR Right to be Forgotten)

```typescript
import { hardDelete } from '../soft-delete/soft-delete.helper';

async permanentlyDeleteUser(userId: string) {
  // Only for GDPR compliance
  return hardDelete(this.prisma.user, { id: userId });
}
```

## Migration Checklist

Models with soft delete support:

- ✅ Tenant (deletedAt, deletedBy)
- ✅ User (deletedAt, deletedBy)
- ✅ Member (deletedAt, deletedBy)
- ✅ Shop (deletedAt, deletedBy)
- ✅ Invoice (deletedAt, deletedBy)

### For Each Service

1. **List endpoints**: Add `excludeDeleted()` to where clause
2. **Delete methods**: Use `softDeleteData(userId)` instead of `.delete()`
3. **Count operations**: Filter out deleted records
4. **Relationships**: Consider cascade behavior

## Query Examples

### List active staff only

```typescript
const staff = await this.prisma.userTenant.findMany({
  where: {
    tenantId,
    user: { ...excludeDeleted() },
  },
  include: { user: true },
});
```

### Count active members

```typescript
const activeCount = await this.prisma.member.count({
  where: {
    tenantId,
    ...excludeDeleted(),
  },
});
```

### Get deleted items for recovery

```typescript
const deleted = await this.prisma.user.findMany({
  where: {
    tenantId,
    deletedAt: { not: null },
  },
  orderBy: { deletedAt: 'desc' },
});
```

## Audit Trail

Each soft delete now includes:

- **deletedAt** - Timestamp of deletion
- **deletedBy** - User ID who performed deletion

Example query to see who deleted what:

```typescript
const auditTrail = await this.prisma.user.findMany({
  where: {
    tenantId,
    deletedAt: { not: null },
  },
  select: {
    id: true,
    email: true,
    deletedAt: true,
    deletedBy: true,
  },
  orderBy: { deletedAt: 'desc' },
});
```

## Testing

Test cases to add for each soft delete:

1. Delete record → verify deletedAt is set
2. List records → verify deleted records excluded
3. Count records → verify deleted records not counted
4. Restore record → verify deletedAt cleared
5. Get deleted records → verify onlyDeleted() works

## Performance Notes

- Add index on deletedAt for faster queries: `@@index([deletedAt])`
- For large tables, consider: `@@index([tenantId, deletedAt])`
- Soft deletes increase row count; monitor DB size

## Future: Archive Tables

For very large deleted datasets, consider:

1. Move soft-deleted records to archive tables after N days
2. Query both active and archive tables
3. Or implement full audit logging system (Tier 3.2)
