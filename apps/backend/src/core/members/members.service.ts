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
