# Phase 2.5 Testing & Verification Guide

## Overview

This guide provides step-by-step instructions for testing and validating all Phase 2.5 optimizations.

---

## ✅ Verification Results

### Remaining Endpoints Analysis

#### 1. **List Payments** - `payment.service.ts:listPayments()`

**Status**: ✅ NO PAGINATION NEEDED  
**Reason**: Already scoped to a single invoice (`linkedInvoiceId: invoiceId`)

```typescript
async listPayments(tenantId: string, invoiceId: string) {
  return this.prisma.receipt.findMany({
    where: {
      tenantId,
      linkedInvoiceId: invoiceId,  // ← Scoped to single invoice
    },
    orderBy: { createdAt: 'desc' },
  });
}
```

**Volume**: Typical invoices have 1-5 payments maximum → No pagination needed
**Performance**: Already optimized by scope

---

#### 2. **List Catalog** - `shop-products.service.ts:listCatalog()`

**Status**: ✅ ALREADY OPTIMIZED  
**Reason**: Uses parallel queries with field selection

```typescript
const [linked, globalActive] = await Promise.all([
  this.prisma.shopProduct.findMany({
    where: { tenantId, shopId, isActive: true },
    select: { id, name, globalProductId }, // ← Field selection
  }),
  this.prisma.globalProduct.findMany({
    where: { isActive: true },
    select: { id, name }, // ← Field selection
  }),
]);
```

**Optimization Level**: Already uses parallel queries + field selection
**Performance**: No changes needed

---

#### 3. **List Tenants with Subscription** - `tenant.service.ts:listTenantsWithSubscription()`

**Status**: ✅ LOW PRIORITY (Admin Only)  
**Reason**: Admin endpoint, not user-facing, small result set

```typescript
async listTenantsWithSubscription() {
  const tenants = await this.prisma.tenant.findMany({
    include: {
      subscription: true,
      userTenants: { ... },  // ← Small result set expected
    },
  });
}
```

**Usage**: Only on admin dashboard, probably <100 tenants
**Decision**: Leave as-is, pagination not critical

---

#### 4. **Job Cards List** - `job-cards.service.ts:list()`

**Status**: ✅ ACCEPTABLE (Per-Shop Scoped)  
**Reason**: Already scoped to single shop, has smart includes

```typescript
async list(user, shopId: string) {
  const jobCards = await this.prisma.jobCard.findMany({
    where: { shopId },  // ← Per-shop scoped
    orderBy: { createdAt: 'desc' },
    include: {
      invoices: true,
      parts: user.role === 'OWNER' ? { include: { product: true } } : false,
    },
  });
}
```

**Volume**: Per-shop job cards typically <500
**Optimization**: Role-based includes (OWNER vs STAFF)
**Decision**: Optional pagination, but not critical. Can add later if needed.

---

## 🧪 Testing Checklist

### Phase 2.5 Endpoints to Test

#### Test 1: Customers List

```
✅ Test without pagination (should apply defaults)
GET /core/customers
Expected: { data: [array], total: X, skip: 0, take: 50 }

✅ Test with pagination
GET /core/customers?skip=0&take=20
Expected: { data: [array of max 20], total: X, skip: 0, take: 20 }

✅ Test with search
GET /core/customers?skip=0&take=20&search=john
Expected: Filtered results containing "john"

✅ Test pagination offset
GET /core/customers?skip=50&take=20
Expected: Second page of results (skip 50, take 20)

✅ Test large take value
GET /core/customers?skip=0&take=100
Expected: Max 100 items returned
```

**Verify**:

- [ ] Response contains `data`, `total`, `skip`, `take` fields
- [ ] Pagination works correctly (skip/take values honored)
- [ ] Search filters results appropriately
- [ ] Total count reflects filtered results (with search)

---

#### Test 2: Invoices List (Receipt Aggregation)

```
✅ Test invoices without receipts loaded
GET /mobileshop/invoices?shopId=xyz
Expected: No full receipt objects, only paidAmount calculated

✅ Test response time improvement
Measure request duration, compare with before optimization
Expected: 3-5x faster than pre-optimization

✅ Verify payment status calculation
GET /mobileshop/invoices?shopId=xyz
Expected:
  - paymentStatus: "PAID" (if balanceAmount <= 0)
  - paymentStatus: "PARTIALLY_PAID" (if paidAmount > 0 and balance > 0)
  - paymentStatus: "UNPAID" (if paidAmount == 0)

✅ Test with search
GET /mobileshop/invoices?shopId=xyz&search=INV001
Expected: Search filters by invoiceNumber, customerName, or customerPhone
```

**Verify**:

- [ ] Receipt aggregation works (no full receipt objects in response)
- [ ] Payment amounts calculated correctly (paidAmount, balanceAmount)
- [ ] Response time significantly faster
- [ ] Payload size reduced (check browser DevTools)

---

#### Test 3: Follow-ups List

```
✅ Test my follow-ups with pagination
GET /core/follow-ups/my?skip=0&take=50
Expected: { data: [array], total: X, skip: 0, take: 50 }

✅ Test all follow-ups (admin)
GET /core/follow-ups/all?skip=0&take=50
Expected: { data: [array], total: X, skip: 0, take: 50 }

✅ Test with filters
GET /core/follow-ups/my?skip=0&take=50&status=PENDING
Expected: Filtered results for PENDING status

✅ Test notify-on-due parameter
GET /core/follow-ups/my?skip=0&take=50&notify=true
Expected: Creates due alerts + returns paginated results

✅ Test without pagination (apply defaults)
GET /core/follow-ups/my
Expected: { data: [first 50 items], total: X, skip: 0, take: 50 }
```

**Verify**:

- [ ] Pagination parameters honored
- [ ] Related objects loaded (assignedToUser, shop, customer)
- [ ] Filters work correctly
- [ ] notify-on-due parameter still works

---

#### Test 4: Gym Attendance List

```
✅ Test today's attendance with pagination
GET /gym/attendance/today?skip=0&take=50
Expected: { data: [today's attendance], total: X, skip: 0, take: 50 }

✅ Test currently checked-in members
GET /gym/attendance/inside-members?skip=0&take=50
Expected: { data: [checked-in members], total: X, skip: 0, take: 50 }

✅ Test response structure
GET /gym/attendance/today?skip=0&take=20
Expected:
{
  data: [
    {
      attendanceId: string,
      checkInTime: DateTime,
      checkOutTime: DateTime,
      memberId: string,
      memberName: string,
      phone: string
    }
  ],
  total: number,
  skip: 0,
  take: 20
}

✅ Test large result set
If gym has 500+ attendance records today
GET /gym/attendance/today?skip=0&take=50
Expected: Only 50 returned, total shows 500+
```

**Verify**:

- [ ] Pagination limits results correctly
- [ ] Response structure is correct
- [ ] Member data is included
- [ ] Total count is accurate

---

### Backward Compatibility Tests

```
✅ Old API calls without pagination params still work
GET /core/customers (no pagination params)
Expected: Uses defaults (skip=0, take=50)

✅ Response format is consistent
All endpoints return: { data, total, skip, take }

✅ Existing integrations don't break
If clients call without skip/take, should still work

✅ Default page size sensible
Default take=50 should balance performance and user experience
```

---

## 📊 Performance Testing

### Network Simulation (Chrome DevTools)

#### Setup

1. Open browser DevTools (F12)
2. Go to Network tab
3. Click throttling dropdown (top right)
4. Select "Slow 3G" or create custom throttle

#### Test Procedure

```
1. Clear cache (Ctrl+Shift+Delete)
2. Record baseline (measure 3 requests)
3. Document response times
4. Compare with expected improvements
```

#### Expected Results

| Endpoint                | Before | After     | Improvement |
| ----------------------- | ------ | --------- | ----------- |
| Customers (1000 items)  | 2-3s   | 400-600ms | 4-5x        |
| Invoices (100 invoices) | 1.5-2s | 300-400ms | 4-6x        |
| Follow-ups (500 items)  | 2-3s   | 400-700ms | 3-5x        |
| Attendance (500 items)  | 1-2s   | 400-600ms | 2-4x        |

#### Payload Size

```
Check DevTools Network tab → Size column
Expected: 50-80% reduction with gzip compression
```

---

## 🚀 Manual Testing Script

### 1. Start Backend

```bash
cd apps/backend
npm run start:dev
```

### 2. Test Customers List

```bash
# Test without pagination
curl "http://localhost_REPLACED:3000/core/customers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test with pagination
curl "http://localhost_REPLACED:3000/core/customers?skip=0&take=20" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test with search
curl "http://localhost_REPLACED:3000/core/customers?skip=0&take=20&search=john" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. Test Follow-ups List

```bash
# Test my follow-ups
curl "http://localhost_REPLACED:3000/core/follow-ups/my?skip=0&take=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test all follow-ups (admin only)
curl "http://localhost_REPLACED:3000/core/follow-ups/all?skip=0&take=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. Test Gym Attendance

```bash
# Test today's attendance
curl "http://localhost_REPLACED:3000/gym/attendance/today?skip=0&take=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Test checked-in members
curl "http://localhost_REPLACED:3000/gym/attendance/inside-members?skip=0&take=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ✨ Success Criteria

### All tests pass if:

- ✅ Response time improved by 3-5x on pagination endpoints
- ✅ Payload size reduced by 50-80% with gzip
- ✅ All response structures include { data, total, skip, take }
- ✅ Pagination parameters honored correctly
- ✅ Backward compatibility maintained
- ✅ No TypeScript errors or runtime errors
- ✅ Build passes: `npm run build`

---

## 📝 Testing Report Template

Use this template to document test results:

```markdown
# Phase 2.5 Testing Report

## Date: [Date]

### Customers List

- [ ] Pagination works correctly
- [ ] Search filters results
- [ ] Response time: \_\_\_ ms (expected 400-600ms)
- [ ] Payload size: \_\_\_ KB (expected <20KB gzip)
- Status: ✅ PASS / ❌ FAIL

### Invoices List

- [ ] Receipt aggregation working (no full receipts)
- [ ] Payment status calculated correctly
- [ ] Response time: \_\_\_ ms (expected 300-400ms)
- [ ] Payload size: \_\_\_ KB (expected <50KB gzip)
- Status: ✅ PASS / ❌ FAIL

### Follow-ups List

- [ ] Pagination working
- [ ] Related data loading
- [ ] Response time: \_\_\_ ms (expected 400-700ms)
- Status: ✅ PASS / ❌ FAIL

### Attendance List

- [ ] Pagination working
- [ ] Member data included
- [ ] Response time: \_\_\_ ms (expected 400-600ms)
- Status: ✅ PASS / ❌ FAIL

## Overall: ✅ ALL TESTS PASS
```

---

## 🔍 Debugging Tips

### If pagination not working:

1. Check controller has `@Query('skip')` and `@Query('take')`
2. Verify service method accepts options parameter
3. Check Prisma `skip` and `take` are numbers (not strings)

### If performance not improving:

1. Check N+1 queries: Use `include` judiciously
2. Verify field selection is being used (select not include)
3. Profile with `npm run start:debug` and check query logs
4. Use Prisma logging to see actual SQL queries

### If response structure wrong:

1. Verify service returns `{ data, total, skip, take }`
2. Check controller returns service response directly
3. Ensure pagination defaults applied (skip=0, take=50)

---

## ✅ Sign-off

Once all tests pass:

- [ ] Document test results
- [ ] Commit changes with message
- [ ] Proceed to Phase 4 (Advanced optimizations)
