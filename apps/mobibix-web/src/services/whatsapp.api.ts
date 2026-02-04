import { authenticatedFetch } from "./auth.api";

export interface WhatsAppDashboard {
  messagesSentToday: number;
  messagesSentThisMonth: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  activeCampaignCount: number;
  whatsappNumberStatus: "CONNECTED" | "DISCONNECTED" | "DISABLED" | string;
  planName: string;
  planExpiry: string;
  monthlyQuota: number | null;
  usedQuota: number;
  remainingQuota: number | null;
  features?: {
    manualMessaging?: boolean;
    bulkCampaign?: boolean;
    automation?: boolean;
    reports?: boolean;
    monthlyQuota?: number;
  };
}

export interface SendWhatsAppMessageRequest {
  phone: string;
  templateId: string;
  parameters?: string[];
  campaignId?: string;
}

export interface CreateWhatsAppCampaignRequest {
  name: string;
  templateId: string;
  filters?: Record<string, any>;
}

export interface ScheduleWhatsAppCampaignRequest {
  scheduledAt: string;
}

export interface WhatsAppLog {
  id: string;
  tenantId: string;
  phone: string;
  type: string;
  status: string;
  error?: string | null;
  messageId?: string | null;
  metadata?: Record<string, any> | null;
  sentAt: string;
}

export async function getWhatsAppDashboard(): Promise<WhatsAppDashboard> {
  const response = await authenticatedFetch("/user/whatsapp/dashboard");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to load WhatsApp dashboard");
  }
  return response.json();
}

export async function sendWhatsAppMessage(
  payload: SendWhatsAppMessageRequest,
): Promise<WhatsAppLog> {
  const response = await authenticatedFetch("/user/whatsapp/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to send WhatsApp message");
  }

  return response.json();
}

export async function getWhatsAppLogs(params?: {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  status?: string;
}): Promise<WhatsAppLog[]> {
  const search = new URLSearchParams();
  if (params?.startDate) search.set("startDate", params.startDate);
  if (params?.endDate) search.set("endDate", params.endDate);
  if (params?.campaignId) search.set("campaignId", params.campaignId);
  if (params?.status) search.set("status", params.status);

  const response = await authenticatedFetch(
    `/user/whatsapp/logs${search.toString() ? `?${search.toString()}` : ""}`,
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch WhatsApp logs");
  }

  return response.json();
}

export async function createWhatsAppCampaign(
  payload: CreateWhatsAppCampaignRequest,
) {
  const response = await authenticatedFetch("/user/whatsapp/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create campaign");
  }

  return response.json();
}

export async function scheduleWhatsAppCampaign(
  campaignId: string,
  payload: ScheduleWhatsAppCampaignRequest,
) {
  const response = await authenticatedFetch(
    `/user/whatsapp/campaigns/${campaignId}/schedule`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to schedule campaign");
  }

  return response.json();
}
