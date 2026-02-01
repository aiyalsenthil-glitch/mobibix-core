"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { InventoryReportItem, getInventoryReport } from "@/services/reports.api";
import { useShop } from "@/context/ShopContext";

export default function InventoryReportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedShopId } = useShop();

  const [data, setData] = useState<InventoryReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const report = await getInventoryReport(selectedShopId || undefined);
      setData(report);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedShopId]);

  return (
    <div
      className={`min-h-screen ${
        theme === "dark" ? "bg-gray-950" : "bg-gray-50"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1
              className={`text-2xl font-bold ${
                theme === "dark" ? "text-white" : "text-gray-900"
              }`}
            >
              Inventory Report
            </h1>
            <p
              className={`mt-1 text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Current stock levels, valuation, and reorder status
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              theme === "dark"
                ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
                : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            }`}
          >
            Back to Reports
          </button>
        </div>

        {/* Content */}
        {loading ? (
             <div className="flex justify-center py-12">
             <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
           </div>
        ) : error ? (
           <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-center">
             {error}
           </div>
        ) : data.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No inventory items found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
             <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                <thead className={`text-xs uppercase bg-gray-50 dark:bg-gray-800/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <tr>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3 text-center">Type</th>
                    <th className="px-6 py-3 text-right">Available Qty</th>
                    <th className="px-6 py-3 text-right">Cost Price</th>
                    <th className="px-6 py-3 text-right">Stock Value</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.map((item, idx) => (
                    <tr key={idx} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {item.product}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                            item.isSerialized 
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}>
                           {item.isSerialized ? "Serialized" : "Standard"} 
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-right">
                        ₹{item.costPrice.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-teal-600 dark:text-teal-400">
                        {item.stockValue !== null ? `₹${item.stockValue.toFixed(2)}` : "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center">
                         {item.lowStock && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                LOW STOCK
                            </span>
                         )}
                         {!item.lowStock && item.quantity > 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                IN STOCK
                            </span>
                         )}
                          {!item.lowStock && item.quantity <= 0 && (
                            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                                NO STOCK
                            </span>
                         )}
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        )}
      </div>
    </div>
  );
}
