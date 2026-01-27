"use client";

import { useEffect, useState } from "react";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { stockIn } from "@/services/inventory.api";
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
        const data = await listProducts(selectedShopId);
        setProducts(data);
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
      });

      // Reload products to get updated stock
      const data = await listProducts(selectedShopId);
      setProducts(data);

      // Reset form
      setSelectedProduct(null);
      setQuantity("");
      setCostPrice("");
      alert("Stock added successfully!");
    } catch (err: any) {
      setError(err.message || "Failed to add stock");
    } finally {
      setIsSubmitting(false);
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

      {/* Stock In Form */}
      {shops.length > 0 && (
        <div
          className={`border rounded-lg p-6 mb-6 shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <h2
            className={`text-xl font-bold mb-4 ${theme === "dark" ? "text-white" : "text-black"}`}
          >
            Add Stock
          </h2>

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
                  placeholder="Search product..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                    theme === "dark"
                      ? "bg-gray-800 border-white/20 text-white"
                      : "bg-white border-gray-300 text-black"
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
                          setSearchQuery(product.name);
                        }}
                        className={`w-full text-left px-4 py-2 hover:bg-teal-50 dark:hover:bg-teal-900/20 border-b last:border-0 ${
                          theme === "dark"
                            ? "border-gray-700 text-white"
                            : "border-gray-100 text-gray-900"
                        }`}
                      >
                        <div className="font-medium">{product.name}</div>
                        <div
                          className={`text-xs ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Current Stock: {product.stockQty || 0} | Sale Price: ₹
                          {product.salePrice}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedProduct && (
                <div
                  className={`mt-2 p-2 rounded text-sm ${theme === "dark" ? "bg-teal-500/20 text-teal-200" : "bg-teal-50 text-teal-900"}`}
                >
                  Selected: {selectedProduct.name}
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
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              />
            </div>

            {/* Cost Price */}
            <div>
              <label
                className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
              >
                Cost Price (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required
                min="0"
                step="0.01"
                placeholder="Enter cost price"
                className={`w-full px-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  theme === "dark"
                    ? "bg-gray-800 border-white/20 text-white"
                    : "bg-white border-gray-300 text-black"
                }`}
              />
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !selectedProduct}
              className="w-full px-6 py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition"
            >
              {isSubmitting ? "Adding Stock..." : "Add Stock"}
            </button>
          </form>
        </div>
      )}

      {/* Products Table */}
      {(error || shopsError) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          {error || shopsError}
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
          className={`border rounded-lg overflow-hidden shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`border-b ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-100 border-gray-300"}`}
              >
                <tr>
                  {["Product Name", "Current Stock", "Sale Price"].map(
                    (header) => (
                      <th
                        key={header}
                        className={`text-left px-6 py-4 text-sm font-semibold ${theme === "dark" ? "text-gray-300" : "text-gray-700"}`}
                      >
                        {header}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-b last:border-b-0 transition ${theme === "dark" ? "border-white/10 hover:bg-white/5" : "border-gray-200 hover:bg-gray-50"}`}
                  >
                    <td
                      className={`px-6 py-4 font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      {product.name}
                    </td>
                    <td
                      className={`px-6 py-4 ${theme === "dark" ? "text-gray-400" : "text-gray-700"}`}
                    >
                      {product.stockQty || 0}
                    </td>
                    <td
                      className={`px-6 py-4 font-semibold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                    >
                      ₹{product.salePrice.toFixed(2)}
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
