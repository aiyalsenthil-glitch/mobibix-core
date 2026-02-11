/**
 * Inventory Management Utilities
 * Handles stock tracking, low stock alerts, and inventory calculations
 */

export interface StockLevel {
  productId: string;
  currentStock: number;
  reorderLevel: number;
  reorderQty: number;
  lastRestockDate?: Date | string;
  isLowStock: boolean;
  stockStatus: "CRITICAL" | "LOW" | "NORMAL" | "OVERSTOCK";
}

export interface StockAdjustment {
  productId: string;
  quantity: number;
  type: "IN" | "OUT" | "ADJUSTMENT";
  reason: string;
  reference?: string;
  date: Date | string;
}

/**
 * Determine stock status based on current level
 */
export function getStockStatus(
  currentStock: number,
  reorderLevel: number,
): StockLevel["stockStatus"] {
  if (currentStock === 0) return "CRITICAL";
  if (currentStock < reorderLevel) return "LOW";
  if (currentStock > reorderLevel * 3) return "OVERSTOCK";
  return "NORMAL";
}

/**
 * Get color code for stock status badge
 */
export function getStockStatusColor(status: StockLevel["stockStatus"]): string {
  const colors: Record<StockLevel["stockStatus"], string> = {
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
    LOW: "bg-amber-100 text-amber-800 border-amber-300",
    NORMAL: "bg-green-100 text-green-800 border-green-300",
    OVERSTOCK: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return colors[status];
}

/**
 * Calculate days until stockout at current consumption rate
 */
export function daysUntilStockout(
  currentStock: number,
  avgDailyConsumption: number,
): number {
  if (avgDailyConsumption === 0) return Infinity;
  return Math.ceil(currentStock / avgDailyConsumption);
}

/**
 * Calculate reorder quantity based on lead time and consumption
 */
export function calculateReorderQty(
  leadTimeDays: number,
  avgDailyConsumption: number,
  safetyStock: number,
): number {
  const reorderPoint = leadTimeDays * avgDailyConsumption + safetyStock;
  return Math.ceil(reorderPoint);
}

/**
 * Get inventory turnover ratio (higher is better)
 */
export function getInventoryTurnover(
  costOfGoodsSold: number,
  avgInventoryValue: number,
): number {
  if (avgInventoryValue === 0) return 0;
  return costOfGoodsSold / avgInventoryValue;
}

/**
 * Calculate holding cost for inventory
 * Annual holding cost = average inventory value × holding cost percentage
 */
export function getHoldingCost(
  avgInventoryValue: number,
  holdingCostPercentage: number = 0.25,
): number {
  // Default 25% per year (includes storage, insurance, obsolescence)
  return avgInventoryValue * holdingCostPercentage;
}

/**
 * Calculate economic order quantity (EOQ)
 * EOQ = sqrt((2 × D × S) / H)
 * D = Annual demand
 * S = Order cost per unit
 * H = Holding cost per unit per year
 */
export function calculateEOQ(
  annualDemand: number,
  orderCostPerUnit: number,
  holdingCostPerUnit: number,
): number {
  if (holdingCostPerUnit === 0) return 0;
  const eoq = Math.sqrt(
    (2 * annualDemand * orderCostPerUnit) / holdingCostPerUnit,
  );
  return Math.ceil(eoq);
}

/**
 * Validate stock adjustment
 */
export function validateStockAdjustment(
  adjustment: Partial<StockAdjustment>,
  currentStock: number,
): { valid: boolean; error?: string } {
  if (!adjustment.productId) {
    return { valid: false, error: "Product is required" };
  }

  if (adjustment.quantity === undefined || adjustment.quantity <= 0) {
    return { valid: false, error: "Quantity must be greater than 0" };
  }

  if (adjustment.type === "OUT" && adjustment.quantity > currentStock) {
    return {
      valid: false,
      error: `Cannot remove more than available stock (${currentStock} available)`,
    };
  }

  if (!adjustment.reason) {
    return { valid: false, error: "Reason is required" };
  }

  return { valid: true };
}
