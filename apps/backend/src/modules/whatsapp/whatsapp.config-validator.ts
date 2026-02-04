import { Logger } from '@nestjs/common';

/**
 * Validates WhatsApp configuration for production safety.
 * Fails fast if placeholder values are detected.
 */
export class WhatsAppConfigValidator {
  private static readonly logger = new Logger(WhatsAppConfigValidator.name);

  static validateOrExit() {
    const requiredVars = [
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_WABA_ID',
      'WHATSAPP_ACCESS_TOKEN',
    ];

    const placeholders = ['YOUR_PHONE_NUMBER_ID', 'YOUR_WABA_ID', 'YOUR_ACCESS_TOKEN'];
    const errors: string[] = [];

    for (const key of requiredVars) {
      const value = process.env[key];

      if (!value) {
        errors.push(`Missing ENV: ${key}`);
        continue;
      }

      // Check if value is a known placeholder
      if (placeholders.some((p) => value.includes(p))) {
        errors.push(`Invalid ENV: ${key} contains placeholder value "${value}"`);
      }
    }

    if (errors.length > 0) {
      if (process.env.NODE_ENV === 'production') {
        this.logger.error('🚨 CRITICAL CONFIGURATION ERROR 🚨');
        errors.forEach((err) => this.logger.error(err));
        this.logger.error('Application will exit to prevent unsafe operation.');
        process.exit(1);
      } else {
        this.logger.warn('⚠️  CONFIG WARNING (Dev Mode) ⚠️');
        errors.forEach((err) => this.logger.warn(err));
        this.logger.warn('WhatsApp features may fail.');
      }
    } else {
      this.logger.log('✅ WhatsApp configuration validated.');
    }
  }
}
