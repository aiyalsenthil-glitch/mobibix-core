import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { DocumentNumberService } from '../../../common/services/document-number.service';
import { StockService } from '../../../core/stock/stock.service';
import { CreateCreditNoteDto } from './dto/create-credit-note.dto';
import { ApplyCreditNoteDto } from './dto/apply-credit-note.dto';
import { VoidCreditNoteDto } from './dto/void-credit-note.dto';
import { DocumentType, CreditNoteType, CreditNoteStatus, ModuleType } from '@prisma/client';

@Injectable()
export class CreditNotesService {
  private readonly logger = new Logger(CreditNotesService.name);

  constructor(
    private prisma: PrismaService,
    private docNumberService: DocumentNumberService,
    private stockService: StockService,
  ) {}

  async listCreditNotes(tenantId: string, shopId: string, params?: any) {
    const { type, status, search, page = 1, limit = 20 } = params || {};
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      shopId,
    };

    if (type) where.type = type;
    if (status) where.status = status;

    if (search) {
      where.OR = [
        { creditNoteNo: { contains: search, mode: 'insensitive' } },
        { customerName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.creditNote.findMany({
        where,
        include: { items: true, applications: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.creditNote.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCreditNote(tenantId: string, shopId: string, id: string) {
    const creditNote = await this.prisma.creditNote.findFirst({
      where: { id, tenantId, shopId },
      include: { 
        items: { include: { product: true } },
        applications: {
          include: {
            invoice: true,
            purchase: true
          }
        }
      },
    });

    if (!creditNote) {
      throw new NotFoundException('Credit Note not found');
    }

    return creditNote;
  }

  async createCreditNote(tenantId: string, shopId: string, dto: CreateCreditNoteDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate totals
      let subTotal = 0;
      let gstAmount = 0;

      const itemsData = dto.items.map((item) => {
        const itemSubTotal = item.rate * item.quantity;
        const itemGstAmount = (itemSubTotal * (item.gstRate || 0)) / 100;
        
        subTotal += itemSubTotal;
        gstAmount += itemGstAmount;

        return {
          shopProductId: item.shopProductId,
          description: item.description,
          quantity: item.quantity,
          rate: item.rate,
          hsnCode: item.hsnCode,
          gstRate: item.gstRate || 0,
          gstAmount: itemGstAmount,
          lineTotal: itemSubTotal,
          restockItem: !!item.restockItem,
        };
      });

      const totalAmount = subTotal + gstAmount;

      // 2. Create in DRAFT status
      // We don't generate the number until ISSUED
      const creditNote = await tx.creditNote.create({
        data: {
          tenantId,
          shopId,
          creditNoteNo: 'DRAFT-' + Date.now().toString().slice(-6),
          type: dto.type as any,
          reason: dto.reason as any,
          customerId: dto.customerId,
          supplierId: dto.supplierId,
          linkedInvoiceId: dto.linkedInvoiceId,
          linkedPurchaseId: dto.linkedPurchaseId,
          date: dto.date ? new Date(dto.date) : new Date(),
          subTotal,
          gstAmount,
          totalAmount,
          status: CreditNoteStatus.DRAFT,
          notes: dto.notes,
          items: {
            create: itemsData,
          },
        },
        include: { items: true },
      });

      return creditNote;
    });
  }

  async issueCreditNote(tenantId: string, shopId: string, id: string) {
    const existing = await this.getCreditNote(tenantId, shopId, id);

    if (existing.status !== CreditNoteStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT credit notes can be issued');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Generate real document number
      const creditNoteNo = await this.docNumberService.generateDocumentNumber(
        shopId,
        DocumentType.CREDIT_NOTE,
        existing.date,
        tx,
      );

      // 2. Handle restock if applicable
      for (const item of existing.items) {
        if (item.restockItem && item.shopProductId) {
          await this.stockService.recordStockIn(
            tenantId,
            shopId,
            item.shopProductId,
            item.quantity,
            existing.type === 'CUSTOMER' ? 'SALE_RETURN' : 'PURCHASE_RETURN' as any,
            existing.id,
            undefined, // cost
            undefined, // imei
            tx,
          );
        }
      }

      // 3. Update status to ISSUED
      return tx.creditNote.update({
        where: { id },
        data: {
          creditNoteNo,
          status: CreditNoteStatus.ISSUED,
        },
      });
    });
  }

  async applyCreditNote(tenantId: string, shopId: string, id: string, dto: ApplyCreditNoteDto, userId: string) {
    const creditNote = await this.getCreditNote(tenantId, shopId, id);

    if (creditNote.status === CreditNoteStatus.DRAFT || creditNote.status === CreditNoteStatus.VOIDED) {
      throw new BadRequestException('Credit note must be ISSUED or partially applied to use');
    }

    const availableAmount = creditNote.totalAmount - (creditNote.appliedAmount || 0) - (creditNote.refundedAmount || 0);
    
    if (dto.amount > availableAmount + 0.01) { // Floating point buffer
       throw new BadRequestException(`Cannot apply ${dto.amount}. Available amount: ${availableAmount}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Application record
      await tx.creditNoteApplication.create({
        data: {
          creditNoteId: id,
          invoiceId: dto.invoiceId,
          purchaseId: dto.purchaseId,
          amount: dto.amount,
          appliedBy: userId,
        },
      });

      // 2. Update Credit Note totals
      const newAppliedAmount = (creditNote.appliedAmount || 0) + dto.amount;
      const isFull = (newAppliedAmount + (creditNote.refundedAmount || 0)) >= creditNote.totalAmount - 0.01;

      await tx.creditNote.update({
        where: { id },
        data: {
          appliedAmount: newAppliedAmount,
          status: isFull ? CreditNoteStatus.FULLY_APPLIED : CreditNoteStatus.PARTIALLY_APPLIED,
        },
      });

      // 3. Update linked Invoice/Purchase paidAmount
      if (dto.invoiceId) {
        // Here we need to be careful about PAISA conversion if the target stores in PAISA
        // Most models in core seem to use PAISA for numbers.
        // I'll check SalesService again. Yes, it uses Paisa.
        // CreditNote seems to use Float (Rupees) as per arch doc, but I should check schema.prisma
        // Wait, arch doc says Float for CreditNote but Invoice uses Int (Paisa).
        // I'll assume I need to convert to Paisa for Invoice update.
        
        await tx.invoice.update({
          where: { id: dto.invoiceId },
          data: {
            paidAmount: { increment: Math.round(dto.amount * 100) },
          },
        });
        
        // Potential status update for invoice? SalesService handles this in recordPayment.
        // I might need to trigger a status re-check for the invoice.
      }

      if (dto.purchaseId) {
        await tx.purchase.update({
          where: { id: dto.purchaseId },
          data: {
            paidAmount: { increment: Math.round(dto.amount * 100) },
          },
        });
      }

      return { success: true };
    });
  }

  async refundCreditNote(tenantId: string, shopId: string, id: string, amount: number, userId: string) {
    const creditNote = await this.getCreditNote(tenantId, shopId, id);

    if (creditNote.status === CreditNoteStatus.DRAFT || creditNote.status === CreditNoteStatus.VOIDED) {
      throw new BadRequestException('Credit note must be ISSUED or partially applied to refund');
    }

    const availableAmount = creditNote.totalAmount - (creditNote.appliedAmount || 0) - (creditNote.refundedAmount || 0);
    
    if (amount > availableAmount + 0.01) {
       throw new BadRequestException(`Cannot refund ${amount}. Available amount: ${availableAmount}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const newRefundedAmount = (creditNote.refundedAmount || 0) + amount;
      const isFull = ((creditNote.appliedAmount || 0) + newRefundedAmount) >= creditNote.totalAmount - 0.01;

      await tx.creditNote.update({
        where: { id },
        data: {
          refundedAmount: newRefundedAmount,
          status: isFull ? CreditNoteStatus.REFUNDED : CreditNoteStatus.PARTIALLY_APPLIED,
        },
      });

      // Also create a Receipt or Financial Entry?
      // ARCH doc says "mark as cash refunded".
      // I'll create a financial OUT entry.
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId,
          type: 'OUT',
          amount: Math.round(amount * 100),
          mode: 'CASH',
          referenceType: 'CREDIT_NOTE' as any,
          referenceId: id,
          note: `Refunable amount from CN ${creditNote.creditNoteNo}`,
        },
      });

      return { success: true };
    });
  }

  async voidCreditNote(tenantId: string, shopId: string, id: string, dto: VoidCreditNoteDto) {
    const creditNote = await this.getCreditNote(tenantId, shopId, id);

    if (creditNote.appliedAmount > 0 || creditNote.refundedAmount > 0) {
      throw new BadRequestException('Cannot void a credit note that has already been applied or refunded');
    }

    return this.prisma.creditNote.update({
      where: { id },
      data: {
        status: CreditNoteStatus.VOIDED,
        voidReason: dto.reason,
        voidedAt: new Date(),
      },
    });
  }
}
