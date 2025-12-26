import {
  Injectable,
  ForbiddenException,
  BadRequestException,
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

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
  ) {}

  async listMembers(tenantId: string) {
    if (!tenantId) {
      throw new ForbiddenException('Tenant not initialized');
    }

    const members = await this.prisma.member.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    return members.map((member) => ({
      ...member,
      isExpired: isMembershipExpired(member.membershipEndAt),
    }));
  }

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

    const limit = subscription.plan.memberLimit;
    if (limit > 0) {
      const count = await this.prisma.member.count({ where: { tenantId } });
      if (count >= limit) {
        throw new ForbiddenException('Member limit reached');
      }
    }

    const existing = await this.prisma.member.findFirst({
      where: { tenantId, phone: dto.phone },
    });

    if (existing) {
      throw new BadRequestException(
        'Member already exists with this phone number',
      );
    }

    if (new Date(dto.membershipEndAt) < new Date(dto.membershipStartAt)) {
      throw new BadRequestException(
        'Membership end date cannot be before start date',
      );
    }

    return this.prisma.member.create({
      data: {
        tenantId,
        fullName: dto.fullName,
        phone: dto.phone,
        gender: dto.gender,
        membershipPlanId: dto.membershipPlanId,
        membershipStartAt: new Date(dto.membershipStartAt),
        membershipEndAt: new Date(dto.membershipEndAt),
        feeAmount: dto.feeAmount,
        paymentStatus: dto.paymentStatus,
        heightCm: dto.heightCm,
        weightKg: dto.weightKg,
        fitnessGoal: dto.fitnessGoal,
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

  async updateMember(tenantId: string, memberId: string, dto: UpdateMemberDto) {
    return this.prisma.member.update({
      where: {
        id_tenantId: {
          id: memberId,
          tenantId,
        },
      },
      data: {
        ...dto,
        membershipStartAt: dto.membershipStartAt
          ? new Date(dto.membershipStartAt)
          : undefined,
        membershipEndAt: dto.membershipEndAt
          ? new Date(dto.membershipEndAt)
          : undefined,
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
  async listExpiringSoon(tenantId: string, days: number = 5) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date();
    endDate.setDate(today.getDate() + days);
    endDate.setHours(23, 59, 59, 999);

    const members = await this.prisma.member.findMany({
      where: {
        tenantId,
        membershipEndAt: {
          gte: today,
          lte: endDate,
        },
      },
      orderBy: {
        membershipEndAt: 'asc',
      },
    });

    return members.map((m) => ({
      ...m,
      isExpired: isMembershipExpired(m.membershipEndAt),
    }));
  }
  async renewMembership(
    tenantId: string,
    memberId: string,
    dto: RenewMemberDto,
  ) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 30);

    const member = await this.prisma.member.update({
      where: {
        id_tenantId: {
          id: memberId,
          tenantId,
        },
      },
      data: {
        membershipStartAt: start,
        membershipEndAt: end,
        feeAmount: dto.feeAmount,
        paymentStatus: dto.paymentStatus,
      },
    });

    // 🔹 record payment (future proof)
    await this.prisma.memberPayment.create({
      data: {
        tenantId,
        memberId,

        amount: dto.feeAmount, // ✅ REQUIRED BY PRISMA

        status: dto.paymentStatus ?? MemberPaymentStatus.PAID,

        method: dto.method ?? 'CASH',

        reference: dto.reference ?? null,
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
        tenantId: tenantId,
      },
    });
  }
  //get member by id
  async getMemberById(tenantId: string, memberId: string) {
    return this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        attendances: {
          orderBy: { checkInTime: 'desc' },
          take: 10, // last 10 visits
        },
      },
    });
  }

  //delete member
  async deleteMember(user: any, memberId: string) {
    const res = await this.prisma.member.deleteMany({
      where: {
        id: memberId,
        tenantId: user.tenantId,
      },
    });

    await this.auditService.log({
      tenantId: user.tenantId,
      userId: user.sub,
      action: 'MEMBER_DELETED',
      entity: 'MEMBER',
      entityId: memberId,
    });

    return res;
  }
  //Find expired members today
  async findExpiredToday(tenantId: string) {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());

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
  //findByphone
  async findByPhone(tenantId: string, phone: string) {
    return this.prisma.member.findFirst({
      where: {
        tenantId,
        phone,
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
