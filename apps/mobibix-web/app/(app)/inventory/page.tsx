"use client";

import { useEffect, useState } from "react";
import {
  listProducts,
  type ShopProduct,
  updateProduct,
} from "@/services/products.api";
import { stockIn } from "@/services/inventory.api";
import { getStockBalances } from "@/services/stock.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [quantity, setQuantity] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAddStockModal, setShowAddStockModal] = useState(false); // Modal control
  const [editingCostId, setEditingCostId] = useState<string | null>(null); // Inline edit cost
  const [editingCostValue, setEditingCostValue] = useState("");
  const [updatingCostId, setUpdatingCostId] = useState<string | null>(null);

  // Load products when shop selection changes
  useEffect(() => {
    const loadProducts = async () => {
      if (!selectedShopId) {
        setProducts([]);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        // Fetch products and stock balances, then merge on productId
        const [productList, balances] = await Promise.all([
          listProducts(selectedShopId),
          getStockBalances(selectedShopId),
        ]);

        const balanceMap = new Map(balances.map((b) => [b.productId, b]));

        const merged: ShopProduct[] = productList.map((p) => {
          const b = balanceMap.get(p.id);
          const stockQty = b?.stockQty ?? p.stockQty ?? 0;
          const isNegative = b?.isNegative ?? stockQty < 0;
          return {
            ...p,
            stockQty,
            isNegative,
          };
        });

        setProducts(merged);
      } catch (err: any) {
        console.error("Error loading products:", err);
        setError(err.message || "Failed to load products");
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadProducts();
  }, [selectedShopId]);

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return product.name.toLowerCase().includes(query);
  });

  const handleStockIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !selectedShopId) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await stockIn(selectedShopId, {
        shopProductId: selectedProduct.id,
        quantity: parseInt(quantity),
        costPrice: parseFloat(costPrice) || 0,
        type: selectedProduct.type,
      });

      // Reload products + stock balances to get updated stock
      const [productList, balances] = await Promise.all([
        listProducts(selectedShopId),
        getStockBalances(selectedShopId),
      ]);

      const balanceMap = new Map(balances.map((b) => [b.productId, b]));
      const merged: ShopProduct[] = productList.map((p) => {
        const b = balanceMap.get(p.id);
        const stockQty = b?.stockQty ?? p.stockQty ?? 0;
        const isNegative = b?.isNegative ?? stockQty < 0;
        return {
          ...p,
          stockQty,
          isNegative,
        };
      });
      setProducts(merged);

      // Reset form
      setSelectedProduct(null);
      setQuantity("");
      setCostPrice("");
      setSearchQuery("");
      setShowAddStockModal(false); // Close modal after success
      setSuccessMessage("✅ Stock added successfully!");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to add stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update product cost
  const handleUpdateCost = async (productId: string, newCost: string) => {
    if (!selectedShopId || !newCost) return;

    try {
      const cost = parseFloat(newCost);
      if (cost <= 0) {
        setError("Cost must be greater than 0");
        return;
      }

      setUpdatingCostId(productId);

      // Call updateProduct API to update cost
      await updateProduct(selectedShopId, productId, { costPrice: cost });

      // Update local state
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, costPrice: cost } : p)),
      );

      setEditingCostId(null);
      setEditingCostValue("");
      setSuccessMessage("✅ Cost updated successfully!");
      setTimeout(() => setSuccessMessage(null), 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update cost");
    } finally {
      setUpdatingCostId(null);
    }
  };

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
      {showAddStockModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className={`w-full max-w-md rounded-xl shadow-2xl transform transition-all ${
              theme === "dark"
                ? "bg-gray-900 border border-white/10"
                : "bg-white border border-gray-200"
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-6 py-4 border-b flex items-center justify-between ${theme === "dark" ? "border-white/10" : "border-gray-200"}`}
            >
              <h2
                className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
              >
                📦 Add Stock
              </h2>
              <button
                onClick={() => {
                  setShowAddStockModal(false);
                  setSelectedProduct(null);
                  setQuantity("");
                  setCostPrice("");
                  setSearchQuery("");
                  setError(null);
                }}
                className={`text-2xl leading-none transition ${theme === "dark" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}`}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6">
              <form onSubmit={handleStockIn} className="space-y-4">
                {/* Product Selection */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Product <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={
                        selectedProduct
                          ? selectedProduct.name
                          : "Search product..."
                      }
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value) {
                          setSelectedProduct(null);
                        }
                      }}
                      className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                        theme === "dark"
                          ? "bg-gray-800 border-white/20 text-white placeholder-gray-500"
                          : "bg-white border-gray-300 text-black placeholder-gray-400"
                      }`}
                    />
                    {searchQuery && (
                      <div
                        className={`absolute z-10 w-full mt-1 border rounded-lg shadow-lg max-h-60 overflow-auto ${theme === "dark" ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
                      >
                        {filteredProducts.map((product) => (
                          <button
                            key={product.id}
                            type="button"
                            onClick={() => {
                              setSelectedProduct(product);
                              setSearchQuery("");
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b last:border-0 transition ${
                              theme === "dark"
                                ? "border-gray-700 text-white"
                                : "border-gray-100 text-gray-900"
                            }`}
                          >
                            <div className="font-medium">{product.name}</div>
                            <div
                              className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                            >
                              Stock: {product.stockQty || 0} | Price: ₹
                              {product.salePrice} | Cost: ₹
                              {product.avgCost ||
                                product.costPrice ||
                                "Not Set"}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedProduct && (
                    <div
                      className={`mt-2 p-2 rounded-lg text-sm font-medium border ${
                        theme === "dark"
                          ? "bg-teal-500/20 border-teal-500/30 text-teal-200"
                          : "bg-teal-50 border-teal-200 text-teal-900"
                      }`}
                    >
                      ✓ {selectedProduct.name}
                    </div>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Quantity <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    required
                    min="1"
                    placeholder="Enter quantity"
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                      theme === "dark"
                        ? "bg-gray-800 border-white/20 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-black placeholder-gray-400"
                    }`}
                  />
                </div>

                {/* Cost Price */}
                <div>
                  <label
                    className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Cost per Unit (₹) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="Enter cost price"
                    className={`w-full px-4 py-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 transition ${
                      theme === "dark"
                        ? "bg-gray-800 border-white/20 text-white placeholder-gray-500"
                        : "bg-white border-gray-300 text-black placeholder-gray-400"
                    }`}
                  />
                  <p
                    className={`mt-1 text-xs font-medium ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
                  >
                    💡 Must be greater than 0
                  </p>
                </div>

                {error && (
                  <div
                    className={`p-3 rounded-lg border text-sm font-medium ${
                      theme === "dark"
                        ? "bg-red-500/20 border-red-500/50 text-red-200"
                        : "bg-red-50 border-red-200 text-red-700"
                    }`}
                  >
                    ❌ {error}
                  </div>
                )}

                {successMessage && (
                  <div
                    className={`p-3 rounded-lg border text-sm font-medium ${
                      theme === "dark"
                        ? "bg-green-500/20 border-green-500/50 text-green-200"
                        : "bg-green-50 border-green-200 text-green-700"
                    }`}
                  >
                    {successMessage}
                  </div>
                )}

                {/* Modal Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddStockModal(false);
                      setSelectedProduct(null);
                      setQuantity("");
                      setCostPrice("");
                      setSearchQuery("");
                      setError(null);
                    }}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                      theme === "dark"
                        ? "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-900 border border-gray-300"
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !selectedProduct}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition ${
                      isSubmitting || !selectedProduct
                        ? "bg-gray-400 cursor-not-allowed text-gray-600"
                        : "bg-teal-600 hover:bg-teal-700 text-white"
                    }`}
                  >
                    {isSubmitting ? "🔄 Adding..." : "✓ Add Stock"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

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
        <div
          className={`border rounded-xl overflow-hidden shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`border-b ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-300"}`}
              >
                <tr>
                  {[
                    "Product Name",
                    "Current Stock",
                    "Sale Price",
                    "Cost Price",
                    "Status",
                    "Action",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`text-left px-6 py-4 text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b last:border-b-0 transition ${theme === "dark" ? "border-white/10 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    {/* Product Name */}
                    <td
                      className={`px-6 py-4 font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {product.name}
                    </td>

                    {/* Current Stock */}
                    <td
                      className={`px-6 py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}
                    >
                      <span
                        className={
                          product.isNegative
                            ? theme === "dark"
                              ? "text-red-300 font-semibold"
                              : "text-red-600 font-semibold"
                            : undefined
                        }
                      >
                        {product.stockQty || 0}
                      </span>
                      {product.isNegative && (
                        <span
                          className={`ml-2 inline-block text-xs px-2 py-0.5 rounded font-medium ${
                            theme === "dark"
                              ? "bg-red-500/20 text-red-200"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          Negative
                        </span>
                      )}
                    </td>

                    {/* Sale Price */}
                    <td
                      className={`px-6 py-4 font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      ₹{product.salePrice.toFixed(2)}
                    </td>

                    {/* Cost Price - Editable */}
                    <td className="px-6 py-4">
                      {editingCostId === product.id ? (
                        <div className="flex gap-2 items-center">
                          <input
                            type="number"
                            value={editingCostValue}
                            onChange={(e) =>
                              setEditingCostValue(e.target.value)
                            }
                            min="0.01"
                            step="0.01"
                            placeholder="Cost"
                            className={`w-24 px-2 py-1 rounded text-sm border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                              theme === "dark"
                                ? "bg-gray-800 border-white/20 text-white"
                                : "bg-white border-gray-300 text-black"
                            }`}
                          />
                          <button
                            onClick={() =>
                              handleUpdateCost(product.id, editingCostValue)
                            }
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
                        <div
                          className={`flex items-center gap-2 ${
                            (product.avgCost || product.costPrice || 0) > 0
                              ? theme === "dark"
                                ? "text-white"
                                : "text-gray-900"
                              : theme === "dark"
                                ? "text-red-300"
                                : "text-red-600"
                          }`}
                        >
                          {(product.avgCost || product.costPrice) &&
                          (product.avgCost || product.costPrice) > 0 ? (
                            <>
                              <span className="font-semibold">
                                ₹
                                {(
                                  product.avgCost || product.costPrice
                                )?.toFixed(2)}
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
                              <span className="text-sm font-medium">
                                Not Set
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300">
                                ⚠ Missing
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-6 py-4">
                      {(product.avgCost || product.costPrice) &&
                      (product.avgCost || product.costPrice) > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                          🟢 Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
                          🟡 Incomplete
                        </span>
                      )}
                    </td>

                    {/* Edit Action */}
                    <td className="px-6 py-4">
                      {editingCostId !== product.id && (
                        <button
                          onClick={() => {
                            setEditingCostId(product.id);
                            setEditingCostValue(
                              (
                                product.avgCost || product.costPrice
                              )?.toString() || "",
                            );
                          }}
                          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs rounded-lg font-medium transition"
                        >
                          Edit Cost
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
