import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateReceiptDto {
  invoiceId: string;
  amount: number;
  paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'BANK';
  transactionRef?: string;
  narration?: string;
}

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async recordPayment(tenantId: string, dto: CreateReceiptDto) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Fetch invoice
      const invoice = await tx.invoice.findFirst({
        where: { id: dto.invoiceId, tenantId },
      });

      if (!invoice) {
        throw new BadRequestException('Invoice not found');
      }

      if (invoice.status === 'CANCELLED') {
        throw new BadRequestException(
          'Cannot record payment on cancelled invoice',
        );
      }

      // 2. Create receipt
      const lastReceipt = await tx.receipt.findFirst({
        where: { shopId: invoice.shopId },
        orderBy: { createdAt: 'desc' },
        select: { printNumber: true },
      });

      const nextPrintNumber = lastReceipt
        ? String(parseInt(lastReceipt.printNumber) + 1).padStart(5, '0')
        : '00001';

      const receipt = await tx.receipt.create({
        data: {
          tenantId,
          shopId: invoice.shopId,
          receiptId: `RCP-${Date.now()}`,
          printNumber: nextPrintNumber,
          receiptType: 'PAYMENT',
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          transactionRef: dto.transactionRef,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          linkedInvoiceId: invoice.id,
          narration: dto.narration,
        },
      });

      // 3. Create financial entry (IN - money received)
      await tx.financialEntry.create({
        data: {
          tenantId,
          shopId: invoice.shopId,
          type: 'IN',
          amount: dto.amount,
          mode: dto.paymentMethod,
          referenceType: 'RECEIPT',
          referenceId: receipt.id,
          note: `Payment received for invoice ${invoice.invoiceNumber}`,
        },
      });

      // 4. Check if invoice is fully paid
      const totalReceipts = await tx.receipt.aggregate({
        where: {
          linkedInvoiceId: invoice.id,
          status: 'ACTIVE',
        },
        _sum: { amount: true },
      });

      const totalPaid = (totalReceipts._sum.amount || 0) + dto.amount;

      if (totalPaid >= invoice.totalAmount) {
        // Update invoice status to PAID
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: 'PAID' },
        });
      }

      return receipt;
    });
  }

  async listPayments(tenantId: string, invoiceId: string) {
    return this.prisma.receipt.findMany({
      where: {
        tenantId,
        linkedInvoiceId: invoiceId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
