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

@UseGuards(JwtAuthGuard) // ✅ ADD THIS
@Controller('gym/payments')
export class PaymentsController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('receive')
  async receivePayment(
    @Req() req,
    @Body() body: { memberId: string; amount: number },
  ) {
    const member = await this.prisma.member.findFirst({
      where: {
        id: body.memberId,
        tenantId: req.user.tenantId, // 🔒 security
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    const newPaid = member.paidAmount + body.amount;

    await this.prisma.member.update({
      where: { id: member.id },
      data: {
        paidAmount: newPaid,
        paymentStatus: newPaid >= member.feeAmount ? 'PAID' : 'DUE',
      },
    });

    return { success: true };
  }
}
