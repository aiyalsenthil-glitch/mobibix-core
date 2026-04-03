import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import * as https from 'https';
import axios from 'axios';

export type CAPIEventName =
  | 'Contact'
  | 'LeadSubmitted'
  | 'Purchase'
  | 'CompleteRegistration'
  | 'ViewContent'
  | 'AddToCart';

export interface CAPIEventPayload {
  eventName: CAPIEventName;
  /** Raw E.164 phone number — will be SHA-256 hashed before sending */
  phone: string;
  /** From message.referral.ctwa_clid — links event to a specific CTWA ad */
  ctwaClid?: string;
  /** Ad source ID from message.referral.source_id */
  adSourceId?: string;
  /** Sale/order value for Purchase events */
  value?: number;
  /** Currency code. Defaults to INR */
  currency?: string;
  /** Product or content name for context */
  contentName?: string;
  /** Tenant's Meta Events Manager dataset ID */
  datasetId: string;
  /** Tenant's CAPI System User Access Token (separate from messaging token) */
  accessToken: string;
  /** Internal tenant reference for logging */
  tenantId: string;
  /** Optional: deduplicate with a stable unique ID (e.g. messageId) */
  eventId?: string;
}

@Injectable()
export class WhatsAppCapiService {
  private readonly logger = new Logger(WhatsAppCapiService.name);
  private readonly GRAPH_API_VERSION = 'v19.0';
  private readonly BASE_URL = 'https://graph.facebook.com';

  /**
   * Fire a Conversions API event to Meta.
   *
   * https://developers.facebook.com/docs/marketing-api/conversions-api/business-messaging
   *
   * Key rules:
   * - Always SHA-256 hash the phone before sending
   * - Use action_source: 'business_messaging' for WhatsApp events
   * - Include ctwa_clid to attribute the event to a CTWA ad click
   * - Send within 7 days of the originating interaction
   */
  async fireEvent(payload: CAPIEventPayload): Promise<boolean> {
    const { eventName, phone, ctwaClid, adSourceId, value, currency, contentName, datasetId, accessToken, tenantId, eventId } = payload;

    if (!datasetId || !accessToken) {
      this.logger.debug(`[CAPI] Skipping ${eventName} for tenant ${tenantId} — CAPI not configured`);
      return false;
    }

    // SHA-256 hash the phone (strip non-digits, lowercase)
    const normalizedPhone = phone.replace(/\D/g, '').toLowerCase();
    const hashedPhone = crypto.createHash('sha256').update(normalizedPhone).digest('hex');

    const eventPayload = {
      data: [
        {
          event_name: eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId || `${tenantId}_${eventName}_${Date.now()}`,
          action_source: 'business_messaging',
          messaging_channel: 'whatsapp',
          user_data: {
            ph: [hashedPhone],
            ...(ctwaClid && { ctwa_clid: ctwaClid }),
          },
          custom_data: {
            ...(value !== undefined && { value, currency: currency || 'INR' }),
            ...(contentName && { content_name: contentName }),
            ...(adSourceId && { ad_id: adSourceId }),
          },
        },
      ],
    };

    try {
      const url = `${this.BASE_URL}/${this.GRAPH_API_VERSION}/${datasetId}/events`;
      const response = await axios.post(url, eventPayload, {
        params: { access_token: accessToken },
        timeout: 8000,
      });

      this.logger.log(
        `[CAPI] ✅ ${eventName} → tenant:${tenantId} | events_received:${response.data?.events_received ?? '?'} | ctwa:${ctwaClid ? 'yes' : 'no'}`,
      );
      return true;
    } catch (err: any) {
      const metaError = err?.response?.data?.error;
      this.logger.warn(
        `[CAPI] ❌ ${eventName} failed for tenant ${tenantId}: ${metaError?.message || err.message}`,
      );
      return false;
    }
  }

  /**
   * Resolve CAPI credentials for a tenant.
   * Uses tenant's own config if set, falls back to platform defaults.
   */
  resolveCreds(tenantCapiConfig?: {
    capiDatasetId?: string | null;
    capiAccessToken?: string | null;
  }): { datasetId: string; accessToken: string } | null {
    const datasetId =
      tenantCapiConfig?.capiDatasetId || process.env.WHATSAPP_CAPI_DATASET_ID;
    const accessToken =
      tenantCapiConfig?.capiAccessToken || process.env.WHATSAPP_CAPI_ACCESS_TOKEN;

    if (!datasetId || !accessToken) return null;
    return { datasetId, accessToken };
  }
}
