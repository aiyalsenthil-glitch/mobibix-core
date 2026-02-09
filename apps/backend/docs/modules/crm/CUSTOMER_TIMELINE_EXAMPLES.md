# Customer Timeline - Usage Examples

## Table of Contents

1. [Basic Queries](#basic-queries)
2. [Filtering](#filtering)
3. [Frontend Integration](#frontend-integration)
4. [Timeline Components](#timeline-components)
5. [Real-World Scenarios](#real-world-scenarios)

---

## Basic Queries

### 1. Get Latest Activities

```typescript
// Fetch most recent 20 activities
const response = await fetch(`/api/crm/timeline/cust-123?tenantId=tenant-1`);
const timeline = await response.json();

console.log(timeline);
// {
//   items: [{ icon: '🧾', title: 'Invoice #INV-001 Created', ... }],
//   total: 45,
//   page: 1,
//   pageSize: 20,
//   hasMore: true
// }
```

### 2. Paginated Timeline

```typescript
// Load page 2 with 50 items
const response = await fetch(
  `/api/crm/timeline/cust-123?` +
    `tenantId=tenant-1&` +
    `page=2&` +
    `pageSize=50`,
);
```

### 3. Get Customer Stats

```typescript
const response = await fetch(
  `/api/crm/timeline/cust-123/stats?tenantId=tenant-1`,
);
const stats = await response.json();

console.log(stats);
// {
//   totalInvoices: 12,
//   totalJobs: 8,
//   totalFollowUps: 5,
//   loyaltyPoints: 450,
//   lastInvoiceDate: "2026-01-28T10:30:00Z",
//   lastInvoiceAmount: 15000
// }
```

---

## Filtering

### By Source (Single)

```typescript
// Show only invoices
const timeline = await fetch(
  `/api/crm/timeline/cust-123?` + `tenantId=tenant-1&` + `sources=INVOICE`,
);
```

### By Source (Multiple)

```typescript
// Show invoices and jobs only
const timeline = await fetch(
  `/api/crm/timeline/cust-123?` + `tenantId=tenant-1&` + `sources=INVOICE,JOB`,
);
```

### By Activity Type

```typescript
// Show only completed activities
const timeline = await fetch(
  `/api/crm/timeline/cust-123?` +
    `tenantId=tenant-1&` +
    `types=INVOICE_PAID,JOB_DELIVERED,FOLLOWUP_COMPLETED`,
);
```

### By Date Range

```typescript
// Activities in January 2026
const timeline = await fetch(
  `/api/crm/timeline/cust-123?` +
    `tenantId=tenant-1&` +
    `startDate=2026-01-01T00:00:00Z&` +
    `endDate=2026-01-31T23:59:59Z`,
);
```

### By Shop

```typescript
// Only Main Store activities
const timeline = await fetch(
  `/api/crm/timeline/cust-123?` + `tenantId=tenant-1&` + `shopId=shop-main`,
);
```

### Combined Filters

```typescript
// Invoices and jobs from Main Store in January 2026
const timeline = await fetch(
  `/api/crm/timeline/cust-123?` +
    `tenantId=tenant-1&` +
    `sources=INVOICE,JOB&` +
    `shopId=shop-main&` +
    `startDate=2026-01-01&` +
    `endDate=2026-01-31`,
);
```

---

## Frontend Integration

### React Hook

```typescript
import { useState, useEffect } from 'react';

interface TimelineQuery {
  customerId: string;
  tenantId: string;
  page?: number;
  pageSize?: number;
  sources?: string[];
  types?: string[];
  startDate?: string;
  endDate?: string;
  shopId?: string;
}

export const useCustomerTimeline = (query: TimelineQuery) => {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    hasMore: false,
  });

  useEffect(() => {
    loadTimeline();
  }, [
    query.customerId,
    query.page,
    query.sources,
    query.types,
    query.startDate,
    query.endDate,
    query.shopId,
  ]);

  const loadTimeline = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        tenantId: query.tenantId,
        page: String(query.page || 1),
        pageSize: String(query.pageSize || 20),
      });

      if (query.sources?.length) {
        params.append('sources', query.sources.join(','));
      }
      if (query.types?.length) {
        params.append('types', query.types.join(','));
      }
      if (query.startDate) params.append('startDate', query.startDate);
      if (query.endDate) params.append('endDate', query.endDate);
      if (query.shopId) params.append('shopId', query.shopId);

      const response = await fetch(
        `/api/crm/timeline/${query.customerId}?${params}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      setTimeline(data.items);
      setPagination({
        total: data.total,
        page: data.page,
        hasMore: data.hasMore,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (!loading && pagination.hasMore) {
      query.page = (query.page || 1) + 1;
    }
  };

  return {
    timeline,
    loading,
    error,
    pagination,
    loadMore,
    reload: loadTimeline,
  };
};
```

### Usage in Component

```typescript
import { useCustomerTimeline } from './useCustomerTimeline';

export const CustomerProfile = ({ customerId, tenantId }) => {
  const [sourceFilter, setSourceFilter] = useState([]);

  const { timeline, loading, error, pagination, loadMore } = useCustomerTimeline({
    customerId,
    tenantId,
    sources: sourceFilter,
    page: 1,
    pageSize: 20,
  });

  if (loading) return <div>Loading timeline...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="customer-profile">
      {/* Filter buttons */}
      <div className="timeline-filters">
        <button onClick={() => setSourceFilter([])}>
          All Activities
        </button>
        <button onClick={() => setSourceFilter(['INVOICE'])}>
          Invoices Only
        </button>
        <button onClick={() => setSourceFilter(['JOB'])}>
          Jobs Only
        </button>
        <button onClick={() => setSourceFilter(['FOLLOW_UP', 'REMINDER'])}>
          CRM Only
        </button>
      </div>

      {/* Timeline */}
      <div className="timeline">
        {timeline.map((item) => (
          <TimelineItem key={item.id} item={item} />
        ))}
      </div>

      {/* Load More */}
      {pagination.hasMore && (
        <button onClick={loadMore}>
          Load More ({pagination.total - timeline.length} remaining)
        </button>
      )}
    </div>
  );
};
```

---

## Timeline Components

### Timeline Item Component

```typescript
import React from 'react';
import { TimelineEntryDto } from './types';

interface TimelineItemProps {
  item: TimelineEntryDto;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ item }) => {
  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return `Today at ${d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else if (d.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    } else {
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getStatusColor = (status?: string) => {
    if (!status) return 'gray';
    if (status === 'PAID' || status === 'DELIVERED' || status === 'COMPLETED') {
      return 'green';
    }
    if (status === 'PENDING' || status === 'IN_PROGRESS') {
      return 'orange';
    }
    if (status === 'CANCELLED' || status === 'FAILED') {
      return 'red';
    }
    return 'gray';
  };

  return (
    <div className="timeline-item">
      <div className="timeline-icon">{item.icon}</div>

      <div className="timeline-content">
        <div className="timeline-header">
          <h4 className="timeline-title">{item.title}</h4>
          <span className="timeline-date">{formatDate(item.createdAt)}</span>
        </div>

        <p className="timeline-description">{item.description}</p>

        <div className="timeline-meta">
          {item.amount && (
            <span className="timeline-amount">₹{item.amount.toLocaleString()}</span>
          )}

          {item.status && (
            <span className={`timeline-status status-${getStatusColor(item.status)}`}>
              {item.status}
            </span>
          )}

          {item.shopName && (
            <span className="timeline-shop">📍 {item.shopName}</span>
          )}
        </div>

        {item.referenceUrl && (
          <a href={item.referenceUrl} className="timeline-link">
            View {item.referenceType} →
          </a>
        )}

        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <details className="timeline-metadata">
            <summary>Details</summary>
            <pre>{JSON.stringify(item.metadata, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
};
```

### CSS Styles

```css
.timeline {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.timeline-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  transition: background-color 0.2s;
}

.timeline-item:hover {
  background-color: #f9fafb;
}

.timeline-icon {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f3f4f6;
  border-radius: 50%;
  flex-shrink: 0;
}

.timeline-content {
  flex: 1;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.timeline-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
  color: #111827;
}

.timeline-date {
  font-size: 13px;
  color: #6b7280;
}

.timeline-description {
  font-size: 14px;
  color: #4b5563;
  margin: 0 0 8px 0;
}

.timeline-meta {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-wrap: wrap;
}

.timeline-amount {
  font-weight: 600;
  color: #059669;
  font-size: 14px;
}

.timeline-status {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.status-green {
  background-color: #d1fae5;
  color: #065f46;
}

.status-orange {
  background-color: #fed7aa;
  color: #92400e;
}

.status-red {
  background-color: #fee2e2;
  color: #991b1b;
}

.status-gray {
  background-color: #f3f4f6;
  color: #4b5563;
}

.timeline-shop {
  font-size: 13px;
  color: #6b7280;
}

.timeline-link {
  display: inline-block;
  margin-top: 8px;
  font-size: 14px;
  color: #2563eb;
  text-decoration: none;
  font-weight: 500;
}

.timeline-link:hover {
  text-decoration: underline;
}

.timeline-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.timeline-filters button {
  padding: 8px 16px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background-color: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.timeline-filters button:hover {
  background-color: #f3f4f6;
}

.timeline-filters button.active {
  background-color: #2563eb;
  color: white;
  border-color: #2563eb;
}

.timeline-metadata {
  margin-top: 12px;
  padding: 12px;
  background-color: #f9fafb;
  border-radius: 6px;
}

.timeline-metadata summary {
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  color: #4b5563;
}

.timeline-metadata pre {
  margin-top: 8px;
  font-size: 12px;
  color: #374151;
  overflow-x: auto;
}
```

---

## Real-World Scenarios

### Scenario 1: Customer Support Dashboard

```typescript
// Show recent customer interactions
export const SupportDashboard = ({ customerId, tenantId }) => {
  const { timeline } = useCustomerTimeline({
    customerId,
    tenantId,
    sources: ['FOLLOW_UP', 'REMINDER', 'WHATSAPP', 'ALERT'],
    pageSize: 50,
  });

  return (
    <div className="support-dashboard">
      <h2>Recent Interactions</h2>
      {timeline.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### Scenario 2: Sales History

```typescript
// Show purchase and payment history
export const SalesHistory = ({ customerId, tenantId }) => {
  const { timeline, pagination } = useCustomerTimeline({
    customerId,
    tenantId,
    sources: ['INVOICE', 'RECEIPT', 'QUOTATION'],
    pageSize: 30,
  });

  const totalRevenue = timeline
    .filter((item) => item.source === 'INVOICE' && item.amount)
    .reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="sales-history">
      <div className="stats">
        <h3>Total Revenue: ₹{totalRevenue.toLocaleString()}</h3>
        <p>{pagination.total} transactions</p>
      </div>
      {timeline.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### Scenario 3: Service History

```typescript
// Show job card history
export const ServiceHistory = ({ customerId, tenantId }) => {
  const { timeline } = useCustomerTimeline({
    customerId,
    tenantId,
    sources: ['JOB'],
    pageSize: 20,
  });

  const completedJobs = timeline.filter(
    (item) => item.type === 'JOB_DELIVERED'
  ).length;

  return (
    <div className="service-history">
      <h2>Service History</h2>
      <p>{completedJobs} completed jobs</p>
      {timeline.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### Scenario 4: Activity This Month

```typescript
// Show current month's activity
export const MonthlyActivity = ({ customerId, tenantId }) => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const { timeline } = useCustomerTimeline({
    customerId,
    tenantId,
    startDate: startOfMonth.toISOString(),
    pageSize: 100,
  });

  return (
    <div className="monthly-activity">
      <h2>Activity This Month</h2>
      <p>{timeline.length} activities</p>
      {timeline.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### Scenario 5: Loyalty & Engagement

```typescript
// Show loyalty points and engagement
export const LoyaltyEngagement = ({ customerId, tenantId }) => {
  const { timeline, stats } = useCustomerTimeline({
    customerId,
    tenantId,
    sources: ['LOYALTY', 'FOLLOW_UP', 'REMINDER'],
    pageSize: 50,
  });

  return (
    <div className="loyalty-engagement">
      <div className="stats-card">
        <h3>⭐ {stats.loyaltyPoints} Points</h3>
        <p>{stats.totalFollowUps} follow-ups completed</p>
      </div>
      {timeline.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
    </div>
  );
};
```

### Scenario 6: Complete Customer 360

```typescript
// Show comprehensive customer view
export const Customer360 = ({ customerId, tenantId }) => {
  const [activeTab, setActiveTab] = useState('all');

  const sourcesByTab = {
    all: [],
    sales: ['INVOICE', 'RECEIPT', 'QUOTATION'],
    service: ['JOB'],
    crm: ['FOLLOW_UP', 'REMINDER', 'WHATSAPP', 'ALERT'],
    loyalty: ['LOYALTY'],
  };

  const { timeline, stats, loading } = useCustomerTimeline({
    customerId,
    tenantId,
    sources: sourcesByTab[activeTab],
    pageSize: 30,
  });

  return (
    <div className="customer-360">
      {/* Stats Overview */}
      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Invoices</h4>
          <p>{stats.totalInvoices}</p>
        </div>
        <div className="stat-card">
          <h4>Total Jobs</h4>
          <p>{stats.totalJobs}</p>
        </div>
        <div className="stat-card">
          <h4>Loyalty Points</h4>
          <p>⭐ {stats.loyaltyPoints}</p>
        </div>
        <div className="stat-card">
          <h4>Follow-ups</h4>
          <p>{stats.totalFollowUps}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {Object.keys(sourcesByTab).map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="timeline">
          {timeline.map((item) => (
            <TimelineItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};
```

---

## Advanced Usage

### Infinite Scroll

```typescript
import { useEffect, useRef } from 'react';

export const InfiniteTimeline = ({ customerId, tenantId }) => {
  const [page, setPage] = useState(1);
  const [allItems, setAllItems] = useState([]);
  const observerRef = useRef(null);

  const { timeline, loading, pagination } = useCustomerTimeline({
    customerId,
    tenantId,
    page,
    pageSize: 20,
  });

  useEffect(() => {
    if (timeline.length > 0) {
      setAllItems((prev) => [...prev, ...timeline]);
    }
  }, [timeline]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && pagination.hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 0.5 }
    );

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [pagination.hasMore, loading]);

  return (
    <div className="infinite-timeline">
      {allItems.map((item) => (
        <TimelineItem key={item.id} item={item} />
      ))}
      {pagination.hasMore && (
        <div ref={observerRef} className="loading-indicator">
          {loading ? 'Loading...' : 'Scroll for more'}
        </div>
      )}
    </div>
  );
};
```

### Export Timeline

```typescript
export const exportTimelineToCSV = (timeline: TimelineEntryDto[]) => {
  const headers = ['Date', 'Type', 'Title', 'Description', 'Amount', 'Status'];

  const rows = timeline.map((item) => [
    new Date(item.createdAt).toLocaleString(),
    item.type,
    item.title,
    item.description,
    item.amount || '',
    item.status || '',
  ]);

  const csv = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customer-timeline-${Date.now()}.csv`;
  a.click();
};
```

---

## Testing Examples

### Unit Test - Service

```typescript
describe('CustomerTimelineService', () => {
  it('should return paginated timeline', async () => {
    const result = await service.getCustomerTimeline({
      customerId: 'cust-1',
      tenantId: 'tenant-1',
      page: 1,
      pageSize: 10,
    });

    expect(result.items.length).toBeLessThanOrEqual(10);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(10);
  });
});
```

### E2E Test - Controller

```typescript
describe('GET /api/crm/timeline/:customerId', () => {
  it('should return timeline with filters', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/crm/timeline/cust-1')
      .query({
        tenantId: 'tenant-1',
        sources: 'INVOICE,JOB',
      });

    expect(response.status).toBe(200);
    expect(response.body.items).toBeDefined();
    expect(
      response.body.items.every(
        (i) => i.source === 'INVOICE' || i.source === 'JOB',
      ),
    ).toBe(true);
  });
});
```

---

**Next Steps**: See [CUSTOMER_TIMELINE_IMPLEMENTATION.md](CUSTOMER_TIMELINE_IMPLEMENTATION.md) for complete feature documentation.
