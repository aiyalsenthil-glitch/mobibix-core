"use client";

import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ProfitSummaryMetrics, getProfitSummary } from "@/services/reports.api";
import { useShop } from "@/context/ShopContext";
import { TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { PartySelector } from "@/components/common/PartySelector";

export default function ProfitReportPage() {
  const { theme } = useTheme();
  const router = useRouter();
  const { selectedShopId } = useShop();
  const isEnterprise = !selectedShopId;

  const [metrics, setMetrics] = useState<ProfitSummaryMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProfitSummary({
        shopId: selectedShopId || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        partyId: selectedPartyId || undefined,
      });
      setMetrics(data.metrics);
    } catch (err: any) {
      setError(err.message || "Failed to load profit summary");
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
              Profit & Loss Summary
            </h1>
            <div className="flex items-center gap-3 mt-1">
               <p className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-500"}`}>
                  Financial performance overview (Revenue vs Costs)
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
              Customer
            </label>
            <PartySelector
              type="CUSTOMER"
              onSelect={(party) => setSelectedPartyId(party?.id || null)}
              placeholder="Filter by Customer"
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
        ) : !metrics ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No data available.
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Revenue Card */}
              <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                          <DollarSign className="w-6 h-6" />
                      </div>
                      <h3 className={`text-sm font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Total Revenue
                      </h3>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      ₹{metrics.totalRevenue.toFixed(2)}
                  </p>
              </div>

              {/* Cost Card */}
              <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                          <Wallet className="w-6 h-6" />
                      </div>
                      <h3 className={`text-sm font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Total Cost
                      </h3>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      ₹{metrics.totalCost.toFixed(2)}
                  </p>
              </div>

              {/* Profit Card */}
              <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-lg">
                          <TrendingUp className="w-6 h-6" />
                      </div>
                      <h3 className={`text-sm font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Gross Profit
                      </h3>
                  </div>
                  <p className={`text-2xl font-bold ${metrics.grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                      ₹{metrics.grossProfit.toFixed(2)}
                  </p>
              </div>

              {/* Margin Card */}
              <div className={`p-6 rounded-xl border ${theme === 'dark' ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} shadow-sm`}>
                  <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 rounded-lg">
                          <TrendingDown className="w-6 h-6" />
                      </div>
                      <h3 className={`text-sm font-medium uppercase tracking-wide ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                          Profit Margin
                      </h3>
                  </div>
                  <p className={`text-2xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                      {metrics.totalCost > 0 ? `${metrics.margin.toFixed(2)}%` : "N/A"}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                      {metrics.totalCost <= 0 ? "Insufficient cost data" : "Based on valid costs"}
                  </p>
              </div>
            </div>

            {/* Breakdown Section */}
            <div className="mt-8">
              <h2 className={`text-lg font-semibold mb-6 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                Revenue & Profit Breakdown
              </h2>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Sales Stream */}
                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>Retail Sales</h3>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-indigo-900/30 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>Product Sales</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Sales Revenue</span>
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>₹{metrics.salesRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Cost of Goods</span>
                      <span className="font-semibold text-red-500">- ₹{metrics.salesCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Retail Profit</span>
                      <span className={`text-xl font-bold ${metrics.salesProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>₹{metrics.salesProfit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Repair Stream */}
                <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-gray-900/50 border-gray-800' : 'bg-white border-gray-100 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className={`font-semibold ${theme === 'dark' ? 'text-teal-400' : 'text-teal-600'}`}>Repair Services</h3>
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${theme === 'dark' ? 'bg-teal-900/30 text-teal-300' : 'bg-teal-50 text-teal-600'}`}>Job Cards</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Repair Revenue</span>
                      <span className={`font-semibold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>₹{metrics.repairRevenue.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-gray-800">
                      <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>Spare Parts Cost</span>
                      <span className="font-semibold text-red-500">- ₹{metrics.repairCost.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2">
                      <span className={`font-bold ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>Repair Profit</span>
                      <span className={`text-xl font-bold ${metrics.repairProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>₹{metrics.repairProfit.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
