import { authenticatedFetch } from "./auth.api";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";

// ========================
// TYPE DEFINITIONS
// ========================

export interface CrmDashboardMetrics {
  customers: {
    total: number;
    new7Days: number;
    new30Days: number;
  };
  followUps: {
    dueToday: number;
    overdue: number;
    pending: number;
  };
  financials: {
    outstandingAmount: number;
    topCustomers: Array<{
      customerId: string;
      customerName: string;
      totalAmount: number;
      purchaseCount: number;
    }>;
  };
  loyalty: {
    totalPointsIssued: number;
    totalPointsRedeemed: number;
    customersWithPoints: number;
  };
  whatsapp: {
    messagesSent: number;
    messagesDelivered: number;
    messagesFailed: number;
    deliveryRate: number;
  };
}

export type FollowUpStatus = "PENDING" | "DONE" | "CANCELLED";
export type FollowUpType =
  | "PHONE_CALL"
  | "EMAIL"
  | "VISIT"
  | "SMS"
  | "WHATSAPP";

export interface FollowUp {
  id: string;
  tenantId: string;
  shopId?: string;
  customerId: string;
  customerName?: string;
  type: FollowUpType;
  purpose: string;
  status: FollowUpStatus;
  followUpAt: string | Date;
  completedAt?: string | Date;
  assignedToUserId?: string;
  assignedToUserName?: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export type TimelineSource = "JOB" | "INVOICE" | "CRM" | "WHATSAPP";

export interface TimelineItem {
  id: string;
  source: TimelineSource;
  eventType: string;
  description: string;
  customerId: string;
  customerName?: string;
  metadata?: Record<string, any>;
  createdAt: string | Date;
}

export interface TimelineResponse {
  items: TimelineItem[];
  total: number;
}

export interface WhatsAppSendRequest {
  customerId: string;
  phone: string;
  message: string;
  messageType?: "TEXT" | "TEMPLATE";
  source?: string; // e.g., 'JOB_READY', 'INVOICE_CREATED'
  sourceId?: string; // Reference ID (job card ID, invoice ID)
}

export interface WhatsAppLog {
  id: string;
  customerId: string;
  phone: string;
  message: string;
  status: "SENT" | "DELIVERED" | "FAILED";
  sentAt: string | Date;
}

// ========================
// API FUNCTIONS
// ========================

/**
 * Get CRM Dashboard metrics
 * Displays on MobileShop home screen
 */
export async function getCrmDashboard(
  preset: string = "LAST_30_DAYS",
  shopId?: string,
): Promise<CrmDashboardMetrics> {
  const params = new URLSearchParams({ preset });
  if (shopId) params.append("shopId", shopId);

  const response = await authenticatedFetch(
    `/mobileshop/crm/dashboard?${params.toString()}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch CRM dashboard");
  }

  return response.json();
}

/**
 * Get my follow-ups with optional pagination
 */
export async function getMyFollowUps(options?: {
  skip?: number;
  take?: number;
}): Promise<
  FollowUp[] | { data: FollowUp[]; total: number; skip: number; take: number }
> {
  const params = new URLSearchParams();
  if (options?.skip !== undefined)
    params.append("skip", options.skip.toString());
  if (options?.take !== undefined)
    params.append("take", options.take.toString());

  const url = `/mobileshop/crm/follow-ups${params.toString() ? "?" + params.toString() : ""}`;
  const response = await authenticatedFetch(url);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch follow-ups");
  }

  return response.json();
}

/**
 * Get follow-up counts (pending + overdue) for the current user
 */
export async function getFollowUpCounts(): Promise<{
  pending: number;
  overdue: number;
  total: number;
}> {
  const response = await authenticatedFetch(
    `/mobileshop/crm/follow-ups/counts`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch follow-up counts");
  }

  return response.json();
}

/**
 * Create a new follow-up
 */
export async function createFollowUp(data: {
  customerId: string;
  type: FollowUpType;
  purpose: string;
  followUpAt: string | Date;
  assignedToUserId?: string;
  shopId?: string;
}): Promise<FollowUp> {
  const response = await authenticatedFetch(`/mobileshop/crm/follow-ups`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create follow-up");
  }

  return response.json();
}

/**
 * Update follow-up status (mark as DONE/CANCELLED)
 */
export async function updateFollowUpStatus(
  followUpId: string,
  status: FollowUpStatus,
): Promise<FollowUp> {
  const response = await authenticatedFetch(
    `/mobileshop/crm/follow-ups/${followUpId}/status`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update follow-up status");
  }

  return response.json();
}

/**
 * Get customer timeline
 * Shows all activities for a customer
 */
export async function getCustomerTimeline(
  customerId: string,
  source?: string, // Comma-separated: 'JOB,INVOICE,CRM,WHATSAPP'
): Promise<TimelineResponse> {
  const params = source ? `?sources=${source}` : "";

  const response = await authenticatedFetch(
    `/mobileshop/crm/customer-timeline/${customerId}${params}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch customer timeline");
  }

  return response.json();
}

/**
 * Send WhatsApp message
 */
export async function sendWhatsAppMessage(
  data: WhatsAppSendRequest,
): Promise<WhatsAppLog> {
  const response = await authenticatedFetch(`/mobileshop/crm/whatsapp/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send WhatsApp message");
  }

  return response.json();
}

/**
 * Get WhatsApp logs for a customer
 */
export async function getWhatsAppLogs(
  customerId?: string,
  limit: number = 20,
): Promise<WhatsAppLog[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (customerId) params.append("customerId", customerId);

  const response = await authenticatedFetch(
    `/mobileshop/crm/whatsapp/logs?${params.toString()}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch WhatsApp logs");
  }

  return response.json();
}
