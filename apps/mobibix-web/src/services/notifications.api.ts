import { authenticatedFetch, extractData } from "./auth.api";

export interface NotificationRecord {
  id: string;
  eventId: string;
  title: string | null;
  status: string;
  payload: Record<string, any>;
  createdAt: string;
  isRead: boolean;
  readAt: string | null;
}

export async function getNotifications(): Promise<NotificationRecord[]> {
  const response = await authenticatedFetch("/notifications");
  return extractData(response);
}

export async function getUnreadCount(): Promise<number> {
  const response = await authenticatedFetch("/notifications/unread-count");
  const data = await extractData(response);
  return data?.count ?? 0;
}

export async function markAsRead(id: string): Promise<void> {
  await authenticatedFetch(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function markAllAsRead(): Promise<void> {
  await authenticatedFetch(`/notifications/read-all`, {
    method: "PATCH",
  });
}
