export class StockTrendPointDto {
  date: string;
  stockIn: number;
  stockOut: number;
}

export class FastMovingDto {
  productId: string;
  name: string;
  outQty: number;
}

export class NegativeStockDto {
  productId: string;
  name: string;
  negativeCount: number;
  negativeDays: number;
}

export class StockKpiOverviewDto {
  trend: StockTrendPointDto[];
  fastMoving: FastMovingDto[];
  deadStock: FastMovingDto[];
  negativeStock: NegativeStockDto[];
}
