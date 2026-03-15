import { SetMetadata } from '@nestjs/common';
import { SKIP_SUBSCRIPTION_CHECK_KEY } from '../guards/subscription.guard';

/**
 * Decorator to skip subscription enforcement check
 *
 * Use for:
 * - Free trial endpoints
 * - Onboarding flows
 * - Public endpoints
 * - Admin/platform endpoints
 *
 * Example:
 * @SkipSubscriptionCheck()
 * @Get('/trial-features')
 * getTrialFeatures() { ... }
 */
export const SkipSubscriptionCheck = () =>
  SetMetadata(SKIP_SUBSCRIPTION_CHECK_KEY, true);
