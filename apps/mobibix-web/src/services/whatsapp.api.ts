import { authenticatedFetch, extractData } from "./auth.api";

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
  whatsAppNumberId?: string;
}

export interface CreateWhatsAppCampaignRequest {
  name: string;
  templateId: string;
  filters?: Record<string, unknown>;
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
  metadata?: Record<string, unknown> | null;
  sentAt: string;
}

export async function getWhatsAppDashboard(): Promise<WhatsAppDashboard> {
  const response = await authenticatedFetch("/user/whatsapp/dashboard");
  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to load WhatsApp dashboard");
  }
  return extractData(response);
}

export async function sendWhatsAppMessage(
  payload: SendWhatsAppMessageRequest,
): Promise<WhatsAppLog> {
  const response = await authenticatedFetch("/user/whatsapp/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to send WhatsApp message");
  }

  return extractData(response);
}

export interface WhatsAppNumber {
  id: string;
  phoneNumber: string;
  displayNumber?: string;
  label?: string;
  isEnabled: boolean;
  isDefault: boolean;
  qualityRating?: string;
}

export async function getPhoneNumbers(
  tenantId: string,
): Promise<WhatsAppNumber[]> {
  const response = await authenticatedFetch(
    `/whatsapp/phone-numbers/${tenantId}`,
  );
  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch phone numbers");
  }
  return extractData(response);
}

export async function getWhatsAppLogs(params?: {
  startDate?: string;
  endDate?: string;
  campaignId?: string;
  status?: string;
  whatsAppNumberId?: string;
}): Promise<WhatsAppLog[]> {
  const search = new URLSearchParams();
  if (params?.startDate) search.set("startDate", params.startDate);
  if (params?.endDate) search.set("endDate", params.endDate);
  if (params?.campaignId) search.set("campaignId", params.campaignId);
  if (params?.status) search.set("status", params.status);
  if (params?.whatsAppNumberId)
    search.set("whatsAppNumberId", params.whatsAppNumberId);

  const response = await authenticatedFetch(
    `/user/whatsapp/logs${search.toString() ? `?${search.toString()}` : ""}`,
  );

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch WhatsApp logs");
  }

  return extractData(response);
}

export async function createWhatsAppCampaign(
  payload: CreateWhatsAppCampaignRequest,
) {
  const response = await authenticatedFetch("/user/whatsapp/campaigns", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to create campaign");
  }

  return extractData(response);
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
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to schedule campaign");
  }

  return extractData(response);
}

export async function getWhatsAppStatus(): Promise<WhatsAppStatus> {
  const response = await authenticatedFetch("/integrations/whatsapp/status");
  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to fetch WhatsApp status");
  }
  return extractData(response);
}

export async function manualSyncWhatsApp(
  data: ManualSyncRequest,
): Promise<void> {
  const response = await authenticatedFetch(
    "/integrations/whatsapp/manual-sync",
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to perform manual sync");
  }
}

export async function disconnectWhatsApp(): Promise<void> {
  const response = await authenticatedFetch(
    "/integrations/whatsapp/disconnect",
    {
      method: "POST",
    },
  );
  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to disconnect WhatsApp");
  }
}

export async function connectWhatsApp(): Promise<{ url: string }> {
  const response = await authenticatedFetch("/integrations/whatsapp/connect");
  if (!response.ok) {
    const error = await extractData(response) as any;
    throw new Error(error?.message || "Failed to initiate WhatsApp connection");
  }
  return extractData(response);
}
const WA_WEB_URL = process.env.NEXT_PUBLIC_WA_WEB_URL || 'http://localhost_REPLACED:3001';

export async function connectWhatsAppWeb(tenantId: string): Promise<{ qr: string }> {
  const response = await fetch(`${WA_WEB_URL}/whatsapp/connect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });
  if (!response.ok) throw new Error("Failed to initialize WA Web");
  return response.json();
}

export async function getWhatsAppWebStatus(tenantId: string): Promise<{ status: string; qr?: string; phoneNumber?: string }> {
  const response = await fetch(`${WA_WEB_URL}/whatsapp/status/${tenantId}`);
  if (!response.ok) throw new Error("Failed to fetch WA Web status");
  return response.json();
}

export async function disconnectWhatsAppWeb(tenantId: string): Promise<void> {
  await fetch(`${WA_WEB_URL}/whatsapp/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenantId }),
  });
}
