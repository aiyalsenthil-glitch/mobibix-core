"use client";

import { useState, useEffect } from "react";
import {
  getGstr1SalesRegister,
  getGstr1HsnSummary,
  type Gstr1Record,
  type Gstr1SummaryItem,
} from "@/services/reports.api";
import { formatCurrency } from "@/lib/gst.utils";

interface GstrReportViewerProps {
  shopId?: string;
}

type ReportTab = "sales-register" | "hsn-summary";

export function GstrReportViewer({ shopId }: GstrReportViewerProps) {
  // State
  const [activeTab, setActiveTab] = useState<ReportTab>("sales-register");
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Sales Register state
  const [salesRegister, setSalesRegister] = useState<Gstr1Record[]>([]);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [meta, setMeta] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadingSalesRegister, setLoadingSalesRegister] = useState(false);
  const [salesRegisterError, setSalesRegisterError] = useState<string | null>(null);

  // HSN Summary state
  const [hsnSummary, setHsnSummary] = useState<Gstr1SummaryItem[]>([]);
  const [loadingHsnSummary, setLoadingHsnSummary] = useState(false);
  const [hsnSummaryError, setHsnSummaryError] = useState<string | null>(null);

  // Load sales register when dates or page change
  useEffect(() => {
    const loadSalesRegister = async () => {
      try {
        setLoadingSalesRegister(true);
        setSalesRegisterError(null);
        const data = await getGstr1SalesRegister(startDate, endDate, currentPage);
        setSalesRegister(data.records);
        setSalesSummary(data.summary);
        setMeta(data.meta);
      } catch (err: unknown) {
        console.error("Failed to load sales register:", err);
        setSalesRegisterError((err as any)?.message || "Failed to load sales register");
      } finally {
        setLoadingSalesRegister(false);
      }
    };
    loadSalesRegister();
  }, [startDate, endDate, currentPage]);

  // Reset page when dates change
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  // Load HSN summary when dates change
  useEffect(() => {
    const loadHsnSummary = async () => {
      try {
        setLoadingHsnSummary(true);
        setHsnSummaryError(null);
        const data = await getGstr1HsnSummary(startDate, endDate);
        setHsnSummary(data);
      } catch (err: unknown) {
        console.error("Failed to load HSN summary:", err);
        setHsnSummaryError((err as any)?.message || "Failed to load HSN summary");
      } finally {
        setLoadingHsnSummary(false);
      }
    };
    loadHsnSummary();
  }, [startDate, endDate]);

  // Use backend provided totals for Sales Register (covers period not just page)
  const salesRegisterTotals = {
    invoiceValue: salesSummary?.totalTaxableAmount + salesSummary?.totalCgst + salesSummary?.totalSgst + salesSummary?.totalIgst || 0, // Approx if not returned directly
    taxableValue: salesSummary?.totalTaxableAmount || 0,
    igst: salesSummary?.totalIgst || 0,
    cgst: salesSummary?.totalCgst || 0,
    sgst: salesSummary?.totalSgst || 0,
    totalInvoices: salesSummary?.totalInvoices || 0
  };

  const hsnSummaryTotals = {
    totalValue: hsnSummary.reduce(
      (sum, item) => sum + (item.totalAmount || 0),
      0,
    ),
    taxableValue: hsnSummary.reduce(
      (sum, item) => sum + (item.taxableValue || 0),
      0,
    ),
    igst: hsnSummary.reduce((sum, item) => sum + (item.igstAmount || 0), 0),
    cgst: hsnSummary.reduce((sum, item) => sum + (item.cgstAmount || 0), 0),
    sgst: hsnSummary.reduce((sum, item) => sum + (item.sgstAmount || 0), 0),
  };

  // Export to CSV
  const exportToCsv = (data: Record<string, any>[], filename: string) => {
    if (data.length === 0) {
      alert("No data to export");
      return;
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma
            if (
              typeof value === "string" &&
              (value.includes(",") || value.includes('"'))
            ) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          })
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-lg bg-white border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900">
          GST Reports (GSTR-1)
        </h2>
        <p className="mt-2 text-gray-600">
          View and download GST compliance reports for your shop
        </p>
      </div>

      {/* Date Range Selector */}
      <div className="rounded-lg bg-white border border-gray-200 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              From
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              To
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              &nbsp;
            </label>
            <button
              onClick={() => {
                const today = new Date();
                setStartDate(getFirstDayOfMonth());
                setEndDate(today.toISOString().split("T")[0]);
              }}
              className="w-full rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              Current Month
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab("sales-register")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "sales-register"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            Sales Register
          </button>
          <button
            onClick={() => setActiveTab("hsn-summary")}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "hsn-summary"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            HSN Summary
          </button>
        </div>
      </div>

      {/* Sales Register Tab */}
      {activeTab === "sales-register" && (
        <div className="rounded-lg bg-white border border-gray-200 p-4">
          {salesRegisterError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
              <p className="text-sm text-red-700">{salesRegisterError}</p>
            </div>
          )}

          {loadingSalesRegister ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          ) : salesRegister.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
              <p>No sales invoices found for the selected date range</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 mb-6">
                <SummaryCard
                  label="Total Value"
                  value={formatCurrency(salesRegisterTotals.invoiceValue)}
                />
                <SummaryCard
                  label="Taxable Value"
                  value={formatCurrency(salesRegisterTotals.taxableValue)}
                />
                <SummaryCard
                  label="CGST"
                  value={formatCurrency(salesRegisterTotals.cgst)}
                  light
                />
                <SummaryCard
                  label="SGST"
                  value={formatCurrency(salesRegisterTotals.sgst)}
                  light
                />
                <SummaryCard
                  label="IGST"
                  value={formatCurrency(salesRegisterTotals.igst)}
                  light
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Invoice No
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Customer
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        GSTIN
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Category
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Invoice Value
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Taxable Value
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        CGST
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        SGST
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        IGST
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {salesRegister.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {item.invoiceNumber}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(item.invoiceDate).toLocaleDateString(
                            "en-IN",
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.customerName || "-"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-600">
                          {item.gstinUin || "-"}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.category || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {formatCurrency(item.invoiceAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatCurrency(item.taxableAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.cgstAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.sgstAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.igstAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                  <div className="text-sm text-gray-500">
                    Showing {(currentPage - 1) * meta.limit + 1} to{" "}
                    {Math.min(currentPage * meta.limit, meta.totalRecords)} of{" "}
                    {meta.totalRecords} bills
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="rounded border border-gray-300 px-3 py-1 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <span className="flex items-center text-sm font-medium px-2">
                      Page {currentPage} of {meta.totalPages}
                    </span>
                    <button
                      disabled={currentPage === meta.totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="rounded border border-gray-300 px-3 py-1 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() =>
                    exportToCsv(
                      salesRegister,
                      `GSTR1-Sales-Register-${startDate}-to-${endDate}-Page-${currentPage}.csv`,
                    )
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  ↓ Export Page CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* HSN Summary Tab */}
      {activeTab === "hsn-summary" && (
        <div className="rounded-lg bg-white border border-gray-200 p-4">
          {hsnSummaryError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-4">
              <p className="text-sm text-red-700">{hsnSummaryError}</p>
            </div>
          )}

          {loadingHsnSummary ? (
            <div className="flex items-center justify-center p-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          ) : hsnSummary.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-8 text-center text-gray-500">
              <p>No transactions found for the selected date range</p>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5 mb-6">
                <SummaryCard
                  label="Total Value"
                  value={formatCurrency(hsnSummaryTotals.totalValue)}
                />
                <SummaryCard
                  label="Taxable Value"
                  value={formatCurrency(hsnSummaryTotals.taxableValue)}
                />
                <SummaryCard
                  label="CGST"
                  value={formatCurrency(hsnSummaryTotals.cgst)}
                  light
                />
                <SummaryCard
                  label="SGST"
                  value={formatCurrency(hsnSummaryTotals.sgst)}
                  light
                />
                <SummaryCard
                  label="IGST"
                  value={formatCurrency(hsnSummaryTotals.igst)}
                  light
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-300 bg-gray-50">
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        HSN Code
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">
                        Description
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Quantity
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Total Value
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        Taxable Value
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        CGST
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        SGST
                      </th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">
                        IGST
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hsnSummary.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono font-medium text-gray-900">
                          {item.hsnCode}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {item.description || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900 font-medium">
                          {formatCurrency(item.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-900">
                          {formatCurrency(item.taxableValue || 0)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.cgstAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.sgstAmount)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.igstAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() =>
                    exportToCsv(
                      hsnSummary,
                      `GSTR1-HSN-Summary-${startDate}-to-${endDate}.csv`,
                    )
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  ↓ Export CSV
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Summary card component
 */
function SummaryCard({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <div
      className={`rounded-lg p-4 ${light ? "bg-gray-50 border border-gray-200" : "bg-blue-50 border border-blue-200"}`}
    >
      <p
        className={`text-xs font-medium ${light ? "text-gray-600" : "text-blue-700"}`}
      >
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-bold ${light ? "text-gray-900" : "text-blue-600"}`}
      >
        {value}
      </p>
    </div>
  );
}

/**
 * Helper: Get first day of current month
 */
function getFirstDayOfMonth(): string {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1);
  return first.toISOString().split("T")[0];
}
