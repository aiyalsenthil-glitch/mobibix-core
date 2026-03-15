# Tier 3.3: Data Isolation Security - Multi-Tenant Protection

**Date:** February 9, 2026  
**Status:** Implementation Starting  
**Scope:** Verify tenant data isolation, prevent cross-tenant access

---

## Objective

Ensure **complete data isolation** between tenants in the multi-tenant system:

- ✅ Tenant A cannot access Tenant B's data
- ✅ Tenant A staff cannot access other tenants' data
- ✅ No data leakage through API endpoints
- ✅ Database queries properly filtered by tenantId

---

## Architecture Review

### Current Multi-Tenant Model

```
┌─────────────────────────────────────────────┐
│          PostgreSQL Database                 │
├─────────────────────────────────────────────┤
│                                             │
│  Tenant 1 (GYM-001)                         │
│  ├─ Users: staff-1, staff-2                 │
│  ├─ Members: 100+                           │
│  └─ Invoices: 50+                           │
│                                             │
│  Tenant 2 (GYM-002)                         │
│  ├─ Users: staff-3, staff-4                 │
│  ├─ Members: 150+                           │
│  └─ Invoices: 75+                           │
│                                             │
│  (Cross-Tenant Boundaries - MUST BE STRICT) │
│                                             │
└─────────────────────────────────────────────┘
       ↓
    Authentication
       ↓
┌─────────────────────────────────────────────┐
│         JWT Token Contains:                 │
│  - userId (who)                             │
│  - tenantId (which tenant)                  │
│  - role (what they can do)                  │
└─────────────────────────────────────────────┘
       ↓
    Authorization
       ↓
┌─────────────────────────────────────────────┐
│    Request Handler (Controller/Guard)      │
│  - Extract tenantId from JWT               │
│  - Pass to service layer                   │
│  - Service filters queries by tenantId     │
└─────────────────────────────────────────────┘
```

### Data Isolation Strategy

**Layer 1: Database Schema**

- Every record has `tenantId` field
- No global records (everything scoped to tenant)
- Foreign keys maintain relationships

**Layer 2: Service Layer**

- All Prisma queries include `where: { tenantId }` filter
- Never query without tenant context
- Soft delete respects tenant boundaries

**Layer 3: Controller/Guard**

- Extract tenantId from JWT token
- Validate it exists and is active
- Pass to service layer
- Never trust client-provided tenantId

**Layer 4: Business Logic**

- Role-based access control (OWNER, STAFF, MEMBER)
- OWNER controls staff assignments
- STAFF can only access their tenant's data
- MEMBER data isolated by tenant

---

## Critical Security Test Scenarios

### Scenario 1: Cross-Tenant Member Access

**Test:** Can Tenant A staff access Tenant B's members?

```typescript
describe('Data Isolation - Members', () => {
  it('should NOT allow staff from gym A to access gym B members', async () => {
    // Setup
    const gymA = await createTenant('GYM-001');
    const gymB = await createTenant('GYM-002');
    const staffA = await createStaff(gymA.id);
    const memberB = await createMember(gymB.id);

    // Act - Try to access memberB as staffA
    const token = issueJWT({ userId: staffA.id, tenantId: gymA.id });
    const response = await get(`/members/${memberB.id}`, token);

    // Assert
    expect(response.status).toBe(403); // Forbidden
    expect(response.body).not.toContain(memberB.phone);
  });

  it('should NOT return gym B members in list', async () => {
    // Setup
    const gymA = await createTenant('GYM-001');
    const gymB = await createTenant('GYM-002');
    const staffA = await createStaff(gymA.id);
    const membersB = await createMembers(gymB.id, 5);

    // Act
    const token = issueJWT({ userId: staffA.id, tenantId: gymA.id });
    const members = await get('/members', token);

    // Assert
    expect(members.data.length).toBe(0);
    expect(members.data.map((m) => m.id)).not.toContain(membersB[0].id);
  });
});
```

### Scenario 2: Cross-Tenant Staff Escalation

**Test:** Can staff member from Tenant A change Tenant B's staff?

```typescript
describe('Data Isolation - Staff Management', () => {
  it('should NOT allow staff A to invite staff to gym B', async () => {
    // Setup
    const gymA = await createTenant('GYM-001');
    const gymB = await createTenant('GYM-002');
    const staffA = await createStaff(gymA.id);

    // Act - Try to invite staff to gymB as staffA
    const token = issueJWT({ userId: staffA.id, tenantId: gymA.id });
    const response = await post(
      '/staff/invite',
      { email: 'newstaff@gym.com' },
      { ...token, headers: { 'X-Tenant-ID': gymB.id } }, // Try to override
    );

    // Assert
    expect(response.status).toBe(403);
    expect(await getStaffCount(gymB.id)).toBe(1); // Only owner
  });

  it('should NOT allow accessing other gym staff list', async () => {
    // Setup
    const gymA = await createTenant('GYM-001');
    const gymB = await createTenant('GYM-002');
    const staffA = await createStaff(gymA.id);
    const staffB = await createStaff(gymB.id);

    // Act
    const token = issueJWT({ userId: staffA.id, tenantId: gymA.id });
    const staff = await get('/staff', token);

    // Assert
    expect(staff.data.map((s) => s.id)).not.toContain(staffB.id);
  });
});
```

### Scenario 3: Cross-Tenant Invoice Access

**Test:** Can staff from Tenant A access Tenant B's invoices?

```typescript
describe('Data Isolation - Financial Data', () => {
  it('should NOT expose invoices from other tenants', async () => {
    // Setup
    const gymA = await createTenant('GYM-001');
    const gymB = await createTenant('GYM-002');
    const staffA = await createStaff(gymA.id);
    const invoiceB = await createInvoice(gymB.id);

    // Act
    const token = issueJWT({ userId: staffA.id, tenantId: gymA.id });
    const response = await get(`/invoices/${invoiceB.id}`, token);

    // Assert
    expect(response.status).toBe(403);
    expect(response.body).not.toContain(invoiceB.id);
  });

  it('should NOT return invoices from other tenants in list', async () => {
    // Setup
    const gymA = await createTenant('GYM-001');
    const gymB = await createTenant('GYM-002');
    const staffA = await createStaff(gymA.id);
    await createInvoices(gymB.id, 10);

    // Act
    const token = issueJWT({ userId: staffA.id, tenantId: gymA.id });
    const invoices = await get('/invoices', token);

    // Assert
    expect(invoices.data.length).toBe(0);
  });
});
```

### Scenario 4: Role-Based Access Control

**Test:** Verify MEMBER can't access STAFF endpoints

```typescript
describe('Data Isolation - RBAC', () => {
  it('should NOT allow MEMBER to access staff endpoints', async () => {
    // Setup
    const gym = await createTenant('GYM-001');
    const member = await createMember(gym.id);

    // Act
    const token = issueJWT({
      userId: member.id,
      tenantId: gym.id,
      role: 'MEMBER',
    });
    const response = await get('/staff', token);

    // Assert
    expect(response.status).toBe(403);
  });

  it('should NOT allow STAFF to create new tenants', async () => {
    // Setup
    const gym = await createTenant('GYM-001');
    const staff = await createStaff(gym.id);

    // Act
    const token = issueJWT({
      userId: staff.id,
      tenantId: gym.id,
      role: 'STAFF',
    });
    const response = await post('/tenant', { name: 'New Gym' }, token);

    // Assert
    expect(response.status).toBe(403);
  });
});
```

### Scenario 5: Deleted Data Isolation

**Test:** Soft-deleted data doesn't leak

```typescript
describe('Data Isolation - Soft Delete', () => {
  it('should NOT return soft-deleted members in list', async () => {
    // Setup
    const gym = await createTenant('GYM-001');
    const staff = await createStaff(gym.id);
    const member = await createMember(gym.id);

    // Act
    await deleteMember(gym.id, member.id, staff.id); // Soft delete
    const members = await get('/members', issueJWT({...}));

    // Assert
    expect(members.data.map(m => m.id)).not.toContain(member.id);
  });

  it('should NOT expose soft-deleted member details', async () => {
    // Setup
    const gym = await createTenant('GYM-001');
    const member = await createMember(gym.id);
    const staff = await createStaff(gym.id);

    // Act
    await deleteMember(gym.id, member.id, staff.id);
    const response = await get(`/members/${member.id}`, issueJWT({...}));

    // Assert
    expect(response.status).toBe(404);
  });
});
```

---

## Service Layer Validation

### Checklist: Verify All Queries Have tenantId Filter

**Pattern to check:**

```typescript
// ✅ CORRECT - Includes tenantId
await prisma.member.findMany({
  where: {
    tenantId: tenantId, // ← MUST HAVE THIS
    isActive: true,
  },
});

// ❌ WRONG - Missing tenantId
await prisma.member.findMany({
  where: {
    isActive: true, // ← VULNERABLE!
  },
});
```

**Services to audit:**

1. **MembersService**
   - [ ] `listMembers()` - check tenantId filter
   - [ ] `createMember()` - validate tenantId
   - [ ] `updateMember()` - verify ownership
   - [ ] `deleteMember()` - prevent cross-tenant deletion
   - [ ] `getMemberById()` - include tenantId check
   - [ ] `getMemberPayments()` - filter by tenant

2. **StaffService**
   - [ ] `listStaff()` - check tenantId filter
   - [ ] `createStaff()` - validate tenant exists
   - [ ] `inviteByEmail()` - verify tenant ownership
   - [ ] `removeStaff()` - prevent cross-tenant removal

3. **TenantService**
   - [ ] `getCurrentTenant()` - verify user's tenant
   - [ ] `updateTenant()` - owner verification
   - [ ] `getTenantById()` - access control check

4. **InvoiceService**
   - [ ] `listInvoices()` - tenant filter
   - [ ] `getInvoice()` - ownership check
   - [ ] `createInvoice()` - tenant validation
   - [ ] `updateInvoice()` - prevent cross-tenant updates

5. **Other Services**
   - [ ] ShopService
   - [ ] QuotationService
   - [ ] PaymentService
   - [ ] FollowUpService

---

## Guard/Middleware Validation

### Current Guards in Use

**JwtAuthGuard** - Verifies token and extracts user context

```typescript
// Should verify:
// ✅ Token is valid
// ✅ User exists
// ✅ User is active
// ✅ tenantId is set (for non-owner users)
```

**PermissionsGuard** - Checks fine-grained permissions

```typescript
// Should verify:
// ✅ User has required permission
// ✅ Permission is scoped to tenant
// ✅ Can't escalate permissions
```

**RolesGuard** - Checks role-based access

```typescript
// Should verify:
// ✅ User has required role
// ✅ Role is for the right tenant
// ✅ Can't switch roles
```

**TenantStatusGuard** - Checks tenant status

```typescript
// Should verify:
// ✅ Tenant exists and is active
// ✅ User belongs to tenant
// ✅ Subscription is valid
```

### Testing Guards

```typescript
describe('Guards - Data Isolation', () => {
  it('JwtAuthGuard should reject requests without token', async () => {
    const response = await get('/members');
    expect(response.status).toBe(401);
  });

  it('JwtAuthGuard should reject invalid tokens', async () => {
    const response = await get('/members', 'invalid-token');
    expect(response.status).toBe(401);
  });

  it('TenantStatusGuard should reject invalid tenant', async () => {
    const token = issueJWT({ userId, tenantId: 'invalid-id' });
    const response = await get('/members', token);
    expect(response.status).toBe(400);
  });

  it('PermissionsGuard should block unauthorized actions', async () => {
    const token = issueJWT({ userId, tenantId, role: 'MEMBER' });
    const response = await post('/staff/invite', {...}, token);
    expect(response.status).toBe(403);
  });
});
```

---

## Query Vulnerability Scan

### Automated Check: Find Missing tenantId Filters

```bash
# Search for potentially vulnerable patterns
grep -r "findMany\|findUnique\|count" src/ \
  --include="*.service.ts" | \
  grep -v "tenantId\|where.*tenantId" | \
  head -20
```

### Manual Review Checklist

```typescript
// Pattern 1: Query with tenantId - ✅ SAFE
const members = await prisma.member.findMany({
  where: { tenantId, isActive: true },
});

// Pattern 2: Query with computed tenantId - ✅ SAFE
const tenantId = req.user.tenantId;
const members = await prisma.member.findMany({
  where: { tenantId },
});

// Pattern 3: Query without tenantId - ❌ UNSAFE
const members = await prisma.member.findMany({
  where: { isActive: true }, // VULNERABLE!
});

// Pattern 4: Global search - ❌ UNSAFE
const user = await prisma.user.findFirst({
  where: { email }, // Could match user from ANY tenant
});

// Pattern 5: Admin override - ⚠️ USE CAUTION
if (req.user.role === 'ADMIN') {
  // Can bypass tenant check, but log it
  return prisma.member.findMany(); // Needs audit logging
}
```

---

## API Endpoint Security Review

### Endpoints to Test

```
GET    /members              - List members (tenantId filter)
GET    /members/:id          - Get member (verify ownership)
POST   /members              - Create member (validate tenantId)
PATCH  /members/:id          - Update member (verify ownership)
DELETE /members/:id          - Delete member (soft delete + audit)

GET    /staff                - List staff (tenantId filter)
POST   /staff                - Add staff (verify can manage staff)
POST   /staff/invite         - Invite staff (verify tenant owner)
DELETE /staff/:id            - Remove staff (verify ownership)

GET    /invoices             - List invoices (tenantId filter)
GET    /invoices/:id         - Get invoice (verify ownership)
POST   /invoices             - Create invoice (validate tenantId)
PATCH  /invoices/:id         - Update invoice (verify ownership)

GET    /tenant               - Get current tenant (from JWT)
POST   /tenant               - Create tenant (owner creation)
PATCH  /tenant               - Update tenant (owner only)
```

---

## Test Implementation Plan

### Phase 1: Unit Tests (Service Layer)

Create `src/core/__tests__/isolation.service.spec.ts`:

```typescript
import { Test } from '@nestjs/testing';
import { MembersService } from '../members/members.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Data Isolation - Service Layer', () => {
  let service: MembersService;
  let prisma: PrismaService;
  let gymA: any, gymB: any;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [MembersService, PrismaService],
    }).compile();

    service = module.get(MembersService);
    prisma = module.get(PrismaService);

    // Create two separate gyms
    gymA = await prisma.tenant.create({ data: { name: 'Gym A' } });
    gymB = await prisma.tenant.create({ data: { name: 'Gym B' } });
  });

  it('should NOT return gym B members when querying gym A', async () => {
    const memberB = await prisma.member.create({
      data: {
        tenantId: gymB.id,
        fullName: 'Member B',
        phone: '+91...',
        feeAmount: 1000,
        paidAmount: 1000,
        durationCode: 'M1',
      },
    });

    const membersA = await service.listMembers(gymA.id);

    expect(membersA).not.toContainEqual(
      expect.objectContaining({ id: memberB.id }),
    );
  });
});
```

### Phase 2: Integration Tests (E2E)

Create `test/isolation.e2e.spec.ts`:

```typescript
describe('Data Isolation - E2E', () => {
  let app: INestApplication;
  let gymA: any, gymB: any;
  let tokenA: string, tokenB: string;

  beforeAll(async () => {
    // Create app and setup
    gymA = await createTenant('Gym A');
    gymB = await createTenant('Gym B');
    tokenA = issueJWT({ userId: gymA.ownerId, tenantId: gymA.id });
    tokenB = issueJWT({ userId: gymB.ownerId, tenantId: gymB.id });
  });

  it('User A should NOT see User B members', async () => {
    const memberB = await service.createMember(
      gymB.id,
      { fullName: 'B Member', ... },
      gymB.ownerId
    );

    const response = await request(app.getHttpServer())
      .get('/members')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(response.body.data).not.toContainEqual(
      expect.objectContaining({ id: memberB.id })
    );
  });

  it('User A should NOT be able to update User B member', async () => {
    const memberB = await service.createMember(
      gymB.id,
      { fullName: 'B Member', ... },
      gymB.ownerId
    );

    const response = await request(app.getHttpServer())
      .patch(`/members/${memberB.id}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ fullName: 'Hacked' });

    expect(response.status).toBe(403);
  });
});
```

### Phase 3: Security Audit Report

Generate report showing:

- ✅ All query points have tenantId filter
- ✅ All endpoints verify access
- ✅ No cross-tenant data leaks
- ✅ Role-based access enforced
- ✅ Guards are properly configured

---

## Common Vulnerabilities to Prevent

| Vulnerability             | Example                                                | Fix                            |
| ------------------------- | ------------------------------------------------------ | ------------------------------ |
| Missing tenantId          | `findMany({ where: { isActive: true } })`              | Add `tenantId` to where clause |
| Client-provided tenantId  | `findMany({ where: { tenantId: req.body.tenantId } })` | Use JWT tenantId instead       |
| Insufficient RBAC         | STAFF can invite to any tenant                         | Verify OWNER status            |
| Missing soft-delete check | `findMany()` returns deleted records                   | Use `excludeDeleted()` helper  |
| Global searches           | `findFirst({ where: { email } })`                      | Add tenantId context           |
| Direct ID access          | GET /members/123 without tenant check                  | Add tenantId verification      |
| Mass update/delete        | `updateMany()` without tenant filter                   | Always include tenantId        |
| Backup data exposure      | Unencrypted backups                                    | Use encrypted backups          |

---

## Success Criteria

✅ **Complete when:**

- [ ] All queries reviewed and verified
- [ ] No missing tenantId filters found
- [ ] 100% of endpoints tested for cross-tenant access
- [ ] RBAC properly enforced at all levels
- [ ] Soft-deleted data properly isolated
- [ ] Guards tested and verified
- [ ] Security test suite created
- [ ] Report generated with findings

---

## Next Steps

1. **Audit database queries** - Find any missing tenantId filters
2. **Test API endpoints** - Verify cross-tenant access is blocked
3. **Verify guards** - Ensure authentication/authorization working
4. **Create test suite** - Comprehensive isolation tests
5. **Generate report** - Document findings and fixes
6. **Deploy & monitor** - Watch for isolation issues

---

## Files to Review

```
src/core/
├── members/members.service.ts        ← Check all queries
├── staff/staff.service.ts             ← Check all queries
├── tenant/tenant.service.ts           ← Check all queries
├── auth/guards/
│   ├── jwt-auth.guard.ts              ← Verify tenantId extraction
│   ├── roles.guard.ts                 ← Check role validation
│   └── permissions.guard.ts           ← Check permission validation
└── tenant/guards/tenant-status.guard.ts ← Verify tenant check
```

---

**Status:** Assessment Complete - Ready for Implementation  
**Estimated Effort:** 4-6 hours for full test suite  
**Risk Level:** High - Critical for data security  
**Next Action:** Start query audit and test creation
