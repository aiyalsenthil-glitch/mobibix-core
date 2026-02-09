"use client";

import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { type Shop } from "@/services/shops.api";
import { listProducts, type ShopProduct } from "@/services/products.api";

interface CopyFromShopModalProps {
  currentShopId: string;
  availableShops: Shop[];
  onClose: () => void;
  onCopyComplete: () => void;
}

export function CopyFromShopModal({
  currentShopId,
  availableShops,
  onClose,
  onCopyComplete,
}: CopyFromShopModalProps) {
  const { theme } = useTheme();
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
    new Set(),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter out current shop
  const sourceShops = availableShops.filter((s) => s.id !== currentShopId);

  useEffect(() => {
    if (selectedShopId) {
      loadSourceProducts();
    }
  }, [selectedShopId]);

  const loadSourceProducts = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listProducts(selectedShopId);
      // Handle both paginated and non-paginated responses
      const productsList = Array.isArray(data) ? data : data.data;
      setProducts(productsList);
      setSelectedProducts(new Set());
    } catch (err: any) {
      setError(err.message || "Failed to load products");
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) {
      newSet.delete(productId);
    } else {
      newSet.add(productId);
    }
    setSelectedProducts(newSet);
  };

  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map((p) => p.id)));
    }
  };

  const handleCopy = async () => {
    if (selectedProducts.size === 0) {
      alert("Please select at least one product to copy");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      // TODO: Call backend API to copy products
      const response = await fetch("/api/products/copy-from-shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceShopId: selectedShopId,
          targetShopId: currentShopId,
          productIds: Array.from(selectedProducts),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to copy products");
      }

      onCopyComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to copy products");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`w-full max-w-3xl rounded-lg shadow-xl ${
          theme === "dark"
            ? "bg-gray-900 border border-white/10"
            : "bg-white border border-gray-200"
        } max-h-[90vh] overflow-y-auto`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between p-6 border-b ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          <div>
            <h2
              className={`text-xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Copy Products from Another Shop
            </h2>
            <p
              className={`text-sm mt-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Select products to copy configuration (price, tax, settings only -
              no stock)
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-2xl ${
              theme === "dark"
                ? "text-gray-400 hover:text-white"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Shop Selector */}
          <div className="mb-6">
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-gray-300" : "text-gray-700"
              }`}
            >
              Source Shop <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                theme === "dark"
                  ? "bg-gray-800 border-white/20 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            >
              <option value="">Select a shop...</option>
              {sourceShops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/20 border border-red-200 dark:border-red-500/50 text-red-700 dark:text-red-200 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Products List */}
          {selectedShopId && (
            <div>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                  <p className="mt-2 text-sm text-gray-500">
                    Loading products...
                  </p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No products found in the selected shop
                </div>
              ) : (
                <>
                  {/* Select All */}
                  <div className="flex items-center justify-between mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedProducts.size === products.length}
                        onChange={toggleAll}
                        className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                      />
                      <span
                        className={`text-sm font-medium ${
                          theme === "dark" ? "text-gray-300" : "text-gray-700"
                        }`}
                      >
                        Select All ({products.length} products)
                      </span>
                    </label>
                    <span className="text-sm text-gray-500">
                      {selectedProducts.size} selected
                    </span>
                  </div>

                  {/* Products Grid */}
                  <div
                    className={`border rounded-lg overflow-hidden ${
                      theme === "dark" ? "border-white/10" : "border-gray-200"
                    }`}
                  >
                    <div className="max-h-96 overflow-y-auto">
                      {products.map((product) => (
                        <label
                          key={product.id}
                          className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 border-b last:border-b-0 ${
                            theme === "dark"
                              ? "border-white/10"
                              : "border-gray-200"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProducts.has(product.id)}
                            onChange={() => toggleProduct(product.id)}
                            className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                          />
                          <div className="flex-1">
                            <div
                              className={`font-medium ${
                                theme === "dark"
                                  ? "text-white"
                                  : "text-gray-900"
                              }`}
                            >
                              {product.name}
                            </div>
                            <div
                              className={`text-sm ${
                                theme === "dark"
                                  ? "text-gray-400"
                                  : "text-gray-600"
                              }`}
                            >
                              {product.category || "Uncategorized"} •{" "}
                              {product.type || "GOODS"}
                            </div>
                          </div>
                          <div
                            className={`text-right ${
                              theme === "dark" ? "text-white" : "text-gray-900"
                            }`}
                          >
                            <div className="font-semibold">
                              ₹{product.salePrice?.toFixed(2) || "0.00"}
                            </div>
                            <div className="text-xs text-gray-500">
                              GST: {product.gstRate || 0}%
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex gap-3 p-6 border-t ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 px-6 py-3 rounded-lg font-semibold transition ${
              theme === "dark"
                ? "bg-gray-700 hover:bg-gray-600 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-900"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            disabled={isSubmitting || selectedProducts.size === 0}
            className="flex-1 px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
          >
            {isSubmitting
              ? "Copying..."
              : `Copy ${selectedProducts.size} Product${selectedProducts.size !== 1 ? "s" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
