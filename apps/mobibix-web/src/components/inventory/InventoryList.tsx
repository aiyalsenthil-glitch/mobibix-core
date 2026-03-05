"use client";

import { useState, useEffect } from "react";
import { getStockLevels, type ShopProduct } from "@/services/products.api";
import { getStockStatus, getStockStatusColor } from "@/lib/inventory.utils";
import { formatCurrency } from "@/lib/gst.utils";

interface InventoryListProps {
  shopId: string;
  onAdjustStock?: (product: ShopProduct) => void;
}

type SortField = "name" | "stock" | "reorderLevel" | "stockValue";
type SortOrder = "asc" | "desc";

export function InventoryList({ shopId, onAdjustStock }: InventoryListProps) {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [filterStatus, setFilterStatus] = useState<
    "ALL" | "CRITICAL" | "LOW" | "NORMAL" | "OVERSTOCK"
  >("ALL");

  // Load products
  useEffect(() => {
    if (!shopId) return;

    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStockLevels(shopId);
        const productsList = Array.isArray(data) ? data : data.data || [];
        setProducts(productsList);
      } catch (err: unknown) {
        console.error("Failed to load products:", err);
        setError((err as any)?.message || "Failed to load inventory");
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [shopId]);

  // Filter and sort products
  const filteredProducts = products
    .filter((product) => {
      // Search filter
      if (
        searchTerm &&
        !product.name?.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Status filter
      if (filterStatus !== "ALL") {
        const status = getStockStatus(
          product.stock || 0,
          product.reorderLevel || 0,
        );
        if (status !== filterStatus) return false;
      }

      return true;
    })
    .sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      switch (sortField) {
        case "name":
          aVal = a.name?.toLowerCase() || "";
          bVal = b.name?.toLowerCase() || "";
          break;
        case "stock":
          aVal = a.stock || 0;
          bVal = b.stock || 0;
          break;
        case "reorderLevel":
          aVal = a.reorderLevel || 0;
          bVal = b.reorderLevel || 0;
          break;
        case "stockValue":
          const aPrice = (a.costPrice || a.salePrice || 0) / 100;
          const bPrice = (b.costPrice || b.salePrice || 0) / 100;
          const aValue = (a.stock || 0) * aPrice;
          const bValue = (b.stock || 0) * bPrice;
          aVal = aValue;
          bVal = bValue;
          break;
        default:
          aVal = a.name;
          bVal = b.name;
      }

      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortOrder === "asc" ? comparison : -comparison;
    });

  // Calculate totals
  const totalStock = products.reduce((sum, p) => sum + (p.stock || 0), 0);
  const totalValue = products.reduce(
    (sum, p) =>
      sum + (p.stock || 0) * ((p.costPrice || p.salePrice || 0) / 100),
    0,
  );

  if (loading) {
    return (
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory</h3>
        <div className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
          <p className="text-sm text-blue-700">Total Units in Stock</p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{totalStock}</p>
        </div>
        <div className="rounded-lg bg-linear-to-br from-green-50 to-green-100 border border-green-200 p-4">
          <p className="text-sm text-green-700">Total Inventory Value</p>
          <p className="mt-1 text-3xl font-bold text-green-900">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="rounded-lg bg-white border border-gray-200 p-4 space-y-3">
        <div className="grid gap-3 md:grid-cols-3">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Search Product
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Product name or SKU..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Filter by Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value as
                    | "ALL"
                    | "CRITICAL"
                    | "LOW"
                    | "NORMAL"
                    | "OVERSTOCK",
                )
              }
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="CRITICAL">Critical</option>
              <option value="LOW">Low</option>
              <option value="NORMAL">Normal</option>
              <option value="OVERSTOCK">Overstock</option>
            </select>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sort By
            </label>
            <div className="flex gap-2">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="name">Product</option>
                <option value="stock">Stock Qty</option>
                <option value="reorderLevel">Reorder Lvl</option>
                <option value="stockValue">Value</option>
              </select>
              <button
                onClick={() =>
                  setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                }
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
              >
                {sortOrder === "asc" ? "↑" : "↓"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
        {error ? (
          <div className="p-6">
            <div className="rounded-lg bg-red-50 border border-red-200 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="font-medium">No products found</p>
            <p className="text-sm">
              Try adjusting your filters or search terms
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-50">
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    Product
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Current Stock
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Reorder Level
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-700">
                    Stock Value
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(
                    product.stock || 0,
                    product.reorderLevel || 0,
                  );
                  const statusColor = getStockStatusColor(status);
                  const stockValue =
                    (product.stock || 0) *
                    ((product.costPrice || product.salePrice || 0) / 100);

                  return (
                    <tr
                      key={product.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-gray-600">
                            {product.sku || product.id.slice(0, 8)}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-gray-900">
                          {product.stock || 0}
                        </p>
                        <p className="text-xs text-gray-600">units</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-gray-600">
                          {product.reorderLevel || "-"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(stockValue)}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${statusColor}`}
                        >
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {onAdjustStock && (
                          <button
                            onClick={() => onAdjustStock(product)}
                            className="text-blue-600 hover:text-blue-700 font-medium text-xs"
                          >
                            Adjust
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
