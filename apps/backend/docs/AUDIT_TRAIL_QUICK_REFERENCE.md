# Audit Trail Quick Reference Guide

## How to Add Audit Tracking to a Service

### Step 1: Import Helpers

```typescript
import { getCreateAudit, getUpdateAudit } from '../audit/audit.helper';
```

### Step 2: Update CREATE Method

**Before:**

```typescript
async createMember(tenantId: string, dto: CreateMemberDto) {
  return this.prisma.member.create({
    data: {
      tenantId,
      fullName: dto.fullName,
      // ... other fields
    },
  });
}
```

**After:**

```typescript
async createMember(tenantId: string, dto: CreateMemberDto, creatorId: string) {
  return this.prisma.member.create({
    data: {
      tenantId,
      fullName: dto.fullName,
      // ... other fields
      ...getCreateAudit(creatorId), // ← ADD THIS LINE
    },
  });
}
```

### Step 3: Update UPDATE Method

**Before:**

```typescript
async updateMember(tenantId: string, id: string, dto: UpdateMemberDto) {
  return this.prisma.member.update({
    where: { id },
    data: {
      fullName: dto.fullName,
      // ... other fields
    },
  });
}
```

**After:**

```typescript
async updateMember(tenantId: string, id: string, dto: UpdateMemberDto, updaterId: string) {
  return this.prisma.member.update({
    where: { id },
    data: {
      fullName: dto.fullName,
      // ... other fields
      ...getUpdateAudit(updaterId), // ← ADD THIS LINE
    },
  });
}
```

### Step 4: Update Controller

**Before:**

```typescript
@Post()
create(@Req() req: any, @Body() dto: CreateMemberDto) {
  return this.membersService.createMember(req.user.tenantId, dto);
}
```

**After:**

```typescript
@Post()
create(@Req() req: any, @Body() dto: CreateMemberDto) {
  return this.membersService.createMember(req.user.tenantId, dto, req.user.sub);
  //                                                              ^^^^^^^^^^^^^^
  //                                                              userId from JWT
}
```

### Step 5: Test

```bash
npm run build  # Should compile without errors
```

---

## Available Helper Functions

```typescript
// Create operation
getCreateAudit(userId);
// Returns: { createdBy: userId }

// Update operation
getUpdateAudit(userId);
// Returns: { updatedBy: userId }

// Get both (for upsert)
getAuditData(userId);
// Returns: { createdBy, updatedBy }

// Extract audit from record
getAuditInfo(record);
// Returns: { createdBy, updatedBy, createdAt, updatedAt, deletedBy, deletedAt }

// Format for display
formatAuditTrail(record);
// Returns: {
//   created: { date: Date, by: userId },
//   lastModified: { date: Date, by: userId },
//   deleted: { date: Date, by: userId } | null
// }

// Select all audit fields
auditSelect();
// Returns object to add to Prisma select

// Fetch full trail with user info
getAuditTrailWithUsers(prisma, entityId, entityType);
// Returns: { entity, created, lastModified, deleted }
```

---

## Database Schema

Fields automatically added to Tenant, User, Member, Shop, Invoice:

```prisma
model Member {
  id              String    @id @default(cuid())

  // ... business fields ...

  // ✅ Audit Trail (NEW)
  createdAt  DateTime  @default(now())   // When created
  createdBy  String?                     // Who created (userId)
  updatedAt  DateTime  @updatedAt        // Last modified time
  updatedBy  String?                     // Who last modified

  // ✅ Soft Delete (Tier 3.1)
  deletedAt  DateTime?                   // When soft-deleted
  deletedBy  String?                     // Who deleted
}
```

---

## Usage Examples

### Create with Audit

```typescript
const member = await prisma.member.create({
  data: {
    tenantId,
    fullName: 'John Doe',
    phone: '+919876543210',
    feeAmount: 5000,
    ...getCreateAudit(userId), // Adds createdBy
  },
});

// Result:
// {
//   id: 'member-123',
//   fullName: 'John Doe',
//   createdBy: 'user-456',
//   createdAt: 2026-02-09T10:30:00Z,
//   ...
// }
```

### Update with Audit

```typescript
const updated = await prisma.member.update({
  where: { id: memberId },
  data: {
    fullName: 'Jane Doe',
    ...getUpdateAudit(userId), // Adds updatedBy
  },
});

// Result:
// {
//   id: 'member-123',
//   fullName: 'Jane Doe',
//   createdBy: 'user-456',
//   updatedBy: 'user-789',
//   updatedAt: 2026-02-09T10:35:00Z,
//   ...
// }
```

### Query with Audit

```typescript
const member = await prisma.member.findUnique({
  where: { id: memberId },
  select: {
    id: true,
    fullName: true,
    phone: true,
    ...auditSelect(), // Adds all audit fields to select
  },
});

// Result includes createdBy, createdAt, updatedBy, updatedAt, deletedBy, deletedAt
```

### Get Audit Trail with Users

```typescript
const trail = await getAuditTrailWithUsers(prisma, 'member-123', 'Member');

// Result:
// {
//   entity: { type: 'Member', id: 'member-123' },
//   created: {
//     at: 2026-02-09T10:30:00Z,
//     by: {
//       id: 'user-456',
//       email: 'john@example.com',
//       fullName: 'John Smith'
//     }
//   },
//   lastModified: {
//     at: 2026-02-09T10:35:00Z,
//     by: {
//       id: 'user-789',
//       email: 'jane@example.com',
//       fullName: 'Jane Doe'
//     }
//   },
//   deleted: null
// }
```

---

## Services Already Implemented

✅ **TenantService**

- createTenant() - captures createdBy

✅ **StaffService**

- createStaff() - captures createdBy
- inviteByEmail() - captures createdBy

✅ **MembersService**

- createMember() - captures createdBy
- updateMember() - captures updatedBy

---

## Services Pending (Optional)

These could be updated with the same pattern:

- ShopService (createShop, updateShop)
- InvoiceService (createInvoice, updateInvoice)
- PaymentService (recordPayment, updatePayment)
- QuotationService (createQuotation)
- FollowUpService (createFollowUp, updateFollowUp)

---

## Testing Pattern

```typescript
describe('Audit Trail', () => {
  it('should capture createdBy', async () => {
    const result = await service.createMember(tenantId, memberDto, userId);
    expect(result.createdBy).toBe(userId);
    expect(result.createdAt).toBeDefined();
  });

  it('should capture updatedBy', async () => {
    const updated = await service.updateMember(
      tenantId,
      memberId,
      updateDto,
      userId,
    );
    expect(updated.updatedBy).toBe(userId);
  });

  it('should fetch audit trail with users', async () => {
    const trail = await getAuditTrailWithUsers(prisma, memberId, 'Member');
    expect(trail.created.by.fullName).toBeDefined();
  });
});
```

---

## Common Issues & Solutions

**Issue:** `TypeError: getCreateAudit is not a function`
**Solution:** Import it: `import { getCreateAudit } from '../audit/audit.helper'`

**Issue:** Build error: `Expected 3 arguments, but got 2`
**Solution:** Add userId parameter to service method call and update signature

**Issue:** Audit fields are null in database
**Solution:** Make sure you're passing `...getCreateAudit(userId)` in the Prisma data object

**Issue:** `req.user.sub` is undefined
**Solution:** Ensure JwtAuthGuard is applied to the route and token is valid

---

## Compliance Checklist

- [x] Who created each record (createdBy)
- [x] When records are created (createdAt)
- [x] Who last modified records (updatedBy)
- [x] When records were modified (updatedAt)
- [x] Who deleted records (deletedBy via soft delete)
- [x] When records were deleted (deletedAt via soft delete)
- [x] Full recovery trail (soft delete + audit)
- [x] User accountability (all changes attributed to userId)

---

**Last Updated:** February 9, 2026  
**Status:** Ready for use  
**Related Docs:** [Tier 3.2 Complete](./TIER3_EXTENDED_AUDIT_COMPLETE.md) | [Soft Delete Guide](./SOFT_DELETE_GUIDE.md)
