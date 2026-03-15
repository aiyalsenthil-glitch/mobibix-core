import { SetMetadata } from '@nestjs/common';
import { FeatureFlag } from './feature-flags.constants';

/**
 * Metadata key for feature flag guards
 */
export const FEATURE_FLAG_KEY = 'feature_flag';

/**
 * Decorator to protect routes with feature flags
 *
 * Usage:
 * ```typescript
 * @RequireFeature(FeatureFlag.WHATSAPP_REMINDERS)
 * @Get('send-reminder')
 * async sendReminder() {
 *   // This method only executes if WHATSAPP_REMINDERS is enabled
 * }
 * ```
 */
export const RequireFeature = (flag: FeatureFlag) =>
  SetMetadata(FEATURE_FLAG_KEY, flag);
