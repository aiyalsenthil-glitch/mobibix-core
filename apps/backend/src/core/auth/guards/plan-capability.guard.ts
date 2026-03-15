import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PLAN_CAPABILITIES } from '../../billing/plan-capabilities';

export const PLAN_FEATURE_KEY = 'plan_feature';

@Injectable()
export class PlanCapabilityGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredFeature = this.reflector.getAllAndOverride<string>(
      PLAN_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No plan feature required → allow
    if (!requiredFeature) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const subscription = request.subscription; // must be attached earlier

    if (!subscription || !subscription.plan) {
      throw new ForbiddenException('Plan not found');
    }
    // 🔓 TRIAL has full access
    if ((subscription.plan.code ?? subscription.plan.name) === 'GYM_TRIAL') {
      return true;
    }

    const planCode = subscription.plan.code ?? subscription.plan.name;
    const capability = PLAN_CAPABILITIES[planCode];

    if (!capability || capability[requiredFeature] !== true) {
      throw new ForbiddenException(
        `Feature '${requiredFeature}' not allowed in current plan`,
      );
    }

    return true;
  }
}
