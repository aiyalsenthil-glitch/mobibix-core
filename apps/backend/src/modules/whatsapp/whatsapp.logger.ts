import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class WhatsAppLogger {
  constructor(private prisma: PrismaService) {}

  async log(data: {
    tenantId: string;
    memberId: string | null;
    customerId?: string | null;
    phone: string;
    type: string;
    status: 'PENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' | 'SKIPPED';
    error?: string | null;
    messageId?: string | null;
    whatsAppNumberId?: string | null;
    metadata?: Record<string, any> | null;
  }) {
    let resolvedCustomerId = data.customerId;

    // Resolve customerId if missing but phone is present
    if (!resolvedCustomerId && data.phone) {
      const party = await this.prisma.party.findFirst({
        where: {
          tenantId: data.tenantId,
          phone: data.phone,
        },
        select: { id: true },
      });
      if (party) {
        resolvedCustomerId = party.id;
      }
    }

    const createData: any = {
      tenantId: data.tenantId,
      phone: data.phone,
      type: data.type,
      status: data.status,
    };

    if (data.whatsAppNumberId) {
      createData.whatsAppNumberId = data.whatsAppNumberId;
    }

    if (data.memberId) {
      createData.memberId = data.memberId;
    }

    if (resolvedCustomerId) {
      createData.customerId = resolvedCustomerId;
    }

    if (data.error) {
      createData.error = data.error;
    }

    if (data.messageId) {
      createData.messageId = data.messageId;
    }

    if (data.metadata) {
      createData.metadata = data.metadata;
    }

    await this.prisma.whatsAppLog.create({ data: createData });
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
