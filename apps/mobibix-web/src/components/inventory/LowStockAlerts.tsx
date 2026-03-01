"use client";

import { useEffect, useState } from "react";
import { getLowStockProducts, type ShopProduct } from "@/services/products.api";
import {
  getStockStatus,
  getStockStatusColor,
  daysUntilStockout,
} from "@/lib/inventory.utils";

interface LowStockAlertsProps {
  shopId: string;
  onAdjustStock?: (product: ShopProduct) => void;
}

export function LowStockAlerts({ shopId, onAdjustStock }: LowStockAlertsProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadLowStockProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getLowStockProducts(shopId);
        setProducts(data);
      } catch (err: unknown) {
        console.error("Failed to load low stock products:", err);
        setError((err as any)?.message || "Failed to load low stock products");
      } finally {
        setLoading(false);
      }
    };

    loadLowStockProducts();
  }, [shopId]);

  if (loading) {
    return (
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Low Stock Alerts
        </h3>
        <div className="flex items-center justify-center p-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        🔔 Low Stock Alerts
      </h3>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-green-300 bg-green-50 p-6 text-center">
          <p className="text-green-700 font-medium">
            ✓ All stocks are healthy!
          </p>
          <p className="text-sm text-green-600 mt-1">
            No products are running low
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((product) => {
            const stock = product.stock || 0;
            const reorderLevel = product.reorderLevel || 0;
            const status = getStockStatus(stock, reorderLevel);
            const statusColor = getStockStatusColor(status);
            const stockPercentage =
              reorderLevel > 0 ? Math.round((stock / reorderLevel) * 100) : 0;

            return (
              <div
                key={product.id}
                className={`rounded-lg border p-4 ${statusColor}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      SKU: {product.sku || product.id.slice(0, 8)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{stock}</p>
                    <p className="text-xs">units</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex justify-between mb-1">
                    <p className="text-xs font-medium">Stock Level</p>
                    <p className="text-xs font-medium">{stockPercentage}%</p>
                  </div>
                  <div className="h-2 rounded-full bg-gray-300 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        status === "CRITICAL"
                          ? "bg-red-500"
                          : status === "LOW"
                            ? "bg-amber-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Details */}
                <div className="grid gap-2 grid-cols-3 text-xs mb-3">
                  <div>
                    <p className="text-gray-600">Reorder Level</p>
                    <p className="font-semibold text-gray-900">
                      {reorderLevel}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Reorder Qty</p>
                    <p className="font-semibold text-gray-900">
                      {product.reorderQty || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <p className="font-semibold text-gray-900">{status}</p>
                  </div>
                </div>

                {/* Action Button */}
                {onAdjustStock && (
                  <button
                    onClick={() => onAdjustStock(product)}
                    className="w-full rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 transition"
                  >
                    📦 Add Stock
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
