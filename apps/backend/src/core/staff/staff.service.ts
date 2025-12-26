import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class StaffService {
  constructor(private readonly prisma: PrismaService) {}

  // ✅ List staff for tenant
  async listStaff(tenantId: string) {
    return this.prisma.user.findMany({
      where: {
        tenantId,
        role: UserRole.STAFF,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
      },
    });
  }

  // ✅ Create staff (TEMP / Phase-1)
  async createStaff(
    tenantId: string,
    data: {
      REMOVED_AUTH_PROVIDERUid: string;
      email: string;
      fullName: string;
    },
  ) {
    const existing = await this.prisma.user.findFirst({
      where: {
        REMOVED_AUTH_PROVIDERUid: data.REMOVED_AUTH_PROVIDERUid,
      },
    });

    if (!existing) {
      throw new BadRequestException('User not found. Staff must login once.');
    }

    return this.prisma.user.update({
      where: { id: existing.id },
      data: {
        tenantId,
        role: UserRole.STAFF,
        fullName: data.fullName,
      },
    });
  }

  // ✅ Invite staff by email (PROPER FLOW)
  async inviteByEmail(tenantId: string, email: string) {
    const existing = await this.prisma.staffInvite.findFirst({
      where: {
        tenantId,
        email,
      },
    });

    // ✅ Already invited but not accepted
    if (existing && !existing.accepted) {
      return {
        status: 'ALREADY_INVITED',
        message: 'Staff already invited',
      };
    }

    // ✅ Already accepted → already staff
    if (existing && existing.accepted) {
      return {
        status: 'ALREADY_JOINED',
        message: 'Staff already joined this gym',
      };
    }

    // ✅ Fresh invite
    return this.prisma.staffInvite.create({
      data: {
        tenantId,
        email,
      },
    });
  }
  //List staff invites for tenant
  async listInvites(tenantId: string) {
    return this.prisma.staffInvite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        accepted: true,
        createdAt: true,
      },
    });
  }
  //Revoke staff invite by email
  async revokeInvite(tenantId: string, inviteId: string) {
    const invite = await this.prisma.staffInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite || invite.tenantId !== tenantId) {
      throw new NotFoundException('Invite not found');
    }

    if (invite.accepted) {
      throw new ForbiddenException('Cannot revoke accepted invite');
    }

    await this.prisma.staffInvite.delete({
      where: { id: inviteId },
    });

    return { success: true };
  }
}
