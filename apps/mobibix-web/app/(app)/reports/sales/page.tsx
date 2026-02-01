"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SalesReportItem, getSalesReport } from "@/services/reports.api";
import { useShop } from "@/context/ShopContext";

export default function SalesReportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedShopId } = useShop();

  const [data, setData] = useState<SalesReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const report = await getSalesReport({
        shopId: selectedShopId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setData(report);
    } catch (err: any) {
      setError(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedShopId, startDate, endDate]);

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
              Sales Report
            </h1>
            <p
              className={`mt-1 text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Daily sales invoices and profit analysis
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

        {/* Filters */}
        <div
          className={`p-4 rounded-xl mb-6 flex flex-wrap gap-4 items-end border ${
            theme === "dark"
              ? "bg-gray-900 border-gray-800"
              : "bg-white border-gray-200"
          }`}
        >
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>
          <div>
            <label
              className={`block text-xs font-medium mb-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={`px-3 py-2 rounded-lg text-sm border ${
                theme === "dark"
                  ? "bg-gray-800 border-gray-700 text-white"
                  : "bg-white border-gray-300 text-gray-900"
              }`}
            />
          </div>
          
          {/* Party Filter intentionally omitted - Backend does not support filtering by partyId yet */}
          
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
            }}
            className="px-4 py-2 text-sm text-teal-600 hover:underline font-medium"
          >
            Reset
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
            No sales records found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
             <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                <thead className={`text-xs uppercase bg-gray-50 dark:bg-gray-800/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    <th className="px-6 py-3">Invoice #</th>
                    <th className="px-6 py-3">Customer</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Paid</th>
                    <th className="px-6 py-3 text-right">Pending</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.map((item) => (
                    <tr key={item.invoiceNo} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {item.invoiceNo}
                      </td>
                      <td className="px-6 py-4">
                        {item.customer || "Walk-in"}
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        ₹{item.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-green-600">
                        ₹{item.paidAmount.toFixed(2)}
                      </td>
                       <td className="px-6 py-4 text-right text-red-500">
                        {item.pendingAmount > 0 ? `₹${item.pendingAmount.toFixed(2)}` : "-"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.pendingAmount <= 0 
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : item.paidAmount > 0
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                            {item.pendingAmount <= 0 ? "PAID" : item.paidAmount > 0 ? "PARTIAL" : "UNPAID"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-medium">
                        {item.profit !== null ? (
                            <span className={item.profit >= 0 ? "text-green-600" : "text-red-500"}>
                                ₹{item.profit.toFixed(2)}
                            </span>
                        ) : (
                            <span className="text-gray-400">N/A</span>
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
