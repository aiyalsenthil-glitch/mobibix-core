"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PurchaseReportItem, getPurchaseReport } from "@/services/reports.api";
import { useShop } from "@/context/ShopContext";
import { PartySelector } from "@/components/common/PartySelector";

export default function PurchaseReportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedShopId } = useShop();
  const isEnterprise = !selectedShopId;

  const [data, setData] = useState<PurchaseReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const report = await getPurchaseReport({
        shopId: selectedShopId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        partyId: selectedPartyId || undefined,
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
  }, [selectedShopId, startDate, endDate, selectedPartyId]);

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
              Purchase Report
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Supplier purchases (Bill & Stock Entries)
               </p>
               {isEnterprise && (
                 <span className="px-2 py-0.5 text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 rounded uppercase tracking-wider">
                   Enterprise View
                 </span>
               )}
            </div>
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
          
           <div className="w-64">
            <label
              className={`block text-xs font-medium mb-1 ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              Supplier
            </label>
            <PartySelector
              type="VENDOR"
              onSelect={(party) => setSelectedPartyId(party?.id || null)}
              placeholder="Filter by Supplier"
            />
          </div>

          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setSelectedPartyId(null);
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
            No purchase records found for this period.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
             <table className={`w-full text-sm text-left ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                <thead className={`text-xs uppercase bg-gray-50 dark:bg-gray-800/50 ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  <tr>
                    <th className="px-6 py-3">Date</th>
                    {isEnterprise && <th className="px-6 py-3 text-indigo-500">Shop</th>}
                    <th className="px-6 py-3">Purchase #</th>
                    <th className="px-6 py-3">Supplier</th>
                    <th className="px-6 py-3 text-right">Total</th>
                    <th className="px-6 py-3 text-right">Paid</th>
                    <th className="px-6 py-3 text-right">Pending</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {data.map((item) => (
                    <tr key={item.purchaseNo} className="bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      {isEnterprise && (
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-indigo-600 dark:text-indigo-400">
                          {item.shopName}
                        </td>
                      )}
                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                        {item.purchaseNo}
                      </td>
                      <td className="px-6 py-4">
                        {item.supplier || "Unknown Supplier"}
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
