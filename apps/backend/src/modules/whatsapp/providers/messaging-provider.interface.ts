export type MessageChannel = 'WHATSAPP' | 'SMS' | 'EMAIL';

export interface SendMessagePayload {
  to: string; // E.164 format e.g. 919876543210
  text: string;
  channel: MessageChannel;
  tenantId: string;
}

export interface SendTemplatePayload {
  to: string;
  templateName: string;
  parameters: string[];
  language?: string;
  channel: MessageChannel;
  tenantId: string;
  /** Dynamic suffix appended to the template's static button URL (Meta Cloud only) */
  buttonUrlSuffix?: string;
}

export interface SendMediaPayload {
  to: string;
  mediaUrl: string;
  caption?: string;
  mediaType: 'image' | 'document' | 'video' | 'audio';
  channel: MessageChannel;
  tenantId: string;
}

export interface ProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
  providerName: string;
  /** Estimated cost in INR for cost tracking */
  cost?: number;
}

export interface MessagingProvider {
  readonly providerName: string;
  sendMessage(payload: SendMessagePayload): Promise<ProviderResult>;
  sendTemplate(payload: SendTemplatePayload): Promise<ProviderResult>;
  sendMedia(payload: SendMediaPayload): Promise<ProviderResult>;
}
