import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CreateEmiApplicationDto, UpdateEmiStatusDto } from './dto/finance.dto';
import { EmiStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EmiApplicationService {
  constructor(private prisma: PrismaService) {}

  private toPaisa(r: number) { return Math.round(r * 100); }
  private fromPaisa(p: number) { return p / 100; }

  private async nextEmiNumber(shopId: string): Promise<string> {
    const count = await this.prisma.emiApplication.count({ where: { shopId } });
    return `EMI-${String(count + 1).padStart(4, '0')}`;
  }

  async create(tenantId: string, userId: string, dto: CreateEmiApplicationDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, tenantId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    // Verify invoice belongs to tenant
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, tenantId },
      select: { id: true, emiApplication: { select: { id: true } } },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    if (invoice.emiApplication) {
      throw new BadRequestException('EMI application already exists for this invoice');
    }

    const emiNumber = await this.nextEmiNumber(dto.shopId);

    return this.prisma.emiApplication.create({
      data: {
        id: uuidv4(),
        tenantId,
        shopId: dto.shopId,
        invoiceId: dto.invoiceId,
        customerId: dto.customerId,
        emiNumber,
        financeProvider: dto.financeProvider,
        applicationRef: dto.applicationRef,
        loanAmount: this.toPaisa(dto.loanAmount),
        downPayment: this.toPaisa(dto.downPayment ?? 0),
        tenureMonths: dto.tenureMonths,
        monthlyEmi: this.toPaisa(dto.monthlyEmi),
        interestRate: dto.interestRate,
        subventionAmount: this.toPaisa(dto.subventionAmount ?? 0),
        notes: dto.notes,
        createdBy: userId,
      },
    });
  }

  async list(
    tenantId: string,
    shopId: string,
    opts: { status?: EmiStatus; page?: number; limit?: number },
  ) {
    const take = opts.limit ?? 50;
    const skip = ((opts.page ?? 1) - 1) * take;
    const where = {
      tenantId,
      shopId,
      ...(opts.status ? { status: opts.status } : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.emiApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true } },
        },
      }),
      this.prisma.emiApplication.count({ where }),
    ]);

    return {
      items: items.map((e) => ({
        ...e,
        loanAmount: this.fromPaisa(e.loanAmount),
        downPayment: this.fromPaisa(e.downPayment),
        monthlyEmi: this.fromPaisa(e.monthlyEmi),
        subventionAmount: this.fromPaisa(e.subventionAmount),
        settlementAmount: e.settlementAmount ? this.fromPaisa(e.settlementAmount) : null,
        invoice: e.invoice
          ? { ...e.invoice, totalAmount: this.fromPaisa(e.invoice.totalAmount) }
          : null,
      })),
      total,
      page: opts.page ?? 1,
      limit: take,
    };
  }

  async getOne(tenantId: string, id: string) {
    const emi = await this.prisma.emiApplication.findFirst({
      where: { id, tenantId },
      include: {
        invoice: { select: { invoiceNumber: true, invoiceDate: true, totalAmount: true, customerName: true } },
      },
    });
    if (!emi) throw new NotFoundException('EMI application not found');
    return {
      ...emi,
      loanAmount: this.fromPaisa(emi.loanAmount),
      downPayment: this.fromPaisa(emi.downPayment),
      monthlyEmi: this.fromPaisa(emi.monthlyEmi),
      subventionAmount: this.fromPaisa(emi.subventionAmount),
      settlementAmount: emi.settlementAmount ? this.fromPaisa(emi.settlementAmount) : null,
      invoice: emi.invoice
        ? { ...emi.invoice, totalAmount: this.fromPaisa(emi.invoice.totalAmount) }
        : null,
    };
  }

  async updateStatus(tenantId: string, id: string, dto: UpdateEmiStatusDto) {
    const emi = await this.prisma.emiApplication.findFirst({
      where: { id, tenantId },
    });
    if (!emi) throw new NotFoundException('EMI application not found');

    return this.prisma.emiApplication.update({
      where: { id },
      data: {
        status: dto.status,
        ...(dto.applicationRef ? { applicationRef: dto.applicationRef } : {}),
        ...(dto.settlementAmount !== undefined
          ? { settlementAmount: this.toPaisa(dto.settlementAmount) }
          : {}),
        ...(dto.rejectedReason ? { rejectedReason: dto.rejectedReason } : {}),
        ...(dto.status === EmiStatus.SETTLED ? { settledAt: new Date() } : {}),
      },
    });
  }

  // ─── Dashboard summary ─────────────────────────────────────────────────────

  async summary(tenantId: string, shopId: string) {
    const [pending, approved, settled, rejected] = await Promise.all([
      this.prisma.emiApplication.aggregate({
        where: { tenantId, shopId, status: EmiStatus.APPLIED },
        _count: true,
        _sum: { loanAmount: true },
      }),
      this.prisma.emiApplication.aggregate({
        where: { tenantId, shopId, status: EmiStatus.APPROVED },
        _count: true,
        _sum: { loanAmount: true },
      }),
      this.prisma.emiApplication.aggregate({
        where: { tenantId, shopId, status: EmiStatus.SETTLED },
        _count: true,
        _sum: { settlementAmount: true },
      }),
      this.prisma.emiApplication.count({
        where: { tenantId, shopId, status: EmiStatus.REJECTED },
      }),
    ]);

    return {
      pending: {
        count: pending._count,
        totalLoanAmount: this.fromPaisa(pending._sum.loanAmount ?? 0),
      },
      approved: {
        count: approved._count,
        totalLoanAmount: this.fromPaisa(approved._sum.loanAmount ?? 0),
      },
      settled: {
        count: settled._count,
        totalSettled: this.fromPaisa(settled._sum.settlementAmount ?? 0),
      },
      rejected: { count: rejected },
    };
  }
}
