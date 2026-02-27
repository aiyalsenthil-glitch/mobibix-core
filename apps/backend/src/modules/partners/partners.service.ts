import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PartnerStatus, PartnerType, PromoCodeType } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PartnersService {
  constructor(private prisma: PrismaService) {}

  // Module 3: Partner Application Flow
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

    // Generate a unique referral code (Module 2)
    const referralCode = await this.generateReferralCode(data.businessName);

    return this.prisma.partner.create({
      data: {
        ...data,
        status: PartnerStatus.PENDING,
        referralCode,
        passwordHash: '', // Set on approval
      },
    });
  }

  private async generateReferralCode(businessName: string): Promise<string> {
    const prefix = businessName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = `${prefix}-${random}`;
    
    const existing = await this.prisma.partner.findUnique({ where: { referralCode: code } });
    if (existing) return this.generateReferralCode(businessName);
    return code;
  }

  // Module 4: Admin Panel Integration (Approval)
  async approvePartner(partnerId: string, adminId: string, commissionPercentage: number) {
    const partner = await this.prisma.partner.findUnique({ where: { id: partnerId } });
    if (!partner) throw new BadRequestException('Partner not found');

    // Generate temporary password
    const tempPassword = Math.random().toString(36).substring(2, 10);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

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

    return { partner: updated, tempPassword };
  }

  // Module 1: Promo Code Engine
  async createPromoCode(data: {
    code: string;
    type: PromoCodeType;
    durationDays: number;
    maxUses?: number;
    partnerId?: string;
    adminId: string;
  }) {
    return this.prisma.promoCode.create({
      data: {
        code: data.code,
        type: data.type,
        durationDays: data.durationDays,
        maxUses: data.maxUses || 500,
        partnerId: data.partnerId,
        createdByAdminId: data.adminId,
      },
    });
  }

  async validatePromoCode(code: string, tenantId: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { code },
    });

    if (!promo || !promo.isActive) {
      throw new BadRequestException('Invalid or inactive promo code');
    }

    if (promo.expiresAt && promo.expiresAt < new Date()) {
      throw new BadRequestException('Promo code has expired');
    }

    if (promo.usedCount >= promo.maxUses) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    // Check if tenant already used any promo
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { promoCodeId: true },
    });

    if (tenant?.promoCodeId) {
       throw new BadRequestException('Promo code already applied to this shop');
    }

    return promo;
  }

  async applyPromoToTenant(code: string, tenantId: string) {
    const promo = await this.validatePromoCode(code, tenantId);

    return this.prisma.$transaction(async (tx) => {
      // Increment used_count atomically
      await tx.promoCode.update({
        where: { id: promo.id },
        data: { usedCount: { increment: 1 } },
      });

      // Update Tenant with promo and partner link
      return tx.tenant.update({
        where: { id: tenantId },
        data: {
          promoCodeId: promo.id,
          partnerId: promo.partnerId, // Module 6: Referral Tracking
        },
      });
    });
  }

  // Module 7: Partner Dashboard Data
  async getPartnerStats(partnerId: string) {
    const partner = await this.prisma.partner.findUnique({
      where: { id: partnerId },
      include: {
        _count: {
          select: { referredTenants: true }
        }
      }
    });

    const referrals = await this.prisma.partnerReferral.findMany({
      where: { partnerId },
    });

    const totalRevenue = referrals.reduce((acc, curr) => acc + curr.subscriptionAmount, 0);
    const pendingCommission = referrals
      .filter(r => r.status === 'PENDING')
      .reduce((acc, curr) => acc + curr.commissionAmount, 0);

    return {
      referralCode: partner?.referralCode,
      totalReferrals: partner?._count.referredTenants,
      totalEarned: partner?.totalEarned,
      totalPaid: partner?.totalPaid,
      pendingCommission,
      totalRevenue,
      referralList: referrals,
    };
  }
}
