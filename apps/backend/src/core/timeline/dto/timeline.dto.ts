import { TimelineSource, TimelineActivityType } from '../timeline.enum';

// Single timeline entry (normalized format)
export class TimelineEntryDto {
  id: string; // Unique ID for this timeline entry (source + recordId)

  // Activity info
  type: TimelineActivityType; // Specific activity type
  source: TimelineSource; // Source system

  // Display info
  title: string; // Human-readable title
  description?: string; // Optional description
  icon?: string; // Optional icon/emoji for UI

  // Reference
  referenceId: string; // Original record ID
  referenceType: string; // Original model name
  referenceUrl?: string; // Optional URL to view details

  // Metadata
  amount?: number; // For financial activities
  status?: string; // For status-based activities
  metadata?: Record<string, any>; // Additional context

  // Timestamps
  createdAt: Date;
  updatedAt?: Date;

  // Related entities (optional, for display)
  shopName?: string;
  userName?: string;
}

// Paginated timeline response
export class CustomerTimelineResponseDto {
  items: TimelineEntryDto[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Query filters
export class GetCustomerTimelineDto {
  customerId: string;
  tenantId: string;

  // Pagination
  page?: number = 1;
  pageSize?: number = 20;

  // Filters
  sources?: TimelineSource[]; // Filter by source
  types?: TimelineActivityType[]; // Filter by activity type
  startDate?: Date; // Activities after this date
  endDate?: Date; // Activities before this date
  shopId?: string; // Filter by shop

  // Sorting
  sortOrder?: 'ASC' | 'DESC' = 'DESC'; // Newest first by default
}
