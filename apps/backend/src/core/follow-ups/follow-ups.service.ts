import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AutomationService } from '../../modules/whatsapp/automation.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { FollowUpBucket, FollowUpQueryDto } from './dto/follow-up-query.dto';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto';
import {
  AlertSeverity,
  AlertSource,
  FollowUpStatus,
  Prisma,
  UserRole,
} from '@prisma/client';

@Injectable()
export class FollowUpsService {
  private readonly logger = new Logger(FollowUpsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService,
  ) {}

  private mapFollowUp(item: any) {
    if (!item) return null;
    return {
      ...item,
      customerName: item.customer?.name,
      customerPhone: item.customer?.phone,
      assignedToUserName: item.assignedToUser?.fullName,

    };
  }

  async createFollowUp(
    tenantId: string,
    userId: string,
    role: UserRole,
    dto: CreateFollowUpDto,
  ) {
    const assignedToUserId = this.resolveAssignee(
      userId,
      role,
      dto.assignedToUserId,
    );
 
    const followUp = await this.prisma.customerFollowUp.create({
      data: {
        tenantId,
        customerId: dto.customerId,
        shopId: dto.shopId ?? null,
        type: dto.type,
        purpose: dto.purpose,
        note: dto.note ?? null,
        followUpAt: new Date(dto.followUpAt),
        status: FollowUpStatus.PENDING,
        assignedToUserId,
      },
      include: {
        assignedToUser: { select: { id: true, fullName: true } },
        shop: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // ─────────────────────────────
    // ✅ Trigger WhatsApp Automation
    // ─────────────────────────────
    try {
      await this.automationService.handleEvent({
        moduleType: 'MOBILE_SHOP',
        eventType: 'FOLLOW_UP_SCHEDULED',
        tenantId,
        customerId: followUp.customerId,
        entityId: followUp.id,
      });
    } catch (err) {
      this.logger.error('Failed to trigger WhatsApp automation', err instanceof Error ? err.stack : err);
    }

    return this.mapFollowUp(followUp);
  }


  async updateFollowUp(
    tenantId: string,
    userId: string,
    role: UserRole,
    followUpId: string,
    dto: UpdateFollowUpDto,
  ) {
    const followUp = await this.prisma.customerFollowUp.findFirst({
      where: { id: followUpId, tenantId },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    this.ensureCanManageFollowUp(role, userId, followUp.assignedToUserId);

    if (dto.status) {
      this.assertStatusTransition(followUp.status, dto.status);
    }

    const assignedToUserId = dto.assignedToUserId
      ? this.resolveAssignee(userId, role, dto.assignedToUserId)
      : dto.assignedToUserId === null
        ? null
        : undefined;

    const updated = await this.prisma.customerFollowUp.update({
      where: { id: followUpId },
      data: {
        type: dto.type,
        purpose: dto.purpose,
        note: dto.note,
        followUpAt: dto.followUpAt ? new Date(dto.followUpAt) : undefined,
        assignedToUserId,
        status: dto.status,
        shopId: dto.shopId ?? undefined,
      },
      include: {
        assignedToUser: { select: { id: true, fullName: true } },
        shop: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // ─────────────────────────────
    // ✅ Trigger WhatsApp Automation
    // ─────────────────────────────
    if (dto.status === FollowUpStatus.DONE) {
      try {
        await this.automationService.handleEvent({
          moduleType: 'MOBILE_SHOP',
          eventType: 'FOLLOW_UP_COMPLETED',
          tenantId,
          customerId: followUp.customerId,
          entityId: followUp.id,
        });
      } catch (err) {
        this.logger.error('Failed to trigger WhatsApp automation', err instanceof Error ? err.stack : err);
      }
    }

    return this.mapFollowUp(updated);
  }


  async listMyFollowUps(
    tenantId: string,
    userId: string,
    query: FollowUpQueryDto,
    notifyOnDue?: boolean,
    options?: { skip?: number; take?: number },
  ) {
    const where = this.buildFollowUpWhere(tenantId, query, userId);

    const [items, total] = await Promise.all([
      this.prisma.customerFollowUp.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        orderBy: { followUpAt: 'asc' },
        include: {
          assignedToUser: { select: { id: true, fullName: true } },
          shop: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.customerFollowUp.count({ where }),
    ]);

    if (notifyOnDue) {
      await this.createDueAlerts(tenantId, items);
    }

    return {
      data: items.map((item) => this.mapFollowUp(item)),

      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }


  async getMyFollowUpCounts(tenantId: string, userId: string) {
    const now = new Date();
    const [pending, overdue] = await Promise.all([
      this.prisma.customerFollowUp.count({
        where: {
          tenantId,
          assignedToUserId: userId,
          status: FollowUpStatus.PENDING,
          followUpAt: { gt: now },
        },
      }),
      this.prisma.customerFollowUp.count({
        where: {
          tenantId,
          assignedToUserId: userId,
          status: FollowUpStatus.PENDING,
          followUpAt: { lte: now },
        },
      }),
    ]);

    return { pending, overdue, total: pending + overdue };
  }

  async listAllFollowUps(
    tenantId: string,
    role: UserRole,
    query: FollowUpQueryDto,
    options?: { skip?: number; take?: number },
  ) {
    if (role !== UserRole.OWNER) {
      throw new ForbiddenException('Only owner can view all follow-ups');
    }

    const where = this.buildFollowUpWhere(tenantId, query);

    const [items, total] = await Promise.all([
      this.prisma.customerFollowUp.findMany({
        where,
        skip: options?.skip ?? 0,
        take: options?.take ?? 50,
        orderBy: { followUpAt: 'asc' },
        include: {
          assignedToUser: { select: { id: true, fullName: true } },
          shop: { select: { id: true, name: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      }),
      this.prisma.customerFollowUp.count({ where }),
    ]);

    return {
      data: items.map((item) => this.mapFollowUp(item)),
      total,
      skip: options?.skip ?? 0,
      take: options?.take ?? 50,
    };
  }


  async updateStatus(
    tenantId: string,
    userId: string,
    role: UserRole,
    followUpId: string,
    status: FollowUpStatus,
  ) {
    const followUp = await this.prisma.customerFollowUp.findFirst({
      where: { id: followUpId, tenantId },
    });

    if (!followUp) {
      throw new NotFoundException('Follow-up not found');
    }

    this.ensureCanManageFollowUp(role, userId, followUp.assignedToUserId);
    this.assertStatusTransition(followUp.status, status);

    const updated = await this.prisma.customerFollowUp.update({
      where: { id: followUpId },
      data: { status },
      include: {
        assignedToUser: { select: { id: true, fullName: true } },
        shop: { select: { id: true, name: true } },
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // ─────────────────────────────
    // ✅ Trigger WhatsApp Automation
    // ─────────────────────────────
    if (status === FollowUpStatus.DONE) {
      try {
        await this.automationService.handleEvent({
          moduleType: 'MOBILE_SHOP',
          eventType: 'FOLLOW_UP_COMPLETED',
          tenantId,
          customerId: followUp.customerId,
          entityId: followUp.id,
        });
      } catch (err) {
        this.logger.error('Failed to trigger WhatsApp automation', err instanceof Error ? err.stack : err);
      }
    }

    return this.mapFollowUp(updated);
  }


  private buildFollowUpWhere(
    tenantId: string,
    query: FollowUpQueryDto,
    assignedToUserId?: string,
  ) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const where: Prisma.CustomerFollowUpWhereInput = {
      tenantId,
      ...(assignedToUserId ? { assignedToUserId } : {}),
      ...(query.shopId ? { shopId: query.shopId } : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    if (query.bucket === FollowUpBucket.TODAY) {
      where.followUpAt = { gte: startOfDay, lte: endOfDay };
      where.status = FollowUpStatus.PENDING;
    }

    if (query.bucket === FollowUpBucket.OVERDUE) {
      where.followUpAt = { lt: now };
      where.status = FollowUpStatus.PENDING;
    }

    if (query.bucket === FollowUpBucket.UPCOMING) {
      where.followUpAt = { gt: endOfDay };
      where.status = FollowUpStatus.PENDING;
    }

    return where;
  }

  private resolveAssignee(userId: string, role: UserRole, requested?: string) {
    if (!requested) {
      return userId;
    }

    if (role === UserRole.OWNER) {
      return requested;
    }

    if (requested !== userId) {
      throw new ForbiddenException(
        'Staff can only assign follow-ups to themselves',
      );
    }

    return requested;
  }

  private ensureCanManageFollowUp(
    role: UserRole,
    userId: string,
    assigneeId: string | null,
  ) {
    if (role === UserRole.OWNER) {
      return;
    }

    if (assigneeId && assigneeId !== userId) {
      throw new ForbiddenException(
        "You cannot modify another user's follow-up",
      );
    }
  }

  private assertStatusTransition(
    current: FollowUpStatus,
    next: FollowUpStatus,
  ) {
    if (current === next) return;

    if (current !== FollowUpStatus.PENDING) {
      throw new BadRequestException('Only pending follow-ups can be updated');
    }

    if (next !== FollowUpStatus.DONE && next !== FollowUpStatus.CANCELLED) {
      throw new BadRequestException('Invalid status transition');
    }
  }

  private async createDueAlerts(
    tenantId: string,
    items: Array<{ id: string; customerId: string; followUpAt: Date }>,
  ) {
    const now = new Date();
    const dueItems = items.filter((item) => item.followUpAt <= now);

    for (const item of dueItems) {
      const message = `Follow-up due: ${item.id}`;
      const existing = await this.prisma.customerAlert.findFirst({
        where: {
          tenantId,
          customerId: item.customerId,
          message,
          resolved: false,
        },
      });

      if (!existing) {
        await this.prisma.customerAlert.create({
          data: {
            tenantId,
            customerId: item.customerId,
            severity: AlertSeverity.INFO,
            source: AlertSource.CUSTOM,
            message,
          },
        });
      }

      // ─────────────────────────────
      // ✅ Trigger WhatsApp Automation
      // ─────────────────────────────
      try {
        await this.automationService.handleEvent({
          moduleType: 'MOBILE_SHOP',
          eventType: 'FOLLOW_UP_OVERDUE',
          tenantId,
          customerId: item.customerId,
          entityId: item.id,
        });
      } catch (err) {
        this.logger.error('Failed to trigger WhatsApp automation', err instanceof Error ? err.stack : err);
      }
    }
  }
}
