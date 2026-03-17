import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceCreatedEvent } from '../events/crm.events';
import { CreateCommissionRuleDto, MarkPaidDto } from './dto/commission.dto';
import { CommissionScope, CommissionType, EarningStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class CommissionService {
  private readonly logger = new Logger(CommissionService.name);

  constructor(private prisma: PrismaService) {}

  // ─── Rule CRUD ────────────────────────────────────────────────────────────

  async createRule(tenantId: string, dto: CreateCommissionRuleDto) {
    const shop = await this.prisma.shop.findFirst({
      where: { id: dto.shopId, tenantId },
      select: { id: true },
    });
    if (!shop) throw new NotFoundException('Shop not found');

    return this.prisma.commissionRule.create({
      data: {
        id: uuidv4(),
        tenantId,
        shopId: dto.shopId,
        name: dto.name,
        applyTo: dto.applyTo ?? CommissionScope.ALL_STAFF,
        staffId: dto.staffId,
        staffRole: dto.staffRole,
        category: dto.category,
        type: dto.type,
        value: dto.value,
      },
    });
  }

  async listRules(tenantId: string, shopId: string) {
    return this.prisma.commissionRule.findMany({
      where: { tenantId, shopId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleRule(tenantId: string, ruleId: string, isActive: boolean) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { id: ruleId, tenantId },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.commissionRule.update({
      where: { id: ruleId },
      data: { isActive },
    });
  }

  async deleteRule(tenantId: string, ruleId: string) {
    const rule = await this.prisma.commissionRule.findFirst({
      where: { id: ruleId, tenantId },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    return this.prisma.commissionRule.delete({ where: { id: ruleId } });
  }

  // ─── Earnings ─────────────────────────────────────────────────────────────

  async listEarnings(
    tenantId: string,
    shopId: string,
    opts: { staffId?: string; status?: EarningStatus; page?: number; limit?: number },
  ) {
    const take = opts.limit ?? 50;
    const skip = ((opts.page ?? 1) - 1) * take;
    const where = {
      tenantId,
      shopId,
      ...(opts.staffId ? { staffId: opts.staffId } : {}),
      ...(opts.status ? { status: opts.status } : {}),
    };
    const [earnings, total] = await Promise.all([
      this.prisma.staffEarning.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: { rule: { select: { name: true, type: true } } },
      }),
      this.prisma.staffEarning.count({ where }),
    ]);

    // Enrich with invoice numbers and staff names in one batch
    const invoiceIds = [...new Set(earnings.map((e) => e.invoiceId))];
    const staffIds = [...new Set(earnings.map((e) => e.staffId))];

    const [invoices, staffUsers] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { id: { in: invoiceIds } },
        select: { id: true, invoiceNumber: true, invoiceDate: true },
      }),
      this.prisma.user.findMany({
        where: { id: { in: staffIds } },
        select: { id: true, fullName: true, email: true },
      }),
    ]);

    const invoiceMap = Object.fromEntries(invoices.map((i) => [i.id, i]));
    const staffMap = Object.fromEntries(staffUsers.map((u) => [u.id, u]));

    const enriched = earnings.map((e) => ({
      ...e,
      invoice: invoiceMap[e.invoiceId],
      staff: staffMap[e.staffId],
    }));

    return { earnings: enriched, total, page: opts.page ?? 1, limit: take };
  }

  async markPaid(tenantId: string, dto: MarkPaidDto) {
    const count = await this.prisma.staffEarning.count({
      where: { id: { in: dto.earningIds }, tenantId },
    });
    if (count !== dto.earningIds.length) {
      throw new NotFoundException('Some earning records not found or unauthorized');
    }
    await this.prisma.staffEarning.updateMany({
      where: { id: { in: dto.earningIds }, tenantId },
      data: { status: EarningStatus.PAID, paidAt: new Date() },
    });
    return { updated: dto.earningIds.length };
  }

  // ─── Commission Calculation ───────────────────────────────────────────────

  @OnEvent('invoice.created')
  async handleInvoiceCreated(event: InvoiceCreatedEvent) {
    try {
      await this.calculateForInvoice(event.tenantId, event.shopId, event.invoiceId);
    } catch (err) {
      this.logger.error(`Commission calc failed for invoice ${event.invoiceId}: ${err.message}`);
    }
  }

  private async calculateForInvoice(tenantId: string, shopId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        items: {
          include: {
            product: { select: { category: true, lastPurchasePrice: true } },
          },
        },
      },
    });
    if (!invoice || !invoice.createdBy) return;

    const staffId = invoice.createdBy;

    const staffUser = await this.prisma.user.findUnique({
      where: { id: staffId },
      select: { role: true },
    });
    const staffRole = staffUser?.role;

    const rules = await this.prisma.commissionRule.findMany({
      where: { tenantId, shopId, isActive: true },
    });
    if (!rules.length) return;

    const earningsToCreate: {
      id: string;
      tenantId: string;
      shopId: string;
      staffId: string;
      invoiceId: string;
      ruleId: string;
      saleAmount: number;
      profitAmount: number;
      earned: number;
      status: EarningStatus;
    }[] = [];

    for (const rule of rules) {
      if (rule.applyTo === CommissionScope.SPECIFIC_STAFF && rule.staffId !== staffId) continue;
      if (rule.applyTo === CommissionScope.SPECIFIC_ROLE && rule.staffRole !== staffRole) continue;

      for (const item of invoice.items) {
        if (rule.category && item.product?.category !== rule.category) continue;

        const saleAmount = item.lineTotal; // paisa
        const costPerUnit = item.product?.lastPurchasePrice ?? 0; // paisa/unit
        const profitAmount = Math.max(0, saleAmount - costPerUnit * item.quantity);

        let earned = 0;
        if (rule.type === CommissionType.PERCENTAGE_OF_SALE) {
          earned = Math.round((saleAmount * Number(rule.value)) / 100);
        } else if (rule.type === CommissionType.PERCENTAGE_OF_PROFIT) {
          earned = Math.round((profitAmount * Number(rule.value)) / 100);
        } else if (rule.type === CommissionType.FIXED_PER_ITEM) {
          // rule.value is rupees per item → convert to paisa
          earned = Math.round(Number(rule.value) * 100 * item.quantity);
        }

        if (earned <= 0) continue;

        earningsToCreate.push({
          id: uuidv4(),
          tenantId,
          shopId,
          staffId,
          invoiceId,
          ruleId: rule.id,
          saleAmount,
          profitAmount,
          earned,
          status: EarningStatus.PENDING,
        });
      }
    }

    if (earningsToCreate.length > 0) {
      await this.prisma.staffEarning.createMany({ data: earningsToCreate });
      this.logger.log(`Created ${earningsToCreate.length} earnings for invoice ${invoiceId}`);
    }
  }
}
