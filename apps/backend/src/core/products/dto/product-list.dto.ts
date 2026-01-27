export class ProductListDto {
  id: string;
  name: string;

  hsnCode?: string;
  gstRate?: number;

  salePrice?: number;
  costPrice?: number;

  isActive: boolean;
  stockQty: number;
}
