import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateInstallmentPlanDto, RecordSlotPaymentDto } from './dto/finance.dto';
import { InstallmentStatus, SlotStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InstallmentPlanService {
  constructor(private prisma: PrismaService) {}

  private toPaisa(r: number) { return Math.round(r * 100); }
  private fromPaisa(p: number) { return p / 100; }

  private async nextPlanNumber(shopId: string): Promise<string> {
    const count = await this.prisma.installmentPlan.count({ where: { shopId } });
    return `KIS-${String(count + 1).padStart(4, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: CreateInstallmentPlanDto) {
    const [shop, invoice] = await Promise.all([
      this.prisma.shop.findFirst({ where: { id: dto.shopId, tenantId }, select: { id: true } }),
      this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, tenantId },
        select: { id: true, installmentPlan: { select: { id: true } } },
      }),
    ]);
    if (!shop) throw new NotFoundException('Shop not found');
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.installmentPlan) {
      throw new BadRequestException('Installment plan already exists for this invoice');
    }

    const downPayment = this.toPaisa(dto.downPayment ?? 0);
    const totalAmount = this.toPaisa(dto.totalAmount);
    const remaining = totalAmount - downPayment;
    const monthlyAmount = Math.ceil(remaining / dto.tenureMonths);
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const planNumber = await this.nextPlanNumber(dto.shopId);

    // Generate slots
    const slots = Array.from({ length: dto.tenureMonths }, (_, i) => {
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + i + 1);
      const isLast = i === dto.tenureMonths - 1;
      // Last slot absorbs rounding remainder
      const slotAmount = isLast
        ? remaining - monthlyAmount * (dto.tenureMonths - 1)
        : monthlyAmount;
      return {
        id: uuidv4(),
        tenantId,
        slotNumber: i + 1,
        dueDate,
        amount: slotAmount,
      };
    });

    return this.prisma.installmentPlan.create({
      data: {
        id: uuidv4(),
        tenantId,
        shopId: dto.shopId,
        invoiceId: dto.invoiceId,
        customerId: dto.customerId,
        planNumber,
        totalAmount,
        downPayment,
        remainingAmount: remaining,
        tenureMonths: dto.tenureMonths,
        monthlyAmount,
        startDate,
        notes: dto.notes,
        createdBy: userId,
        slots: { create: slots },
      },
      include: { slots: { orderBy: { slotNumber: 'asc' } } },
    });
  }

  async list(
    tenantId: string,
    shopId: string,
    opts: { status?: InstallmentStatus; page?: number; limit?: number },
  ) {
    const take = opts.limit ?? 50;
    const skip = ((opts.page ?? 1) - 1) * take;
    const where = {
      tenantId,
      shopId,
      ...(opts.status ? { status: opts.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.installmentPlan.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          customer: { select: { name: true, phone: true } },
          invoice: { select: { invoiceNumber: true, totalAmount: true } },
          slots: {
            where: { status: { in: [SlotStatus.PENDING, SlotStatus.OVERDUE] } },
            orderBy: { dueDate: 'asc' },
            take: 1,
          },
        },
      }),
      this.prisma.installmentPlan.count({ where }),
    ]);

    return {
      items: items.map((p) => ({
        ...p,
        totalAmount: this.fromPaisa(p.totalAmount),
        downPayment: this.fromPaisa(p.downPayment),
        remainingAmount: this.fromPaisa(p.remainingAmount),
        monthlyAmount: this.fromPaisa(p.monthlyAmount),
        invoice: p.invoice
          ? { ...p.invoice, totalAmount: this.fromPaisa(p.invoice.totalAmount) }
          : null,
        nextSlot: p.slots[0]
          ? { ...p.slots[0], amount: this.fromPaisa(p.slots[0].amount), paidAmount: this.fromPaisa(p.slots[0].paidAmount) }
          : null,
        slots: undefined, // remove from list view
      })),
      total,
      page: opts.page ?? 1,
      limit: take,
    };
  }

  async getOne(tenantId: string, id: string) {
    const plan = await this.prisma.installmentPlan.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { name: true, phone: true } },
        invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true, customerName: true } },
        slots: { orderBy: { slotNumber: 'asc' } },
      },
    });
    if (!plan) throw new NotFoundException('Installment plan not found');

    return {
      ...plan,
      totalAmount: this.fromPaisa(plan.totalAmount),
      downPayment: this.fromPaisa(plan.downPayment),
      remainingAmount: this.fromPaisa(plan.remainingAmount),
      monthlyAmount: this.fromPaisa(plan.monthlyAmount),
      invoice: plan.invoice
        ? { ...plan.invoice, totalAmount: this.fromPaisa(plan.invoice.totalAmount) }
        : null,
      slots: plan.slots.map((s) => ({
        ...s,
        amount: this.fromPaisa(s.amount),
        paidAmount: this.fromPaisa(s.paidAmount),
      })),
    };
  }

  async recordPayment(tenantId: string, slotId: string, dto: RecordSlotPaymentDto) {
    const slot = await this.prisma.installmentSlot.findFirst({
      where: { id: slotId, tenantId },
      include: { plan: true },
    });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.status === SlotStatus.PAID || slot.status === SlotStatus.WAIVED) {
      throw new BadRequestException('Slot already paid or waived');
    }

    const paidPaisa = this.toPaisa(dto.paidAmount);
    const newPaid = slot.paidAmount + paidPaisa;
    const isFull = newPaid >= slot.amount;
    const newStatus = dto.status ?? (isFull ? SlotStatus.PAID : SlotStatus.PARTIALLY_PAID);

    const updatedSlot = await this.prisma.installmentSlot.update({
      where: { id: slotId },
      data: {
        paidAmount: newPaid,
        paidAt: isFull ? new Date() : undefined,
        receiptId: dto.receiptId,
        status: newStatus,
      },
    });

    // Update plan remaining amount and status
    const allSlots = await this.prisma.installmentSlot.findMany({
      where: { planId: slot.planId },
    });
    const totalPaid = allSlots.reduce((sum, s) => sum + s.paidAmount, 0) + (paidPaisa - slot.paidAmount);
    const totalAmount = slot.plan.totalAmount - slot.plan.downPayment;
    const allDone = allSlots.every((s) =>
      s.id === slotId
        ? isFull
        : s.status === SlotStatus.PAID || s.status === SlotStatus.WAIVED,
    );

    await this.prisma.installmentPlan.update({
      where: { id: slot.planId },
      data: {
        remainingAmount: Math.max(0, totalAmount - totalPaid),
        ...(allDone ? { status: InstallmentStatus.COMPLETED } : {}),
      },
    });

    return updatedSlot;
  }

  async markOverdue(tenantId: string) {
    const now = new Date();
    return this.prisma.installmentSlot.updateMany({
      where: {
        tenantId,
        status: SlotStatus.PENDING,
        dueDate: { lt: now },
      },
      data: { status: SlotStatus.OVERDUE },
    });
  }

  async summary(tenantId: string, shopId: string) {
    const [active, overdueSlots, thisMonthDue] = await Promise.all([
      this.prisma.installmentPlan.aggregate({
        where: { tenantId, shopId, status: InstallmentStatus.ACTIVE },
        _count: true,
        _sum: { remainingAmount: true },
      }),
      this.prisma.installmentSlot.count({
        where: { tenantId, status: SlotStatus.OVERDUE, plan: { shopId } },
      }),
      this.prisma.installmentSlot.aggregate({
        where: {
          tenantId,
          status: { in: [SlotStatus.PENDING, SlotStatus.OVERDUE] },
          dueDate: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            lt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          },
          plan: { shopId },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    return {
      activePlans: {
        count: active._count,
        totalRemaining: this.fromPaisa(active._sum.remainingAmount ?? 0),
      },
      overdueSlots,
      thisMonthDue: {
        count: thisMonthDue._count,
        amount: this.fromPaisa(thisMonthDue._sum.amount ?? 0),
      },
    };
  }
}
