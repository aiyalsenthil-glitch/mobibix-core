"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Download, FileText, Loader, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import {
  getGstr1SalesRegister,
  getGstr1HsnSummary,
  type Gstr1Record,
  type Gstr1SummaryItem,
  type Gstr1Report as Gstr1ReportType,
} from "@/services/reports.api";

export default function Gstr1ReportPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<Gstr1ReportType | null>(null);
  const [hsnSummary, setHsnSummary] = useState<Gstr1SummaryItem[]>([]);
  const [view, setView] = useState<"B2B" | "HSN">("B2B");
  const [page, setPage] = useState(1);

  // Default to previous month
  const [month, setMonth] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM")
  );

  const handleGenerate = async (targetPage: number = 1) => {
    setLoading(true);
    setPage(targetPage);
    try {
      const start = startOfMonth(new Date(month));
      const end = endOfMonth(new Date(month));

      const [salesData, hsnData] = await Promise.all([
        getGstr1SalesRegister(start.toISOString(), end.toISOString(), targetPage),
        targetPage === 1 ? getGstr1HsnSummary(start.toISOString(), end.toISOString()) : Promise.resolve(hsnSummary),
      ]);

      setReportData(salesData);
      if (targetPage === 1) setHsnSummary(hsnData);
    } catch (error) {
      console.error("Failed to fetch GSTR-1 data:", error);
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

  const exportB2B = () => reportData && downloadCsv(`GSTR1_B2B_${month}.csv`, reportData.records);
  const exportHSN = () => downloadCsv(`GSTR1_HSN_${month}.csv`, hsnSummary);

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
            <h1 className="text-3xl font-bold">GSTR-1 Report</h1>
            <p className={`${isDark ? "text-gray-400" : "text-gray-600"} mt-1`}>
              Outward supplies of goods or services
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
                onClick={() => handleGenerate(1)}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50 transition-colors"
              >
                {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
                Generate
              </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} p-6 rounded-xl border shadow-sm`}>
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mb-1`}>Total Taxable Value</p>
            <p className="text-2xl font-bold">
              {formatCurrency(reportData?.summary?.totalTaxableAmount || 0)}
            </p>
          </div>
          <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} p-6 rounded-xl border shadow-sm`}>
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mb-1`}>Total Tax Liability</p>
            <p className="text-2xl font-bold">
              {formatCurrency(
                (reportData?.summary?.totalCgst || 0) +
                (reportData?.summary?.totalSgst || 0) +
                (reportData?.summary?.totalIgst || 0)
              )}
            </p>
          </div>
          <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} p-6 rounded-xl border shadow-sm`}>
            <p className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"} mb-1`}>Total Invoices</p>
            <p className="text-2xl font-bold">{reportData?.summary?.totalInvoices || 0}</p>
          </div>
        </div>

        {/* Report Tables */}
        <div className={`${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"} rounded-xl border shadow-sm overflow-hidden`}>
          <div className={`border-b ${isDark ? "border-gray-800" : "border-gray-200"} flex items-center justify-between px-6 py-4`}>
              <div className="flex gap-4">
                  <button 
                      onClick={() => setView("B2B")}
                      className={`font-medium pb-1 border-b-2 transition-colors ${view === "B2B" ? "border-indigo-600 text-indigo-600" : `border-transparent ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
                  >
                      Sales Register
                  </button>
                  <button 
                       onClick={() => setView("HSN")}
                       className={`font-medium pb-1 border-b-2 transition-colors ${view === "HSN" ? "border-indigo-600 text-indigo-600" : `border-transparent ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-700"}`}`}
                  >
                      HSN Summary
                  </button>
              </div>
              <div className="flex gap-2">
                  {view === "B2B" && (
                      <button 
                          onClick={exportB2B}
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
            {view === "B2B" ? (
               <>
                 <table className="w-full text-sm text-left">
                    <thead className={`${isDark ? "bg-gray-800/50 text-gray-300" : "bg-gray-50 text-gray-700"} font-medium border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                        <tr>
                            <th className="px-6 py-3">Invoice No</th>
                            <th className="px-6 py-3">Date</th>
                            <th className="px-6 py-3">Customer (GSTIN)</th>
                            <th className="px-6 py-3 text-right">Value</th>
                            <th className="px-6 py-3 text-right">Taxable</th>
                            <th className="px-6 py-3 text-right">IGST</th>
                            <th className="px-6 py-3 text-right">CGST</th>
                            <th className="px-6 py-3 text-right">SGST</th>
                        </tr>
                    </thead>
                    <tbody className={`divide-y ${isDark ? "divide-gray-800" : "divide-gray-200"}`}>
                        {!reportData || reportData.records.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                                    {loading ? <Loader className="animate-spin mx-auto" /> : "No data generated. Select a month and click Generate."}
                                </td>
                            </tr>
                        ) : (
                            reportData.records.map((row, i) => (
                                <tr key={i} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors`}>
                                    <td className={`px-6 py-3 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{row.invoiceNumber}</td>
                                    <td className="px-6 py-3">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                                    <td className="px-6 py-3">
                                        <div className="font-medium">{row.customerName}</div>
                                        <div className={`text-xs ${isDark ? "text-gray-500" : "text-gray-400"}`}>{row.gstinUin || "B2C"}</div>
                                    </td>
                                    <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.invoiceAmount)}</td>
                                    <td className="px-6 py-3 text-right">{formatCurrency(row.taxableAmount)}</td>
                                    <td className="px-6 py-3 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(row.igstAmount)}</td>
                                    <td className="px-6 py-3 text-right">{formatCurrency(row.cgstAmount)}</td>
                                    <td className="px-6 py-3 text-right">{formatCurrency(row.sgstAmount)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                 </table>
                 
                 {reportData?.meta && reportData.meta.totalPages > 1 && (
                   <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Showing {(reportData.meta.page - 1) * reportData.meta.limit + 1} to{" "}
                        {Math.min(reportData.meta.page * reportData.meta.limit, reportData.meta.totalRecords)} of{" "}
                        {reportData.meta.totalRecords} entries
                      </div>
                      <div className="flex gap-2 items-center">
                        <button
                          onClick={() => handleGenerate(page - 1)}
                          disabled={page === 1 || loading}
                          className="px-3 py-1.5 text-sm font-medium border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 bg-white hover:bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Previous
                        </button>
                        <span className="text-sm px-2 font-medium text-gray-700 dark:text-gray-400">
                          Page {page} of {reportData.meta.totalPages}
                        </span>
                        <button
                          onClick={() => handleGenerate(page + 1)}
                          disabled={page === reportData.meta.totalPages || loading}
                          className="px-3 py-1.5 text-sm font-medium border rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 bg-white hover:bg-gray-50 border-gray-300 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                        >
                          Next
                        </button>
                      </div>
                   </div>
                 )}
               </>
            ) : (
               <table className="w-full text-sm text-left">
                  <thead className={`${isDark ? "bg-gray-800/50 text-gray-300" : "bg-gray-50 text-gray-700"} font-medium border-b ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                      <tr>
                          <th className="px-6 py-3">HSN Code</th>
                          <th className="px-6 py-3">Description</th>
                          <th className="px-6 py-3 text-right">Quantity</th>
                          <th className="px-6 py-3 text-right">Total Value</th>
                          <th className="px-6 py-3 text-right">Taxable</th>
                          <th className="px-6 py-3 text-right">IGST</th>
                          <th className="px-6 py-3 text-right">CGST</th>
                          <th className="px-6 py-3 text-right">SGST</th>
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
                                  <td className="px-6 py-3 max-w-xs truncate">N/A</td>
                                  <td className="px-6 py-3 text-right">{row.quantity}</td>
                                  <td className="px-6 py-3 text-right font-medium">{formatCurrency(row.totalAmount)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.totalAmount - (row.cgstAmount + row.sgstAmount + row.igstAmount))}</td>
                                  <td className="px-6 py-3 text-right text-indigo-600 dark:text-indigo-400">{formatCurrency(row.igstAmount)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.cgstAmount)}</td>
                                  <td className="px-6 py-3 text-right">{formatCurrency(row.sgstAmount)}</td>
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
