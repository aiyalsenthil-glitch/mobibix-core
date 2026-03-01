import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ModuleType } from '@prisma/client';
import { PlansService } from '../billing/plans/plans.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { CreateTenantDto, UpdateTenantSettingsDto } from './dto/tenant.dto';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PLAN_CAPABILITIES } from '../billing/plan-capabilities';
import { PlanRulesService } from '../billing/plan-rules.service';
import { PartnersService } from '../../modules/partners/partners.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { getCreateAudit } from '../audit/audit.helper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantWelcomeEvent } from '../../common/email/email.events';
import { DocumentNumberService } from '../../common/services/document-number.service';
import { EmailService } from '../../common/email/email.service';
import { RequestDeletionDto } from './dto/deletion-request.dto';

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
    private readonly partnersService: PartnersService,
    private readonly docNumberService: DocumentNumberService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * ============================
   * CREATE TENANT (ONBOARDING)
   * ============================
   */
  async createTenant(
    userId: string,
    dto: CreateTenantDto,
    audit?: { ip?: string; userAgent?: string },
  ) {
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

        // 🔐 Legal & Compliance Recording
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        marketingConsent: dto.marketingConsent ?? false,
        acceptedPolicyVersion: dto.acceptedPolicyVersion || '2026-03-01',
        consentIpAddress: audit?.ip,
        consentUserAgent: audit?.userAgent,
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

    // --- AUTO-CREATE FIRST SHOP ---
    if (effectiveTenantType === 'MOBILE_SHOP') {
      try {
        const invoicePrefix = dto.name.substring(0, 3).toUpperCase();
        const firstShop = await this.prisma.shop.create({
          data: {
            tenantId: tenant.id,
            name: `${dto.name} - Main Branch`,
            phone: dto.contactPhone || '',
            addressLine1: dto.addressLine1 ?? '',
            city: dto.city ?? '',
            state: dto.state ?? '',
            pincode: dto.pincode ?? '',
            invoicePrefix: invoicePrefix,
            gstNumber: dto.gstNumber,
            gstEnabled: !!dto.gstNumber,
            isActive: true, // Auto activate
          },
        });

        await this.docNumberService.initializeShopDocumentSettings(
          firstShop.id,
          invoicePrefix,
        );
        this.logger.log(
          `✅ Auto-created first shop for tenant ${tenant.id} (${firstShop.id})`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to auto-create first shop for ${tenant.id}: ${err.message}`,
        );
      }
    }

    // Module 1: Apply Promo Code Logic
    if (dto.promoCode) {
      try {
        await this.partnersService.applyPromoToTenant(
          dto.promoCode,
          tenant.id,
          userId,
        );

        const promo = await this.prisma.promoCode.findUnique({
          where: { code: dto.promoCode },
        });

        if (promo?.type === 'FREE_TRIAL') {
          // Set plan = PRO and extend duration
          const proPlan = await this.prisma.plan.findFirst({
            where: {
              code: 'PRO',
              module:
                effectiveTenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
            },
          });

          if (proPlan) {
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + promo.durationDays);

            await this.prisma.tenantSubscription.update({
              where: {
                tenantId_module: {
                  tenantId: tenant.id,
                  module:
                    effectiveTenantType === 'MOBILE_SHOP'
                      ? 'MOBILE_SHOP'
                      : 'GYM',
                },
              },
              data: {
                planId: proPlan.id,
                endDate: newEndDate,
                status: 'ACTIVE', // Activate immediately for 3 months free
              },
            });
            this.logger.log(
              `🎁 Applied FREE_TRIAL promo ${dto.promoCode}: Plan=PRO, Days=${promo.durationDays}`,
            );
          }
        }
      } catch (err) {
        this.logger.error(
          `Failed to apply promo code ${dto.promoCode}: ${err.message}`,
        );
        // Don't fail the whole onboarding if promo fails
      }
    }

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

  async updateTenant(tenantId: string, data: UpdateTenantSettingsDto) {
    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        name: data.name,
        legalName: data.legalName,
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
        country: data.country,
        gstNumber: data.gstNumber,
        taxId: data.taxId,
        businessType: data.businessType,
        currency: data.currency,
        timezone: data.timezone,
        logoUrl: data.logoUrl,
        marketingConsent: data.marketingConsent,
      },
    });
  }

  async requestDeletion(
    tenantId: string,
    userId: string,
    dto: RequestDeletionDto,
  ) {
    if (!dto.acknowledged) {
      throw new BadRequestException('Acknowledgment is required');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        users: {
          where: { id: userId },
        },
      },
    });

    if (!tenant) throw new NotFoundException('Tenant not found');

    const user = tenant.users[0];
    if (!user || user.role !== 'OWNER') {
      throw new ForbiddenException('Only the owner can request deletion');
    }

    if (tenant.deletionRequestPending) {
      throw new BadRequestException('A deletion request is already pending');
    }

    // 1️⃣ Create deletion request record
    const request = await this.prisma.deletionRequest.create({
      data: {
        tenantId,
        requestedBy: userId,
        reason: dto.reason,
      },
    });

    // 2️⃣ Flag the tenant
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { deletionRequestPending: true },
    });

    // 3️⃣ Send admin email
    try {
      await this.emailService.send({
        tenantId,
        recipientType: 'ADMIN',
        emailType: 'DELETION_REQUEST',
        referenceId: request.id,
        module: tenant.tenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
        to: 'privacy@aiyalgroups.com',
        subject: `[Deletion Request] Tenant: ${tenant.name}`,
        data: {
          tenantName: tenant.name,
          tenantId: tenant.id,
          ownerName: user.fullName || 'Unknown',
          ownerEmail: user.email || 'No email',
          ownerPhone: user.phone || 'No phone',
          requestedAt: new Date().toISOString(),
          reason: dto.reason || 'None',
        },
      });
    } catch (err) {
      this.logger.error(`Failed to send deletion request email: ${err.message}`);
      // Don't fail the request if email fails, but log it
    }

    return {
      message: 'Deletion request submitted successfully',
      requestId: request.id,
    };
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
