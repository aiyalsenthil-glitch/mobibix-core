import { authenticatedFetch } from "./auth.api";

export interface WhatsAppDashboard {
  planRequired?: boolean; // Added for no-plan scenario
  message?: string; // Added for no-plan scenario
  messagesSentToday: number;
  messagesSentThisMonth: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  activeCampaignCount: number;
  whatsappNumberStatus:
    | "CONNECTED"
    | "DISCONNECTED"
    | "DISABLED"
    | string
    | null;
  planName: string | null;
  planExpiry: string | null;
  monthlyQuota: number | null;
  usedQuota: number;
  remainingQuota: number | null;
  dailyReminderQuota: number | null;
  dailyReminderUsed: number;
  features?: {
    manualMessaging?: boolean;
    bulkCampaign?: boolean;
    automation?: boolean;
    reports?: boolean;
    monthlyQuota?: number;
  };
}

export interface WhatsAppStatus {
  status: "ACTIVE" | "PENDING" | "FAILED" | "DISCONNECTED";
  wabaId: string | null;
  phoneNumberId: string | null;
  phoneNumber: string | null;
}

export interface ManualSyncRequest {
  wabaId: string;
  phoneNumberId: string;
  accessToken: string;
  phoneNumber: string;
}

export interface SendWhatsAppMessageRequest {
  phone: string;
  templateId?: string;
  text?: string;
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


export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const response = await authenticatedFetch("/integrations/whatsapp/status");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to fetch WhatsApp status");
  }
  return response.json();
}

export async function manualSyncWhatsApp(data: ManualSyncRequest): Promise<void> {
  const response = await authenticatedFetch("/integrations/whatsapp/manual-sync", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to perform manual sync");
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  const response = await authenticatedFetch("/integrations/whatsapp/disconnect", {
    method: "POST",
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to disconnect WhatsApp");
  }
}

export async function connectWhatsApp(): Promise<{ url: string }> {
  const response = await authenticatedFetch("/integrations/whatsapp/connect");
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to initiate WhatsApp connection");
  }
  return response.json();
}
