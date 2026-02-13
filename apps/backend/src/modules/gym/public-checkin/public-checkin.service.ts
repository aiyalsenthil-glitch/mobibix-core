import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class PublicCheckinService {
  constructor(private prisma: PrismaService) {}

  async lookupMember(tenantCode: string, phone: string) {
    // 1️⃣ Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid gym');
    }

    // 2️⃣ Find member by phone
    const member = await this.prisma.member.findFirst({
      where: {
        tenantId: tenant.id,
        phone,
      },
    });

    if (!member) {
      throw new BadRequestException(
        'Phone number not registered. Contact front desk.',
      );
    }

    // 3️⃣ Check expiry
    if (member.membershipEndAt < new Date()) {
      throw new BadRequestException(
        'Membership expired. Please contact front desk.',
      );
    }

    // 4️⃣ Find active attendance
    const activeAttendance = await this.prisma.gymAttendance.findFirst({
      where: {
        memberId: member.id,
        tenantId: tenant.id,
        checkOutTime: null,
      },
    });

    return {
      memberId: member.id,
      name: member.fullName,
      paymentStatus: member.paymentStatus,
      pendingAmount:
        member.paymentStatus === 'PARTIAL'
          ? member.feeAmount - member.paidAmount
          : 0,
      isInside: !!activeAttendance,
    };
  }
  async confirmAttendance(tenantCode: string, memberId: string) {
    // 1️⃣ Find tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { code: tenantCode },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid gym');
    }

    // 2️⃣ Find member with composite key
    const member = await this.prisma.member.findUnique({
      where: { id_tenantId: { id: memberId, tenantId: tenant.id } },
    });

    if (!member) {
      throw new BadRequestException('Member not found');
    }

    // 3️⃣ Expiry check
    if (member.membershipEndAt < new Date()) {
      throw new BadRequestException(
        'Membership expired. Please contact front desk.',
      );
    }

    // 4️⃣ Payment rule
    if (member.paymentStatus === 'DUE') {
      throw new BadRequestException(
        'Payment pending. Please contact front desk.',
      );
    }

    // 5️⃣ Check active attendance
    const activeAttendance = await this.prisma.gymAttendance.findFirst({
      where: {
        memberId: member.id,
        tenantId: tenant.id,
        checkOutTime: null,
      },
    });

    if (activeAttendance) {
      // CHECK OUT
      await this.prisma.gymAttendance.update({
        where: { id: activeAttendance.id },
        data: { checkOutTime: new Date() },
      });

      return { action: 'CHECK_OUT' };
    }

    // CHECK IN
    await this.prisma.gymAttendance.create({
      data: {
        tenantId: tenant.id,
        memberId: member.id,
        checkInTime: new Date(),
      },
    });

    return { action: 'CHECK_IN' };
  }
}
