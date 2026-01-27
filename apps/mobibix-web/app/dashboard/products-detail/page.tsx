"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

interface Product {
  id: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  unitsSold?: number;
  category?: string;
}

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const period = searchParams.get("period") || "today";
  const { authUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(period);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("accessToken");
        const filterParam = activeTab === "today" ? "today" : "month";
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api"}/mobileshop/products?filter=${filterParam}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setProducts(Array.isArray(data) ? data : data.products || []);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchProducts();
    }
  }, [authUser, activeTab]);

  return (
    <div className={`space-y-6 ${isDark ? "text-white" : "text-gray-900"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push("/dashboard")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-gray-800 text-gray-400"
                : "hover:bg-gray-100 text-gray-600"
            }`}
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold">Top Products</h1>
        </div>
      </div>

      {/* Tabs */}
      <div
        className={`flex gap-2 border-b ${
          isDark ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setActiveTab("today")}
          className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "today"
              ? isDark
                ? "border-amber-400 text-amber-400"
                : "border-amber-500 text-amber-600"
              : isDark
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Today
        </button>
        <button
          onClick={() => setActiveTab("month")}
          className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeTab === "month"
              ? isDark
                ? "border-amber-400 text-amber-400"
                : "border-amber-500 text-amber-600"
              : isDark
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          This Month
        </button>
      </div>

      {/* Products Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={isDark ? "bg-gray-800" : "bg-gray-50"}>
                <th className="px-6 py-4 text-left font-semibold">
                  Product Name
                </th>
                <th className="px-6 py-4 text-left font-semibold">SKU</th>
                <th className="px-6 py-4 text-left font-semibold">Price</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Units Sold
                </th>
                <th className="px-6 py-4 text-left font-semibold">Category</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      Loading...
                    </p>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      No products found
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr
                    key={product.id}
                    className={`border-t ${
                      isDark
                        ? "border-gray-800 hover:bg-gray-800"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-amber-600 dark:text-amber-400">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm">{product.sku || "-"}</td>
                    <td className="px-6 py-4 font-semibold">
                      $
                      {product.price.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 font-semibold text-sm">
                        {product.unitsSold || product.quantity || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4">{product.category || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {products.length > 0 && (
        <div
          className={`rounded-2xl border p-6 ${
            isDark
              ? "bg-gray-900 border-gray-800"
              : "bg-gradient-to-br from-white to-gray-50 border-gray-200"
          }`}
        >
          <h3 className="text-lg font-bold mb-4">Summary</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                Total Products
              </p>
              <p className="text-2xl font-bold">{products.length}</p>
            </div>
            <div>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                Total Units Sold
              </p>
              <p className="text-2xl font-bold">
                {products.reduce(
                  (sum, p) => sum + (p.unitsSold || p.quantity || 0),
                  0,
                )}
              </p>
            </div>
            <div>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                Total Revenue
              </p>
              <p className="text-2xl font-bold">
                $
                {products
                  .reduce(
                    (sum, p) =>
                      sum + p.price * (p.unitsSold || p.quantity || 0),
                    0,
                  )
                  .toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProductsDetailPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}
