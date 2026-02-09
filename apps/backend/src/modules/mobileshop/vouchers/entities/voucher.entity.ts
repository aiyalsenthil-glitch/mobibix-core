import { PaymentVoucher } from '@prisma/client';

export class VoucherEntity implements PaymentVoucher {
  id: string;
  tenantId: string;
  shopId: string;
  voucherId: string;
  voucherType: any;
  voucherSubType: any;
  date: Date;
  amount: number;
  paymentMethod: any;
  transactionRef: string | null;
  narration: string | null;
  globalSupplierId: string | null;
  expenseCategory: string | null;
  linkedPurchaseId: string | null;
  status: any;
  createdAt: Date;
  createdBy: string | null;
}
