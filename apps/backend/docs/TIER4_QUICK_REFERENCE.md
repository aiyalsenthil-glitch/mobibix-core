# 🚀 Tier 4 Performance - Quick Reference

**For Developers:** Fast lookup guide for implementing performance optimizations

---

## 1. Using the Cache Service

### Basic Usage

```typescript
// In any service
constructor(private cacheService: CacheService) {}

// Get from cache
const value = this.cacheService.get<Tenant>('tenant:123');

// Set in cache (5 min TTL)
this.cacheService.set('tenant:123', tenantData, 5 * 60 * 1000);

// Delete from cache
this.cacheService.delete('tenant:123');
```

### Cache-Aside Pattern (Recommended)

```typescript
async getTenantSubscription(tenantId: string) {
  return this.cacheService.getOrSet(
    `subscription:${tenantId}`,
    () => this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    }),
    5 * 60 * 1000, // 5 minutes
  );
}
```

### Cache Invalidation

```typescript
// Invalidate single item
this.cacheService.delete(`subscription:${tenantId}`);

// Invalidate all items for a tenant
this.cacheService.invalidatePattern(`tenant:${tenantId}`);

// Clear all cache
this.cacheService.clear();
```

### Cache Naming Convention

```
{resource}:{identifier}:{sub-resource}

Examples:
- tenant:abc123
- subscription:abc123
- user:xyz789
- member:abc123:payments
- shop:abc123:settings
```

---

## 2. Adding Pagination to Services

### Service Method Pattern

```typescript
async listMembers(
  tenantId: string,
  options?: { skip?: number; take?: number; search?: string }
) {
  const { skip = 0, take = 50, search } = options ?? {};

  // Build where clause
  const where: any = { tenantId, deletedAt: null };

  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  // Parallel count + fetch
  const [total, data] = await Promise.all([
    this.prisma.member.count({ where }),
    this.prisma.member.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      select: { /* only needed fields */ },
    }),
  ]);

  return { data, total };
}
```

### Controller Pattern

```typescript
import { PaginationDto, PaginatedResponse } from '@/common/dto/pagination.dto';

@Get()
async list(
  @Req() req,
  @Query() pagination: PaginationDto
): Promise<PaginatedResponse<MemberDto>> {
  const result = await this.membersService.listMembers(
    req.user.tenantId,
    pagination,
  );

  return new PaginatedResponse(
    result.data,
    result.total,
    pagination.skip,
    pagination.take,
  );
}
```

---

## 3. Optimizing Queries

### Use Explicit `select` Instead of `include`

```typescript
// ❌ Bad: Over-fetching
const member = await this.prisma.member.findUnique({
  where: { id },
  include: {
    tenant: true,
    payments: true,
    attendances: true,
  },
});

// ✅ Good: Minimal fetch
const member = await this.prisma.member.findUnique({
  where: { id },
  select: {
    id: true,
    fullName: true,
    phone: true,
    membershipEndAt: true,
    paymentStatus: true,
  },
});
```

### Fix N+1 Queries

```typescript
// ❌ Bad: N+1 problem
const invoices = await prisma.invoice.findMany({ where: { tenantId } });
for (const invoice of invoices) {
  invoice.items = await prisma.invoiceItem.findMany({
    where: { invoiceId: invoice.id },
  });
}

// ✅ Good: Single query with JOIN
const invoices = await prisma.invoice.findMany({
  where: { tenantId },
  include: { items: true },
});
```

### Parallelize Independent Queries

```typescript
// ❌ Bad: Sequential
const members = await getMemberStats(tenantId);
const invoices = await getInvoiceStats(tenantId);
const payments = await getPaymentStats(tenantId);

// ✅ Good: Parallel
const [members, invoices, payments] = await Promise.all([
  getMemberStats(tenantId),
  getInvoiceStats(tenantId),
  getPaymentStats(tenantId),
]);
```

---

## 4. Database Indexes

### Check if Index Exists

```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'Member';
```

### Verify Index Usage

```sql
EXPLAIN ANALYZE
SELECT * FROM "Member"
WHERE "tenantId" = 'abc123'
  AND "deletedAt" IS NULL;

-- Look for "Index Scan" (good) vs "Seq Scan" (bad)
```

### Common Index Patterns

```sql
-- Soft-delete filtering
CREATE INDEX "Member_tenantId_deletedAt_idx"
ON "Member"("tenantId", "deletedAt");

-- Status filtering
CREATE INDEX "Member_tenantId_paymentStatus_idx"
ON "Member"("tenantId", "paymentStatus");

-- Date-range queries
CREATE INDEX "Invoice_tenantId_createdAt_idx"
ON "Invoice"("tenantId", "createdAt");

-- Foreign key lookups
CREATE INDEX "Invoice_customerId_idx"
ON "Invoice"("customerId");
```

---

## 5. Performance Monitoring

### Check Slow Queries

```typescript
// Logs automatically with PerformanceInterceptor
// Look for warnings in console:
⚠️  SLOW: GET /api/invoices - 1250ms
🐌 VERY SLOW: GET /api/dashboard - 3500ms
```

### Enable Prisma Query Logging

```typescript
// In development, see all queries
prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### Test Response Time

```bash
# Test with cURL
curl -w "@curl-format.txt" -H "Authorization: Bearer <token>" \
  https://api.example.com/api/members

# curl-format.txt:
time_total:  %{time_total}\n
size_download:  %{size_download}\n
```

### Load Testing

```bash
# Install autocannon
npm install -g autocannon

# Run load test
autocannon -c 50 -d 30 \
  -H "Authorization: Bearer <token>" \
  https://api.example.com/api/members
```

---

## 6. Response Optimization

### Compression (Automatic)

Already enabled globally. Compresses all responses >1KB.

**To disable for specific endpoints:**

```typescript
// Client sends header
headers: {
  'x-no-compression': '1'
}
```

### HTTP Caching Headers

```typescript
// For static/rarely changing data
@Get('plans')
async listPlans(@Res() res: Response) {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  const plans = await this.plansService.listPlans();
  res.json(plans);
}
```

---

## 7. Common Performance Issues

### Issue: Member list takes 5+ seconds

**Solution:**

1. Add pagination (skip/take)
2. Add index on `Member_tenantId_deletedAt_idx`
3. Use explicit `select` to reduce fields
4. Remove unnecessary `include` relations

### Issue: Dashboard loads slowly

**Solution:**

1. Parallelize all queries with `Promise.all`
2. Cache tenant/subscription data
3. Add indexes on filtered fields
4. Use count queries instead of fetching all data

### Issue: Large JSON responses

**Solution:**

1. Ensure compression is enabled (check `Content-Encoding: gzip`)
2. Use pagination to limit results
3. Remove unnecessary fields with explicit `select`
4. Split large responses into multiple endpoints

### Issue: Cached data is stale

**Solution:**

1. Reduce TTL (cache expiry time)
2. Invalidate cache on updates:
   ```typescript
   await this.prisma.member.update({ ... });
   this.cacheService.delete(`member:${id}`);
   ```
3. Use cache versioning:
   ```typescript
   const key = `member:${id}:v2`; // Change version to invalidate
   ```

---

## 8. Testing Checklist

Before deploying performance changes:

- [ ] Test on dev environment
- [ ] Run E2E tests
- [ ] Check slow query warnings
- [ ] Verify response sizes reduced
- [ ] Test pagination works correctly
- [ ] Test cache invalidation
- [ ] Load test with autocannon
- [ ] Test on simulated 3G
- [ ] Monitor production for 24 hours

---

## 9. Quick Wins

### Easiest optimizations (30 min each):

1. ✅ **Enable compression** (Already done)
2. ⏳ **Apply database indexes**
   ```bash
   cd apps/backend && npx prisma migrate dev
   ```
3. ⏳ **Cache tenant subscriptions**
   ```typescript
   return this.cacheService.getOrSet(
     `subscription:${tenantId}`,
     () => this.getSubscriptionFromDB(tenantId),
     5 * 60 * 1000,
   );
   ```
4. ⏳ **Add pagination to member list**
5. ⏳ **Parallelize dashboard queries**

---

## 10. Performance Targets

| Metric                | Target | How to Measure               |
| --------------------- | ------ | ---------------------------- |
| **API Response Time** | <500ms | Performance interceptor logs |
| **List Endpoints**    | <800ms | cURL timing                  |
| **Dashboard**         | <1.5s  | cURL timing                  |
| **Payload Size**      | <100KB | Network tab / cURL           |
| **Cache Hit Rate**    | >80%   | Cache stats                  |
| **Slow Queries**      | <1%    | Log analysis                 |

---

## Need Help?

**Performance Issues:**

1. Check performance interceptor logs
2. Enable Prisma query logging
3. Run `EXPLAIN ANALYZE` on slow queries
4. Check cache hit/miss ratio

**Documentation:**

- [Full Performance Audit](./TIER4_PERFORMANCE_AUDIT.md)
- [Implementation Summary](./TIER4_IMPLEMENTATION_SUMMARY.md)
- [Tier 3 Security](./TIER3_MASTER_SUMMARY.md)

---

**Last Updated:** February 9, 2026  
**Tier 4 Status:** 60% Complete
