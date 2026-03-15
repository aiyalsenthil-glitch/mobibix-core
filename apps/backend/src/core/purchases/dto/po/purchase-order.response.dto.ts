import { POStatus } from '@prisma/client';

export class PurchaseOrderItemResponseDto {
  id: string;
  globalProductId?: string;
  description: string;
  quantity: number;
  estimatedPrice?: number;
  receivedQuantity: number;
  uom?: string;
}

export class PurchaseOrderResponseDto {
  id: string;
  tenantId: string;
  shopId: string;
  poNumber: string;
  globalSupplierId?: string;
  supplierName: string;
  orderDate: Date;
  expectedDelivery?: Date;
  totalEstimatedAmount: number;
  currency: string;
  exchangeRate: number;
  paymentDueDays: number;
  notes?: string;
  status: POStatus;
  createdAt: Date;
  updatedAt: Date;
  items: PurchaseOrderItemResponseDto[];
}
