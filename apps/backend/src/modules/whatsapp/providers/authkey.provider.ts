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
 * Authkey CPaaS Provider
 * API Docs: https://console.REMOVED_TOKEN.io
 *
 * Key API facts (from official docs):
 *   - Template identified by `wid` (numeric template ID registered in Authkey portal)
 *   - Variables: `bodyValues: { "1": "val1", "2": "val2" }` (NOT an array)
 *   - Auth: `Authorization: Basic <REMOVED_TOKEN>` header (Basic auth)
 *   - Endpoint (POST JSON single): https://console.REMOVED_TOKEN.io/restapi/requestjson.php
 *   - Endpoint (POST JSON bulk): https://console.REMOVED_TOKEN.io/restapi/requestjson_v2.0.php
 *   - GET single: https://api.REMOVED_TOKEN.io/request?REMOVED_TOKEN=X&mobile=Y&country_code=91&wid=Z&1=v1
 *
 * IMPORTANT:
 *   The `templateName` field MUST contain the Authkey numeric `wid` (e.g. "101").
 *   Register templates in the Authkey portal and store the wid in your WhatsAppTemplate record.
 *
 * Credentials injected by ProviderManager from WhatsAppNumber:
 *   REMOVED_TOKENApiKey  — plain API key (stored AES-encrypted in DB, decrypted before injection)
 *   REMOVED_TOKENSenderId — not used in JSON API (embedded in account) — kept for GET API fallback
 */
@Injectable()
export class AuthkeyProvider implements MessagingProvider {
  readonly providerName = 'AUTHKEY';
  private readonly logger = new Logger(AuthkeyProvider.name);

  private readonly jsonEndpoint = 'https://console.REMOVED_TOKEN.io/restapi/requestjson.php';
  private readonly bulkEndpoint = 'https://console.REMOVED_TOKEN.io/restapi/requestjson_v2.0.php';

  /** Estimated cost in INR per message type */
  private static readonly COSTS = {
    WHATSAPP_TEMPLATE: 0.35,
    WHATSAPP_SESSION: 0.20,
    SMS: 0.12,
  } as const;

  /**
   * Send a free-form session WhatsApp message via Authkey.
   * Note: Authkey primarily supports template messages.
   * Session messages are sent using wid=0 (if supported) or fall back to a generic template.
   */
  async sendMessage(
    payload: SendMessagePayload & { apiKey: string; senderId?: string },
  ): Promise<ProviderResult> {
    // Authkey does not have a documented free-text API for WhatsApp.
    // We use the GET-style API with `message` param as fallback.
    try {
      const params = new URLSearchParams({
        REMOVED_TOKEN: payload.apiKey,
        mobile: payload.to,
        country_code: '91',
        type: payload.channel === 'SMS' ? 'sms' : 'whatsapp',
        message: payload.text,
      });

      const response = await axios.get(
        `https://api.REMOVED_TOKEN.io/request?${params.toString()}`,
        { timeout: 10_000 },
      );

      const isSuccess = this.isSuccessResponse(response.data);
      if (!isSuccess) {
        const error = this.extractError(response.data);
        this.logger.warn(`[AUTHKEY session] ${error}`);
        return { success: false, error, providerName: this.providerName };
      }

      return {
        success: true,
        messageId: String(response.data?.id || response.data?.message_id || ''),
        providerName: this.providerName,
        cost: payload.channel === 'SMS'
          ? AuthkeyProvider.COSTS.SMS
          : AuthkeyProvider.COSTS.WHATSAPP_SESSION,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[AUTHKEY session error] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  /**
   * Send a registered WhatsApp template via Authkey.
   *
   * `payload.templateName` MUST be the numeric Authkey `wid` (e.g. "101").
   * `payload.parameters` is an ordered array → mapped to bodyValues {"1":..., "2":...}
   */
  async sendTemplate(
    payload: SendTemplatePayload & { apiKey: string; senderId?: string },
  ): Promise<ProviderResult> {
    // Build bodyValues from positional array: ["val1", "val2"] → {"1":"val1","2":"val2"}
    const bodyValues: Record<string, string> = {};
    payload.parameters.forEach((val, idx) => {
      bodyValues[String(idx + 1)] = val;
    });

    const body: Record<string, any> = {
      country_code: '91',
      mobile: payload.to,
      wid: payload.templateName, // Authkey uses numeric template ID as `wid`
      type: 'text',
    };

    if (Object.keys(bodyValues).length > 0) {
      body.bodyValues = bodyValues;
    }

    try {
      const response = await axios.post(this.jsonEndpoint, body, {
        headers: {
          Authorization: `Basic ${payload.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      });

      const isSuccess = this.isSuccessResponse(response.data);
      if (!isSuccess) {
        const error = this.extractError(response.data);
        this.logger.warn(`[AUTHKEY template wid=${payload.templateName}] ${error}`);
        return { success: false, error, providerName: this.providerName };
      }

      return {
        success: true,
        messageId: String(response.data?.id || response.data?.message_id || ''),
        providerName: this.providerName,
        cost: AuthkeyProvider.COSTS.WHATSAPP_TEMPLATE,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[AUTHKEY template error] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  /**
   * Send a media template via Authkey.
   * Uses type="media" with headerValues.
   */
  async sendMedia(
    payload: SendMediaPayload & { apiKey: string; templateWid?: string; senderId?: string },
  ): Promise<ProviderResult> {
    const wid = (payload as any).templateWid;
    if (!wid) {
      this.logger.warn('[AUTHKEY] sendMedia requires a templateWid — falling back to caption text');
      return this.sendMessage({
        to: payload.to,
        text: payload.caption || payload.mediaUrl,
        channel: payload.channel,
        tenantId: payload.tenantId,
        apiKey: (payload as any).apiKey,
      });
    }

    const body = {
      country_code: '91',
      mobile: payload.to,
      wid,
      type: 'media',
      headerValues: { headerData: payload.mediaUrl },
    };

    try {
      const response = await axios.post(this.jsonEndpoint, body, {
        headers: {
          Authorization: `Basic ${(payload as any).apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 10_000,
      });

      const isSuccess = this.isSuccessResponse(response.data);
      if (!isSuccess) {
        const error = this.extractError(response.data);
        return { success: false, error, providerName: this.providerName };
      }

      return {
        success: true,
        messageId: String(response.data?.id || ''),
        providerName: this.providerName,
        cost: AuthkeyProvider.COSTS.WHATSAPP_TEMPLATE,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[AUTHKEY media error] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  /**
   * Send the same template to multiple recipients (up to 200) in a single API call.
   * Use this for bulk campaigns to reduce API calls.
   */
  async sendBulkTemplate(
    apiKey: string,
    wid: string,
    recipients: Array<{ mobile: string; bodyValues?: Record<string, string> }>,
    countryCode = '91',
  ): Promise<ProviderResult> {
    const body = {
      version: '2.0',
      country_code: countryCode,
      wid,
      type: 'text',
      data: recipients.map((r) => ({
        mobile: r.mobile,
        ...(r.bodyValues ? { bodyValues: r.bodyValues } : {}),
      })),
    };

    try {
      const response = await axios.post(this.bulkEndpoint, body, {
        headers: {
          Authorization: `Basic ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30_000,
      });

      const isSuccess = this.isSuccessResponse(response.data);
      if (!isSuccess) {
        return {
          success: false,
          error: this.extractError(response.data),
          providerName: this.providerName,
        };
      }

      return {
        success: true,
        messageId: String(response.data?.id || ''),
        providerName: this.providerName,
        cost: recipients.length * AuthkeyProvider.COSTS.WHATSAPP_TEMPLATE,
      };
    } catch (err: any) {
      const error = err.response?.data
        ? JSON.stringify(err.response.data)
        : err.message;
      this.logger.error(`[AUTHKEY bulk error] ${error}`);
      return { success: false, error, providerName: this.providerName };
    }
  }

  private isSuccessResponse(data: any): boolean {
    if (!data) return false;
    if (data.type === 'success') return true;
    if (data.status === 'success' || data.status === '1' || data.status === 1) return true;
    if (data.id && Number(data.id) > 0) return true;
    if (data.message_id && Number(data.message_id) > 0) return true;
    return false;
  }

  private extractError(data: any): string {
    return data?.message || data?.error || data?.error_message || JSON.stringify(data);
  }
}
