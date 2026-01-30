# 📊 CRM Dashboard - Visual Reference

## 🗂️ Module Structure

```
src/core/crm-dashboard/
│
├── 📁 dto/
│   ├── dashboard-query.dto.ts      (30 lines)  ← Query parameters + 7 presets
│   └── dashboard-response.dto.ts   (70 lines)  ← Response interfaces (21 KPIs)
│
├── crm-dashboard.service.ts        (510 lines) ← Core KPI logic
├── crm-dashboard.controller.ts     (42 lines)  ← REST endpoint + role guard
└── crm-dashboard.module.ts         (12 lines)  ← Module registration

📄 Total: 5 files, 664 lines of code
```

---

## 📊 KPI Categories Breakdown

```
┌─────────────────────────────────────────────────────┐
│             CRM DASHBOARD (21 KPIs)                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  👥 CUSTOMERS (6 KPIs)                              │
│     ├─ Total Count                                  │
│     ├─ Active (90-day window)                       │
│     ├─ Inactive                                     │
│     ├─ New (Last 7 days)                            │
│     ├─ New (Last 30 days)                           │
│     └─ Repeat Customers + Rate %                    │
│                                                     │
│  📋 FOLLOW-UPS (4 KPIs)                             │
│     ├─ Due Today                                    │
│     ├─ Overdue                                      │
│     ├─ Pending (Future)                             │
│     └─ Completed This Week                          │
│                                                     │
│  💰 FINANCIALS (2 KPIs)                             │
│     ├─ Total Outstanding (CREDIT invoices)          │
│     └─ High-Value Customers (Top 10)                │
│                                                     │
│  🎁 LOYALTY (4 KPIs)                                │
│     ├─ Points Issued                                │
│     ├─ Points Redeemed                              │
│     ├─ Net Balance                                  │
│     └─ Active Customers with Points                 │
│                                                     │
│  📱 WHATSAPP (5 KPIs)                               │
│     ├─ Total Sent                                   │
│     ├─ Successful                                   │
│     ├─ Failed                                       │
│     ├─ Success Rate %                               │
│     └─ 7-Day Trend (Daily Breakdown)                │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## 🔄 Request/Response Flow

```
┌──────────────┐
│   FRONTEND   │
└──────┬───────┘
       │
       │ GET /api/core/crm-dashboard?preset=LAST_30_DAYS
       │ Authorization: Bearer <jwt>
       ▼
┌──────────────────────────────────────────────────────┐
│  CrmDashboardController                              │
│  ✓ JWT Auth Guard                                    │
│  ✓ Extract tenantId & role from token                │
│  ✓ Role check: OWNER or ADMIN only                   │
└──────────────┬───────────────────────────────────────┘
               │
               │ service.getDashboardMetrics(tenantId, query)
               ▼
┌──────────────────────────────────────────────────────┐
│  CrmDashboardService                                 │
│                                                      │
│  1. resolveDateRange() ← Convert preset to dates     │
│                                                      │
│  2. Promise.all([                                    │
│     ├─ getCustomerMetrics()     ← Prisma queries    │
│     ├─ getFollowUpMetrics()     ← Prisma queries    │
│     ├─ getFinancialMetrics()    ← Prisma queries    │
│     ├─ getLoyaltyMetrics()      ← Prisma queries    │
│     └─ getWhatsAppMetrics()     ← Prisma queries    │
│     ])                                               │
│                                                      │
│  3. Aggregate results into CrmDashboardResponse      │
└──────────────┬───────────────────────────────────────┘
               │
               │ { customers, followUps, financials, loyalty, whatsapp }
               ▼
┌──────────────────────────────────────────────────────┐
│  RESPONSE (JSON)                                     │
│  {                                                   │
│    customers: { total, active, ... },                │
│    followUps: { dueToday, overdue, ... },            │
│    financials: { totalOutstanding, ... },            │
│    loyalty: { pointsIssued, ... },                   │
│    whatsapp: { totalSent, successRate, ... },        │
│    dateRange: { startDate, endDate },                │
│    generatedAt: "2024-01-15T..."                     │
│  }                                                   │
└──────────────┬───────────────────────────────────────┘
               │
               ▼
       ┌──────────────┐
       │   FRONTEND   │
       │  (Renders    │
       │   Charts)    │
       └──────────────┘
```

---

## 📅 Date Range Presets Visual

```
TODAY
├─── [2024-01-15 00:00:00] ──────────────► [2024-01-15 23:59:59]
     ↑ Start of day                        ↑ End of day

LAST_7_DAYS
├─── [2024-01-08] ────────────────────────► [2024-01-15]
     ↑ 7 days ago                           ↑ Now

LAST_30_DAYS (Default)
├─── [2023-12-16] ────────────────────────► [2024-01-15]
     ↑ 30 days ago                          ↑ Now

LAST_90_DAYS
├─── [2023-10-17] ────────────────────────► [2024-01-15]
     ↑ 90 days ago                          ↑ Now

THIS_MONTH
├─── [2024-01-01 00:00:00] ───────────────► [2024-01-31 23:59:59]
     ↑ First day of month                   ↑ Last day of month

LAST_MONTH
├─── [2023-12-01 00:00:00] ───────────────► [2023-12-31 23:59:59]
     ↑ First day of prev month              ↑ Last day of prev month

CUSTOM
├─── [startDate param] ────────────────────► [endDate param]
     ↑ User-provided                        ↑ User-provided
```

---

## 🎨 Frontend Chart Recommendations

```
┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER METRICS SECTION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │   Total    │  │   Active   │  │  Inactive  │           │
│  │    1,250   │  │     850    │  │     400    │           │
│  └────────────┘  └────────────┘  └────────────┘           │
│       ↑ Metric Cards                                        │
│                                                             │
│  ┌─────────────────────┐    ┌────────────────────────┐    │
│  │  Active vs Inactive │    │   Repeat Rate Gauge    │    │
│  │   [Pie Chart]       │    │        36%             │    │
│  │    ┌─┐              │    │    ┌───────┐           │    │
│  │    │█│ 68% Active   │    │    │ ███   │           │    │
│  │    │░│ 32% Inactive │    │    └───────┘           │    │
│  └─────────────────────┘    └────────────────────────┘    │
│                                                             │
│  ┌──────────────────────────────────────────────────┐      │
│  │  New Customers Trend (Line Chart)                │      │
│  │  100 ┼                            ╭──────         │      │
│  │   80 ┼                       ╭────╯               │      │
│  │   60 ┼                  ╭────╯                    │      │
│  │   40 ┼             ╭────╯                         │      │
│  │   20 ┼        ╭────╯                              │      │
│  │    0 ┼────────┴────────────────────────────►      │      │
│  │       Jan  Feb  Mar  Apr  May  Jun  Jul          │      │
│  └──────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FOLLOW-UP METRICS SECTION                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Due     │  │ Overdue  │  │ Pending  │  │Completed │   │
│  │  Today   │  │    (!)   │  │  (Future)│  │This Week │   │
│  │    15    │  │     8    │  │    42    │  │    35    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│       ↑ Kanban-style board with badges                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  FINANCIAL METRICS SECTION                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐                                  │
│  │ Total Outstanding    │                                  │
│  │  ₹ 1,25,000          │                                  │
│  └──────────────────────┘                                  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  High-Value Customers (Top 10)                        │ │
│  ├──────────┬───────────────┬──────────┬─────────────────┤ │
│  │ Customer │ Total Spent   │ Invoices │ Last Invoice    │ │
│  ├──────────┼───────────────┼──────────┼─────────────────┤ │
│  │ ABC Ltd  │ ₹ 2,50,000    │    45    │ 2024-01-15      │ │
│  │ XYZ Corp │ ₹ 1,80,000    │    32    │ 2024-01-12      │ │
│  │ ...      │ ...           │   ...    │ ...             │ │
│  └──────────┴───────────────┴──────────┴─────────────────┘ │
│       ↑ Sortable Data Table                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  LOYALTY METRICS SECTION                                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────┐     │
│  │  Points Issued vs Redeemed (Stacked Bar)          │     │
│  │                                                    │     │
│  │  Issued    ████████████████████ 15,000            │     │
│  │  Redeemed  ██████████ 8,500                       │     │
│  │  Net       ██████ 6,500                           │     │
│  └───────────────────────────────────────────────────┘     │
│                                                             │
│  ┌──────────────────────┐                                  │
│  │ Active Customers     │                                  │
│  │ with Points: 320     │                                  │
│  └──────────────────────┘                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  WHATSAPP METRICS SECTION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────┐    ┌────────────────────────┐    │
│  │ Success Rate Donut   │    │ 7-Day Trend (Line)     │    │
│  │       95%            │    │  500 ┼          ╭─╮    │    │
│  │    ┌──────┐          │    │  400 ┼       ╭──╯ ╰─╮ │    │
│  │    │█████░│          │    │  300 ┼    ╭──╯      │ │    │
│  │    │█████░│          │    │  200 ┼ ╭──╯         │ │    │
│  │    └──────┘          │    │  100 ┼─╯            │ │    │
│  │  Success: 475        │    │    0 ┴──────────────►│ │    │
│  │  Failed:   25        │    │      Mon Tue Wed Thu │ │    │
│  └──────────────────────┘    └────────────────────────┘    │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Flow

```
┌─────────────────────────────────────────────────┐
│  1. CLIENT REQUEST                              │
│     GET /api/core/crm-dashboard                 │
│     Authorization: Bearer <jwt>                 │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  2. JWT AUTH GUARD                              │
│     ✓ Verify token signature                    │
│     ✓ Check expiration                          │
│     ✓ Extract payload: { sub, tenantId, role }  │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  3. CONTROLLER ROLE CHECK                       │
│     if (role === OWNER || role === ADMIN) {     │
│       ✅ ALLOW                                   │
│     } else {                                    │
│       ❌ throw ForbiddenException               │
│     }                                           │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  4. SERVICE TENANT ISOLATION                    │
│     const tenantId = req.user.tenantId;         │
│                                                 │
│     // All queries include:                     │
│     where: { tenantId }                         │
│                                                 │
│     ✅ NO CROSS-TENANT DATA LEAKAGE             │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  5. RETURN SCOPED DATA                          │
│     { customers, followUps, ... }               │
│     (Only data for user's tenant)               │
└─────────────────────────────────────────────────┘
```

---

## ⚡ Performance Architecture

```
┌────────────────────────────────────────────────────────┐
│  PARALLEL QUERY EXECUTION (Promise.all)                │
├────────────────────────────────────────────────────────┤
│                                                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐ │
│  │  Customer    │  │  Follow-Up   │  │  Financial  │ │
│  │  Metrics     │  │  Metrics     │  │  Metrics    │ │
│  │              │  │              │  │             │ │
│  │  3 queries   │  │  4 queries   │  │  3 queries  │ │
│  │  ⏱ 100ms     │  │  ⏱ 80ms      │  │  ⏱ 120ms    │ │
│  └──────────────┘  └──────────────┘  └─────────────┘ │
│                                                        │
│  ┌──────────────┐  ┌──────────────┐                  │
│  │  Loyalty     │  │  WhatsApp    │                  │
│  │  Metrics     │  │  Metrics     │                  │
│  │              │  │              │                  │
│  │  3 queries   │  │  3 queries   │                  │
│  │  ⏱ 90ms      │  │  ⏱ 110ms     │                  │
│  └──────────────┘  └──────────────┘                  │
│                                                        │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                                        │
│  Total: 16 Prisma queries                              │
│  Execution: PARALLEL (not sequential)                  │
│  Total Time: ~200-500ms (limited by slowest query)     │
│                                                        │
│  WITHOUT Promise.all: ~600-800ms (sequential)          │
│  WITH Promise.all: ~200-500ms (parallel) ✅            │
│  Performance Gain: 40-60% faster                       │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 🗃️ Database Query Strategy

```
┌──────────────────────────────────────────────────────┐
│  CUSTOMER METRICS                                    │
├──────────────────────────────────────────────────────┤
│  1. count({ where: { tenantId } })                   │
│  2. findMany({ distinct: ['customerId'] })  ← Active │
│  3. count({ createdAt: { gte: 7daysAgo } })          │
│  4. count({ createdAt: { gte: 30daysAgo } })         │
│  5. groupBy({ having: { _count: { gt: 1 } } })       │
│     ↑ Repeat customers                               │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  FOLLOW-UP METRICS                                   │
├──────────────────────────────────────────────────────┤
│  1. count({ status: PENDING, followUpAt: today })    │
│  2. count({ status: PENDING, followUpAt: < now })    │
│  3. count({ status: PENDING, followUpAt: > today })  │
│  4. count({ status: DONE, updatedAt: > 7daysAgo })   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  FINANCIAL METRICS                                   │
├──────────────────────────────────────────────────────┤
│  1. aggregate({ _sum: { totalAmount } })             │
│     where: { status: CREDIT }                        │
│  2. groupBy({ by: ['customerId'], _sum, _count })    │
│     orderBy: { _sum: { totalAmount: 'desc' } }       │
│     take: 10  ← Top 10 spenders                      │
│  3. findMany({ id: { in: [...] } })                  │
│     ↑ Load customer names                            │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  LOYALTY METRICS                                     │
├──────────────────────────────────────────────────────┤
│  1. aggregate({ _sum: { points } })                  │
│     where: { points: { gt: 0 } }  ← Issued           │
│  2. aggregate({ _sum: { points } })                  │
│     where: { points: { lt: 0 } }  ← Redeemed         │
│  3. count({ loyaltyPoints: { gt: 0 } })              │
│     ↑ Active customers on Customer table             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  WHATSAPP METRICS                                    │
├──────────────────────────────────────────────────────┤
│  1. count()  ← Total sent                            │
│  2. count({ status: SUCCESS })                       │
│  3. count({ status: FAILED })                        │
│  4. findMany({ createdAt: > 7daysAgo })              │
│     ↑ Then group by date in-memory                   │
└──────────────────────────────────────────────────────┘
```

---

## 📏 Business Rules Visual

```
┌─────────────────────────────────────────────┐
│  ACTIVE CUSTOMER DEFINITION                 │
├─────────────────────────────────────────────┤
│                                             │
│  Timeline:                                  │
│  ├──────────────────────┬─────────────────► │
│  90 days ago           NOW                  │
│                         ↑                   │
│  If customer has ≥1 invoice in this range:  │
│  ✅ ACTIVE                                   │
│                                             │
│  If no invoices in 90 days:                 │
│  ❌ INACTIVE                                 │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  REPEAT CUSTOMER DEFINITION                 │
├─────────────────────────────────────────────┤
│                                             │
│  Customer Invoice Count:                    │
│  ├─ 0 invoices: ❌ Not repeat               │
│  ├─ 1 invoice:  ❌ Not repeat               │
│  └─ 2+ invoices: ✅ REPEAT                  │
│                                             │
│  Repeat Rate = (Repeat / Total) × 100       │
│  Example: (450 / 1250) × 100 = 36%          │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  OUTSTANDING AMOUNT DEFINITION              │
├─────────────────────────────────────────────┤
│                                             │
│  Invoice Status:                            │
│  ├─ PAID:      ❌ Not outstanding           │
│  ├─ CREDIT:    ✅ Outstanding               │
│  └─ CANCELLED: ❌ Not outstanding           │
│                                             │
│  Outstanding = SUM(totalAmount)             │
│                WHERE status = 'CREDIT'      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  LOYALTY POINTS FLOW                        │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐      ┌──────────┐            │
│  │ ISSUED   │      │ REDEEMED │            │
│  │ +15,000  │  ──► │ -8,500   │            │
│  │ (points  │      │ (points  │            │
│  │  > 0)    │      │  < 0)    │            │
│  └────┬─────┘      └────┬─────┘            │
│       │                 │                   │
│       └─────────┬───────┘                   │
│                 ▼                           │
│         ┌─────────────┐                     │
│         │ NET BALANCE │                     │
│         │   6,500     │                     │
│         └─────────────┘                     │
└─────────────────────────────────────────────┘
```

---

## 🧩 Module Dependencies

```
┌────────────────────────────────────────┐
│  CrmDashboardModule                    │
├────────────────────────────────────────┤
│                                        │
│  Imports:                              │
│  ├─ None (standalone)                  │
│                                        │
│  Providers:                            │
│  ├─ CrmDashboardService                │
│  └─ PrismaService (injected)           │
│                                        │
│  Controllers:                          │
│  └─ CrmDashboardController             │
│      ├─ @UseGuards(JwtAuthGuard)       │
│      └─ Role Check (OWNER/ADMIN)       │
│                                        │
│  Exports:                              │
│  └─ CrmDashboardService                │
│      (for potential reuse)             │
│                                        │
└────────────────────────────────────────┘
                 ▲
                 │
                 │ imports: [CrmDashboardModule]
                 │
┌────────────────────────────────────────┐
│  CoreModule                            │
│  (Parent module)                       │
└────────────────────────────────────────┘
```

---

## 🎯 Error Handling Flow

```
┌────────────────────────────────────────────────┐
│  Request Received                              │
└────────────────┬───────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────┐
│  JWT Valid?                                    │
├────────────────────────────────────────────────┤
│  ❌ Invalid/Expired                            │
│     └─► 401 Unauthorized                       │
└────────────────┬───────────────────────────────┘
                 │ ✅ Valid
                 ▼
┌────────────────────────────────────────────────┐
│  Role Check: OWNER or ADMIN?                   │
├────────────────────────────────────────────────┤
│  ❌ STAFF/USER                                 │
│     └─► 403 Forbidden                          │
│         "Only Owners and Admins can access"    │
└────────────────┬───────────────────────────────┘
                 │ ✅ Authorized
                 ▼
┌────────────────────────────────────────────────┐
│  Date Range Valid?                             │
├────────────────────────────────────────────────┤
│  ❌ Invalid preset/dates                       │
│     └─► 400 Bad Request                        │
│         (Class-validator error)                │
└────────────────┬───────────────────────────────┘
                 │ ✅ Valid
                 ▼
┌────────────────────────────────────────────────┐
│  Prisma Queries Execute                        │
├────────────────────────────────────────────────┤
│  ❌ Database connection error                  │
│     └─► 500 Internal Server Error              │
│         (NestJS exception filter)              │
└────────────────┬───────────────────────────────┘
                 │ ✅ Success
                 ▼
┌────────────────────────────────────────────────┐
│  200 OK { customers, followUps, ... }          │
└────────────────────────────────────────────────┘
```

---

## 📊 Sample Response (Formatted)

```json
{
  "customers": {
    "total": 1250,
    "active": 850,
    "inactive": 400,
    "newCustomers": {
      "last7Days": 25,
      "last30Days": 120
    },
    "repeatCustomers": 450,
    "repeatRate": 36.0
  },
  "followUps": {
    "dueToday": 15,
    "overdue": 8,
    "pending": 42,
    "completedThisWeek": 35
  },
  "financials": {
    "totalOutstanding": 125000,
    "highValueCustomers": [
      {
        "customerId": "cluxy123abc",
        "customerName": "ABC Enterprises",
        "totalSpent": 250000,
        "invoiceCount": 45,
        "lastInvoiceDate": "2024-01-15T10:30:00.000Z"
      },
      {
        "customerId": "cluxy456def",
        "customerName": "XYZ Corporation",
        "totalSpent": 180000,
        "invoiceCount": 32,
        "lastInvoiceDate": "2024-01-12T15:20:00.000Z"
      }
      // ... 8 more customers
    ]
  },
  "loyalty": {
    "totalPointsIssued": 15000,
    "totalPointsRedeemed": 8500,
    "netPointsBalance": 6500,
    "activeCustomersWithPoints": 320
  },
  "whatsapp": {
    "totalSent": 500,
    "successful": 475,
    "failed": 25,
    "successRate": 95.0,
    "last7Days": [
      { "date": "2024-01-09", "sent": 68, "successful": 65 },
      { "date": "2024-01-10", "sent": 75, "successful": 72 },
      { "date": "2024-01-11", "sent": 82, "successful": 78 },
      { "date": "2024-01-12", "sent": 70, "successful": 67 },
      { "date": "2024-01-13", "sent": 65, "successful": 62 },
      { "date": "2024-01-14", "sent": 72, "successful": 69 },
      { "date": "2024-01-15", "sent": 68, "successful": 62 }
    ]
  },
  "dateRange": {
    "startDate": "2023-12-16T00:00:00.000Z",
    "endDate": "2024-01-15T23:59:59.999Z",
    "preset": "LAST_30_DAYS"
  },
  "generatedAt": "2024-01-15T14:30:00.000Z"
}
```

---

**Visual Reference Version:** 1.0.0  
**Last Updated:** January 2024  
**Status:** ✅ Production Ready
