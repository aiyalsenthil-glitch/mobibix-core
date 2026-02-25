import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType } from '@prisma/client';
import { PlansService } from '../billing/plans/plans.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { CreateTenantDto } from './dto/tenant.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';
import { PlanRulesService } from '../billing/plan-rules.service';
import { normalizePhone } from '../../common/utils/phone.util';
// import { EmailService } from '../../common/email/email.service'; <-- Removed direct usage
import { getCreateAudit } from '../audit/audit.helper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantWelcomeEvent } from '../../common/email/email.events';

@Injectable()
export class TenantService {
  private readonly logger = new Logger(TenantService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
    private readonly planRulesService: PlanRulesService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * ============================
   * CREATE TENANT (ONBOARDING)
   * ============================
   */
  async createTenant(userId: string, dto: CreateTenantDto) {
    // 🔒 Safety guard (prevents Prisma crash)
    if (!userId) {
      throw new BadRequestException('Invalid user session');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }
    const effectiveTenantType = dto.tenantType ?? 'GYM';

    const existingUserTenant = await this.prisma.userTenant.findFirst({
      where: {
        userId,
        tenant: {
          tenantType: effectiveTenantType,
        },
      },
      include: {
        tenant: true,
      },
    });

    if (existingUserTenant) {
      throw new BadRequestException(
        `Tenant already exists for type ${effectiveTenantType}`,
      );
    }

    const trialPlan = await this.plansService.getOrCreateTrialPlan(
      effectiveTenantType === 'MOBILE_SHOP'
        ? ModuleType.MOBILE_SHOP
        : ModuleType.GYM,
    );

    // Generate guaranteed unique tenant code: timestamp (base36) + random (4 hex chars)
    // Example: K3F2A1B4 (8 chars total, always unique)
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const random = randomBytes(2).toString('hex').toUpperCase();
    const code = timestamp + random;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        code,
        tenantType: dto.tenantType ?? 'GYM',
        businessType: dto.businessType,
        businessCategoryId: dto.businessCategoryId,

        contactPhone: dto.contactPhone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country,
        currency: dto.currency,
        timezone: dto.timezone,
        ...getCreateAudit(userId), // ✅ Capture who created
      },
    });
    // Send welcome email after gym create (Event Driven)
    if (!user.welcomeEmailSent && user.email) {
      try {
        const module =
          effectiveTenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM'; // Resolve module

        await this.eventEmitter.emitAsync(
          'tenant.welcome',
          new TenantWelcomeEvent(tenant.id, module, new Date(), user, tenant),
        );

        await this.prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSent: true },
        });

        this.logger.log(`[EVENT] Emitted tenant.welcome for ${user.email}`);
      } catch (err) {
        this.logger.error('Failed to emit welcome event', err);
      }
    }

    await this.subscriptionsService.assignTrialSubscription(
      tenant.id,
      trialPlan.id,
      effectiveTenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
    );

    this.logger.log(
      `✅ Trial subscription created for tenant ${tenant.id} (${effectiveTenantType})`,
    );

    const userTenant = await this.prisma.userTenant.create({
      data: {
        userId,
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    this.logger.log(
      `✅ Tenant onboarding completed: ${tenant.name} (${tenant.code}) for user ${userId}`,
    );

    return { tenant, userTenant };
  }

  async searchTenants(query: string) {
    return this.prisma.tenant.findMany({
      where: {
        OR: [{ name: { contains: query, mode: 'insensitive' } }],
      },
      take: 20,
    });
  }

  async updateTenant(
    tenantId: string,
    data: {
      name?: string;
      contactPhone?: string;
      contactEmail?: string;
      website?: string;
      addressLine1?: string;
      addressLine2?: string;
      city?: string;
      state?: string;
      pincode?: string;
    },
  ) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        contactPhone: data.contactPhone
          ? normalizePhone(data.contactPhone)
          : undefined,

        contactEmail: data.contactEmail,
        website: data.website,
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
    });
  }

  async getCurrentTenantPublic(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        code: true,
        tenantType: true,
        name: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantType: tenant.tenantType,
      tenantName: tenant.name,
    };
  }

  async getPublicTenantByCode(code: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { code },
      select: {
        id: true,
        code: true,
        tenantType: true,
        name: true,
        kioskToken: true,
      },
    });

    if (!tenant || tenant.tenantType !== 'GYM' || !tenant.kioskToken) {
      throw new NotFoundException('Gym not available');
    }

    return {
      tenantId: tenant.id,
      tenantCode: tenant.code,
      tenantType: 'GYM',
      tenantName: tenant.name,
      kioskToken: tenant.kioskToken,
    };
  }

  async generateKioskToken(tenantId: string) {
    const token = randomBytes(32).toString('hex');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { kioskToken: token },
      select: {
        id: true,
        kioskToken: true,
      },
    });
  }
  /**
   * ============================
   * GET TENANT BY ID
   * ============================
   */
  async findById(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        id: true,
        name: true,
        legalName: true,
        tenantType: true,
        code: true,
        contactPhone: true,
        contactEmail: true,
        website: true,
        logoUrl: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        pincode: true,
        country: true,
        currency: true,
        timezone: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    return tenant;
  }

  /**
   * ============================
   * TENANT USAGE / PLAN INFO
   * ============================
   */
  async getUsage(tenantId: string | null) {
    // 0️⃣ No tenant yet → onboarding
    if (!tenantId) {
      return {
        hasTenant: false,
        plan: null,
      };
    }

    // 1️⃣ Fetch subscription + plan
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId },
      include: { plan: true },
    });

    // 2️⃣ If tenant exists but no subscription yet
    if (!subscription || !subscription.plan) {
      return {
        hasTenant: true,
        tenantId,
        plan: null,
        status: null,
        membersUsed: 0,
        membersLimit: null,
        daysLeft: null,
      };
    }

    const plan = subscription.plan;

    // 3️⃣ Determine module from tenant type
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });

    const module =
      tenant?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;

    // 4️⃣ Resolve capabilities
    const rules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      module, // 🔥 Pass module
    );

    // 4️⃣ Count members
    const membersUsed = await this.prisma.member.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    // 5️⃣ Calculate daysLeft and usage period
    const now = new Date();
    let daysLeft: number | null = null;
    const cycleStart = new Date();
    cycleStart.setDate(1); // Default to start of month
    cycleStart.setHours(0, 0, 0, 0);

    if (subscription.endDate) {
      const end = new Date(subscription.endDate);
      const diffMs = end.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

      // If we want cycle tracking relative to subscription, we'd need billingCycle logic.
      // For now, "Current Month" is the standard for quota display.
    }

    const isTrial =
      subscription.status === 'TRIAL' &&
      subscription.endDate &&
      subscription.endDate.getTime() > now.getTime();

    const isTrialExpired =
      subscription.status === 'TRIAL' &&
      subscription.endDate &&
      subscription.endDate.getTime() <= now.getTime();

    // 6️⃣ WhatsApp Usage Stats (Current Month)
    const usageStats = await this.prisma.whatsAppDailyUsage.aggregate({
      where: {
        tenantId,
        date: { gte: cycleStart },
      },
      _sum: {
        marketing: true,
        utility: true,
        service: true,
        authentication: true,
      },
    });

    // 7️⃣ Final response
    return {
      hasTenant: true,
      tenantId,
      status: subscription.status,
      isTrial,
      trialExpired: isTrialExpired,

      plan: {
        name: plan.name,
        code: plan.code,
        level: plan.level,
        tagline: plan.tagline,
        description: plan.description,
        featuresJson: plan.featuresJson,
        features: rules?.features || [],
        memberLimit: rules?.maxMembers ?? null,
        staffAllowed: (rules?.maxStaff ?? 0) !== 0,
        maxStaff: rules?.maxStaff ?? null,
        maxShops: rules?.maxShops ?? null,
        whatsappAllowed: (rules?.whatsapp?.messageQuota || 0) > 0,
      },

      membersUsed,
      membersLimit: rules?.maxMembers ?? null,
      daysLeft,
      endDate: subscription.endDate,
      billingCycle: subscription.billingCycle || 'MONTHLY',
      autoRenew: subscription.autoRenew ?? false,
      paymentStatus: subscription.paymentStatus ?? 'PENDING',

      whatsappUsage: {
        marketing: usageStats._sum.marketing ?? 0,
        utility: usageStats._sum.utility ?? 0,
        service: usageStats._sum.service ?? 0,
        startOfPeriod: cycleStart,
      },
    };
  }
  // ============================
  // UPDATE TENANT LOGO
  // ============================
  async updateLogo(tenantId: string, logoUrl: string) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { logoUrl },
    });
  }

  /**
   * ============================
   * ADMIN / INTERNAL
   * ============================
   */
  async listTenantsWithSubscription() {
    const tenants = await this.prisma.tenant.findMany({
      include: {
        subscription: {
          include: {
            plan: true,
          },
        },
        userTenants: {
          where: { role: UserRole.OWNER },
          include: {
            user: { select: { email: true, fullName: true } },
          },
        },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      ownerEmail: t.userTenants[0]?.user.email ?? null,
      ownerName: t.userTenants[0]?.user.fullName ?? null,

      subscription: t.subscription,
    }));
  }

  async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
  issueJwt(
    payload: {
      userId: string;
      tenantId: string | null;
      userTenantId: string | null;
      role: UserRole;
    },
    expiresIn?: string | number,
  ) {
    const jwtPayload = {
      sub: payload.userId,
      tenantId: payload.tenantId,
      userTenantId: payload.userTenantId,
      role: payload.role,
    };

    if (expiresIn) {
      return this.jwtService.sign(jwtPayload, { expiresIn: expiresIn as any });
    }

    return this.jwtService.sign(jwtPayload);
  }
}
