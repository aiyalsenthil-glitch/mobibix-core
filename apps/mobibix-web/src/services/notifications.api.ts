import { authenticatedFetch, extractData } from "./auth.api";

export interface NotificationRecord {
  id: string;
  tenantId: string;
  userId?: string;
  eventId: string;
  channel: "IN_APP";
  recipient: string;
  status: string;
  payload: Record<string, any>;
  createdAt: string;
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const response = await authenticatedFetch("/notifications");
  return extractData(response);
}

export async function markAsRead(id: string): Promise<void> {
  await authenticatedFetch(`/notifications/${id}/read`, {
    method: "PUT",
  });
}
