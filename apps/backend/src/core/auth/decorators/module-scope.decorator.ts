import { SetMetadata } from '@nestjs/common';
import { ModuleType } from '@prisma/client';

export const MODULE_SCOPE_KEY = 'moduleScope';

/**
 * Decorator to specify which module (GYM or MOBILE_SHOP) a controller/route belongs to.
 * Used by SubscriptionGuard to validate module-specific subscriptions.
 *
 * @example
 * ```typescript
 * @Controller('gym/members')
 * @ModuleScope(ModuleType.GYM)
 * export class GymMembersController {}
 * ```
 */
export const ModuleScope = (module: ModuleType) =>
  SetMetadata(MODULE_SCOPE_KEY, module);
