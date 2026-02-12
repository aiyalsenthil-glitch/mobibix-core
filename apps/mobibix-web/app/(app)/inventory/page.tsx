"use client";

import { useEffect, useState } from "react";
import {
  listProducts,
  type ShopProduct,
} from "@/services/products.api";
import { stockIn } from "@/services/inventory.api";
import { getStockBalances } from "@/services/stock.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";
import { StockInModal } from "@/components/inventory/StockInModal";
import { useProductCost } from "@/hooks/useProductCost";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function InventoryPage() {
  const { theme } = useTheme();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    error: shopsError,
    selectShop,
    hasMultipleShops,
  } = useShop();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Modal control
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    editingCostId,
    setEditingCostId,
    editingCostValue,
    setEditingCostValue,
    updatingCostId,
    handleUpdateCost,
  } = useProductCost({
    selectedShopId,
    setProducts,
    setError,
    setSuccessMessage,
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Inventory Management
        </h1>
      </div>

      {/* Shop Filter Section */}
      {isLoadingShops ? (
        <div
          className={`border rounded-lg p-4 mb-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <div className={theme === "dark" ? "text-gray-300" : "text-black"}>
            Loading shops...
          </div>
        </div>
      ) : shops.length === 0 ? (
        <div className="mb-6">
          <NoShopsAlert variant="compact" />
        </div>
      ) : (
        hasMultipleShops && (
          <div
            className={`border rounded-lg p-4 mb-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
          >
            <label
              className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
            >
              Select Shop
            </label>
            <select
              value={selectedShopId}
              onChange={(e) => selectShop(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                theme === "dark"
                  ? "bg-gray-800 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              }`}
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
        )
      )}

      {/* Add Stock Button */}
      {shops.length > 0 && (
        <div className="mb-6 flex justify-end">
          <button
            onClick={() => setShowAddStockModal(true)}
            className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 shadow-lg ${
              theme === "dark"
                ? "bg-teal-600 hover:bg-teal-700 text-white"
                : "bg-teal-600 hover:bg-teal-700 text-white"
            }`}
          >
            <span>📦</span> Add Stock
          </button>
        </div>
      )}



      {/* Add Stock Modal */}
      <StockInModal
        open={showAddStockModal}
        onOpenChange={setShowAddStockModal}
        shopId={selectedShopId || ""}
        filteredProducts={products}
        onSuccess={() => {
           // Reload products
           if (selectedShopId) {
             setRefreshTrigger(prev => prev + 1);
           }
           setSuccessMessage("✅ Stock added successfully!");
           setTimeout(() => setSuccessMessage(null), 3000);
        }}
      />


      {/* Products Table */}
      {(error || shopsError) && (
        <div
          className={`p-4 rounded-lg border text-sm font-medium mb-4 ${
            theme === "dark"
              ? "bg-red-500/20 border-red-500/50 text-red-200"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          ❌ {error || shopsError}
        </div>
      )}

      {isLoading ? (
        <div
          className={`text-center py-12 font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
        >
          Loading products...
        </div>
      ) : !selectedShopId ? (
        <div className="text-center py-12">
          <p
            className={`font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            Select a shop to manage inventory
          </p>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p
            className={`font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            No products available
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product Name</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Sale Price</TableHead>
                <TableHead>Cost Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>
                    <span
                      className={
                        product.isNegative
                          ? "text-red-600 dark:text-red-400 font-semibold"
                          : undefined
                      }
                    >
                      {product.stockQty || 0}
                    </span>
                    {product.isNegative && (
                      <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                        Negative
                      </span>
                    )}
                  </TableCell>
                  <TableCell>₹{(product.salePrice / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    {editingCostId === product.id ? (
                      <div className="flex gap-2 items-center">
                        <input
                          type="number"
                          value={editingCostValue}
                          onChange={(e) => setEditingCostValue(e.target.value)}
                          min="0.01"
                          step="0.01"
                          placeholder="Cost"
                          className="w-24 px-2 py-1 rounded text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-background"
                        />
                        <button
                          onClick={() => handleUpdateCost(product.id, editingCostValue)}
                          disabled={updatingCostId === product.id}
                          className="px-2 py-1 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded font-medium transition"
                        >
                          {updatingCostId === product.id ? "..." : "✓"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingCostId(null);
                            setEditingCostValue("");
                          }}
                          className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs rounded font-medium transition"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {(product.avgCost || product.costPrice || 0) > 0 ? (
                          <>
                            <span className="font-semibold">
                              ₹{((product.avgCost || product.costPrice || 0) / 100).toFixed(2)}
                            </span>
                            {product.avgCost ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                                📊 WAC
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                                ✓ Set
                              </span>
                            )}
                          </>
                        ) : (
                          <>
                            <span className="text-sm font-medium">Not Set</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300">
                              ⚠ Missing
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {(product.avgCost || product.costPrice || 0) > 0 ? (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                        🟢 Ready
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                        🟡 Incomplete
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCostId !== product.id && (
                      <button
                        onClick={() => {
                          setEditingCostId(product.id);
                          setEditingCostValue(
                            ((product.avgCost || product.costPrice || 0) / 100)?.toString() || ""
                          );
                        }}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg font-medium transition"
                      >
                        Edit Cost
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

    </div>
  );
}
