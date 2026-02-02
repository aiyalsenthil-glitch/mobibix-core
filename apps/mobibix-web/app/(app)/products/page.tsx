"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { listProducts, type ShopProduct } from "@/services/products.api";
import { EditProductModal } from "./EditProductModal";
import { CopyFromShopModal } from "./CopyFromShopModal";
import { ImportProductsModal } from "./ImportProductsModal";
import { ExportProductsModal } from "./ExportProductsModal";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { NoShopsAlert } from "../components/NoShopsAlert";
import { ProductModal } from "./ProductModal";

export default function ProductsPage() {
  const { theme } = useTheme();
  const router = useRouter();
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
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(
    null,
  );
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  const handleProductCreated = (newProduct: ShopProduct) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  const reloadProducts = async () => {
    if (selectedShopId) {
      try {
        const data = await listProducts(selectedShopId);
        setProducts(data);
      } catch (err: any) {
        console.error("Error reloading products:", err);
      }
    }
  };

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
          >
            Products
          </h1>
          <p
            className={`text-sm mt-1 ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}
          >
            Manage what this shop sells • Configure pricing and product settings
          </p>
        </div>

        {/* Action Buttons */}
        {selectedShopId && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowExportModal(true)}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                theme === "dark"
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-900"
              }`}
              title="Export products to CSV/Excel"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Export
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
                theme === "dark"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
              title="Import products from CSV/Excel"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              Import
            </button>
            {shops.length > 1 && (
              <button
                onClick={() => setShowCopyModal(true)}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                title="Copy products from another shop"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                Copy from Shop
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition flex items-center gap-2"
              title="Add a single new product"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Add Product
            </button>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div
        className={`border rounded-lg p-4 mb-6 ${
          theme === "dark"
            ? "bg-blue-500/10 border-blue-500/30"
            : "bg-blue-50 border-blue-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <svg
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              theme === "dark" ? "text-blue-400" : "text-blue-600"
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <p
              className={`text-sm font-medium ${
                theme === "dark" ? "text-blue-300" : "text-blue-900"
              }`}
            >
              Products are shop-specific configurations
            </p>
            <p
              className={`text-xs mt-1 ${
                theme === "dark" ? "text-blue-400" : "text-blue-700"
              }`}
            >
              Each product defines what this shop sells and at what price. For
              stock levels, click the{" "}
              <span className="font-semibold">Stock</span> button or visit the{" "}
              <button
                onClick={() => router.push("/inventory")}
                className="underline hover:no-underline font-semibold"
              >
                Inventory page
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Shop Filter Section - Only show if multiple shops */}
      {isLoadingShops ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
          <div className="text-black dark:text-stone-300">Loading shops...</div>
        </div>
      ) : shops.length === 0 ? null : (
        hasMultipleShops && (
          <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
            <label
              className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-stone-300" : "text-black"}`}
            >
              Filter by Shop
            </label>
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
            <p
              className={`text-xs mt-2 ${theme === "dark" ? "text-stone-500" : "text-gray-500"}`}
            >
              Showing products sold by the selected shop
            </p>
          </div>
        )
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-4 mb-6 shadow-sm">
        <input
          type="text"
          placeholder="Search products by name, category, SKU, barcode, or brand..."
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

      {shops.length === 0 ? (
        <div className="mb-6">
          <NoShopsAlert variant="compact" />
        </div>
      ) : isLoading ? (
        <div className="text-center py-12 text-black dark:text-stone-400 font-medium">
          Loading products...
        </div>
      ) : !selectedShopId ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
          </div>
          <p className="text-black dark:text-stone-400 font-medium">
            Select a shop to view its product catalog
          </p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-black dark:text-stone-300 mb-2">
            {searchQuery
              ? "No products found matching your search"
              : "No products configured for this shop"}
          </p>
          <p className="text-sm text-gray-500 dark:text-stone-400">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Add products from the global catalog or create custom products to start selling."}
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
                    "Product Name",
                    "Category",
                    "Type",
                    "HSN/SAC",
                    "Sale Price",
                    "Cost Status",
                    "GST Rate",
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
                  const isActive = product.isActive !== false; // Default to true if not specified
                  return (
                    <tr
                      key={product.id}
                      className={`${theme === "dark" ? "border-white/10" : "border-gray-200"} border-b last:border-b-0 ${
                        theme === "dark"
                          ? "hover:bg-white/5"
                          : "hover:bg-gray-50"
                      } transition ${!isActive ? "opacity-60" : ""}`}
                    >
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-gray-900"} font-medium`}
                      >
                        {product.name}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        {product.category || "-"}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300">
                          {product.type || "GOODS"}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        {product.hsnCode || "-"}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-white" : "text-gray-900"} font-semibold`}
                      >
                        ₹{product.salePrice?.toFixed(2) || "0.00"}
                      </td>
                      {/* Cost Status Column */}
                      <td className="px-6 py-4">
                        {product.costPrice && product.costPrice > 0 ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300">
                            ✓ Set
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300">
                            ⚠ Not Set
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-6 py-4 ${theme === "dark" ? "text-stone-400" : "text-gray-700"}`}
                      >
                        {product.gstRate ? `${product.gstRate}%` : "-"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            isActive
                              ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-gray-500/20 dark:text-gray-300"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingProduct(product)}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded text-sm font-medium transition"
                            title="Edit product details"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              router.push(
                                `/inventory?productId=${product.id}&shopId=${selectedShopId}`,
                              )
                            }
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition flex items-center gap-1"
                            title="Manage stock for this product"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                              />
                            </svg>
                            Stock
                          </button>
                        </div>
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

      {/* Copy from Shop Modal */}
      {showCopyModal && selectedShopId && (
        <CopyFromShopModal
          currentShopId={selectedShopId}
          availableShops={shops}
          onClose={() => setShowCopyModal(false)}
          onCopyComplete={reloadProducts}
        />
      )}

      {/* Import Products Modal */}
      {showImportModal && selectedShopId && (
        <ImportProductsModal
          shopId={selectedShopId}
          onClose={() => setShowImportModal(false)}
          onImportComplete={reloadProducts}
        />
      )}

      {/* Export Products Modal */}
      {showExportModal && selectedShopId && selectedShop && (
        <ExportProductsModal
          shopId={selectedShopId}
          shopName={selectedShop.name}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {/* Create Product Modal */}
      {showCreateModal && selectedShopId && (
        <ProductModal
          shopId={selectedShopId}
          onClose={() => setShowCreateModal(false)}
          onProductCreated={handleProductCreated}
        />
      )}
    </div>
  );
}
