import { Receipt } from '@prisma/client';

export class ReceiptEntity implements Receipt {
  id: string;
  tenantId: string;
  shopId: string;
  receiptId: string;
  printNumber: string;
  receiptType: any;
  amount: number;
  paymentMethod: any;
  transactionRef: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string | null;
  linkedInvoiceId: string | null;
  linkedJobId: string | null;
  narration: string | null;
  status: any;
  createdAt: Date;
  createdBy: string | null;
}
