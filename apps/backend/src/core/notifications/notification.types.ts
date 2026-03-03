export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP';

export interface BaseNotificationPayload {
  tenantId: string;
  userId?: string; // Sometimes we only have recipient string (like phone number)
  recipient: string; // The email address or the phone number
  eventId: string; // e.g., "invoice.overdue", "tenant.deletion.pending"
  moduleType: 'MOBILE_SHOP' | 'GYM';
  data: Record<string, any>; // Render payload
}

export interface ChannelStrategy {
  getChannel(): NotificationChannel;
  send(payload: BaseNotificationPayload): Promise<boolean>;
}
