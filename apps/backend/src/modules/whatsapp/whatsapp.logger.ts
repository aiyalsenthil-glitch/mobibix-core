import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class WhatsAppLogger {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    tenantId: string;
    memberId: string | null;
    phone: string;
    type: string;
    status: string;
    error?: string | null;
  }) {
    await this.prisma.whatsAppLog.create({
      data,
    });
  }
}
