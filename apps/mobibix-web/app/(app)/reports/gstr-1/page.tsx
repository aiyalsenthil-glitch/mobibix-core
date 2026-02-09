"use client";

import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Download, FileText, Loader, Search } from "lucide-react";
import {
  getGstr1SalesRegister,
  getGstr1HsnSummary,
  Gstr1SalesRegisterItem,
  Gstr1SummaryItem,
} from "@/services/reports.api";

export default function Gstr1ReportPage() {
  const [loading, setLoading] = useState(false);
  const [salesRegister, setSalesRegister] = useState<Gstr1SalesRegisterItem[]>([]);
  const [hsnSummary, setHsnSummary] = useState<Gstr1SummaryItem[]>([]);
  const [view, setView] = useState<"B2B" | "HSN">("B2B");

  // Default to previous month
  const [month, setMonth] = useState(
    format(subMonths(new Date(), 1), "yyyy-MM")
  );

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const start = startOfMonth(new Date(month));
      const end = endOfMonth(new Date(month));

      const [salesData, hsnData] = await Promise.all([
        getGstr1SalesRegister(start.toISOString(), end.toISOString()),
        getGstr1HsnSummary(start.toISOString(), end.toISOString()),
      ]);

      setSalesRegister(salesData);
      setHsnSummary(hsnData);
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
      ...data.map(row => headers.map(fieldName => JSON.stringify(row[fieldName], (_, value) => value === null ? "" : value)).join(","))
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

  const exportB2B = () => downloadCsv(`GSTR1_B2B_${month}.csv`, salesRegister);
  const exportHSN = () => downloadCsv(`GSTR1_HSN_${month}.csv`, hsnSummary);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GSTR-1 Report</h1>
          <p className="text-gray-600 mt-1">
            Outward supplies of goods or services
          </p>
        </div>
        <div className="flex gap-3">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2"
            />
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium disabled:opacity-50"
            >
              {loading ? <Loader size={18} className="animate-spin" /> : <Search size={18} />}
              Generate Report
            </button>
        </div>
      </div>

      {/* Summary Cards (Derived from loaded data) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Taxable Value</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(salesRegister.reduce((sum, item) => sum + (item.taxableValue || 0), 0))}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Tax Liability</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(
              salesRegister.reduce(
                (sum, item) =>
                  sum +
                  (item.integratedTax || 0) +
                  (item.centralTax || 0) +
                  (item.stateTax || 0) +
                  (item.cess || 0),
                0
              )
            )}
          </p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-sm font-medium text-gray-500 mb-1">Total Invoices</p>
          <p className="text-2xl font-bold text-gray-900">{salesRegister.length}</p>
        </div>
      </div>

      {/* Report Tables */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex items-center justify-between px-6 py-4">
            <div className="flex gap-4">
                <button 
                    onClick={() => setView("B2B")}
                    className={`font-medium pb-1 border-b-2 transition-colors ${view === "B2B" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    Sales Register (B2B/B2C)
                </button>
                <button 
                     onClick={() => setView("HSN")}
                     className={`font-medium pb-1 border-b-2 transition-colors ${view === "HSN" ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
                >
                    HSN Summary
                </button>
            </div>
            <div className="flex gap-2">
                {view === "B2B" && (
                    <button 
                        onClick={exportB2B}
                        disabled={!salesRegister.length}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm font-medium px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                )}
                 {view === "HSN" && (
                    <button 
                        onClick={exportHSN}
                        disabled={!hsnSummary.length}
                        className="text-gray-600 hover:text-gray-900 flex items-center gap-2 text-sm font-medium px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                        <Download size={16} /> Export CSV
                    </button>
                )}
            </div>
        </div>

        <div className="overflow-x-auto">
          {view === "B2B" ? (
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
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
                <tbody className="divide-y divide-gray-200">
                    {salesRegister.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                                {loading ? "Loading..." : "No data generated. Select a month and click Generate."}
                            </td>
                        </tr>
                    ) : (
                        salesRegister.map((row, i) => (
                            <tr key={i} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{row.invoiceNumber}</td>
                                <td className="px-6 py-3">{new Date(row.invoiceDate).toLocaleDateString()}</td>
                                <td className="px-6 py-3">
                                    <div>{row.customerName}</div>
                                    <div className="text-xs text-gray-500">{row.gstin || "N/A"}</div>
                                </td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.invoiceValue)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.taxableValue)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.integratedTax)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.centralTax)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.stateTax)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
          ) : (
             <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
                    <tr>
                        <th className="px-6 py-3">HSN</th>
                        <th className="px-6 py-3">Description</th>
                        <th className="px-6 py-3 text-right">UQC</th>
                        <th className="px-6 py-3 text-right">Total Qty</th>
                        <th className="px-6 py-3 text-right">Total Value</th>
                        <th className="px-6 py-3 text-right">Taxable</th>
                        <th className="px-6 py-3 text-right">IGST</th>
                        <th className="px-6 py-3 text-right">CGST</th>
                        <th className="px-6 py-3 text-right">SGST</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                     {hsnSummary.length === 0 ? (
                        <tr>
                            <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                                {loading ? "Loading..." : "No HSN data generated."}
                            </td>
                        </tr>
                    ) : (
                        hsnSummary.map((row) => (
                            <tr key={row.hsnCode} className="hover:bg-gray-50">
                                <td className="px-6 py-3 font-medium text-gray-900">{row.hsnCode}</td>
                                <td className="px-6 py-3 max-w-xs truncate">{row.description}</td>
                                <td className="px-6 py-3 text-right">{row.uqc}</td>
                                <td className="px-6 py-3 text-right">{row.totalQuantity}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.totalValue)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.taxableValue)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.integratedTax)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.centralTax)}</td>
                                <td className="px-6 py-3 text-right">{formatCurrency(row.stateTax)}</td>
                            </tr>
                        ))
                    )}
                </tbody>
             </table>
          )}
        </div>
      </div>
    </div>
  );
}
