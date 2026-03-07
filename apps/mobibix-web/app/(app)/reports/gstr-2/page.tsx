"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Download, CreditCard, Loader, Search, ArrowLeft, ShieldCheck, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import {
  getGstr2PurchaseRegister,
  getGstr2HsnSummary,
  type Gstr2Record,
  type Gstr2SummaryItem,
  type Gstr2Report as Gstr2ReportType,
} from "@/services/reports.api";

export default function Gstr2ReportPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<Gstr2ReportType | null>(null);
  const [hsnSummary, setHsnSummary] = useState<Gstr2SummaryItem[]>([]);
  const [view, setView] = useState<"Purchase" | "HSN">("Purchase");

  // Default to previous month
  const [month, setMonth] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM")
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(new Date(month));
      const end = endOfMonth(new Date(month));

      const [purchaseData, hsnData] = await Promise.all([
        getGstr2PurchaseRegister(start.toISOString(), end.toISOString()),
        getGstr2HsnSummary(start.toISOString(), end.toISOString()),
      ]);

      setReportData(purchaseData);
      setHsnSummary(hsnData);
    } catch (error) {
      console.error("Failed to fetch GSTR-2 data:", error);
      alert("Failed to fetch report data");
    } finally {
      setLoading(false);
    }
  };

  const downloadCsv = (filename: string, data: any[]) => {
    if (!data.length) return;
    
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map(row => headers.map(fieldName => {
        const val = row[fieldName];
        // Divide by 100 for numeric fields that contain "Amount", "Value", "cgst", "sgst", "igst", "TotalTax", "itc" (case insensitive)
        const isNumericAmount = /amount|value|cgst|sgst|igst|tax|itc/i.test(fieldName) && typeof val === "number";
        const formattedVal = isNumericAmount ? val.toFixed(2) : val;
        return JSON.stringify(formattedVal, (_, v) => v === null ? "" : v);
      }).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const exportPurchase = () => reportData && downloadCsv(`GSTR2_Purchases_${month}.csv`, reportData.records);
  const exportHSN = () => downloadCsv(`GSTR2_HSN_${month}.csv`, hsnSummary);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);

  const isDark = theme === "dark";

  return (
    <div className={`min-h-screen ${isDark ? "bg-gray-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-7xl mx-auto p-6">
        <button 
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Reports
        </button>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">GSTR-2 Report</h1>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
              Inward supplies of goods or services (ITC Tracking)
            </p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                className={`border rounded-lg px-3 py-2 flex-1 md:flex-none ${isDark ? "bg-gray-900 border-gray-700 text-white" : "bg-white border-gray-300"}`}
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
                Generate
              </button>
          </div>
        </div>

        {/* Level 1 Summary: Financials */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} p-6 rounded-xl border shadow-sm`}>
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mb-1`}>Eligible ITC</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(reportData?.totalITC || 0)}
            </p>
          </div>
          <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} p-6 rounded-xl border shadow-sm`}>
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mb-1`}>Total Taxable Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(reportData?.totalTaxableAmount || 0)}
            </p>
          </div>
          <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} p-6 rounded-xl border shadow-sm`}>
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mb-1`}>Gross Purchases</p>
            <p className="text-2xl font-bold">{reportData?.totalPurchases || 0}</p>
          </div>
        </div>

        {/* Level 2 Summary: Compliance */}
        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
             <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={24} />
                <div>
                   <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Compliance Status</p>
                   <p className="text-xs text-emerald-600 dark:text-emerald-400">{reportData.itcEligibleCount} / {reportData.totalPurchases} invoices are ITC eligible.</p>
                </div>
             </div>
             {reportData.legacyUnverifiedCount > 0 && (
               <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-lg">
                  <AlertCircle className="text-orange-600 dark:text-orange-400" size={24} />
                  <div>
                    <p className="text-sm font-medium text-orange-800 dark:text-orange-300">Legacy Warnings</p>
                    <p className="text-xs text-orange-600 dark:text-orange-400">{reportData.legacyUnverifiedCount} legacy purchases need CA verification.</p>
                  </div>
               </div>
             )}
          </div>
        )}

        {/* Report Tables */}
        <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} rounded-xl border shadow-sm overflow-hidden`}>
          <div className={`border-b ${isDark ? "border-gray-800" : "border-gray-200"} flex items-center justify-between px-6 py-4`}>
              <div className="flex gap-4">
                  <button 
                      onClick={() => setView("Purchase")}
                      className={`font-medium pb-1 border-b-2 transition-colors ${view === "Purchase" ? "border-pink-600 text-pink-600" : `border-transparent ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
                  >
                      Purchase Register
                  </button>
                  <button 
                       onClick={() => setView("HSN")}
                       className={`font-medium pb-1 border-b-2 transition-colors ${view === "HSN" ? "border-pink-600 text-pink-600" : `border-transparent ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
                  >
                      HSN Summary
                  </button>
              </div>
              <div className="flex gap-2">
                  {view === "Purchase" && (
                      <button 
                          onClick={exportPurchase}
                          disabled={!reportData?.records.length}
                          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 border rounded-lg transition-colors disabled:opacity-50 ${isDark ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                          <Download size={16} /> Export CSV
                      </button>
                  )}
                   {view === "HSN" && (
                      <button 
                          onClick={exportHSN}
                          disabled={!hsnSummary.length}
                          className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 border rounded-lg transition-colors disabled:opacity-50 ${isDark ? "border-gray-700 bg-gray-800 text-gray-300 hover:bg-gray-700" : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"}`}
                      >
                          <Download size={16} /> Export CSV
                      </button>
                  )}
              </div>
          </div>

          <div className="overflow-x-auto">
            {view === "Purchase" ? (
               <table className="w-full text-sm text-left">
                  <thead className={`${isDark ? "bg-gray-800/50 text-gray-300" : "bg-gray-50 text-gray-700"} font-medium border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                      <tr>
                          <th className="px-6 py-3">Purchase No</th>
                          <th className="px-6 py-3">Date</th>
                          <th className="px-6 py-3">Supplier (GSTIN)</th>
                          <th className="px-6 py-3 text-right">Value</th>
                          <th className="px-6 py-3 text-right">ITC Status</th>
                          <th className="px-6 py-3 text-right">Eligible ITC</th>
                          <th className="px-6 py-3 text-right">Total GST</th>
                      </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-200"}`}>
                      {!reportData || reportData.records.length === 0 ? (
                          <tr>
                              <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                  {loading ? <Loader className="animate-spin mx-auto" /> : "No data generated. Select a month and click Generate."}
                              </td>
                          </tr>
                      ) : (
                          reportData.records.map((row, i) => (
                              <tr key={i} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors`}>
                                  <td className={`px-6 py-3 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{row.purchaseNumber}</td>
                                  <td className="px-6 py-3">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                                  <td className="px-6 py-3">
                                      <div className="font-medium">{row.supplierName}</div>
                                      <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{row.supplierGstin || "UNREGISTERED"}</div>
                                  </td>
                                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.invoiceAmount)}</td>
                                  <td className="px-6 py-3 text-right">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${row.itcEligible ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"}`}>
                                         {row.itcEligible ? "Eligible" : "Ineligible"}
                                      </span>
                                  </td>
                                  <td className="px-6 py-3 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                                      {formatCurrency(row.itcCgstAmount + row.itcSgstAmount + row.itcIgstAmount)}
                                  </td>
                                  <td className="px-6 py-3 text-right">
                                      {formatCurrency(row.cgstAmount + row.sgstAmount + row.igstAmount)}
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
               </table>
            ) : (
               <table className="w-full text-sm text-left">
                  <thead className={`${isDark ? "bg-gray-800/50 text-gray-300" : "bg-gray-50 text-gray-700"} font-medium border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                      <tr>
                          <th className="px-6 py-3">HSN Code</th>
                          <th className="px-6 py-3 text-right">Quantity</th>
                          <th className="px-6 py-3 text-right">Unit Price</th>
                          <th className="px-6 py-3 text-right">Total Value</th>
                          <th className="px-6 py-3 text-right">Taxable</th>
                          <th className="px-6 py-3 text-right">CGST</th>
                          <th className="px-6 py-3 text-right">SGST</th>
                          <th className="px-6 py-3 text-right">IGST</th>
                      </tr>
                  </thead>
                  <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-200"}`}>
                       {hsnSummary.length === 0 ? (
                          <tr>
                              <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                  {loading ? <Loader className="animate-spin mx-auto" /> : "No HSN data generated."}
                              </td>
                          </tr>
                      ) : (
                          hsnSummary.map((row) => (
                              <tr key={row.hsnCode} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors`}>
                                  <td className={`px-6 py-3 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{row.hsnCode}</td>
                                  <td className="px-6 py-3 text-right">{row.quantity}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.unitPrice)}</td>
                                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.totalAmount)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.totalAmount - (row.cgstAmount + row.sgstAmount + row.igstAmount))}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.cgstAmount)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.sgstAmount)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.igstAmount)}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
               </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
