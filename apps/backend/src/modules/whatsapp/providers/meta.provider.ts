import axios from 'axios';
import { Injectable, Logger } from '@nestjs/common';
import {
  MessagingProvider,
  ProviderResult,
  SendMediaPayload,
  SendMessagePayload,
  SendTemplatePayload,
} from './messaging-provider.interface';
import { PrismaService } from '../../../core/prisma/prisma.service';

/**
 * MetaProvider — sends via Meta WhatsApp Cloud API (graph.facebook.com).
 * Requires: phoneNumberId, accessToken resolved from WhatsAppNumber record.
 */
@Injectable()
export class MetaProvider implements MessagingProvider {
  readonly providerName = 'META_CLOUD';
  private readonly logger = new Logger(MetaProvider.name);
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v22.0';

  constructor(private readonly prisma: PrismaService) {}

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
      const components: any[] = [
        {
          type: 'body',
          parameters: payload.parameters.map((text) => ({ type: 'text', text })),
        },
      ];
      if (payload.buttonUrlSuffix) {
        components.push({
          type: 'button',
          sub_type: 'url',
          index: '0',
          parameters: [{ type: 'text', text: payload.buttonUrlSuffix }],
        });
      }

      const response = await axios.post(
        url,
        {
          messaging_product: 'whatsapp',
          to: payload.to,
          type: 'template',
          template: {
            name: payload.templateName,
            language: { code: payload.language || 'en' },
            components,
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
    }
  }

  /**
   * Send a Conversions API event (CAPI) to Meta
   * Requires: wabaId, accessToken, tenantId
   */
  async sendEvent(params: {
    tenantId: string;
    wabaId: string;
    accessToken: string;
    eventType: 'PURCHASE' | 'LEAD' | 'ADD_TO_CART';
    phone: string;
    whatsappNumberId?: string;
    value?: number;
    currency?: string;
  }): Promise<ProviderResult> {
    const url = `https://graph.facebook.com/${this.apiVersion}/${params.wabaId}/events`;

    const payload = {
      messaging_product: 'whatsapp',
      event_type: params.eventType,
      event_data: {
        phone: params.phone,
        value: params.value ?? 0,
        currency: params.currency ?? 'INR',
        event_time: Math.floor(Date.now() / 1000),
      },
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${params.accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      // Log success to DB
      await this.prisma.metaEventLog.create({
        data: {
          tenantId: params.tenantId,
          whatsAppNumberId: params.whatsappNumberId,
          eventType: params.eventType,
          phone: params.phone,
          status: 'SUCCESS',
          payload: payload as any,
          response: response.data as any,
        },
      });

      return {
        success: true,
        messageId: response.data?.id,
        providerName: this.providerName,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[META CAPI] ${error}`);

      // Log failure to DB
      await this.prisma.metaEventLog.create({
        data: {
          tenantId: params.tenantId,
          whatsAppNumberId: params.whatsappNumberId,
          eventType: params.eventType,
          phone: params.phone,
          status: 'FAILED',
          payload: payload as any,
          error,
        },
      });

      return { success: false, error, providerName: this.providerName };
    }
  }
}
