import { PrismaService } from '../../../core/prisma/prisma.service';
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('gym/payments')
export class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

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
}
