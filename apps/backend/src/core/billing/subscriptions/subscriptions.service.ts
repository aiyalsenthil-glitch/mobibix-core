import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SubscriptionStatus, ModuleType } from '@prisma/client';
import { EmailService } from '../../../common/email/email.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}
  //DONOT USE
  async upgradeSubscription(
    tenantId: string,
    planId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const newPlan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!newPlan || newPlan.level === null) {
      throw new NotFoundException('Invalid plan');
    }

    const currentSub = await this.getCurrentActiveSubscription(
      tenantId,
      module,
    );
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        userTenants: {
          where: { role: 'OWNER' },
          include: {
            user: true,
          },
        },
      },
    });

    if (!currentSub) {
      // Trial exists but expired → UPGRADE existing row
      const existingSub = await this.prisma.tenantSubscription.findFirst({
        where: { tenantId, module },
        orderBy: { endDate: 'desc' },
        include: { plan: true },
      });

      if (!existingSub) {
        throw new NotFoundException('Subscription record not found');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + newPlan.durationDays);

      return this.prisma.tenantSubscription.updateMany({
        where: { tenantId, module },
        data: {
          planId: newPlan.id,
          status: SubscriptionStatus.ACTIVE,
          startDate,
          endDate,
          expiryReminderSentAt: null,
        },
      });
    }

    const oldPlanName = currentSub.plan.name;
    const newPlanName = newPlan.name;

    // 🔥 UPGRADE-ONLY RULE (NOW TYPE-SAFE)
    if (newPlan.level <= currentSub.plan.level) {
      throw new BadRequestException(
        'Cannot downgrade or reselect the same plan',
      );
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + newPlan.durationDays);
    // Send email notification about the upgrade
    const updatedSub = await this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: {
        planId: newPlan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        expiryReminderSentAt: null,
      },
    });
    // 📧 Send plan upgrade email (non-blocking)
    try {
      const ownerEmail = tenant?.userTenants?.[0]?.user?.email;

      if (ownerEmail) {
        await this.emailService.sendEmail({
          to: ownerEmail,
          subject: 'Your GymPilot plan has been upgraded 🎉',
          html: `
        <h3>Plan Upgraded Successfully</h3>
        <p>Hello${tenant?.name ? ` ${tenant.name}` : ''},</p>
        <p>Your GymPilot plan has been upgraded.</p>
        <p>
          <b>${oldPlanName}</b> → <b>${newPlanName}</b>
        </p>
        <p>
          Effective from <b>${startDate.toDateString()}</b>
        </p>
        <br/>
        <p>If you have any questions, contact support anytime.</p>
        <p>— Team GymPilot</p>
      `,
        });
      }
    } catch (err) {
      // ❗ Do NOT fail upgrade if email fails
      console.error(
        '[Subscription] Plan upgrade email failed for tenant',
        tenantId,
        err,
      );
    }
    console.log(
      '[Subscription] Plan upgraded',
      tenantId,
      oldPlanName,
      '→',
      newPlanName,
    );

    return updatedSub;
  }

  async canAddMember(
    tenantId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ): Promise<boolean> {
    const subscription = await this.getCurrentActiveSubscription(
      tenantId,
      module,
    );
    if (!subscription) return false;

    const plan = subscription.plan;
    const features = plan.features as any;

    if (!features?.memberLimit) return true;

    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    return memberCount < features.memberLimit;
  }

  //USETHIS
  async buyPlan(
    tenantId: string,
    planId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const plan = await this.prisma.plan.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      throw new NotFoundException('Invalid plan');
    }

    const now = new Date();

    // Get current ACTIVE or TRIAL subscription for this module
    const current = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: { in: ['ACTIVE', 'TRIAL'] },
        endDate: { gt: now },
      },
      orderBy: { endDate: 'desc' },
    });

    // Get last scheduled subscription for this module (if any)
    const lastScheduled = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: 'SCHEDULED',
      },
      orderBy: { startDate: 'desc' },
    });
    let startDate: Date;

    if (current?.status === 'TRIAL') {
      // 🔥 Paid plan overrides trial immediately
      startDate = now;

      // Expire trial
      await this.prisma.tenantSubscription.update({
        where: { id: current.id },
        data: { status: 'EXPIRED' },
      });
    } else if (current) {
      // ACTIVE → schedule after current ends
      startDate = current.endDate;
    } else if (lastScheduled) {
      startDate = lastScheduled.endDate;
    } else {
      startDate = now;
    }

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + plan.durationDays);

    const status: SubscriptionStatus = startDate > now ? 'SCHEDULED' : 'ACTIVE';

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId,
        module,
        startDate,
        endDate,
        status,
      },
    });
  }
  async getUpcomingSubscription(
    tenantId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: 'SCHEDULED',
        startDate: { gt: new Date() },
      },
      orderBy: { startDate: 'asc' },
      include: { plan: true },
    });
  }
  async getCurrentActiveSubscription(
    tenantId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const now = new Date();

    // 1️⃣ Promote scheduled → active if time reached
    const scheduled = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: 'SCHEDULED',
        startDate: { lte: now },
      },
      orderBy: { startDate: 'asc' },
    });

    if (scheduled) {
      await this.prisma.tenantSubscription.update({
        where: { id: scheduled.id },
        data: { status: 'ACTIVE' },
      });
    }

    // 2️⃣ Prefer ACTIVE over TRIAL
    const active = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: 'ACTIVE',
        startDate: { lte: now },
        endDate: { gt: now },
      },
      include: { plan: true },
      orderBy: { startDate: 'desc' },
    });

    if (active) return active;

    // 3️⃣ Fallback to TRIAL
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: 'TRIAL',
        startDate: { lte: now },
        endDate: { gt: now },
      },
      include: { plan: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async assignTrialSubscription(
    tenantId: string,
    planId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    return this.prisma.tenantSubscription.create({
      data: {
        tenantId,
        planId,
        module,
        status: SubscriptionStatus.TRIAL,
        startDate,
        endDate,
      },
    });
  }

  async getSubscriptionByTenant(
    tenantId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
      },
      orderBy: {
        startDate: 'desc',
      },
      include: {
        plan: true,
      },
    });
  }

  async extendTrial(
    tenantId: string,
    extraDays: number,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const sub = await this.getSubscriptionByTenant(tenantId, module);
    if (!sub) return null;
    console.log(
      '[Subscription] Trial extended',
      tenantId,
      'by',
      extraDays,
      'days',
    );

    const newEndDate = new Date(sub.endDate);
    newEndDate.setDate(newEndDate.getDate() + extraDays);

    return this.prisma.tenantSubscription.update({
      where: { id: sub.id },
      data: {
        endDate: newEndDate,
        status: 'TRIAL',
      },
    });
  }
  async changePlan(
    tenantId: string,
    planName: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    // 1️⃣ Find plan
    const plan = await this.prisma.plan.findFirst({
      where: {
        name: planName,
        isActive: true,
      },
    });

    if (!plan) {
      throw new BadRequestException('Invalid or inactive plan');
    }

    // 2️⃣ Calculate new dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(startDate.getDate() + plan.durationDays);

    // 3️⃣ Update subscription
    const currentSub = await this.getCurrentActiveSubscription(
      tenantId,
      module,
    );
    if (!currentSub) {
      throw new NotFoundException('Active subscription not found');
    }
    return this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        startDate,
        endDate,
        expiryReminderSentAt: null,
      },
    });
  }

  async getActiveSubscriptionByTenant(
    tenantId: string,
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    return this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        module,
        status: 'ACTIVE',
      },
      include: {
        plan: true,
      },
    });
  }

  async changeStatus(
    tenantId: string,
    status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED',
    module: ModuleType = 'MOBILE_SHOP',
  ) {
    const currentSub = await this.getCurrentActiveSubscription(
      tenantId,
      module,
    );
    if (!currentSub) {
      throw new NotFoundException('Active subscription not found');
    }

    return this.prisma.tenantSubscription.update({
      where: { id: currentSub.id },
      data: { status },
    });
  }
}
