import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { EmailService } from '../../common/email/email.service';
import { PartnerStatus, PartnerType, PromoCodeType } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GeneratePromoDto } from './dto/create-partner.dto';

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  // ─────────────────────────────────────────────
  // MODULE 3: Partner Application Flow
  // ─────────────────────────────────────────────
  async apply(data: {
    businessName: string;
    contactPerson: string;
    email: string;
    phone: string;
    partnerType: PartnerType;
    region?: string;
  }) {
    const existing = await this.prisma.partner.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictException('Application with this email already exists');
    }

    const referralCode = await this.generateReferralCode(data.businessName);

    const partner = await this.prisma.partner.create({
      data: {
        ...data,
        status: PartnerStatus.PENDING,
        referralCode,
        passwordHash: '', // Set on approval
      },
    });

    this.logger.log(
      `✅ Partner application received: ${partner.email} (${partner.businessName})`,
    );
    return partner;
  }

  private async generateReferralCode(businessName: string): Promise<string> {
    const prefix = businessName
      .substring(0, 3)
      .toUpperCase()
      .replace(/[^A-Z]/g, 'X');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${random}`;

    const existing = await this.prisma.partner.findUnique({
      where: { referralCode: code },
    });
    if (existing) return this.generateReferralCode(businessName);
    return code;
  }

  // ─────────────────────────────────────────────
  // MODULE 4: Admin Panel — Approval
  // ─────────────────────────────────────────────
  async approvePartner(
    partnerId: string,
    adminId: string,
    firstCommissionPct: number = 30,
    renewalCommissionPct: number = 10,
  ) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    if (partner.status === PartnerStatus.APPROVED) {
      throw new BadRequestException('Partner is already approved');
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    const updated = await this.prisma.partner.update({
      where: { id: partnerId },
      data: {
        status: PartnerStatus.APPROVED,
        firstCommissionPct,
        renewalCommissionPct,
        passwordHash,
        approvedAt: new Date(),
        approvedByAdminId: adminId,
      },
    });

    // Auto-generate two starter promo codes for the partner:
    // 1. 14-day FREE_TRIAL code (platform default trial)
    // 2. SUBSCRIPTION_BONUS code (+3 months on first paid plan)
    const trialCode = `${updated.referralCode}-TRIAL`;
    const bonusCode = `${updated.referralCode}-BONUS`;
    await Promise.all([
      this.prisma.promoCode.create({
        data: {
          code: trialCode,
          type: PromoCodeType.FREE_TRIAL,
          durationDays: 14,
          bonusMonths: 0,
          maxUses: 500,
          partnerId: updated.id,
          createdByAdminId: adminId,
          description: `14-day free trial for partner ${updated.businessName}`,
        },
      }),
      this.prisma.promoCode.create({
        data: {
          code: bonusCode,
          type: PromoCodeType.SUBSCRIPTION_BONUS,
          durationDays: 0,
          bonusMonths: 3,
          maxUses: 500,
          partnerId: updated.id,
          createdByAdminId: adminId,
          description: `+3 months bonus on first paid subscription — partner ${updated.businessName}`,
        },
      }),
    ]);

    // 🔐 Email temp password — NEVER return it in API response
    try {
      await this.emailService.send({
        targetType: 'SYSTEM',
        tenantId: 'platform',
        recipientType: 'PARTNER',
        emailType: 'PARTNER_APPROVED',
        referenceId: updated.id,
        module: 'MOBILE_SHOP',
        to: updated.email,
        subject: 'Welcome to MobiBix Partner Program — Your Login Details',
        data: {
          name: updated.contactPerson,
          businessName: updated.businessName,
          referralCode: updated.referralCode,
          trialCode,
          bonusCode,
          tempPassword,
          loginUrl: 'https://app.REMOVED_DOMAIN/partner/login',
        },
      } as any);
      this.logger.log(`📧 Approval email sent to partner ${updated.email}`);
    } catch (emailErr) {
      this.logger.error(
        `Failed to send approval email to ${updated.email}`,
        emailErr,
      );
      // Don't throw — approval itself succeeded
    }

    // Return partner WITHOUT tempPassword
    return { partner: updated };
  }

  async suspendPartner(partnerId: string, adminId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });
    if (!partner) throw new NotFoundException('Partner not found');

    return this.prisma.partner.update({
      where: { id: partnerId },
      data: { status: PartnerStatus.SUSPENDED },
    });
  }

  async listPartners(status?: PartnerStatus) {
    return this.prisma.partner.findMany({
      where: status ? { status } : undefined,
      select: {
        id: true,
        businessName: true,
        contactPerson: true,
        email: true,
        phone: true,
        partnerType: true,
        region: true,
        referralCode: true,
        status: true,
        firstCommissionPct: true,
        renewalCommissionPct: true,
        totalEarned: true,
        totalPaid: true,
        approvedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─────────────────────────────────────────────
  // MODULE 1: Promo Code Engine
  // ─────────────────────────────────────────────
  async createPromoCode(data: GeneratePromoDto & { adminId: string }) {
    return this.prisma.promoCode.create({
      data: {
        code: data.code,
        type: data.type as PromoCodeType,
        durationDays: data.durationDays ?? 0,
        bonusMonths: data.bonusMonths ?? 0,
        maxUses: data.maxUses ?? 500,
        partnerId: data.partnerId,
        createdByAdminId: data.adminId,
        // ✅ FIX: Persist expiresAt (previously ignored)
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });
  }

  async listPromoCodes() {
    return this.prisma.promoCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        partner: {
          select: { businessName: true, referralCode: true },
        },
      },
    });
  }

  async validatePromoCode(code: string, tenantId: string) {
    const promo = await this.prisma.promoCode.findUnique({ where: { code } });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Invalid or inactive promo code');
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Promo code has expired');
    }

    if (promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { promoCodeId: true },
    });

    if (tenant?.promoCodeId) {
      throw new BadRequestException('Promo code already applied to this shop');
    }

    return promo;
  }

  async applyPromoToTenant(code: string, tenantId: string, userId?: string) {
    // Validate first (outside transaction for clear error messages)
    const promo = await this.validatePromoCode(code, tenantId);

    // Cross-account abuse check: same user can't use same promo via different accounts
    if (userId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new BadRequestException('User not found');

      const existingUse = await this.prisma.promoUsage.findFirst({
        where: {
          promoId: promo.id,
          OR: [
            { userId },
            ...(user.email ? [{ user: { email: user.email } }] : []),
            ...(user.phone ? [{ user: { phone: user.phone } }] : []),
          ],
        },
      });

      if (existingUse) {
        throw new ForbiddenException(
          'Promo code already redeemed by this account',
        );
      }
    }

    // ✅ Atomic: all writes in one transaction + double-lock against concurrent requests
    return this.prisma.$transaction(async (tx) => {
      // Re-check inside transaction to close the race window between validate and write
      const lockedPromo = await tx.promoCode.findUnique({
        where: { id: promo.id },
      });
      if (!lockedPromo || lockedPromo.usedCount >= lockedPromo.maxUses) {
        throw new BadRequestException(
          'Promo code usage limit reached (concurrent request)',
        );
      }

      if (userId) {
        // Record usage (@@unique[promoId, userId] acts as a DB-level duplicate guard)
        await tx.promoUsage.create({
          data: { promoId: promo.id, userId, tenantId },
        });
      }
      // Increment usedCount atomically
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });

      // Link promo + partner to tenant
      const updated = await tx.tenant.update({
        where: { id: tenantId },
        data: {
          promoCodeId: promo.id,
          partnerId: promo.partnerId,
        },
      });

      // Notify partner that their promo was used
      if (promo.partnerId) {
        setImmediate(() =>
          this.notifyPromoUsed(promo.partnerId!, promo.code, updated.name),
        );
      }

      return updated;
    });
  }

  // ─────────────────────────────────────────────
  // MODULE 7: Partner Dashboard Data
  // ─────────────────────────────────────────────
  async getPartnerStats(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
    });

    if (!partner) throw new NotFoundException('Partner not found');

    const [promoCodes, referredTenantsCount] = await Promise.all([
      this.prisma.promoCode.findMany({
        where: { partnerId, isActive: true },
        select: {
          id: true,
          code: true,
          type: true,
          durationDays: true,
          bonusMonths: true,
          maxUses: true,
          usedCount: true,
          expiresAt: true,
        },
      }),
      this.prisma.tenant.count({ where: { partnerId } }),
    ]);

    const [referrals, referredTenants] = await Promise.all([
      this.prisma.partnerReferral.findMany({
        where: { partnerId },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.findMany({
        where: { partnerId },
        select: {
          id: true,
          name: true,
          contactPhone: true,
          city: true,
          createdAt: true,
          subscription: {
            where: { status: 'ACTIVE' },
            take: 1,
            select: { status: true },
          },
        },
      }),
    ]);

    const totalRevenue = referrals.reduce(
      (acc, curr) => acc + curr.subscriptionAmount,
      0,
    );
    const pendingCommission = referrals
      .filter((r) => r.status === 'PENDING')
      .reduce((acc, curr) => acc + curr.commissionAmount, 0);

    // CRM: aggregate per tenant from referral records
    const latestPlanByTenant: Record<string, string> = {};
    const commissionByTenant: Record<string, number> = {};
    for (const r of referrals) {
      latestPlanByTenant[r.tenantId] ??= r.subscriptionPlan;
      commissionByTenant[r.tenantId] = (commissionByTenant[r.tenantId] ?? 0) + r.commissionAmount;
    }

    const referredShops = referredTenants.map((t) => ({
      id: t.id,
      name: t.name,
      phone: t.contactPhone,
      city: t.city,
      plan: latestPlanByTenant[t.id] ?? null,
      isActive: t.subscription.length > 0,
      totalCommission: commissionByTenant[t.id] ?? 0,
      joinedAt: t.createdAt,
    }));

    return {
      referralCode: partner.referralCode,
      businessName: partner.businessName,
      firstCommissionPct: partner.firstCommissionPct,
      renewalCommissionPct: partner.renewalCommissionPct,
      totalReferrals: referredTenantsCount,
      totalEarned: partner.totalEarned,
      totalPaid: partner.totalPaid,
      pendingCommission,
      totalRevenue,
      referralList: referrals,
      promoCodes,
      referredShops,
    };
  }

  // ─────────────────────────────────────────────
  // MODULE 8: Admin Payout — mark all CONFIRMED referrals as PAID
  // ─────────────────────────────────────────────
  async markPartnerPayout(partnerId: string) {
    const confirmed = await this.prisma.partnerReferral.findMany({
      where: { partnerId, status: 'CONFIRMED' },
      select: { id: true, commissionAmount: true },
    });

    if (confirmed.length === 0) {
      return { paid: 0, totalPaid: 0 };
    }

    const totalPayout = confirmed.reduce((s, r) => s + r.commissionAmount, 0);
    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.partnerReferral.updateMany({
        where: { id: { in: confirmed.map((r) => r.id) } },
        data: { status: 'PAID', paidAt: now },
      }),
      this.prisma.partner.update({
        where: { id: partnerId },
        data: { totalPaid: { increment: totalPayout } },
      }),
    ]);

    this.logger.log(
      `💸 Payout marked: Partner ${partnerId} — ₹${totalPayout / 100} across ${confirmed.length} referrals`,
    );

    setImmediate(() =>
      this.notifyPayoutDone(partnerId, totalPayout, confirmed.length),
    );

    return { paid: confirmed.length, totalPaid: totalPayout };
  }

  // ─────────────────────────────────────────────
  // MODULE 10: Partner Notifications
  // ─────────────────────────────────────────────
  private async notify(
    partnerId: string,
    type: string,
    title: string,
    body: string,
  ) {
    try {
      await (this.prisma as any).partnerNotification.create({
        data: { partnerId, type, title, body },
      });
    } catch (e) {
      this.logger.warn(`Failed to create partner notification: ${e.message}`);
    }
  }

  async getNotifications(partnerId: string) {
    const items = await (this.prisma as any).partnerNotification.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const unreadCount = items.filter((n: any) => !n.isRead).length;
    return { items, unreadCount };
  }

  async markNotificationsRead(partnerId: string) {
    await (this.prisma as any).partnerNotification.updateMany({
      where: { partnerId, isRead: false },
      data: { isRead: true },
    });
    return { ok: true };
  }

  async notifyPromoUsed(partnerId: string, code: string, shopName: string) {
    await this.notify(
      partnerId,
      'PROMO_USED',
      '🎉 Promo Code Used!',
      `${shopName} just applied your code ${code} and signed up.`,
    );
  }

  async notifyCommissionEarned(
    partnerId: string,
    amount: number,
    shopName: string,
    isFirst: boolean,
  ) {
    await this.notify(
      partnerId,
      'COMMISSION_EARNED',
      '💰 Commission Earned',
      `You earned ₹${(amount / 100).toFixed(2)} from ${shopName}'s ${isFirst ? 'first payment' : 'renewal'}.`,
    );
  }

  async notifyPayoutDone(partnerId: string, totalPaid: number, count: number) {
    await this.notify(
      partnerId,
      'COMMISSION_PAID',
      '🏦 Payout Processed',
      `₹${(totalPaid / 100).toFixed(2)} across ${count} referrals has been deposited to your account.`,
    );
  }

  async notifyExpiringShops(partnerId: string) {
    const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const expiring = await (this.prisma as any).tenantSubscription.findMany({
      where: {
        tenant: { partnerId },
        status: 'ACTIVE',
        endDate: { lte: in7Days },
      },
      include: { tenant: { select: { name: true } } },
    });
    for (const sub of expiring) {
      await this.notify(
        partnerId,
        'SUBSCRIPTION_EXPIRING',
        '⚠️ Shop Subscription Expiring',
        `${sub.tenant.name}'s subscription expires on ${new Date(sub.endDate).toLocaleDateString('en-IN')}. Follow up to help them renew!`,
      );
    }
    return expiring.length;
  }

  // ─────────────────────────────────────────────
  // MODULE 9: Partner self-service promo creation (max 5 custom codes)
  // ─────────────────────────────────────────────
  async createPartnerPromoCode(
    partnerId: string,
    data: { code: string; type: string; durationDays?: number; bonusMonths?: number; maxUses?: number; expiresAt?: string },
  ) {
    const existing = await this.prisma.promoCode.count({
      where: { partnerId, createdByAdminId: null }, // only partner-created
    });
    if (existing >= 5) {
      throw new BadRequestException(
        'Maximum 5 custom promo codes allowed per partner. Contact support to create more.',
      );
    }
    if (data.type === 'SUBSCRIPTION_BONUS' && (data.bonusMonths ?? 0) > 3) {
      throw new BadRequestException('Maximum 3 bonus months allowed per promo code.');
    }

    try {
      return await this.prisma.promoCode.create({
        data: {
          code: data.code.toUpperCase(),
          type: data.type as PromoCodeType,
          durationDays: data.durationDays ?? 0,
          bonusMonths: Math.min(data.bonusMonths ?? 0, 3),
          maxUses: data.maxUses ?? 100,
          partnerId,
          expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
          description: `Custom campaign code by partner`,
        },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          `Promo code "${data.code.toUpperCase()}" is already taken. Please choose a different code.`,
        );
      }
      throw e;
    }
  }
}
