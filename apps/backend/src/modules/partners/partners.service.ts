import {
  Injectable,
  BadRequestException,
  ConflictException,
  Logger,
  NotFoundException,
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

    this.logger.log(`✅ Partner application received: ${partner.email} (${partner.businessName})`);
    return partner;
  }

  private async generateReferralCode(businessName: string): Promise<string> {
    const prefix = businessName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${random}`;

    const existing = await this.prisma.partner.findUnique({ where: { referralCode: code } });
    if (existing) return this.generateReferralCode(businessName);
    return code;
  }

  // ─────────────────────────────────────────────
  // MODULE 4: Admin Panel — Approval
  // ─────────────────────────────────────────────
  async approvePartner(partnerId: string, adminId: string, commissionPercentage: number) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
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
        commissionPercentage,
        passwordHash,
        approvedAt: new Date(),
        approvedByAdminId: adminId,
      },
    });

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
          tempPassword,
          loginUrl: 'https://app.REMOVED_DOMAIN/partner/login',
        },
      } as any);
      this.logger.log(`📧 Approval email sent to partner ${updated.email}`);
    } catch (emailErr) {
      this.logger.error(`Failed to send approval email to ${updated.email}`, emailErr);
      // Don't throw — approval itself succeeded
    }

    // Return partner WITHOUT tempPassword
    return { partner: updated };
  }

  async suspendPartner(partnerId: string, adminId: string) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
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
        commissionPercentage: true,
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
        durationDays: data.durationDays,
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

<<<<<<< Updated upstream
  async applyPromoToTenant(code: string, tenantId: string) {
    // Validate first (outside transaction for clear error messaging)
    const promo = await this.validatePromoCode(code, tenantId);

    // ✅ Atomic: increment usedCount + link tenant in single transaction
    return this.prisma.$transaction(async (tx) => {
      // Re-validate inside transaction to eliminate race condition window
      const lockedPromo = await tx.promoCode.findUnique({ where: { id: promo.id } });

      if (!lockedPromo || lockedPromo.usedCount >= lockedPromo.maxUses) {
        throw new BadRequestException('Promo code usage limit reached (concurrent request)');
      }

=======
  async applyPromoToTenant(code: string, tenantId: string, userId: string) {
    const promo = await this.validatePromoCode(code, tenantId);

    // Get user details to check for cross-product usage via email or phone
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User not found');

    // 1. Check if this specific userId has used this promo before (cross-product)
    const existingUse = await this.prisma.promoUsage.findFirst({
      where: {
        promoId: promo.id,
        OR: [
          { userId: userId },
          // Check by email if user has one
          user.email ? { user: { email: user.email } } : { id: 'impossible_id' },
          // Check by phone if user has one
          user.phone ? { user: { phone: user.phone } } : { id: 'impossible_id' }
        ]
      },
      include: { user: true }
    });

    if (existingUse) {
      throw new ConflictException('Promo already redeemed by this account');
    }

    return this.prisma.$transaction(async (tx) => {
      // Create PromoUsage record
      await tx.promoUsage.create({
        data: {
          promoId: promo.id,
          userId: userId,
          tenantId: tenantId,
        }
      });

      // Increment used_count atomically
>>>>>>> Stashed changes
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });

      return tx.tenant.update({
        where: { id: tenantId },
        data: {
          promoCodeId: promo.id,
          partnerId: promo.partnerId,
        },
      });
    });
  }

  // ─────────────────────────────────────────────
  // MODULE 7: Partner Dashboard Data
  // ─────────────────────────────────────────────
  async getPartnerStats(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        _count: {
          select: { referredTenants: true },
        },
      },
    });

    if (!partner) throw new NotFoundException('Partner not found');

    const referrals = await this.prisma.partnerReferral.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
    });

    const totalRevenue = referrals.reduce((acc, curr) => acc + curr.subscriptionAmount, 0);
    const pendingCommission = referrals
      .filter((r) => r.status === 'PENDING')
      .reduce((acc, curr) => acc + curr.commissionAmount, 0);

    return {
      referralCode: partner.referralCode,
      businessName: partner.businessName,
      totalReferrals: partner._count.referredTenants,
      totalEarned: partner.totalEarned,
      totalPaid: partner.totalPaid,
      pendingCommission,
      totalRevenue,
      referralList: referrals,
    };
  }
}
