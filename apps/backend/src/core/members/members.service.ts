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
import { normalizePhone } from '../../common/utils/phone.util';
import { WhatsAppSender } from '../../modules/whatsapp/whatsapp.sender';
import { TenantService } from '../tenant/tenant.service';
import { PlanRulesService } from '../billing/plan-rules.service';
import { getCreateAudit, getUpdateAudit } from '../audit/audit.helper';
import { softDeleteData } from '../soft-delete/soft-delete.helper';

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

import { AutomationService } from '../../modules/whatsapp/automation.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
    private readonly whatsAppSender: WhatsAppSender,
    private readonly tenantService: TenantService,
    private readonly planRulesService: PlanRulesService,
    private readonly automationService: AutomationService, // ✅ Injected
  ) {}

  async createMember(
    tenantId: string,
    dto: CreateMemberDto,
    creatorId: string,
  ) {
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
      // This should NEVER happen if TenantStatusGuard is applied
      throw new ForbiddenException('SUBSCRIPTION_EXPIRED');
    }

    // 🛡️ CHECK FOR DELETION REQUEST (Soft Lock)
    const tenant = (await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { deletionRequestPending: true } as any,
    })) as any;
    if (tenant?.deletionRequestPending) {
      throw new BadRequestException(
        'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
      );
    }

    const rules = await this.planRulesService.getPlanRulesForTenant(
      tenantId,
      subscription.module,
    );
    const limit = rules?.maxMembers ?? subscription.plan.maxMembers;
    if (limit !== null && limit !== undefined) {
      const count = await this.prisma.member.count({ where: { tenantId } });
      if (limit <= 0 || count >= limit) {
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

    // ─────────────────────────────
    // 🔗 Ensure Customer Exists (Bridge for Automation)
    // ─────────────────────────────
    let customer = await this.prisma.party.findUnique({
      where: {
        tenantId_phone: {
          tenantId,
          phone: normalizedPhone,
        },
      },
    });

    if (!customer) {
      customer = await this.prisma.party.create({
        data: {
          tenantId,
          name: dto.fullName,
          phone: normalizedPhone,
          state: 'Unknown', // Required field, default to Unknown
          partyType: 'CUSTOMER',
        },
      });
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
        customerId: customer.id, // ✅ Linked Customer
        ...getCreateAudit(creatorId), // ✅ Capture who created
      },
    });
    // ─────────────────────────────
    // ✅ Admission payment record (LEDGER)
    // ─────────────────────────────
    if (paid > 0) {
      await this.prisma.memberPayment.create({
        data: {
          tenantId,
          memberId: member.id,
          amount: paid,
          status: paymentStatus,
          method: 'ADMISSION',
          reference: 'MEMBER_CREATE', // ✅ future-proof
        },
      });
    }

    // ─────────────────────────────
    // ✅ Trigger WhatsApp Automation (Event-Driven)
    // ─────────────────────────────
    try {
      if (member.isActive) {
        console.log(
          `[MembersService] Triggering MEMBER_CREATED automation for member ${member.id}`,
        ); // Temp log

        await this.automationService.handleEvent({
          moduleType: 'GYM',
          eventType: 'MEMBER_CREATED',
          tenantId: member.tenantId,
          entityId: member.id,
        });
      }
    } catch (err) {
      console.error('Failed to trigger WhatsApp automation:', err.message);
      // Do not fail member creation
    }

    return member;
  }

  async listMembers(
    tenantId: string,
    options?: { skip?: number; take?: number; search?: string },
  ) {
    if (!tenantId) {
      throw new ForbiddenException('Tenant not initialized');
    }

    const where: any = {
      tenantId,
      isActive: true,
    };

    // Add search filter if provided
    if (options?.search) {
      where.OR = [
        { fullName: { contains: options.search, mode: 'insensitive' } },
        { phone: { contains: options.search } },
      ];
    }

    // Parallel queries for better performance
    const [members, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          phone: true,
          photoUrl: true,
          membershipEndAt: true,
          membershipStartAt: true,
          paymentStatus: true,
          isActive: true,
          heightCm: true,
          weightKg: true,
        },
      }),
      this.prisma.member.count({ where }),
    ]);

    return {
      data: members.map((member) => ({
        ...member,
        isExpired: isMembershipExpired(member.membershipEndAt),
      })),
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }
  // ===============================
  // MEMBERSHIP RENEWAL DUE
  // (expired + overdue)
  // ===============================
  async listMembershipsDue(
    tenantId: string,
    options?: { skip?: number; take?: number },
  ) {
    const endToday = endOfDay(new Date());
    return this.prisma.member.findMany({
      where: {
        tenantId,
        isActive: true,
        membershipEndAt: {
          lte: endToday,
        },
      },
      skip: options?.skip ?? 0,
      take: options?.take ?? 100,
      orderBy: { membershipEndAt: 'desc' },
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
    const feeAmount = member.feeAmount ?? 0;
    const paidAmount = member.paidAmount ?? 0;
    const pendingAmount = Math.max(feeAmount - paidAmount, 0);

    return {
      id: member.id,
      fullName: member.fullName,
      phone: member.phone,
      photoUrl: member.photoUrl,

      membershipStartAt: member.membershipStartAt,
      membershipEndAt: member.membershipEndAt,

      feeAmount,
      paidAmount,
      pendingAmount, // ✅ ADD THIS
      paymentStatus: member.paymentStatus,

      heightCm: member.heightCm,
      weightKg: member.weightKg,
      fitnessGoal: member.fitnessGoal,

      payments: member.payments,
      attendance: member.attendances,
    };
  }

  async getPaymentDueMembers(
    tenantId: string,
    options?: { skip?: number; take?: number },
  ) {
    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        isActive: true,
        paymentStatus: { in: ['DUE', 'PARTIAL'] },
      },
      skip: options?.skip ?? 0,
      take: options?.take ?? 100,
      orderBy: { paymentDueDate: 'asc' },
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

    // 🛡️ CHECK FOR DELETION REQUEST (Soft Lock)
    const tenant = (await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { deletionRequestPending: true } as any,
    })) as any;
    if (tenant?.deletionRequestPending) {
      throw new BadRequestException(
        'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
      );
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
        reference: 'MANUAL_COLLECT', // ✅ future-proof
      },
    });

    return updatedMember;
  }

  async updateMember(
    tenantId: string,
    memberId: string,
    dto: UpdateMemberDto,
    updaterId: string,
  ) {
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
      data: {
        ...updateData,
        ...getUpdateAudit(updaterId), // ✅ Capture who updated
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
        feeAmount: true,
        paidAmount: true,
      },
    });

    if (!existingMember) {
      throw new BadRequestException('Member not found');
    }

    // 🛡️ CHECK FOR DELETION REQUEST (Soft Lock)
    const tenant = (await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { deletionRequestPending: true } as any,
    })) as any;
    if (tenant?.deletionRequestPending) {
      throw new BadRequestException(
        'Your account is currently pending deletion and most operations are restricted. Please contact support if you need to cancel the request.',
      );
    }

    // ─────────────────────────────
    // 🚨 STRICT PENDING CHECK
    // ─────────────────────────────
    const oldFee = existingMember.feeAmount ?? 0;
    const oldPaid = existingMember.paidAmount ?? 0;
    const pendingAmount = Math.max(oldFee - oldPaid, 0);

    if (pendingAmount > 0) {
      if (!dto.resolvePendingDues) {
        throw new BadRequestException(
          `Member has pending dues of ${pendingAmount}. Please clear dues or select 'Collect Pending & Renew'.`,
        );
      }

      // ✅ Auto-Resolve Pending (Separate Payment Record)
      await this.prisma.memberPayment.create({
        data: {
          tenantId,
          memberId,
          amount: pendingAmount,
          status: 'PAID',
          method: dto.method ?? 'CASH',
          reference: 'RENEWAL_CLEARANCE',
          // Mark this as clearing previous debt
        },
      });

      // We strictly consider old debt cleared now.
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

    const safeData = { ...dto };
    delete (safeData as any).paymentStatus; // 🚫 REMOVE FIELDS OWNER SHOULD NOT FORCE-EDIT (❌ ignore even if sent)

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

  // delete member
  async deleteMember(user: any, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId: user.tenantId,
      },
      select: { id: true, phone: true },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const deleteSuffix = `-del-${Date.now()}`;
    const newPhone = member.phone
      ? `${member.phone.substring(0, 15 - deleteSuffix.length)}${deleteSuffix}`
      : undefined;

    await this.prisma.member.update({
      where: {
        id_tenantId: {
          id: memberId,
          tenantId: user.tenantId,
        },
      },
      data: {
        isActive: false,
        phone: newPhone,
        ...softDeleteData(user.sub ?? user.id ?? user.userId ?? 'system'),
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
    } catch (err) {
      console.error('Failed to audit member deletion:', err);
    }

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
