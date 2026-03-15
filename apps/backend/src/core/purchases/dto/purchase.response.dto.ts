export class PurchaseResponseDto {
  id: string;
  tenantId: string;
  shopId: string;
  invoiceNumber: string;
  globalSupplierId?: string;
  supplierGstin?: string;
  supplierName: string;
  invoiceDate: Date;
  dueDate?: Date;
  subTotal: number;
  totalGst: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  paymentReference?: string;
  cashAmount?: number;
  upiAmount?: number;
  purchaseType: string;
  taxInclusive: boolean;
  status: string;
  notes?: string;
  items?: PurchaseItemResponseDto[];
  payments?: SupplierPaymentResponseDto[];
  createdAt: Date;
  updatedAt: Date;

  // Multi-currency
  currency: string;
  exchangeRate: number;
  poId?: string;
}

export class PurchaseItemResponseDto {
  id: string;
  shopProductId?: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  purchasePrice: number;
  gstRate: number;
  taxAmount: number;
  totalAmount: number;
}

export class SupplierPaymentResponseDto {
  id: string;
  amount: number;
  paymentMethod: string;
  paymentReference?: string;
  paymentDate: Date;
  notes?: string;
}
