"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

interface InventoryItem {
  id: string;
  productName: string;
  sku?: string;
  currentStock: number;
  minStock?: number;
  maxStock?: number;
  reorderLevel?: number;
  status: "in-stock" | "low-stock" | "out-of-stock";
  location?: string;
}

export default function InventoryDetailPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "low" | "out">(
    "all",
  );

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api"}/mobileshop/stock/summary`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          const items = Array.isArray(data) ? data : data.items || [];

          // Transform and add status
          const transformedItems = items.map((item: any) => ({
            ...item,
            status:
              item.currentStock === 0
                ? "out-of-stock"
                : item.currentStock <= (item.minStock || 10)
                  ? "low-stock"
                  : "in-stock",
          }));

          setInventory(transformedItems);
        }
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchInventory();
    }
  }, [authUser]);

  const filteredInventory = inventory.filter((item) => {
    if (activeFilter === "low")
      return (
        item.currentStock <= (item.minStock || 10) && item.currentStock > 0
      );
    if (activeFilter === "out") return item.currentStock === 0;
    return true;
  });

  const stats = {
    total: inventory.length,
    inStock: inventory.filter((i) => i.status === "in-stock").length,
    lowStock: inventory.filter((i) => i.status === "low-stock").length,
    outOfStock: inventory.filter((i) => i.status === "out-of-stock").length,
  };

  return (
    <div className={`space-y-6 ${isDark ? "text-white" : "text-gray-900"}`}>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
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
        <h1 className="text-3xl font-bold">Inventory</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div
          className={`rounded-2xl border p-6 ${
            isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
          }`}
        >
          <p className={isDark ? "text-gray-400" : "text-gray-600"}>
            Total Products
          </p>
          <p className="text-3xl font-bold mt-2">{stats.total}</p>
        </div>
        <div
          className={`rounded-2xl border p-6 ${
            isDark
              ? "bg-green-900/20 border-green-800"
              : "bg-green-50 border-green-200"
          }`}
        >
          <p className={isDark ? "text-green-400" : "text-green-600"}>
            In Stock
          </p>
          <p className="text-3xl font-bold mt-2 text-green-600 dark:text-green-400">
            {stats.inStock}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-6 ${
            isDark
              ? "bg-yellow-900/20 border-yellow-800"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <p className={isDark ? "text-yellow-400" : "text-yellow-600"}>
            Low Stock
          </p>
          <p className="text-3xl font-bold mt-2 text-yellow-600 dark:text-yellow-400">
            {stats.lowStock}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-6 ${
            isDark ? "bg-red-900/20 border-red-800" : "bg-red-50 border-red-200"
          }`}
        >
          <p className={isDark ? "text-red-400" : "text-red-600"}>
            Out of Stock
          </p>
          <p className="text-3xl font-bold mt-2 text-red-600 dark:text-red-400">
            {stats.outOfStock}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div
        className={`flex gap-2 border-b ${
          isDark ? "border-gray-800" : "border-gray-200"
        }`}
      >
        <button
          onClick={() => setActiveFilter("all")}
          className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeFilter === "all"
              ? isDark
                ? "border-purple-400 text-purple-400"
                : "border-purple-500 text-purple-600"
              : isDark
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          All Products ({inventory.length})
        </button>
        <button
          onClick={() => setActiveFilter("low")}
          className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeFilter === "low"
              ? isDark
                ? "border-yellow-400 text-yellow-400"
                : "border-yellow-500 text-yellow-600"
              : isDark
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Low Stock ({stats.lowStock})
        </button>
        <button
          onClick={() => setActiveFilter("out")}
          className={`px-4 py-3 font-semibold transition-colors border-b-2 ${
            activeFilter === "out"
              ? isDark
                ? "border-red-400 text-red-400"
                : "border-red-500 text-red-600"
              : isDark
                ? "border-transparent text-gray-400 hover:text-gray-300"
                : "border-transparent text-gray-600 hover:text-gray-900"
          }`}
        >
          Out of Stock ({stats.outOfStock})
        </button>
      </div>

      {/* Inventory Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={isDark ? "bg-gray-800" : "bg-gray-50"}>
                <th className="px-6 py-4 text-left font-semibold">Product</th>
                <th className="px-6 py-4 text-left font-semibold">SKU</th>
                <th className="px-6 py-4 text-left font-semibold">
                  Current Stock
                </th>
                <th className="px-6 py-4 text-left font-semibold">Min Level</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
                <th className="px-6 py-4 text-left font-semibold">Location</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      Loading inventory...
                    </p>
                  </td>
                </tr>
              ) : filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      No items in this category
                    </p>
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t ${
                      isDark
                        ? "border-gray-800 hover:bg-gray-800"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-purple-600 dark:text-purple-400">
                      {item.productName}
                    </td>
                    <td className="px-6 py-4 text-sm">{item.sku || "-"}</td>
                    <td className="px-6 py-4 font-bold">{item.currentStock}</td>
                    <td className="px-6 py-4">{item.minStock || "-"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                          item.status === "in-stock"
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : item.status === "low-stock"
                              ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                              : "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                        }`}
                      >
                        {item.status === "in-stock"
                          ? "In Stock"
                          : item.status === "low-stock"
                            ? "Low Stock"
                            : "Out of Stock"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {item.location || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
