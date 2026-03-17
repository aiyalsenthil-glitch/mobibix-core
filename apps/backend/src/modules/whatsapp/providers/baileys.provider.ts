import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessagingProvider,
  ProviderResult,
  SendMediaPayload,
  SendMessagePayload,
  SendTemplatePayload,
} from './messaging-provider.interface';

/**
 * BaileysProvider — sends via the whatsapp-web-service (Baileys / WhatsApp Web).
 * Uses WA_WEB_URL env var to reach the local web service over HTTP.
 * Template messages are NOT supported natively by Baileys — they are sent as plain text.
 */
@Injectable()
export class BaileysProvider implements MessagingProvider {
  readonly providerName = 'WEB_SOCKET';
  private readonly logger = new Logger(BaileysProvider.name);

  constructor(private readonly config: ConfigService) {}

  private get webUrl(): string {
    return this.config.get<string>('WA_WEB_URL') || 'http://localhost_REPLACED:3005';
  }

  async sendMessage(payload: SendMessagePayload): Promise<ProviderResult> {
    try {
      const { data } = await axios.post(`${this.webUrl}/whatsapp/send`, {
        tenantId: payload.tenantId,
        to: payload.to,
        text: payload.text,
      });

      return {
        success: true,
        messageId: data?.messageId,
        providerName: this.providerName,
        cost: 0, // Baileys is free
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[BAILEYS text] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  /**
   * Baileys doesn't support official templates — render as plain text fallback.
   */
  async sendTemplate(payload: SendTemplatePayload): Promise<ProviderResult> {
    const renderedText = `[${payload.templateName}] ${payload.parameters.join(' | ')}`;
    return this.sendMessage({
      to: payload.to,
      text: renderedText,
      channel: payload.channel,
      tenantId: payload.tenantId,
    });
  }

  async sendMedia(payload: SendMediaPayload): Promise<ProviderResult> {
    try {
      const { data } = await axios.post(`${this.webUrl}/whatsapp/send-media`, {
        tenantId: payload.tenantId,
        to: payload.to,
        mediaUrl: payload.mediaUrl,
        mediaType: payload.mediaType,
        caption: payload.caption,
      });

      return {
        success: true,
        messageId: data?.messageId,
        providerName: this.providerName,
        cost: 0,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[BAILEYS media] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }
}
