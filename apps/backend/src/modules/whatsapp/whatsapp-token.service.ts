/**
 * ════════════════════════════════════════════════════
 * WhatsApp Token Service
 * ════════════════════════════════════════════════════
 *
 * RESPONSIBILITY: Resolve the correct WhatsApp API access token
 * for a given tenant and phone number configuration.
 *
 * RESOLUTION ORDER:
 * 1. Per-tenant token (from WhatsAppPhoneNumber.accessToken)
 * 2. Database record fallback (from WhatsAppNumber.accessToken)
 * 3. Global fallback (from process.env.WHATSAPP_ACCESS_TOKEN)
 *
 * ENCRYPTION: AES-256-GCM via crypto.util.ts
 * MASTER KEY: process.env.ENCRYPTION_MASTER_KEY
 */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
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
    accessToken?: string | null;
  }): Promise<string> {
    // 1. Try per-tenant/per-number token
    if (phoneNumberConfig.accessToken) {
      try {
        const token = decrypt(phoneNumberConfig.accessToken);
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

    // 2. Try to fetch from database if not in config
    try {
      const dbPhone = await this.prisma.whatsAppNumber.findUnique({
        where: { phoneNumberId: phoneNumberConfig.phoneNumberId },
        select: { accessToken: true },
      });

      if (dbPhone?.accessToken) {
        try {
          const token = decrypt(dbPhone.accessToken);
          this.logger.debug(
            `Using resolved token from DB for phoneNumberId=${phoneNumberConfig.phoneNumberId}`,
          );
          return token;
        } catch (err) {
          this.logger.error(`Failed to decrypt token from DB: ${err.message}`);
        }
      }
    } catch (err) {
      this.logger.warn(`WhatsAppNumber lookup failed: ${err.message}`);
    }

    // 3. Global fallback
    const globalToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!globalToken) {
      throw new InternalServerErrorException(
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
  async setTokenForPhoneNumber(id: string, plainToken: string): Promise<void> {
    const encrypted = encrypt(plainToken);
    await this.prisma.whatsAppNumber.update({
      where: { id },
      data: { accessToken: encrypted },
    });
    this.logger.log(`Token updated for phone number record ${id}`);
  }

  /**
   * Store an encrypted access token for a module-level phone number.
   */
  async setTokenForModulePhoneNumber(
    modulePhoneNumberId: string,
    plainToken: string,
  ): Promise<void> {
    // Both are consolidated now - use the record ID
    return this.setTokenForPhoneNumber(modulePhoneNumberId, plainToken);
  }
}
