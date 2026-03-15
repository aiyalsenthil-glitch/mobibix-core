import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagService } from './feature-flag.service';
import { FEATURE_FLAG_KEY } from './feature-flag.decorator';
import { FeatureFlag } from './feature-flags.constants';

/**
 * Guard to protect routes based on feature flags
 *
 * Checks if the required feature is enabled for the tenant/shop context.
 * Extracts tenantId and shopId from request user (injected by JWT guard).
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  private readonly logger = new Logger(FeatureFlagGuard.name);

  constructor(
    private reflector: Reflector,
    private featureFlagService: FeatureFlagService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get required feature flag from metadata
    const requiredFeature = this.reflector.getAllAndOverride<FeatureFlag>(
      FEATURE_FLAG_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No feature flag required
    if (!requiredFeature) {
      return true;
    }

    // Get request and user context
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // Extract tenant and shop context
    const tenantId = user?.tenantId;
    const shopId = user?.shopId; // Optional: some users may not have shop context

    // Check if feature is enabled
    const isEnabled = await this.featureFlagService.isFeatureEnabled(
      requiredFeature,
      tenantId,
      shopId,
    );

    if (!isEnabled) {
      this.logger.warn(
        `Feature ${requiredFeature} is disabled for tenant ${tenantId}, shop ${shopId}`,
      );
      throw new ForbiddenException(
        `Feature ${requiredFeature} is not enabled for your account`,
      );
    }

    return true;
  }
}
