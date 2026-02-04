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

    const now = new Date();

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        OR: [
          {
            status: 'ACTIVE',
            startDate: { lte: now },
            endDate: { gt: now },
          },
          {
            status: 'TRIAL',
            startDate: { lte: now },
            endDate: { gt: now },
          },
        ],
      },
      orderBy: [
        { status: 'desc' }, // ACTIVE > TRIAL
        { startDate: 'desc' },
      ],
      include: { plan: true },
    });

    if (!subscription?.plan) {
      throw new ForbiddenException('PLAN_REQUIRED');
    }
    // 🔓 TRIAL has full access
    if (subscription?.status === 'TRIAL') {
      return true;
    }
    const planCode = (subscription.plan.code ??
      subscription.plan.name) as keyof typeof PLAN_CAPABILITIES;
    const plan = PLAN_CAPABILITIES[planCode];

    if (!plan || plan[feature] !== true) {
      throw new ForbiddenException('PLAN_UPGRADE_REQUIRED');
    }

    return true;
  }
}
