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
import { PlanRulesService } from '../billing/plan-rules.service';
import { PartnersService } from '../../modules/partners/partners.service';
import { normalizePhone } from '../../common/utils/phone.util';
import { getCreateAudit } from '../audit/audit.helper';
import { setCtx } from '../cls/async-context';
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
      this.logger.warn(
        `User ${userId} already has a tenant of type ${effectiveTenantType}. Returning existing.`,
      );
      return {
        tenant: existingUserTenant.tenant,
        userTenant: existingUserTenant,
      };
    }

    const trialPlanModule =
      effectiveTenantType === 'MOBILE_SHOP'
        ? ModuleType.MOBILE_SHOP
        : effectiveTenantType === 'DIGITAL_LEDGER'
          ? ModuleType.DIGITAL_LEDGER
          : ModuleType.GYM;

    const trialPlan = await this.plansService.getOrCreateTrialPlan(trialPlanModule);

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
        country: dto.country ?? 'India',
        currency: dto.currency || 'INR',
        timezone: dto.timezone || 'Asia/Kolkata',
        businessType: dto.businessType,
        businessCategoryId: dto.businessCategoryId,
        enabledModules: [trialPlanModule],

        contactPhone: dto.contactPhone
          ? normalizePhone(dto.contactPhone)
          : undefined,
        addressLine1: dto.addressLine1,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
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
    // Module 1: Apply Promo Code / Distributor Referral Logic
    let promoDescription: string | undefined;
    if (dto.promoCode) {
      const codeUpper = dto.promoCode.toUpperCase();
      if (codeUpper.startsWith('DIST-')) {
        // Distributor Referral Linkage
        try {
          const dist = await this.prisma.distDistributor.findUnique({
            where: { referralCode: codeUpper },
          });
          if (dist) {
            await this.prisma.distDistributorRetailer.create({
              data: {
                distributorId: dist.id,
                retailerId: tenant.id,
                status: 'ACTIVE',
                linkedVia: 'REFERRAL_CODE',
              },
            });
            this.logger.log(
              `🔗 Tenant ${tenant.id} automatically linked to Distributor ${dist.id} vis code ${codeUpper}`,
            );
          }
        } catch (e: any) {
          this.logger.error(`Failed to link distributor code: ${e.message}`);
        }
      } else {
        // Standard Partner Promo Code Logic
        try {
          await this.partnersService.applyPromoToTenant(
            dto.promoCode,
            tenant.id,
            userId,
          );

        const promo = await this.prisma.promoCode.findUnique({
          where: { code: dto.promoCode },
        });

        if (promo) {
          promoDescription = promo.description || undefined;
        }

        if (promo?.type === 'SUBSCRIPTION_BONUS') {
          // No free access granted immediately — bonus months applied on first paid subscription.
          // Send in-app notification confirming code registration.
          try {
            const bonusMonths = promo.bonusMonths ?? 3;
            await this.prisma.notificationLog.create({
              data: {
                tenantId: tenant.id,
                userId,
                eventId: 'promo.bonus_registered',
                channel: 'IN_APP',
                recipient: user.email || userId,
                title: `🎁 Bonus unlocked — +${bonusMonths} months free on your first paid plan`,
                status: 'SENT',
                sentAt: new Date(),
                payload: {
                  type: 'subscription_bonus',
                  promoCode: dto.promoCode,
                  bonusMonths,
                  body: `Your referral code "${dto.promoCode}" is registered. When you subscribe to any paid plan, we will automatically add ${bonusMonths} extra months to your subscription at no charge — one time only.`,
                },
              },
            });
          } catch (notifErr: any) {
            this.logger.error(`Failed to create bonus notification: ${notifErr.message}`);
          }
        } else if (promo?.type === 'FREE_TRIAL') {
          // Derive correct plan code per module — seeded codes are MOBIBIX_PRO / GYM_PRO
          const planCode =
            effectiveTenantType === 'MOBILE_SHOP' ? 'MOBIBIX_PRO' : 'GYM_PRO';
          const proPlan = await this.prisma.plan.findFirst({
            where: {
              code: planCode,
              module:
                effectiveTenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
            },
          });

          if (proPlan) {
            const newEndDate = new Date();
            newEndDate.setDate(newEndDate.getDate() + promo.durationDays);

            const resolvedModule =
              effectiveTenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM';

            const activeSub = await this.prisma.tenantSubscription.findFirst({
              where: {
                tenantId: tenant.id,
                module: resolvedModule,
                status: { in: ['ACTIVE', 'TRIAL'] },
              },
            });

            if (activeSub) {
              await this.prisma.tenantSubscription.update({
                where: { id: activeSub.id },
                data: {
                  planId: proPlan.id,
                  endDate: newEndDate,
                  status: 'ACTIVE',
                },
              });
            } else {
              await this.prisma.tenantSubscription.create({
                data: {
                  tenantId: tenant.id,
                  planId: proPlan.id,
                  module: resolvedModule,
                  status: 'ACTIVE',
                  startDate: new Date(),
                  endDate: newEndDate,
                  autoRenew: true,
                  billingCycle: 'MONTHLY',
                  priceSnapshot: 0,
                },
              });
            }
            this.logger.log(
              `🎁 Applied FREE_TRIAL promo ${dto.promoCode}: Plan=PRO, Days=${promo.durationDays}`,
            );


            // --- IN-APP Welcome Notification (Bell) ---
            try {
              const planLabel =
                effectiveTenantType === 'MOBILE_SHOP'
                  ? 'Mobibix Pro'
                  : 'GymPilot Pro';
              const notifTitle = `🎉 Welcome! ${promo.durationDays} days of ${planLabel} activated`;
              const notifBody = promo.description
                ? `${promo.description} — Enjoy your extended trial access! Your plan is active until ${newEndDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}.`
                : `Your promo code gave you ${promo.durationDays} free days on ${planLabel}. Enjoy the full experience!`;

              await this.prisma.notificationLog.create({
                data: {
                  tenantId: tenant.id,
                  userId,
                  eventId: 'promo.activated',
                  channel: 'IN_APP',
                  recipient: user.email || userId,
                  title: notifTitle,
                  status: 'SENT',
                  sentAt: new Date(),
                  payload: {
                    type: 'promo_welcome',
                    promoCode: dto.promoCode,
                    planName: planLabel,
                    durationDays: promo.durationDays,
                    expiresAt: newEndDate.toISOString(),
                    description: promo.description,
                    body: notifBody,
                  },
                },
              });
              this.logger.log(
                `🔔 IN_APP promo notification created for tenant ${tenant.id}`,
              );
            } catch (notifErr: any) {
              this.logger.error(
                `Failed to create promo notification: ${notifErr.message}`,
              );
              // Non-fatal
            }
          }
        }
        } catch (err: any) {
          this.logger.error(
            `Failed to apply promo ${dto.promoCode}: ${err.message}`,
          );
          // Don't fail the whole onboarding if promo fails
        }
      }
    }

    // Send welcome email (Event Driven) - MOVED DOWN to include promo info
    if (!user.welcomeEmailSent && user.email) {
      try {
        const module = trialPlanModule;

        await this.eventEmitter.emitAsync('tenant.welcome', {
          tenantId: tenant.id,
          module,
          timestamp: new Date(),
          user,
          tenant,
          userId, // Required by NotificationEventBus
          data: promoDescription
            ? {
                message: promoDescription,
                promoCode: dto.promoCode,
              }
            : undefined,
        });

        await this.prisma.user.update({
          where: { id: user.id },
          data: { welcomeEmailSent: true },
        });

        this.logger.log(`[EVENT] Emitted tenant.welcome for ${user.email}`);
      } catch (err) {
        this.logger.error('Failed to emit welcome event', err);
      }
    }

    // 🚀 Only assign standard trial if no promo was applied (promo logic already creates sub)
    const existingSub = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId: tenant.id,
        module: trialPlanModule,
      },
    });
    
    if (!existingSub) {
      await this.subscriptionsService.assignTrialSubscription(
        tenant.id,
        trialPlan.id,
        trialPlanModule,
      );
    }

    // 🔥 SYNC: Update the root User record with the default tenant and role
    // This allows refresh tokens/search to work before the next login
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tenantId: tenant.id,
        role: UserRole.OWNER,
      },
    });

    this.logger.log(
      `✅ Trial subscription created for tenant ${tenant.id} (${effectiveTenantType})`,
    );

    // Switch CLS tenantId to the newly created tenant so the middleware
    // injects the correct tenantId. The user may already have a different
    // tenant in context (e.g. DIGITAL_LEDGER), which would cause P2002.
    setCtx('tenantId', tenant.id);
    const userTenant = await this.prisma.userTenant.upsert({
      where: { userId_tenantId: { userId, tenantId: tenant.id } },
      update: { role: UserRole.OWNER },
      create: { userId, tenantId: tenant.id, role: UserRole.OWNER },
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
            name: dto.name,
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
        // taxSystem will be available after: npx prisma generate
        logoUrl: data.logoUrl,
        marketingConsent: data.marketingConsent,
        gymUpiId: data.gymUpiId,
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

    // 2️⃣ Flag the tenant and schedule deletion
    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 30); // 30-day cooling period

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        status: 'PENDING_DELETION',
        deletionRequestPending: true,
        deletionScheduledAt: scheduledDate,
      },
    });

    // 🛑 Cancel External Mandates immediately to stop automated phantom bills!
    const activeSubs = await this.prisma.tenantSubscription.findMany({
      where: {
        tenantId,
        status: 'ACTIVE',
        providerSubscriptionId: { not: null },
      },
      select: { id: true, providerSubscriptionId: true },
    });

    for (const sub of activeSubs) {
      if (sub.providerSubscriptionId) {
        try {
          await this.subscriptionsService.toggleAutoRenew(sub.id, false);
          this.logger.log(
            `Externally cancelled Mandate for deleting tenant Sub ${sub.id}`,
          );
        } catch (err: any) {
          this.logger.error(
            `Failed canceling mandate for Sub ${sub.id} prior to tenant delete!`,
            err,
          );
        }
      }
    }

    // 3️⃣ Immediately revoke user sessions to disable login
    await this.prisma.refreshToken.deleteMany({
      where: {
        user: { userTenants: { some: { tenantId } } },
      },
    });

    // 4️⃣ Emit the Stage 1 Event
    this.eventEmitter.emit('tenant.deletion.requested', {
      tenantId,
      ownerId: userId,
      scheduledDate,
      module: tenant.tenantType === 'MOBILE_SHOP' ? 'MOBILE_SHOP' : 'GYM',
      reason: dto.reason,
    });

    return {
      message:
        'Deletion requested successfully. Data will be purged in 30 days.',
      scheduledFor: scheduledDate,
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

    // 1️⃣ Fetch subscription + plan (scoped to correct module, newest first)
    const tenantRow = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { tenantType: true },
    });
    const tenantModule =
      tenantRow?.tenantType === 'GYM' ? ModuleType.GYM : ModuleType.MOBILE_SHOP;

    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: { tenantId, module: tenantModule },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
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

    // 3️⃣ Module already resolved from tenantRow above — reuse it
    // 4️⃣ Resolve capabilities
    const rules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      tenantModule,
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
      code: t.code,
      tenantType: t.tenantType,
      status: t.status,
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

  // ─────────────────────────────────────────────
  // PRIVACY & COMPLIANCE
  // ─────────────────────────────────────────────
  async processDeletionRequest(
    requestId: string,
    approve: boolean,
    adminUserId: string,
  ) {
    const request = await this.prisma.deletionRequest.findUnique({
      where: { id: requestId },
      include: {
        tenant: {
          include: {
            shops: true,
            userTenants: { include: { user: true } },
          },
        },
      },
    });

    if (!request || request.status !== 'PENDING') {
      throw new BadRequestException('Request not found or not pending');
    }

    if (!approve) {
      await this.prisma.$transaction([
        this.prisma.deletionRequest.update({
          where: { id: requestId },
          data: {
            status: 'REJECTED',
            resolvedAt: new Date(),
            adminNotes: 'Rejected by admin',
          },
        }),
        this.prisma.tenant.update({
          where: { id: request.tenantId },
          data: { deletionRequestPending: false },
        }),
      ]);
      return { message: 'Deletion request rejected.' };
    }

    // Checking GST Compliance Data
    const hasGst = request.tenant.shops.some(
      (s) => s.gstEnabled || s.gstNumber,
    );

    // Save compliance snapshots
    const owner =
      request.tenant.userTenants.find((ut) => ut.role === 'OWNER')?.user ||
      request.tenant.userTenants[0]?.user;

    await this.prisma.deletionRequest.update({
      where: { id: requestId },
      data: {
        originalEmail: owner?.email,
        originalLegalName: request.tenant.legalName || request.tenant.name,
        originalPhone: owner?.phone,
        originalGstNumber: request.tenant.shops.find((s) => s.gstNumber)
          ?.gstNumber,
        isHardDeleted: !hasGst,
        status: 'COMPLETED',
        resolvedAt: new Date(),
        adminNotes: `Approved by ${adminUserId}`,
      },
    });

    if (hasGst) {
      await this.anonymizeTenant(request.tenantId, owner?.id);
    } else {
      await this.hardDeleteTenant(request.tenantId, owner?.id);
    }

    return {
      message: 'Tenant deletion processed successfully.',
      isHardDeleted: !hasGst,
    };
  }

  async executeScheduledDeletion(tenantId: string, ownerUserId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        shops: true,
      },
    });

    if (!tenant) return;

    const hasGst = tenant.shops.some((s) => s.gstEnabled || s.gstNumber);

    this.logger.warn(
      `Executing automated deletion for Tenant ${tenantId} (hasGst: ${hasGst})`,
    );

    await this.prisma.deletionRequest.updateMany({
      where: { tenantId, status: 'PENDING' },
      data: {
        status: 'COMPLETED',
        resolvedAt: new Date(),
        adminNotes: 'Automated 30-day scheduled deletion executed.',
        isHardDeleted: !hasGst,
      },
    });

    if (hasGst) {
      await this.anonymizeTenant(tenantId, ownerUserId);
    } else {
      await this.hardDeleteTenant(tenantId, ownerUserId);
    }
  }

  private async hardDeleteTenant(tenantId: string, ownerUserId?: string) {
    const whereClause = { where: { tenantId } };
    const p = this.prisma;

    await p.whatsAppLog.deleteMany(whereClause).catch(() => {});
    await p.whatsAppCampaign.deleteMany(whereClause).catch(() => {});
    await p.whatsAppDailyUsage.deleteMany(whereClause).catch(() => {});
    await p.whatsAppNumber.deleteMany(whereClause).catch(() => {});
    await p.whatsAppSetting.deleteMany(whereClause).catch(() => {});
    await p.financialEntry.deleteMany(whereClause).catch(() => {});
    await p.receipt.deleteMany(whereClause).catch(() => {});
    await p.paymentVoucher.deleteMany(whereClause).catch(() => {});
    await p.invoiceItem
      .deleteMany({ where: { invoice: { tenantId } } })
      .catch(() => {});
    await p.purchaseItem
      .deleteMany({ where: { purchase: { tenantId } } })
      .catch(() => {});
    await p.supplierPayment.deleteMany(whereClause).catch(() => {});
    await p.purchase.deleteMany(whereClause).catch(() => {});
    await p.jobCard.deleteMany(whereClause).catch(() => {});
    await p.gRN.deleteMany(whereClause).catch(() => {});
    await p.quotation.deleteMany(whereClause).catch(() => {});
    await p.ledgerPayment.deleteMany(whereClause).catch(() => {});
    await p.ledgerCollection.deleteMany(whereClause).catch(() => {});
    await p.ledgerAccount.deleteMany(whereClause).catch(() => {});
    await p.ledgerCustomer.deleteMany(whereClause).catch(() => {});
    await p.iMEI.deleteMany(whereClause).catch(() => {});
    await p.stockLedger.deleteMany(whereClause).catch(() => {});
    await p.stockCorrection.deleteMany(whereClause).catch(() => {});
    await p.invoice.deleteMany(whereClause).catch(() => {});
    await p.shopProduct.deleteMany(whereClause).catch(() => {});
    await p.customerAlert.deleteMany(whereClause).catch(() => {});
    await p.customerReminder.deleteMany(whereClause).catch(() => {});
    await p.customerFollowUp.deleteMany(whereClause).catch(() => {});
    await p.loyaltyTransaction.deleteMany(whereClause).catch(() => {});
    await p.loyaltyConfig.deleteMany(whereClause).catch(() => {});
    await p.loyaltyAdjustment.deleteMany(whereClause).catch(() => {});
    await p.usageSnapshot.deleteMany(whereClause).catch(() => {});
    await p.payment.deleteMany(whereClause).catch(() => {});
    await p.party.deleteMany(whereClause).catch(() => {});
    await p.auditLog.deleteMany(whereClause).catch(() => {});
    await p.memberPayment.deleteMany(whereClause).catch(() => {});
    await p.gymAttendance.deleteMany(whereClause).catch(() => {});
    await p.gymMembership.deleteMany(whereClause).catch(() => {});
    await p.member.deleteMany(whereClause).catch(() => {});
    await p.shopStaff.deleteMany(whereClause).catch(() => {});
    await p.shop.deleteMany(whereClause).catch(() => {});
    await p.staffInvite.deleteMany(whereClause).catch(() => {});
    await p.userTenant.deleteMany(whereClause).catch(() => {});
    await p.tenantSubscription.deleteMany(whereClause).catch(() => {});

    await p.tenant.delete({ where: { id: tenantId } }).catch(() => {});

    if (ownerUserId) {
      const userTenants = await p.userTenant.count({
        where: { userId: ownerUserId },
      });
      if (userTenants === 0) {
        await p.refreshToken
          .deleteMany({ where: { userId: ownerUserId } })
          .catch(() => {});
        await p.user.delete({ where: { id: ownerUserId } }).catch(() => {});
      }
    }
  }

  private async anonymizeTenant(tenantId: string, ownerUserId?: string) {
    const whereClause = { where: { tenantId } };
    const p = this.prisma;

    // Remove volatile marketing/auth data
    await p.refreshToken
      .deleteMany({ where: { user: { userTenants: { some: { tenantId } } } } })
      .catch(() => {});
    await p.whatsAppLog.deleteMany(whereClause).catch(() => {});
    await p.whatsAppCampaign.deleteMany(whereClause).catch(() => {});
    await p.whatsAppDailyUsage.deleteMany(whereClause).catch(() => {});
    await p.whatsAppNumber.deleteMany(whereClause).catch(() => {});
    await p.whatsAppSetting.deleteMany(whereClause).catch(() => {});
    await p.customerAlert.deleteMany(whereClause).catch(() => {});
    await p.customerReminder.deleteMany(whereClause).catch(() => {});
    await p.customerFollowUp.deleteMany(whereClause).catch(() => {});
    await p.emailLog.deleteMany(whereClause).catch(() => {});

    // Anonymize the tenant
    await p.tenant
      .update({
        where: { id: tenantId },
        data: {
          name: `Deleted Business ${tenantId.substring(0, 6)}`,
          legalName: `Anonymized ${tenantId.substring(0, 6)}`,
          contactPhone: '0000000000',
          contactEmail: 'deleted@anonymized.local',
          addressLine1: null,
          addressLine2: null,
          deletionRequestPending: false,
          website: null,
          gstNumber: null,
          taxId: null,
        },
      })
      .catch(() => {});

    // Anonymize shops
    await p.shop
      .updateMany({
        where: { tenantId },
        data: {
          addressLine1: 'Deleted',
          phone: '0000000000',
          gstNumber: null,
          gstEnabled: false,
        },
      })
      .catch(() => {});

    // Sever relations
    await p.userTenant.deleteMany(whereClause).catch(() => {});
    await p.tenantSubscription.deleteMany(whereClause).catch(() => {});

    // Anonymize user if has no other tenants
    if (ownerUserId) {
      const userTenants = await p.userTenant.count({
        where: { userId: ownerUserId },
      });
      if (userTenants === 0) {
        await p.user
          .update({
            where: { id: ownerUserId },
            data: {
              email: `deleted_user_${ownerUserId.substring(0, 8)}@anonymized.local`,
              fullName: 'Deleted User',
              phone: '0000000000',
              REMOVED_AUTH_PROVIDERUid: `deleted_${ownerUserId.substring(0, 8)}`,
              avatar: null,
            },
          })
          .catch(() => {});
      }
    }
  }

  issueJwt(
    payload: {
      userId: string;
      tenantId: string | null;
      userTenantId: string | null;
      role: UserRole;
      tokenVersion?: number;
    },
    expiresIn?: string | number,
  ) {
    const jwtPayload = {
      sub: payload.userId,
      tenantId: payload.tenantId,
      userTenantId: payload.userTenantId,
      role: payload.role,
      tokenVersion: payload.tokenVersion ?? 0,
    };

    if (expiresIn) {
      return this.jwtService.sign(jwtPayload, { expiresIn: expiresIn as any });
    }

    return this.jwtService.sign(jwtPayload);
  }
}
