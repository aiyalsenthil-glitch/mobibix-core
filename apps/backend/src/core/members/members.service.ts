import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { SubscriptionsService } from '../billing/subscriptions/subscriptions.service';
import { PLAN_LIMITS } from '../billing/plan-limits';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditService: AuditService,
  ) {}
  async countAll(): Promise<number> {
    return this.prisma.member.count({
      where: this.prisma.tenantWhere(),
    });
  }
  async createMember(tenantId: string, dto: CreateMemberDto) {
    if (!tenantId) {
      throw new ForbiddenException('Tenant not found');
    }

    // 1️⃣ Get current active subscription (SINGLE SOURCE OF TRUTH)
    const subscription =
      await this.subscriptionsService.getCurrentActiveSubscription(tenantId);

    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    // 2️⃣ Count existing members (ONLY members table)
    const memberCount = await this.prisma.member.count({
      where: { tenantId },
    });

    // 3️⃣ Read plan features (robust fallback to PLAN_LIMITS)
    const features = subscription.plan.features as
      | { maxMembers?: number | null }
      | undefined;

    // Prefer explicit plan.features.maxMembers when provided and numeric.
    // Otherwise fall back to canonical PLAN_LIMITS mapping by plan name.
    let maxMembers: number | null | undefined = undefined;
    if (features && typeof features.maxMembers === 'number') {
      maxMembers = features.maxMembers;
    } else {
      const fallback = PLAN_LIMITS[subscription.plan.name];
      maxMembers = fallback ? fallback.maxMembers : null;
    }
    // 4️⃣ Enforce member limit
    // IMPORTANT RULE:
    // - number → enforce
    // - null / undefined → unlimited
    if (typeof maxMembers === 'number' && memberCount >= maxMembers) {
      throw new ForbiddenException(
        'Member limit reached for your current plan. Please upgrade.',
      );
    }

    // 5️⃣ Create member
    return this.prisma.member.create({
      data: {
        tenantId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email ?? null,
      },
    });
  }

  async listMembers(tenantId: string) {
    return this.prisma.member.findMany({
      where: { tenantId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getMemberById(tenantId: string, memberId: string) {
    return this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
    });
  }

  async updateMember(tenantId: string, memberId: string, dto: UpdateMemberDto) {
    return this.prisma.member.updateMany({
      where: {
        id: memberId,
        tenantId,
      },
      data: dto,
    });
  }

  async deleteMember(user: any, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId: user.tenantId,
      },
    });

    if (!member) {
      return { message: 'Member not found' };
    }

    await this.prisma.member.delete({
      where: { id: memberId },
    });

    await this.auditService.log({
      tenantId: user.tenantId,
      userId: user.id,
      action: 'DELETE',
      entity: 'MEMBER',
      entityId: memberId,
      meta: {
        memberName: member.name,
      },
    });

    return { message: 'Member deleted successfully' };
  }
}
