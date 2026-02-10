/**
 * ════════════════════════════════════════════════════
 * WhatsApp Token Service
 * ════════════════════════════════════════════════════
 *
 * RESPONSIBILITY: Resolve the correct WhatsApp API access token
 * for a given tenant and phone number configuration.
 *
 * RESOLUTION ORDER:
 * 1. Per-tenant token (from WhatsAppPhoneNumber.encryptedAccessToken)
 * 2. Module-level token (from WhatsAppPhoneNumberModule.encryptedAccessToken)
 * 3. Global fallback (from process.env.WHATSAPP_ACCESS_TOKEN)
 *
 * ENCRYPTION: AES-256-GCM via crypto.util.ts
 * MASTER KEY: process.env.ENCRYPTION_MASTER_KEY
 */
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

@Injectable()
export class WhatsAppTokenService {
  private readonly logger = new Logger(WhatsAppTokenService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve the access token for a given phone number configuration.
   *
   * @param phoneNumberConfig - The resolved phone number config (from WhatsAppPhoneNumbersService)
   * @returns The decrypted access token
   */
  async resolveToken(phoneNumberConfig: {
    id: string;
    tenantId: string;
    phoneNumberId: string;
    encryptedAccessToken?: string | null;
  }): Promise<string> {
    // 1. Try per-tenant/per-number token
    if (phoneNumberConfig.encryptedAccessToken) {
      try {
        const token = decrypt(phoneNumberConfig.encryptedAccessToken);
        this.logger.debug(
          `Using per-number token for phoneNumberId=${phoneNumberConfig.phoneNumberId}`,
        );
        return token;
      } catch (err) {
        this.logger.error(
          `Failed to decrypt token for phone number ${phoneNumberConfig.id}: ${err.message}`,
        );
        // Fall through to module-level
      }
    }

    // 2. Try module-level token
    try {
      const modulePhone =
        await this.prisma.whatsAppPhoneNumberModule.findFirst({
          where: {
            phoneNumberId: phoneNumberConfig.phoneNumberId,
            isActive: true,
          },
          select: { encryptedAccessToken: true },
        });

      if (modulePhone?.encryptedAccessToken) {
        try {
          const token = decrypt(modulePhone.encryptedAccessToken);
          this.logger.debug(
            `Using module-level token for phoneNumberId=${phoneNumberConfig.phoneNumberId}`,
          );
          return token;
        } catch (err) {
          this.logger.error(
            `Failed to decrypt module token: ${err.message}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Module phone lookup failed: ${err.message}`);
    }

    // 3. Global fallback
    const globalToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!globalToken) {
      throw new Error(
        'No WhatsApp access token available. Set per-tenant token, module token, or WHATSAPP_ACCESS_TOKEN env.',
      );
    }

    this.logger.debug(
      `Using global fallback token for tenant=${phoneNumberConfig.tenantId}`,
    );
    return globalToken;
  }

  /**
   * Store an encrypted access token for a tenant phone number.
   */
  async setTokenForPhoneNumber(
    phoneNumberId: string,
    plainToken: string,
  ): Promise<void> {
    const encrypted = encrypt(plainToken);
    await this.prisma.whatsAppPhoneNumber.update({
      where: { id: phoneNumberId },
      data: { encryptedAccessToken: encrypted },
    });
    this.logger.log(`Token updated for phone number ${phoneNumberId}`);
  }

  /**
   * Store an encrypted access token for a module-level phone number.
   */
  async setTokenForModulePhoneNumber(
    modulePhoneNumberId: string,
    plainToken: string,
  ): Promise<void> {
    const encrypted = encrypt(plainToken);
    await this.prisma.whatsAppPhoneNumberModule.update({
      where: { id: modulePhoneNumberId },
      data: { encryptedAccessToken: encrypted },
    });
    this.logger.log(
      `Token updated for module phone number ${modulePhoneNumberId}`,
    );
  }
}
