"use client";

import { useEffect, useState } from "react";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { EditProductModal } from "./EditProductModal";
import { useTheme } from "@/context/ThemeContext";
import { useShopSelection } from "@/hooks/useShopSelection";

export default function ProductsPage() {
  const { theme } = useTheme();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    error: shopsError,
    selectShop,
    hasMultipleShops,
  } = useShopSelection();

  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(
    null,
  );

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
    return (
      product.name.toLowerCase().includes(query) ||
      product.sku?.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query) ||
      product.category?.toLowerCase().includes(query) ||
      product.brand?.toLowerCase().includes(query)
    );
  });

  const handleProductUpdated = (updatedProduct: ShopProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p)),
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Products
        </h1>
      </div>

      {/* Shop Filter Section - Only show if multiple shops */}
      {hasMultipleShops && (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
          <label
            className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-stone-300" : "text-black"}`}
          >
            Select Shop
          </label>
          {isLoadingShops ? (
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-black dark:text-stone-300">
              Loading shops...
            </div>
          ) : shops.length === 0 ? (
            <div className="px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-black dark:text-stone-300">
              No shops available
            </div>
          ) : (
            <select
              value={selectedShopId}
              onChange={(e) => selectShop(e.target.value)}
              className={`w-full px-4 py-2 rounded-lg font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
                theme === "dark"
                  ? "bg-stone-900/40 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              } border`}
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
        <input
          type="text"
          placeholder="Search by name, SKU, barcode, category, or brand..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full px-4 py-2 rounded-lg focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 ${
            theme === "dark"
              ? "bg-stone-900/40 border-white/20 text-white placeholder-gray-500"
              : "bg-white border-gray-300 text-black placeholder-gray-400"
          } border`}
        />
      </div>

      {(error || shopsError) && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 dark:bg-red-500/20 dark:border-red-500/50 dark:text-red-200 px-4 py-3 rounded-lg mb-4">
          {error || shopsError}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-black dark:text-stone-400 font-medium">
          Loading products...
        </div>
      ) : !selectedShopId ? (
        <div className="text-center py-12">
          <p className="text-black dark:text-stone-400 font-medium">
            Select a shop to view products
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-black dark:text-stone-400 font-medium">
            {searchQuery
              ? "No products found matching your search"
              : "No products available"}
          </p>
        </div>
      ) : (
        <div
          className={`bg-white dark:bg-white/5 border ${theme === "dark" ? "border-white/10" : "border-gray-300"} rounded-lg overflow-hidden shadow-sm`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-200 border-gray-300"} border-b`}
              >
                <tr>
                  {[
                    "Name",
                    "SKU",
                    "Category",
                    "Brand",
                    "Sale Price",
                    "Stock",
                    "Status",
                    "Actions",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`text-left px-6 py-4 text-sm font-semibold ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isLowStock =
                    product.minStock && product.stock <= product.minStock;
                  return (
                    <tr
                      key={product.id}
                      className={`${theme === "dark" ? "border-white/10" : "border-gray-200"} border-b last:border-b-0 ${
                        theme === "dark"
                          ? "hover:bg-white/5"
                          : "hover:bg-gray-50"
                      } transition`}
                    >
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-gray-900"} font-medium`}
                      >
                        {product.name}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        {product.sku || "-"}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        {product.category || "-"}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        {product.brand || "-"}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-gray-900"} font-semibold`}
                      >
                        ₹{product.salePrice.toFixed(2)}
                      </td>
                      <td
                        className={`px-6 py-4 ${
                          isLowStock
                            ? "text-orange-600 dark:text-orange-400 font-semibold"
                            : theme === "dark"
                              ? "text-stone-400"
                              : "text-gray-700"
                        }`}
                      >
                        {product.stock}
                        {isLowStock && " ⚠️"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${
                            product.stock > 0
                              ? "bg-green-200 text-green-900 border-green-400 dark:bg-green-500/20 dark:text-green-200 dark:border-green-500/50"
                              : "bg-red-200 text-red-900 border-red-400 dark:bg-red-500/20 dark:text-red-200 dark:border-red-500/50"
                          } border`}
                        >
                          {product.stock > 0 ? "In Stock" : "Out of Stock"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                        onClick={() => setEditingProduct(product)}
                        className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm font-medium transition"
                      >
                        Edit
                      </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && selectedShopId && (
        <EditProductModal
          product={editingProduct}
          shopId={selectedShopId}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={handleProductUpdated}
        />
      )}
    </div>
  );
}
