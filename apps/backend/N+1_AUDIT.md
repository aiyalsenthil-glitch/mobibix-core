#!/bin/bash

# N+1 Query Audit Report

# Critical Performance Issues Identified

## CRITICAL N+1 QUERIES

### 1. automation.service.ts - Line 408-417

**Issue**: Querying customer for each automation in loop
**Current Code**:

```typescript
for (const automation of automations) {
  const customer = await this.prisma.party.findUnique({
    where: { id: customerId },
  });
  // ...
}
```

**Fix**: Query customer ONCE before loop

```typescript
const customer = await this.prisma.party.findUnique({
  where: { id: customerId },
});

for (const automation of automations) {
  if (!customer?.phone) continue;
  // ...
}
```

**Impact**: Reduces query count from O(n) to O(1)

---

## AREAS TO MONITOR

### Sales Service (sales.service.ts)

- ✅ Invoice list: Uses `groupBy` for aggregation (good)
- ✅ Receipt summaries: Fetched once, then mapped (good)
- ⚠️ Verify no inline receipt queries in loops

### WhatsApp Service (whatsapp-user.service.ts)

- ✅ Message sending: Bulk operations handled
- ⚠️ Verify template resolution doesn't happen per message

### Products Service

- ✅ Shop product linking: Batch operations
- ⚠️ Verify no shop lookups in product loops

---

## COMMON N+1 PATTERNS TO AVOID

1. **Loop with Query**:

   ```typescript
   ❌ BAD:
   const items = await prisma.items.findMany();
   for (const item of items) {
     const related = await prisma.related.findUnique({ where: { id: item.relatedId } });
   }

   ✅ GOOD:
   const items = await prisma.items.findMany({
     include: { related: true }
   });
   ```

2. **Sequential Queries**:

   ```typescript
   ❌ BAD:
   const parent = await prisma.parent.findUnique(...);
   const children = await prisma.child.findMany({ where: { parentId: parent.id } });
   const details = await prisma.details.findMany({ where: { childId: { in: } } });

   ✅ GOOD:
   const parent = await prisma.parent.findUnique({
     include: {
       children: {
         include: { details: true }
       }
     }
   });
   ```

3. **Map with Query**:

   ```typescript
   ❌ BAD:
   const enriched = items.map(async item => {
     const data = await prisma.data.findUnique(...);
     return { ...item, data };
   });

   ✅ GOOD:
   const enriched = items.map(item => ({
     ...item,
     data: dataMap.get(item.id) // Pre-fetched map
   }));
   ```

---

## RECOMMENDED FIXES (Priority Order)

1.  **automation.service.ts** - Move customer query outside loop (line 408)
2.  Check **gym-dashboard** for N+1 on member queries
3.  Review **entity-resolver** for bulk processing opportunities
4.  Audit **createReminders** for batch operations

---

## DATABASE INDEXES NEEDED

1. WhatsAppAutomation (eventType, moduleType, enabled)
2. Member (tenantId, customerId)
3. Party (tenantId, phone)
4. Invoice (tenantId, shopId, createdAt)
5. WhatsAppLog (tenantId, createdAt, status)
6. CustomerReminder (tenantId, customerId, status)

---

## TESTING N+1 QUERIES

Enable Prisma query logging:

```typescript
// In main.ts or service
const prisma = new PrismaClient({
  log: ['query', 'warn', 'error'],
});
```

Then monitor console for multiple queries for same resource.

---

Generated: 2026-02-13
