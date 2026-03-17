import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import {
  MessagingProvider,
  ProviderResult,
  SendMediaPayload,
  SendMessagePayload,
  SendTemplatePayload,
} from './messaging-provider.interface';

/**
 * MetaProvider — sends via Meta WhatsApp Cloud API (graph.facebook.com).
 * Requires: phoneNumberId, accessToken resolved from WhatsAppNumber record.
 */
@Injectable()
export class MetaProvider implements MessagingProvider {
  readonly providerName = 'META_CLOUD';
  private readonly logger = new Logger(MetaProvider.name);
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  /** Called by ProviderManager with resolved credentials */
  async sendMessage(
    payload: SendMessagePayload & { phoneNumberId: string; accessToken: string },
  ): Promise<ProviderResult> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${payload.phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: payload.to,
          type: 'text',
          text: { preview_url: false, body: payload.text },
        },
        {
          headers: {
            Authorization: `Bearer ${payload.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        providerName: this.providerName,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[META text] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  async sendTemplate(
    payload: SendTemplatePayload & { phoneNumberId: string; accessToken: string },
  ): Promise<ProviderResult> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${payload.phoneNumberId}/messages`;

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'template',
          template: {
            name: payload.templateName,
            language: { code: payload.language || 'en' },
            components: [
              {
                type: 'body',
                parameters: payload.parameters.map((text) => ({
                  type: 'text',
                  text,
                })),
              },
            ],
          },
        },
        {
          headers: {
            Authorization: `Bearer ${payload.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        providerName: this.providerName,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[META template] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  async sendMedia(
    payload: SendMediaPayload & { phoneNumberId: string; accessToken: string },
  ): Promise<ProviderResult> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${payload.phoneNumberId}/messages`;
    const mediaTypeMap: Record<string, string> = {
      image: 'image',
      document: 'document',
      video: 'video',
      audio: 'audio',
    };

    try {
      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: mediaTypeMap[payload.mediaType],
          [mediaTypeMap[payload.mediaType]]: {
            link: payload.mediaUrl,
            caption: payload.caption,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${payload.accessToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        providerName: this.providerName,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[META media] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }
}
