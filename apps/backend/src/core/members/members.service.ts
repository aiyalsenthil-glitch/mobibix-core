import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { AuditService } from '../audit/audit.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { isMembershipExpired } from '../../common/utils/membership.util';
import { MemberPaymentStatus } from '@prisma/client';
import { startOfDay, endOfDay, addDays } from 'date-fns';
import { RenewMemberDto } from './dto/renew-member.dto';
import { formatDateDDMMYYYY } from '../../common/utils/date.util';
import { normalizePhone } from '../../common/utils/phone.util';
import { WhatsAppSender } from '../../modules/whatsapp/whatsapp.sender';
import { WhatsAppTemplates } from '../../modules/whatsapp/whatsapp.templates';
import { WhatsAppFeature } from '../billing/whatsapp-rules';

// ─────────────────────────────
// ✅ Membership duration resolver
// ─────────────────────────────
function calculateMembershipDates(durationCode: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);

  switch (durationCode) {
    case 'D30':
      end.setDate(end.getDate() + 30);
      break;
    case 'D60':
      end.setDate(end.getDate() + 60);
      break;
    case 'D90':
      end.setDate(end.getDate() + 90);
      break;
    case 'M6':
      end.setMonth(end.getMonth() + 6);
      break;
    case 'Y1':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      throw new BadRequestException('Invalid duration');
  }

  // normalize to end of day
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
// ─────────────────────────────
// Extend membership from base date
// ─────────────────────────────

function extendMembershipFromBase(baseDate: Date, durationCode: string) {
  const end = new Date(baseDate);

  switch (durationCode) {
    case 'D30':
      end.setDate(end.getDate() + 30);
      break;
    case 'D60':
      end.setDate(end.getDate() + 60);
      break;
    case 'D90':
      end.setDate(end.getDate() + 90);
      break;
    case 'M6':
      end.setMonth(end.getMonth() + 6);
      break;
    case 'Y1':
      end.setFullYear(end.getFullYear() + 1);
      break;
    default:
      throw new BadRequestException('Invalid duration');
  }

  end.setHours(23, 59, 59, 999);
  return end;
}
// ─────────────────────────────
// Duration code to days mapper
// ─────────────────────────────
function durationCodeToDays(code: 'D30' | 'D60' | 'D90' | 'M6' | 'Y1'): number {
  switch (code) {
    case 'D30':
      return 30;
    case 'D60':
      return 60;
    case 'D90':
      return 90;
    case 'M6':
      return 180;
    case 'Y1':
      return 365;
    default:
      throw new BadRequestException('Invalid duration code');
  }
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
    private readonly whatsAppSender: WhatsAppSender, // ✅ ADD
  ) {}

  async createMember(tenantId: string, dto: CreateMemberDto) {
    const subscription = await this.prisma.tenantSubscription.findFirst({
      where: {
        tenantId,
        status: {
          in: ['TRIAL', 'ACTIVE'],
        },
      },
      include: {
        plan: true,
      },
    });

    if (!subscription) {
      throw new ForbiddenException('No active subscription');
    }

    if (!subscription.plan || !subscription.plan.isActive) {
      throw new ForbiddenException('Subscription plan is inactive');
    }
    if (subscription.status === 'EXPIRED') {
      throw new ForbiddenException(
        'Your trial has expired. Please upgrade to continue.',
      );
    }

    const limit = subscription.plan.memberLimit;
    if (limit > 0) {
      const count = await this.prisma.member.count({ where: { tenantId } });
      if (count >= limit) {
        throw new ForbiddenException(
          `Member limit reached for ${subscription.plan.name} plan. Please upgrade.`,
        );
      }
    }
    const normalizedPhone = normalizePhone(dto.phone);
    const existing = await this.prisma.member.findFirst({
      where: { tenantId, phone: normalizedPhone },
    });

    if (existing) {
      throw new BadRequestException('MOBILE_ALREADY_EXISTS');
    }

    const fee = dto.feeAmount;
    const baseMonthlyFee = dto.feeAmount; // ✅ clear meaning
    const paid = dto.paidAmount ?? 0;

    let paymentStatus: MemberPaymentStatus;

    if (paid <= 0) {
      paymentStatus = 'DUE';
    } else if (paid < fee) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PAID';
    }
    const { start: membershipStartAt, end: membershipEndAt } =
      calculateMembershipDates(dto.durationCode);

    const member = await this.prisma.member.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        phone: normalizedPhone,
        gender: dto.gender,
        isActive: true,
        membershipPlanId: dto.membershipPlanId,

        // ✅ FIXED
        membershipStartAt,
        membershipEndAt,
        paymentDueDate: membershipEndAt,

        photoUrl: dto.photoUrl,
        //Payment details
        monthlyFee: baseMonthlyFee,
        feeAmount: dto.feeAmount,
        paidAmount: dto.paidAmount ?? 0,
        paymentStatus,

        heightCm: dto.heightCm ?? 0,
        weightKg: dto.weightKg ?? 0,
        fitnessGoal: dto.fitnessGoal,
      },
    });

    // ─────────────────────────────
    // ✅ Welcome WhatsApp (ULTIMATE)
    // ─────────────────────────────
    try {
      if (member.isActive && !member.welcomeMessageSent) {
        // 🔹 Get tenant plan
        const planName = subscription.plan.name;

        if (planName === 'ULTIMATE') {
          const result = await this.whatsAppSender.sendTemplateMessage(
            tenantId,
            WhatsAppFeature.WELCOME,
            member.phone,
            WhatsAppTemplates.WELCOME,
            [
              formatDateDDMMYYYY(member.membershipStartAt),
              formatDateDDMMYYYY(member.membershipEndAt),
            ],
          );

          if (result.success) {
            await this.prisma.member.update({
              where: { id: member.id },
              data: { welcomeMessageSent: true },
            });
          }
        }
      }
    } catch (err) {
      // ❌ Never fail member creation due to WhatsApp
      console.error('Welcome WhatsApp failed', err.message);
    }
    return member;
  }

  async listMembers(tenantId: string) {
    if (!tenantId) {
      throw new ForbiddenException('Tenant not initialized');
    }

    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        isActive: true,
      },

      orderBy: { createdAt: 'desc' },
    });

    return members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      photoUrl: member.photoUrl, // ✅ ADD THIS
      membershipEndAt: member.membershipEndAt,
      membershipStartAt: member.membershipStartAt,
      paymentStatus: member.paymentStatus,
      isActive: member.isActive,
      isExpired: isMembershipExpired(member.membershipEndAt),
      heightCm: member.heightCm,
      weightKg: member.weightKg,
    }));
  }
  // ===============================
  // MEMBERSHIP RENEWAL DUE
  // (expired + overdue)
  // ===============================
  async listMembershipsDue(tenantId: string) {
    const endToday = endOfDay(new Date());
    return this.prisma.member.findMany({
      where: {
        tenantId,
        isActive: true,
        membershipEndAt: {
          lte: endToday,
        },
      },
    });
  }

  //get member by id
  async getMemberById(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
        isActive: true,
      },

      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          orderBy: { checkInTime: 'desc' },
          take: 10,
        },
      },
    });

    if (!member) {
      throw new BadRequestException('Member not found');
    }

    return {
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      photoUrl: member.photoUrl,
      // ✅ ANDROID FIELD NAMES (DO NOT RENAME)
      membershipStartAt: member.membershipStartAt,
      membershipEndAt: member.membershipEndAt,

      feeAmount: member.feeAmount ?? 0,
      paidAmount: member.paidAmount ?? 0,
      paymentStatus: member.paymentStatus,

      // ✅ EDIT SCREEN NEEDS THESE
      heightCm: member.heightCm,
      weightKg: member.weightKg,
      fitnessGoal: member.fitnessGoal,

      // 🟡 optional (details screen only)
      payments: member.payments,
      attendance: member.attendances,
    };
  }

  async getPaymentDueMembers(tenantId: string) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        isActive: true,
      },

      select: {
        id: true,
        fullName: true,
        phone: true,
        feeAmount: true,
        paidAmount: true,
      },
    });

    return members
      .map((m) => {
        const paid = m.paidAmount ?? 0;
        const due = m.feeAmount - paid;

        return {
          id: m.id,
          fullName: m.fullName, // since Android uses fullName
          phone: m.phone,

          feeAmount: m.feeAmount, // ✅ ADD
          paidAmount: paid, // ✅ ADD
          dueAmount: due,
        };
      })
      .filter((m) => m.dueAmount > 0);
  }
  async collectPayment(tenantId: string, memberId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Invalid payment amount');
    }

    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
        isActive: true,
      },
    });

    if (!member) {
      throw new BadRequestException('Member not found');
    }

    const newPaid = member.paidAmount + amount;

    if (newPaid > member.feeAmount) {
      throw new BadRequestException('Payment exceeds total fee');
    }

    let paymentStatus: MemberPaymentStatus;
    if (newPaid <= 0) {
      paymentStatus = 'DUE';
    } else if (newPaid < member.feeAmount) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PAID';
    }

    // ✅ update member (Option A source of truth)
    const updatedMember = await this.prisma.member.update({
      where: { id: memberId },
      data: {
        paidAmount: newPaid,
        paymentStatus,

        // ✅ reset reminder only
        paymentReminderSent: false,
      },
    });

    // 🟡 optional audit trail (do NOT use for logic)
    await this.prisma.memberPayment.create({
      data: {
        tenantId,
        memberId,
        amount,
        status: paymentStatus,
        method: 'CASH',
      },
    });

    return updatedMember;
  }

  async updateMember(tenantId: string, memberId: string, dto: UpdateMemberDto) {
    const exists = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
        isActive: true,
      },

      select: { id: true },
    });

    if (!exists) {
      throw new BadRequestException('Member not found');
    }
    const updateData: any = {};

    if (dto.fullName !== undefined) updateData.fullName = dto.fullName;
    if (dto.phone !== undefined) updateData.phone = normalizePhone(dto.phone);
    if (dto.heightCm !== undefined) updateData.heightCm = dto.heightCm;
    if (dto.weightKg !== undefined) updateData.weightKg = dto.weightKg;
    if (dto.fitnessGoal !== undefined) updateData.fitnessGoal = dto.fitnessGoal;
    if (dto.photoUrl !== undefined) updateData.photoUrl = dto.photoUrl;

    return this.prisma.member.update({
      where: { id: memberId },
      data: updateData,
    });
  }
  async getMemberPayments(tenantId: string, memberId: string) {
    return this.prisma.memberPayment.findMany({
      where: {
        tenantId,
        memberId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  //count expired members
  async countExpiredToday(tenantId: string) {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

    return this.prisma.member.count({
      where: {
        tenantId,
        membershipEndAt: {
          gte: start,
          lte: end,
        },
      },
    });
  }

  async countExpiringSoon(tenantId: string, days: number = 5): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    return this.prisma.member.count({
      where: {
        tenantId,
        membershipEndAt: {
          gte: today,
          lte: endDate,
        },
      },
    });
  }
  async listExpiringSoon(tenantId: string, days = 7) {
    const start = endOfDay(new Date()); // 👈 after today ends
    const end = endOfDay(addDays(start, days)); // 👈 end of Nth day

    return this.prisma.member.findMany({
      where: {
        tenantId,
        membershipEndAt: {
          gt: start,
          lte: end,
        },
      },
      orderBy: {
        membershipEndAt: 'asc',
      },
    });
  }
  async listMembersWithStatus(tenantId: string) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        isActive: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        membershipEndAt: true,
        paymentStatus: true, // optional but useful
      },
    });

    return members.map((m) => ({
      id: m.id,
      fullName: m.fullName,
      phone: m.phone,
      membershipEndDate: m.membershipEndAt,

      // ✅ DERIVED STATUS (SOURCE OF TRUTH)
      membershipStatus: isMembershipExpired(m.membershipEndAt)
        ? 'EXPIRED'
        : 'ACTIVE',

      paymentStatus: m.paymentStatus,
    }));
  }

  async renewMembership(
    tenantId: string,
    userId: string,
    role: 'OWNER' | 'STAFF',
    memberId: string,
    dto: RenewMemberDto,
  ) {
    // ─────────────────────────────
    // 1️⃣ Basic validation
    // ─────────────────────────────
    if (!userId || typeof userId !== 'string') {
      throw new ForbiddenException('Invalid authenticated user');
    }

    const fee = Number(dto.feeAmount);
    const paid = Number(dto.paidAmount ?? 0);

    if (isNaN(fee) || fee <= 0) {
      throw new BadRequestException('Invalid fee amount');
    }

    if (isNaN(paid) || paid < 0 || paid > fee) {
      throw new BadRequestException('Invalid paid amount');
    }

    if (paid < 0 || paid > fee) {
      throw new BadRequestException('Invalid paid amount');
    }
    if (!['D30', 'D60', 'D90', 'M6', 'Y1'].includes(dto.durationCode)) {
      throw new BadRequestException('Invalid duration code');
    }

    // 🔒 Fee override only by OWNER
    if (dto.isFeeOverridden === true && role !== 'OWNER') {
      throw new ForbiddenException('Only owner can override membership fee');
    }

    // ─────────────────────────────
    // 2️⃣ Load existing member
    // ─────────────────────────────
    const existingMember = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
        isActive: true,
      },
      select: {
        membershipEndAt: true,
      },
    });

    if (!existingMember) {
      throw new BadRequestException('Member not found');
    }

    // ─────────────────────────────
    // 3️⃣ Decide base date (expiry logic)
    // ─────────────────────────────
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const baseDate =
      existingMember.membershipEndAt && existingMember.membershipEndAt >= today
        ? existingMember.membershipEndAt
        : today;

    // ─────────────────────────────
    // 4️⃣ Calculate NEW end date (durationCode)
    // ─────────────────────────────
    const newMembershipEndAt = extendMembershipFromBase(
      baseDate,
      dto.durationCode,
    );

    // ─────────────────────────────
    // 5️⃣ Payment status
    // ─────────────────────────────
    let paymentStatus: MemberPaymentStatus;

    if (paid <= 0) {
      paymentStatus = 'DUE';
    } else if (paid < fee) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PAID';
    }

    // ─────────────────────────────
    // 6️⃣ Update member (SOURCE OF TRUTH)
    // ─────────────────────────────
    const member = await this.prisma.member.update({
      where: {
        id: memberId,
        tenantId,
        isActive: true,
      },
      data: {
        membershipStartAt: today,
        membershipEndAt: newMembershipEndAt,

        // ✅ Important for WhatsApp cron
        paymentDueDate: newMembershipEndAt,
        paymentReminderSent: false,

        feeAmount: fee,
        paidAmount: paid,
        paymentStatus,
      },
    });

    // ─────────────────────────────
    // 7️⃣ Payment audit (if any)
    // ─────────────────────────────
    if (paid > 0) {
      await this.prisma.memberPayment.create({
        data: {
          tenantId,
          memberId,
          total: fee,
          amount: paid,
          status: paymentStatus,
          method: dto.method ?? 'CASH',
          reference: dto.reference ?? null,

          // ✅ STORE DURATION CODE (NOT DAYS)
          durationDays: durationCodeToDays(dto.durationCode),
        },
      });
    }

    // ─────────────────────────────
    // 8️⃣ Audit log
    // ─────────────────────────────
    await this.prisma.auditLog.create({
      data: {
        action: dto.isFeeOverridden ? 'FEE_OVERRIDE' : 'MEMBERSHIP_RENEWED',
        entity: 'MEMBER',
        entityId: memberId,

        tenant: { connect: { id: tenantId } },
        user: { connect: { id: userId } },

        meta: {
          durationCode: dto.durationCode,
          feeAmount: fee,
          paidAmount: paid,
          paymentStatus,
          overridden: dto.isFeeOverridden === true,
        },
      },
    });

    return member;
  }

  async countAll(tenantId: string) {
    if (!tenantId) {
      return 0; // 🔒 dashboard-safe
    }

    return this.prisma.member.count({
      where: {
        tenantId,
        isActive: true,
      },
    });
  }
  async updateMemberByOwner(
    tenantId: string,
    userId: string,
    role: 'OWNER' | 'STAFF',
    memberId: string,
    dto: UpdateMemberDto,
  ) {
    // 🔒 ROLE CHECK
    if (role !== 'OWNER') {
      throw new ForbiddenException('Only owner can edit member');
    }

    // 🚫 REMOVE FIELDS OWNER SHOULD NOT FORCE-EDIT
    const {
      paymentStatus, // ❌ ignore even if sent
      ...safeData
    } = dto;

    // 🗓 Convert date strings → Date (IMPORTANT)
    const updateData: any = {
      ...safeData,
    };
    if (dto.heightCm !== undefined) {
      updateData.heightCm = dto.heightCm;
    }

    if (dto.weightKg !== undefined) {
      updateData.weightKg = dto.weightKg;
    }

    if (dto.fitnessGoal !== undefined) {
      updateData.fitnessGoal = dto.fitnessGoal;
    }

    // ✅ UPDATE MEMBER
    const member = await this.prisma.member.update({
      where: {
        id_tenantId: {
          id: memberId,
          tenantId,
        },
      },
      data: updateData,
    });

    // 🔐 AUDIT LOG
    await this.prisma.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'MEMBER_EDIT',
        entity: 'MEMBER',
        entityId: memberId,
        meta: updateData,
      },
    });

    return member;
  }

  //delete member
  async deleteMember(user: any, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId: user.tenantId,
      },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    await this.prisma.member.update({
      where: {
        id_tenantId: {
          id: memberId,
          tenantId: user.tenantId,
        },
      },
      data: {
        isActive: false,
      },
    });

    // audit (safe)
    try {
      await this.auditService.log({
        tenantId: user.tenantId,
        userId: user.sub,
        action: 'MEMBER_DISABLED',
        entity: 'MEMBER',
        entityId: memberId,
      });
    } catch {}

    return { success: true };
  }

  //findByphone
  async findByPhone(tenantId: string, phone: string) {
    const normalized = normalizePhone(phone);

    return this.prisma.member.findFirst({
      where: {
        tenantId,
        phone: normalized,
      },
    });
  }

  //find members for renewal dashboard
  async findExpiringBetween(tenantId: string, from: Date, to: Date) {
    return this.prisma.member.findMany({
      where: {
        tenantId,
        membershipEndAt: {
          gte: from,
          lte: to,
        },
        paymentStatus: {
          in: ['DUE', 'PARTIAL'],
        },
      },
      select: {
        id: true,
        feeAmount: true,
        paymentStatus: true,
      },
    });
  }
  // 1️⃣ Memberships needing renewal (prepaid)
  async countMembershipsDue(tenantId: string) {
    const endToday = endOfDay(new Date());

    return this.prisma.member.count({
      where: {
        tenantId,
        membershipEndAt: {
          lte: endToday,
        },
      },
    });
  }

  // 2️⃣ Payments pending (prepaid)
  async getPaymentsPending(tenantId: string) {
    return this.prisma.member.findMany({
      where: {
        tenantId,
      },
      select: {
        id: true,
        feeAmount: true,
        paidAmount: true, // ✅ ADD THIS
        paymentStatus: true,
      },
    });
  }

  // 3️⃣ Expiring this week
  async countExpiringThisWeek(tenantId: string, days = 7) {
    const start = startOfDay(new Date());
    const end = endOfDay(addDays(start, days));

    return this.prisma.member.count({
      where: {
        tenantId,
        membershipEndAt: {
          gte: start,
          lte: end,
        },
      },
    });
  }
  //Expiring soon members
  async findExpiringSoon(tenantId: string, days: number) {
    const start = new Date();
    const end = addDays(start, days);

    return this.prisma.member.findMany({
      where: {
        tenantId,
        membershipEndAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        id: true,
        fullName: true,
        phone: true,
        membershipEndAt: true,
        paymentStatus: true,
      },
      orderBy: {
        membershipEndAt: 'asc',
      },
    });
  }
}
