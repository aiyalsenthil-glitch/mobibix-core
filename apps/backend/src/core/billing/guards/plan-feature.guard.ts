import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PLAN_CAPABILITIES } from '../plan-capabilities';

export const PLAN_FEATURE_KEY = 'plan_feature';
export const RequirePlanFeature = (feature: string) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);

@Injectable()
export class PlanFeatureGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
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

    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    if (!subscription?.plan) {
      throw new ForbiddenException('PLAN_REQUIRED');
    }

    const planName = subscription.plan.name as keyof typeof PLAN_CAPABILITIES;
    const plan = PLAN_CAPABILITIES[planName];

    if (!plan || plan[feature] !== true) {
      throw new ForbiddenException('PLAN_UPGRADE_REQUIRED');
    }

    return true;
  }
}
