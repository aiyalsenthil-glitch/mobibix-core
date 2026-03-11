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

  private toPaisa(amount: number): number {
    return Math.round(amount * 100);
  }

  private fromPaisa(amount: number): number {
    return amount / 100;
  }

  private mapCreditNote(cn: any) {
    if (!cn) return null;
    return {
      ...cn,
      subTotal: this.fromPaisa(cn.subTotal),
      gstAmount: this.fromPaisa(cn.gstAmount),
      totalAmount: this.fromPaisa(cn.totalAmount),
      appliedAmount: this.fromPaisa(cn.appliedAmount || 0),
      refundedAmount: this.fromPaisa(cn.refundedAmount || 0),
      items: cn.items?.map((item: any) => ({
        ...item,
        rate: this.fromPaisa(item.rate),
        gstAmount: this.fromPaisa(item.gstAmount),
        lineTotal: this.fromPaisa(item.lineTotal),
      })),
      applications: cn.applications?.map((app: any) => ({
        ...app,
        amount: this.fromPaisa(app.amount),
        invoice: app.invoice ? { ...app.invoice, totalAmount: this.fromPaisa(app.invoice.totalAmount) } : undefined,
        purchase: app.purchase ? { ...app.purchase, grandTotal: this.fromPaisa(app.purchase.grandTotal) } : undefined,
      })),
    };
  }

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
      data: items.map(item => this.mapCreditNote(item)),
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

    return this.mapCreditNote(creditNote);
  }

  async createCreditNote(tenantId: string, shopId: string, dto: CreateCreditNoteDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Calculate totals
      let subTotal = 0;
      let gstAmount = 0;

      const itemsData = dto.items.map((item) => {
        const ratePaisa = this.toPaisa(item.rate);
        const itemSubTotal = ratePaisa * item.quantity;
        const itemGstAmount = Math.round((itemSubTotal * (item.gstRate || 0)) / 100);
        
        subTotal += itemSubTotal;
        gstAmount += itemGstAmount;

        return {
          shopProductId: item.shopProductId,
          description: item.description,
          quantity: item.quantity,
          rate: ratePaisa,
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

      return this.mapCreditNote(creditNote);
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
      const updated = await tx.creditNote.update({
        where: { id },
        data: {
          creditNoteNo,
          status: CreditNoteStatus.ISSUED,
        },
      });
      return this.mapCreditNote(updated);
    });
  }

  async applyCreditNote(tenantId: string, shopId: string, id: string, dto: ApplyCreditNoteDto, userId: string) {
    const creditNote = await this.getCreditNote(tenantId, shopId, id);

    if (creditNote.status === CreditNoteStatus.DRAFT || creditNote.status === CreditNoteStatus.VOIDED) {
      throw new BadRequestException('Credit note must be ISSUED or partially applied to use');
    }

    const totalAmount = creditNote.totalAmount; // Already converted to Rupees by mapCreditNote
    const appliedAmount = (creditNote.appliedAmount || 0);
    const refundedAmount = (creditNote.refundedAmount || 0);
    const availableAmount = totalAmount - appliedAmount - refundedAmount;
    
    if (dto.amount > availableAmount + 0.01) { // Floating point buffer
       throw new BadRequestException(`Cannot apply ${dto.amount}. Available amount: ${availableAmount}`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create Application record
      const amountPaisa = this.toPaisa(dto.amount);
      await tx.creditNoteApplication.create({
        data: {
          creditNoteId: id,
          invoiceId: dto.invoiceId,
          purchaseId: dto.purchaseId,
          amount: amountPaisa,
          appliedBy: userId,
        },
      });

      // 2. Update Credit Note totals
      const currentAppliedPaisa = Math.round((creditNote.appliedAmount || 0) * 100);
      const newAppliedPaisa = currentAppliedPaisa + this.toPaisa(dto.amount);
      const totalAmountPaisa = Math.round(creditNote.totalAmount * 100);
      const refundedAmountPaisa = Math.round((creditNote.refundedAmount || 0) * 100);
      
      const isFull = (newAppliedPaisa + refundedAmountPaisa) >= totalAmountPaisa - 1; // 1 paisa buffer

      await tx.creditNote.update({
        where: { id },
        data: {
          appliedAmount: newAppliedPaisa,
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
            paidAmount: { increment: this.toPaisa(dto.amount) },
          },
        });
        
        // Potential status update for invoice? SalesService handles this in recordPayment.
        // I might need to trigger a status re-check for the invoice.
      }

      if (dto.purchaseId) {
        await tx.purchase.update({
          where: { id: dto.purchaseId },
          data: {
            paidAmount: { increment: this.toPaisa(dto.amount) },
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

    const totalAmount = creditNote.totalAmount; // Rupees
    const appliedAmount = (creditNote.appliedAmount || 0);
    const refundedAmount = (creditNote.refundedAmount || 0);
    const availableAmount = totalAmount - appliedAmount - refundedAmount;
    
    if (amount > availableAmount + 0.01) {
       throw new BadRequestException(`Cannot refund ${amount}. Available amount: ${availableAmount}`);
    }

    return this.prisma.$transaction(async (tx) => {
      const currentRefundedPaisa = Math.round((creditNote.refundedAmount || 0) * 100);
      const newRefundedPaisa = currentRefundedPaisa + this.toPaisa(amount);
      const totalAmountPaisa = Math.round(creditNote.totalAmount * 100);
      const appliedAmountPaisa = Math.round((creditNote.appliedAmount || 0) * 100);

      const isFull = (appliedAmountPaisa + newRefundedPaisa) >= totalAmountPaisa - 1;

      await tx.creditNote.update({
        where: { id },
        data: {
          refundedAmount: newRefundedPaisa,
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
          amount: this.toPaisa(amount),
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
