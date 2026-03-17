import { Injectable, Logger } from '@nestjs/common';
import { WhatsAppTokenService } from '../whatsapp-token.service';
import { MetaProvider } from './meta.provider';
import { BaileysProvider } from './baileys.provider';
import { AuthkeyProvider } from './REMOVED_TOKEN.provider';
import {
  MessageChannel,
  ProviderResult,
  SendMediaPayload,
  SendMessagePayload,
  SendTemplatePayload,
} from './messaging-provider.interface';

/** Minimal shape we need from a WhatsAppNumber record */
export interface PhoneNumberConfig {
  id: string;
  provider: 'META_CLOUD' | 'WEB_SOCKET' | 'AUTHKEY';
  phoneNumberId: string; // Meta phone number ID
  accessToken?: string | null; // Encrypted; resolved by WhatsAppTokenService
  REMOVED_TOKENApiKey?: string | null; // Encrypted API key for Authkey
  REMOVED_TOKENSenderId?: string | null;
  isEnabled: boolean;
  setupStatus: string;
}

export interface SendOptions {
  channel?: MessageChannel;
  /** If true, attempt fallback to Baileys on Authkey/Meta failure */
  allowFallback?: boolean;
}

/**
 * ProviderManager selects the correct messaging provider based on the
 * WhatsAppNumber.provider field, injects credentials, and executes the send.
 *
 * Business logic (quotas, feature gates, logging) remains in WhatsAppSender.
 * This service is purely transport-layer routing.
 */
@Injectable()
export class ProviderManager {
  private readonly logger = new Logger(ProviderManager.name);

  constructor(
    private readonly meta: MetaProvider,
    private readonly baileys: BaileysProvider,
    private readonly REMOVED_TOKEN: AuthkeyProvider,
    private readonly tokenService: WhatsAppTokenService,
  ) {}

  async sendMessage(
    phoneConfig: PhoneNumberConfig,
    to: string,
    text: string,
    tenantId: string,
    opts: SendOptions = {},
  ): Promise<ProviderResult> {
    const channel: MessageChannel = opts.channel || 'WHATSAPP';
    const payload: SendMessagePayload = { to, text, channel, tenantId };

    const result = await this.dispatchMessage(phoneConfig, payload, tenantId);

    if (!result.success && opts.allowFallback && phoneConfig.provider !== 'WEB_SOCKET') {
      this.logger.warn(
        `[ProviderManager] ${phoneConfig.provider} failed — falling back to Baileys`,
      );
      return this.baileys.sendMessage(payload);
    }

    return result;
  }

  async sendTemplate(
    phoneConfig: PhoneNumberConfig,
    to: string,
    templateName: string,
    parameters: string[],
    tenantId: string,
    opts: SendOptions & { language?: string } = {},
  ): Promise<ProviderResult> {
    const channel: MessageChannel = opts.channel || 'WHATSAPP';
    const payload: SendTemplatePayload = {
      to,
      templateName,
      parameters,
      language: opts.language,
      channel,
      tenantId,
    };

    const result = await this.dispatchTemplate(phoneConfig, payload, tenantId);

    if (!result.success && opts.allowFallback && phoneConfig.provider !== 'WEB_SOCKET') {
      this.logger.warn(
        `[ProviderManager] ${phoneConfig.provider} template failed — falling back to Baileys`,
      );
      return this.baileys.sendTemplate(payload);
    }

    return result;
  }

  async sendMedia(
    phoneConfig: PhoneNumberConfig,
    to: string,
    mediaUrl: string,
    mediaType: SendMediaPayload['mediaType'],
    tenantId: string,
    opts: SendOptions & { caption?: string } = {},
  ): Promise<ProviderResult> {
    const channel: MessageChannel = opts.channel || 'WHATSAPP';
    const payload: SendMediaPayload = {
      to,
      mediaUrl,
      caption: opts.caption,
      mediaType,
      channel,
      tenantId,
    };

    const result = await this.dispatchMedia(phoneConfig, payload, tenantId);

    if (!result.success && opts.allowFallback && phoneConfig.provider !== 'WEB_SOCKET') {
      return this.baileys.sendMedia(payload);
    }

    return result;
  }

  // ─────────────── private dispatch helpers ───────────────

  private async dispatchMessage(
    config: PhoneNumberConfig,
    payload: SendMessagePayload,
    tenantId: string,
  ): Promise<ProviderResult> {
    switch (config.provider) {
      case 'META_CLOUD': {
        const accessToken = await this.resolveMetaToken(config);
        if (!accessToken) {
          return this.tokenError(config.provider);
        }
        return this.meta.sendMessage({
          ...payload,
          phoneNumberId: config.phoneNumberId,
          accessToken,
        } as any);
      }

      case 'WEB_SOCKET':
        return this.baileys.sendMessage(payload);

      case 'AUTHKEY': {
        const { apiKey, senderId } = this.resolveAuthkeyCredentials(config);
        if (!apiKey) {
          return this.tokenError(config.provider);
        }
        return this.REMOVED_TOKEN.sendMessage({ ...payload, apiKey, senderId } as any);
      }

      default:
        return {
          success: false,
          error: `Unknown provider: ${config.provider}`,
          providerName: config.provider,
        };
    }
  }

  private async dispatchTemplate(
    config: PhoneNumberConfig,
    payload: SendTemplatePayload,
    tenantId: string,
  ): Promise<ProviderResult> {
    switch (config.provider) {
      case 'META_CLOUD': {
        const accessToken = await this.resolveMetaToken(config);
        if (!accessToken) return this.tokenError(config.provider);
        return this.meta.sendTemplate({
          ...payload,
          phoneNumberId: config.phoneNumberId,
          accessToken,
        } as any);
      }

      case 'WEB_SOCKET':
        return this.baileys.sendTemplate(payload);

      case 'AUTHKEY': {
        const { apiKey, senderId } = this.resolveAuthkeyCredentials(config);
        if (!apiKey) return this.tokenError(config.provider);
        return this.REMOVED_TOKEN.sendTemplate({ ...payload, apiKey, senderId } as any);
      }

      default:
        return {
          success: false,
          error: `Unknown provider: ${config.provider}`,
          providerName: config.provider,
        };
    }
  }

  private async dispatchMedia(
    config: PhoneNumberConfig,
    payload: SendMediaPayload,
    tenantId: string,
  ): Promise<ProviderResult> {
    switch (config.provider) {
      case 'META_CLOUD': {
        const accessToken = await this.resolveMetaToken(config);
        if (!accessToken) return this.tokenError(config.provider);
        return this.meta.sendMedia({
          ...payload,
          phoneNumberId: config.phoneNumberId,
          accessToken,
        } as any);
      }

      case 'WEB_SOCKET':
        return this.baileys.sendMedia(payload);

      case 'AUTHKEY': {
        const { apiKey, senderId } = this.resolveAuthkeyCredentials(config);
        if (!apiKey) return this.tokenError(config.provider);
        return this.REMOVED_TOKEN.sendMedia({ ...payload, apiKey, senderId } as any);
      }

      default:
        return {
          success: false,
          error: `Unknown provider: ${config.provider}`,
          providerName: config.provider,
        };
    }
  }

  private async resolveMetaToken(config: PhoneNumberConfig): Promise<string | null> {
    try {
      return await this.tokenService.resolveToken(config as any);
    } catch {
      return null;
    }
  }

  private resolveAuthkeyCredentials(config: PhoneNumberConfig): {
    apiKey: string;
    senderId: string;
  } {
    // REMOVED_TOKENApiKey is stored plaintext for now (encrypt at rest in future iteration)
    return {
      apiKey: config.REMOVED_TOKENApiKey || '',
      senderId: config.REMOVED_TOKENSenderId || '',
    };
  }

  private tokenError(provider: string): ProviderResult {
    return {
      success: false,
      error: `No access token/credentials found for provider: ${provider}`,
      providerName: provider,
    };
  }
}
