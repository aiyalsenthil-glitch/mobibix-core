import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { StockVerificationStatus, StockEntryType, StockRefType } from '@prisma/client';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  CreateVerificationDto,
  AddItemsDto,
  ConfirmVerificationDto,
} from './dto/stock-verification.dto';

@Injectable()
export class StockVerificationService {
  private readonly logger = new Logger(StockVerificationService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── CREATE SESSION ────────────────────────────────────────────────────────

  async createSession(tenantId: string, userId: string, dto: CreateVerificationDto) {
    // One active DRAFT session per shop at a time
    const existing = await this.prisma.stockVerification.findFirst({
      where: { tenantId, shopId: dto.shopId, status: StockVerificationStatus.DRAFT },
    });

    if (existing) {
      throw new ConflictException(
        `An active verification session already exists (id: ${existing.id}). Confirm or cancel it first.`,
      );
    }

    const session = await this.prisma.stockVerification.create({
      data: {
        tenantId,
        shopId:      dto.shopId,
        sessionDate: new Date(dto.sessionDate),
        notes:       dto.notes,
        createdBy:   userId,
        status:      StockVerificationStatus.DRAFT,
      },
    });

    this.logger.log(`Stock verification session created: ${session.id} by userId=${userId}`);
    return session;
  }

  // ─── ADD / REPLACE ITEMS ───────────────────────────────────────────────────

  /**
   * Upsert counted items for a session.
   * System quantity is auto-fetched from ShopProduct.quantity at call time.
   */
  async addItems(
    tenantId: string,
    sessionId: string,
    dto: AddItemsDto,
  ) {
    const session = await this.findDraftSession(tenantId, sessionId);

    // Validate: items with difference must have a reason
    for (const item of dto.items) {
      const product = await this.prisma.shopProduct.findFirst({
        where: { id: item.shopProductId, tenantId, shopId: session.shopId },
      });
      if (!product) {
        throw new BadRequestException(
          `Product ${item.shopProductId} not found in this shop.`,
        );
      }

      const difference = item.physicalQty - product.quantity;
      if (difference !== 0 && !item.reason) {
        throw new BadRequestException(
          `Product "${product.name}" has a difference (${difference}). Reason is required.`,
        );
      }

      // Upsert item using @@unique([verificationId, shopProductId])
      await this.prisma.stockVerificationItem.upsert({
        where: {
          verificationId_shopProductId: {
            verificationId: sessionId,
            shopProductId:  item.shopProductId,
          },
        },
        update: {
          physicalQty: item.physicalQty,
          systemQty:   product.quantity,
          difference,
          reason:      item.reason ?? null,
          notes:       item.notes ?? null,
        },
        create: {
          tenantId,
          shopId:         session.shopId,
          verificationId: sessionId,
          shopProductId:  item.shopProductId,
          systemQty:      product.quantity,
          physicalQty:   item.physicalQty,
          difference,
          reason:        item.reason ?? null,
          notes:         item.notes ?? null,
        },
      });
    }

    return this.getSession(tenantId, sessionId);
  }

  // ─── CONFIRM SESSION ───────────────────────────────────────────────────────

  /**
   * Confirms session:
   * 1. For each item with difference ≠ 0 → write StockLedger entry
   * 2. Update ShopProduct.quantity
   * 3. Mark session CONFIRMED
   * All inside one Prisma transaction.
   */
  async confirmSession(
    tenantId: string,
    userId: string,
    sessionId: string,
    dto: ConfirmVerificationDto,
  ) {
    const session = await this.findDraftSession(tenantId, sessionId);

    const items = await this.prisma.stockVerificationItem.findMany({
      where: { verificationId: sessionId },
    });

    if (items.length === 0) {
      throw new BadRequestException('Cannot confirm an empty verification session.');
    }

    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        if (item.difference === 0) continue;

        const ledgerEntry = await tx.stockLedger.create({
          data: {
            tenantId,
            shopId:        session.shopId,
            shopProductId: item.shopProductId,
            type:          item.difference > 0 ? StockEntryType.IN : StockEntryType.OUT,
            quantity:      Math.abs(item.difference),
            referenceType: StockRefType.ADJUSTMENT,
            referenceId:   item.id,
            costPerUnit:   0, // no cost impact for verification adjustments
            note:          `Stock verification: ${item.reason ?? 'CORRECTION'}`,
          },
        });

        // Patch item with ledger link
        await tx.stockVerificationItem.update({
          where: { id: item.id },
          data: { stockLedgerId: ledgerEntry.id },
        });

        // Update physical stock quantity
        await tx.shopProduct.update({
          where: { id: item.shopProductId },
          data: { quantity: { increment: item.difference } },
        });
      }

      // Seal the session
      await tx.stockVerification.update({
        where: { id: sessionId },
        data: {
          status:      StockVerificationStatus.CONFIRMED,
          confirmedBy: userId,
          confirmedAt: new Date(),
        },
      });
    });

    this.logger.log(
      `Stock verification confirmed: ${sessionId} by userId=${userId}, ${items.filter((i) => i.difference !== 0).length} adjustments applied`,
    );

    return this.getSession(tenantId, sessionId);
  }

  // ─── CANCEL SESSION ────────────────────────────────────────────────────────

  async cancelSession(tenantId: string, userId: string, sessionId: string) {
    const session = await this.findDraftSession(tenantId, sessionId);

    return this.prisma.stockVerification.update({
      where: { id: session.id },
      data: {
        status:      StockVerificationStatus.CANCELLED,
        cancelledBy: userId,
        cancelledAt: new Date(),
      },
    });
  }

  // ─── QUERIES ───────────────────────────────────────────────────────────────

  async getSessions(
    tenantId: string,
    shopId: string,
    filters?: { startDate?: string; endDate?: string; status?: string },
  ) {
    const where: any = { tenantId, shopId };
    if (filters?.status) where.status = filters.status;
    if (filters?.startDate || filters?.endDate) {
      where.sessionDate = {};
      if (filters.startDate) where.sessionDate.gte = new Date(filters.startDate);
      if (filters.endDate)   where.sessionDate.lte = new Date(filters.endDate);
    }

    return this.prisma.stockVerification.findMany({
      where,
      orderBy: { sessionDate: 'desc' },
      include: { _count: { select: { items: true } } },
    });
  }

  async getSession(tenantId: string, sessionId: string) {
    const session = await this.prisma.stockVerification.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        items: {
          include: {
            shopProduct: { select: { name: true, category: true, quantity: true } },
          },
        },
      },
    });

    if (!session) throw new NotFoundException('Verification session not found.');
    return session;
  }

  // ─── PRIVATE ───────────────────────────────────────────────────────────────

  private async findDraftSession(tenantId: string, sessionId: string) {
    const session = await this.prisma.stockVerification.findFirst({
      where: { id: sessionId, tenantId },
    });

    if (!session) throw new NotFoundException('Verification session not found.');
    if (session.status !== StockVerificationStatus.DRAFT) {
      throw new BadRequestException(
        `Session is already ${session.status}. Only DRAFT sessions can be modified.`,
      );
    }
    return session;
  }
}
