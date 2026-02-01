import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../billing/plans/plans.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { CreateTenantDto } from './dto/tenant.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';
import { normalizePhone } from '../../common/utils/phone.util';
import { EmailService } from '../../common/email/email.service';
import { welcomeEmailTemplate } from '../../common/email/templates/welcome.template';

@Injectable()
export class TenantService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly jwtService: JwtService,
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

    await this.plansService.ensureDefaultPlans();
    const trialPlan = await this.plansService.getOrCreateTrialPlan();

    const code = dto.code ?? randomBytes(4).toString('hex').toUpperCase();

    const tenant = await this.prisma.tenant.create({
      data: {
        name: dto.name,
        legalName: dto.legalName,
        code,
        tenantType: dto.tenantType ?? 'GYM',

        contactPhone: dto.contactPhone,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        country: dto.country,
        currency: dto.currency,
        timezone: dto.timezone,
      },
    });
    // Send welcome email after gym creation
    if (!user.welcomeEmailSent && user.email) {
      try {
        const emailService = new EmailService();

        await emailService.sendEmail({
          to: user.email,
          subject: 'Welcome to GymPilot 🎉',
          html: welcomeEmailTemplate(tenant.name),
        });

        await this.prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSent: true },
        });
      } catch (err) {
        console.error('Welcome email failed', err);
      }
    }

    await this.subscriptionsService.assignTrialSubscription(
      tenant.id,
      trialPlan.id,
      'MOBILE_SHOP',
    );
    const userTenant = await this.prisma.userTenant.create({
      data: {
        userId,
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

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

    const planKey = plan.name.toUpperCase();
    const capability = PLAN_CAPABILITIES[planKey] ?? PLAN_CAPABILITIES.TRIAL;

    // 4️⃣ Count members
    const membersUsed = await this.prisma.member.count({
      where: {
        tenantId,
      },
    });

    // 5️⃣ Calculate days left
    let daysLeft: number | null = null;

    if (subscription.endDate) {
      const now = new Date();
      const end = new Date(subscription.endDate);

      const diffMs = end.getTime() - now.getTime();
      daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    }
    const now = new Date();
    const end = subscription.endDate ? new Date(subscription.endDate) : null;

    const isTrial =
      subscription.status === 'TRIAL' &&
      end !== null &&
      end.getTime() > now.getTime();

    const isTrialExpired =
      subscription.status === 'TRIAL' &&
      end !== null &&
      end.getTime() <= now.getTime();
    // 6️⃣ Final response (stable contract)
    return {
      hasTenant: true,
      tenantId,

      status: subscription.status,

      isTrial, // ✅ ADD
      trialExpired: isTrialExpired, // ✅ ADD

      plan: {
        name: plan.name,
        level: plan.level,
        memberLimit: capability.memberLimit,
        staffAllowed: capability.staffAllowed,
        whatsappAllowed: capability.whatsapp,
      },

      membersUsed,
      membersLimit: capability.memberLimit,
      daysLeft,
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
        subscription: true,
        userTenants: {
          where: { role: UserRole.OWNER },
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    return tenants.map((t) => ({
      id: t.id,
      name: t.name,
      ownerEmail: t.userTenants[0]?.user.email ?? null,

      subscription: t.subscription,
    }));
  }

  async getUserProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }
  issueJwt(payload: {
    userId: string;
    tenantId: string | null;
    userTenantId: string | null;
    role: UserRole;
  }) {
    return this.jwtService.sign({
      sub: payload.userId,
      tenantId: payload.tenantId,
      userTenantId: payload.userTenantId,
      role: payload.role,
    });
  }
}
