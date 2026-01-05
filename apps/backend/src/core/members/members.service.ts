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
import { endOfDayDate } from '../../common/utils/date.util';
import { normalizePhone } from '../../common/utils/phone.util';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
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

    if (new Date(dto.membershipEndAt) < new Date(dto.membershipStartAt)) {
      throw new BadRequestException(
        'Membership end date cannot be before start date',
      );
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
    return this.prisma.member.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        phone: normalizedPhone,
        gender: dto.gender,
        isActive: true,
        membershipPlanId: dto.membershipPlanId,
        membershipStartAt: new Date(dto.membershipStartAt),
        membershipEndAt: new Date(dto.membershipEndAt),

        monthlyFee: baseMonthlyFee, // ✅ BASE MONTHLY FEE
        feeAmount: baseMonthlyFee, // ⚠️ optional (can remove later)

        paidAmount: paid,
        paymentStatus,
        paymentDueDate: new Date(dto.membershipStartAt),
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        fitnessGoal: dto.fitnessGoal,
      },
    });
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
          memberId: m.id,
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

    return this.prisma.member.update({
      where: { id: memberId },
      data: {
        fullName: dto.fullName,
        phone: dto.phone ? normalizePhone(dto.phone) : undefined,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        fitnessGoal: dto.fitnessGoal,
        photoUrl: dto.photoUrl,
      },
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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const duration = dto.durationDays ?? 30;
    const fee = dto.feeAmount;
    const paid = dto.paidAmount ?? 0;
    const { feeAmount: _renewalTotalFee, ...safeDto } = dto;
    const allowedDurations = [30, 60, 90, 180, 365];

    if (!userId || typeof userId !== 'string') {
      throw new ForbiddenException('Invalid authenticated user');
    }

    if (!allowedDurations.includes(duration)) {
      throw new BadRequestException(
        'Invalid duration. Allowed: 1, 2, 3, 6, or 12 months',
      );
    }

    if (paid < 0 || paid > fee) {
      throw new BadRequestException('Invalid paid amount');
    }
    // 🔒 BACKEND ROLE VALIDATION (EXACT PLACE)
    if (dto.isFeeOverridden === true && role !== 'OWNER') {
      throw new ForbiddenException('Only owner can override membership fee');
    }
    let paymentStatus: MemberPaymentStatus;
    if (paid <= 0) {
      paymentStatus = 'DUE';
    } else if (paid < fee) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'PAID';
    }

    const existingMember = await this.prisma.member.findUnique({
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

    const baseDate =
      existingMember.membershipEndAt && existingMember.membershipEndAt >= today
        ? existingMember.membershipEndAt
        : today;

    const newEndDateRaw = new Date(baseDate);
    newEndDateRaw.setDate(newEndDateRaw.getDate() + duration);

    // 🔒 normalize expiry to end of day
    const newEndDate = endOfDayDate(newEndDateRaw);

    const member = await this.prisma.member.update({
      where: {
        id: memberId,
        tenantId,
        isActive: true,
      },

      data: {
        membershipStartAt: today,
        membershipEndAt: newEndDate,

        // ✅ IMPORTANT FOR WHATSAPP CRON
        paymentDueDate: newEndDate,
        paymentReminderSent: false,
      },
    });

    // 💰 Payment audit
    if (paid > 0) {
      await this.prisma.memberPayment.create({
        data: {
          tenantId,
          memberId,
          total: fee, // ✅ TOTAL RENEWAL FEE
          amount: paid, // ✅ PAID NOW
          status: paymentStatus,
          method: dto.method ?? 'CASH',
          reference: dto.reference ?? null,
          durationDays: duration,
        },
      });
    }
    // 🧾 Audit log for fee override / renewal
    await this.prisma.auditLog.create({
      data: {
        action: dto.isFeeOverridden ? 'FEE_OVERRIDE' : 'MEMBERSHIP_RENEWED',
        entity: 'MEMBER',
        entityId: memberId,

        tenant: { connect: { id: tenantId } },
        user: { connect: { id: userId } },

        meta: {
          durationDays: duration,
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

    if (dto.membershipStartAt) {
      updateData.membershipStartAt = endOfDayDate(
        new Date(dto.membershipStartAt),
      );
    }

    if (dto.membershipEndAt) {
      updateData.membershipEndAt = endOfDayDate(new Date(dto.membershipEndAt));
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
