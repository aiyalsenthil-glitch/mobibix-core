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
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';
    error?: string | null;
    messageId?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    await this.prisma.whatsAppLog.create({
      data: {
        tenantId: data.tenantId,
        memberId: data.memberId,
        phone: data.phone,
        type: data.type,
        status: data.status,
        error: data.error || undefined,
        messageId: data.messageId || undefined,
        metadata: data.metadata || undefined,
      },
    });
  }

  async updateStatus(
    logId: string,
    status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED',
    data?: { error?: string; deliveredAt?: Date; readAt?: Date },
  ) {
    const updateData: any = { status };
    if (data?.error) updateData.error = data.error;
    if (data?.deliveredAt) updateData.deliveredAt = data.deliveredAt;
    if (data?.readAt) updateData.readAt = data.readAt;

    return this.prisma.whatsAppLog.update({
      where: { id: logId },
      data: updateData,
    });
  }

  async updateMessageId(logId: string, messageId: string) {
    return this.prisma.whatsAppLog.update({
      where: { id: logId },
      data: { messageId, status: 'SENT' },
    });
  }
}
