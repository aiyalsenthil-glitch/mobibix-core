import { BadRequestException } from '@nestjs/common';
import { PLAN_LIMITS } from '../billing/plan-limits';
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMemberDto } from './dto/create-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';

@Injectable()
export class MembersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─────────────────────────────────────────────
  // CREATE MEMBER
  // ─────────────────────────────────────────────
  async createMember(tenantId: string, dto: CreateMemberDto) {
    const subscription = await this.prisma.tenantSubscription.findUnique({
      where: { tenantId },
      include: { plan: true },
    });

    const planName = subscription?.plan?.name ?? 'TRIAL';
    const limits = PLAN_LIMITS[planName];

    if (limits?.maxMembers !== null) {
      const count = await this.prisma.member.count({
        where: { tenantId },
      });

      if (count >= limits.maxMembers) {
        // 🚨 SOFT ENFORCEMENT
        throw new BadRequestException(
          `Member limit reached for ${planName} plan`,
        );
      }
    }

    return this.prisma.member.create({
      data: {
        ...dto,
        tenantId,
      },
    });
  }

  // ─────────────────────────────────────────────
  // LIST MEMBERS (TENANT ISOLATED)
  // ─────────────────────────────────────────────
  async listMembers(tenantId: string) {
    return this.prisma.member.findMany({
      where: {
        tenantId,
      },
    });
  }

  // ─────────────────────────────────────────────
  // GET SINGLE MEMBER (TENANT ISOLATED)
  // ─────────────────────────────────────────────
  async getMemberById(tenantId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return member;
  }

  // ─────────────────────────────────────────────
  // UPDATE MEMBER (TENANT ISOLATED)
  // ─────────────────────────────────────────────
  async updateMember(tenantId: string, memberId: string, dto: UpdateMemberDto) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: memberId,
        tenantId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return this.prisma.member.update({
      where: {
        id: memberId,
      },
      data: {
        ...dto,
      },
    });
  }
}
