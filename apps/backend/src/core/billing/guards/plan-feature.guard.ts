import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanRulesService } from '../plan-rules.service';
import { WhatsAppFeature } from '../whatsapp-rules';

export const PLAN_FEATURE_KEY = 'plan_feature';
export const RequirePlanFeature = (feature: string) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private planRulesService: PlanRulesService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const feature = this.reflector.getAllAndOverride<string>(PLAN_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!feature) return true;

    const req = context.switchToHttp().getRequest();
    const tenantId = req.user?.tenantId;

    if (!tenantId) return true;

    // Use centralized Plan Rules Service (Source of Truth: DB)
    // This handles caching, active subscription checks, and trial restrictions correctly.
    const isEnabled = await this.planRulesService.isFeatureEnabledForTenant(
      tenantId,
      feature as WhatsAppFeature,
    );

    if (!isEnabled) {
      // Enhanced error with upgrade metadata
      throw new ForbiddenException({
        error: 'UPGRADE_REQUIRED',
        message: this.getFeatureMessage(feature),
        requiredPlan: 'PRO',
        requiredFeature: feature,
        upgradeHint: this.getUpgradeHint(feature),
      });
    }

    return true;
  }

  private getFeatureMessage(feature: string): string {
    const messages = {
      WHATSAPP_UTILITY:
        'WhatsApp messaging is available in PRO or as an add-on.',
      WHATSAPP_MARKETING:
        'WhatsApp marketing campaigns are available in PRO or as an add-on.',
      WHATSAPP_AUTOMATION:
        'WhatsApp automation is available in PRO or as an add-on.',
      WHATSAPP_ALERTS_AUTOMATION:
        'WhatsApp automation is available in PRO or as an add-on.',
      REPORTS: 'Reports & analytics are available in PRO plan.',
      MULTI_SHOP: 'Multi-shop management is available in PRO plan.',
      CUSTOM_PRINT_LAYOUT: 'Custom print layouts are available in PRO plan.',
    };
    return messages[feature] || 'This feature requires a plan upgrade.';
  }

  private getUpgradeHint(feature: string): string {
    const hints = {
      WHATSAPP_UTILITY: 'Enable customer alerts & notifications',
      WHATSAPP_MARKETING: 'Enable marketing campaigns',
      WHATSAPP_AUTOMATION: 'Enable automated messaging',
      WHATSAPP_ALERTS_AUTOMATION: 'Enable automated messaging',
      REPORTS: 'Access analytics & reports',
      MULTI_SHOP: 'Manage multiple locations',
      CUSTOM_PRINT_LAYOUT: 'Customize invoice templates',
    };
    return hints[feature] || 'Unlock premium features';
  }
}
