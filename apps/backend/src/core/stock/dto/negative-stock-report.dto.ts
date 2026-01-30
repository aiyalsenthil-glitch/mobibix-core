export class NegativeStockReportDto {
  shopProductId: string;
  shopId: string;
  shopName: string;
  productName: string;
  currentStock: number;
  firstNegativeDate: Date | null;
  lastMovementDate?: Date | null;
}
