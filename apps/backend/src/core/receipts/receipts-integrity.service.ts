import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ReceiptIntegrityCheck {
  invoiceId: string;
  invoiceNumber: string;
  invoiceAmount: number;
  receiptTotal: number;
  receiptCancellationTotal: number;
  netReceived: number;
  outstandingBalance: number;
  status: 'OK' | 'OVER_COLLECTED' | 'CANCELLED_EXCEEDS';
  details: string;
}

@Injectable()
export class ReceiptsIntegrityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Verify receipt amounts don't exceed invoice (no over-collection)
   * NOTE: This service needs to be updated to match current Receipt model
   * Receipts don't have a 'type' field - they use 'status' instead
   */
  async verifyReceiptIntegrity(
    tenantId: string,
    invoiceId: string,
  ): Promise<ReceiptIntegrityCheck> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { receipts: true },
    });

    if (!invoice || invoice.tenantId !== tenantId) {
      throw new Error('Invoice not found');
    }

    // Sum all receipts (using status instead of type)
    const receiptTotal = invoice.receipts
      .filter((r) => r.status === 'ACTIVE')
      .reduce((sum, r) => sum + r.amount, 0);

    const receiptCancellationTotal = invoice.receipts
      .filter((r) => r.status === 'CANCELLED')
      .reduce((sum, r) => sum + r.amount, 0);

    const netReceived = receiptTotal - receiptCancellationTotal;
    const outstandingBalance = invoice.subTotal - netReceived;

    let status: 'OK' | 'OVER_COLLECTED' | 'CANCELLED_EXCEEDS' = 'OK';
    let details = '';

    if (netReceived > invoice.subTotal) {
      status = 'OVER_COLLECTED';
      details = `Over-collection detected: ${netReceived} received > ${invoice.subTotal} invoice amount`;
    }

    if (receiptCancellationTotal > receiptTotal) {
      status = 'CANCELLED_EXCEEDS';
      details = `Cancellation exceeds receipts: ${receiptCancellationTotal} cancelled > ${receiptTotal} received`;
    }

    // Update Invoice.paidAmount to reflect net received
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: netReceived },
    });

    return {
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      invoiceAmount: invoice.subTotal,
      receiptTotal,
      receiptCancellationTotal,
      netReceived,
      outstandingBalance,
      status,
      details,
    };
  }

  /**
   * Get all invoices with receipt discrepancies
   */
  async getDiscrepancyReport(
    tenantId: string,
  ): Promise<ReceiptIntegrityCheck[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      include: { receipts: true },
    });

    const discrepancies: ReceiptIntegrityCheck[] = [];

    for (const invoice of invoices) {
      const receiptTotal = invoice.receipts
        .filter((r) => r.status === 'ACTIVE')
        .reduce((sum, r) => sum + r.amount, 0);

      const receiptCancellationTotal = invoice.receipts
        .filter((r) => r.status === 'CANCELLED')
        .reduce((sum, r) => sum + r.amount, 0);

      const netReceived = receiptTotal - receiptCancellationTotal;

      if (
        netReceived > invoice.subTotal ||
        receiptCancellationTotal > receiptTotal
      ) {
        let status: 'OVER_COLLECTED' | 'CANCELLED_EXCEEDS' = 'OVER_COLLECTED';
        let details = '';

        if (netReceived > invoice.subTotal) {
          status = 'OVER_COLLECTED';
          details = `Over-collection: ${netReceived} > ${invoice.subTotal}`;
        } else {
          status = 'CANCELLED_EXCEEDS';
          details = `Cancellation exceeds: ${receiptCancellationTotal} > ${receiptTotal}`;
        }

        discrepancies.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          invoiceAmount: invoice.subTotal,
          receiptTotal,
          receiptCancellationTotal,
          netReceived,
          outstandingBalance: invoice.subTotal - netReceived,
          status,
          details,
        });
      }
    }

    return discrepancies;
  }

  /**
   * Sync Invoice.paidAmount with Receipt sum (idempotent)
   */
  async syncPaidAmounts(tenantId: string): Promise<{ synced: number }> {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
      include: { receipts: true },
    });

    let syncedCount = 0;

    for (const invoice of invoices) {
      const netReceived =
        invoice.receipts
          .filter((r) => r.status === 'ACTIVE')
          .reduce((sum, r) => sum + r.amount, 0) -
        invoice.receipts
          .filter((r) => r.status === 'CANCELLED')
          .reduce((sum, r) => sum + r.amount, 0);

      if (invoice.paidAmount !== netReceived) {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: netReceived },
        });
        syncedCount++;
      }
    }

    return { synced: syncedCount };
  }
}
