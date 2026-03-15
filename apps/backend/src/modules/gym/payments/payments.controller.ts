import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { TenantRequiredGuard } from '../../../core/auth/guards/tenant.guard';
import { TenantStatusGuard } from '../../../core/tenant/guards/tenant-status.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { UserRole, ModuleType } from '@prisma/client';
import { ModuleScope } from '../../../core/auth/decorators/module-scope.decorator';
import { GranularPermissionGuard } from '../../../core/permissions/guards/granular-permission.guard';
import { RequirePermission, ModulePermission } from '../../../core/permissions/decorators/require-permission.decorator';
import { PERMISSIONS } from '../../../security/permission-registry';

@UseGuards(
  JwtAuthGuard,
  RolesGuard,
  GranularPermissionGuard,
  TenantRequiredGuard,
  TenantStatusGuard,
)
@ModuleScope(ModuleType.GYM)
@ModulePermission('payment')
@Roles(UserRole.OWNER, UserRole.STAFF)
@Controller('gym/payments')
export class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  @RequirePermission(PERMISSIONS.GYM.PAYMENT.COLLECT)
  @Post('receive')
  async receivePayment(
    @Req() req,
    @Body() body: { memberId: string; amount: number; method?: string },
  ) {
    // 1️⃣ Fetch member securely
    const member = await this.prisma.member.findFirst({
      where: {
        id: body.memberId,
        tenantId: req.user.tenantId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    // 2️⃣ Calculate new paid amount
    const newPaid = member.paidAmount + body.amount;

    // 3️⃣ Decide payment status CORRECTLY
    let paymentStatus: 'PAID' | 'PARTIAL' | 'DUE';

    if (newPaid >= member.feeAmount) {
      paymentStatus = 'PAID';
    } else if (newPaid > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'DUE';
    }

    // 4️⃣ Create payment transaction (SOURCE OF TRUTH)
    await this.prisma.memberPayment.create({
      data: {
        tenantId: req.user.tenantId,
        memberId: member.id,
        amount: body.amount,
        status: paymentStatus === 'PAID' ? 'PAID' : 'PARTIAL',
        method: body.method ?? 'CASH',
      },
    });

    // 5️⃣ Update member aggregate (CACHE)
    await this.prisma.member.update({
      where: { id: member.id },
      data: {
        paidAmount: newPaid,
        paymentStatus,
      },
    });

    return {
      success: true,
      paymentStatus,
      pendingAmount: Math.max(member.feeAmount - newPaid, 0),
    };
  }

  @RequirePermission(PERMISSIONS.GYM.PAYMENT.VIEW)
  @Get()
  @Get('history')
  async getPaymentHistory(@Req() req) {
    // Get all payments with member details for this tenant
    const payments = await this.prisma.memberPayment.findMany({
      where: {
        tenantId: req.user.tenantId,
      },
      include: {
        member: {
          select: {
            fullName: true,
            feeAmount: true,
            paidAmount: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format for frontend
    return payments.map((payment) => ({
      id: payment.id,
      memberName: payment.member.fullName,
      planName: 'Membership', // Could be enhanced to include actual plan name
      totalAmount: payment.member.feeAmount,
      paidAmount: payment.amount,
      createdAt: payment.createdAt,
    }));
  }
}
