"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

interface Invoice {
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  date: string;
  status: string;
  customerName?: string;
}

export default function SalesDetailPage() {
  const router = useRouter();
  const { authUser } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api"}/mobileshop/sales/invoices?filter=today`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );
        if (response.ok) {
          const data = await response.json();
          setInvoices(Array.isArray(data) ? data : data.invoices || []);
        }
      } catch (error) {
        console.error("Failed to fetch invoices:", error);
      } finally {
        setLoading(false);
      }
    };

    if (authUser) {
      fetchInvoices();
    }
  }, [authUser]);

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
        <h1 className="text-3xl font-bold">Today's Sales</h1>
      </div>

      {/* Sales Table */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-200"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className={isDark ? "bg-gray-800" : "bg-gray-50"}>
                <th className="px-6 py-4 text-left font-semibold">Invoice #</th>
                <th className="px-6 py-4 text-left font-semibold">Customer</th>
                <th className="px-6 py-4 text-left font-semibold">Amount</th>
                <th className="px-6 py-4 text-left font-semibold">Date</th>
                <th className="px-6 py-4 text-left font-semibold">Status</th>
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
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <p className={isDark ? "text-gray-400" : "text-gray-500"}>
                      No invoices found for today
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className={`border-t ${
                      isDark
                        ? "border-gray-800 hover:bg-gray-800"
                        : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-pink-600 dark:text-pink-400">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-6 py-4">{invoice.customerName || "-"}</td>
                    <td className="px-6 py-4 font-semibold">
                      $
                      {invoice.totalAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {new Date(invoice.date).toLocaleDateString()}{" "}
                      {new Date(invoice.date).toLocaleTimeString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          invoice.status === "paid" ||
                          invoice.status === "completed"
                            ? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200"
                            : invoice.status === "pending"
                              ? "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200"
                              : "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      {invoices.length > 0 && (
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
                Total Invoices
              </p>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
            <div>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                Total Revenue
              </p>
              <p className="text-2xl font-bold">
                $
                {invoices
                  .reduce((sum, inv) => sum + inv.totalAmount, 0)
                  .toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
              </p>
            </div>
            <div>
              <p className={isDark ? "text-gray-400" : "text-gray-600"}>
                Average Invoice
              </p>
              <p className="text-2xl font-bold">
                $
                {(
                  invoices.reduce((sum, inv) => sum + inv.totalAmount, 0) /
                  invoices.length
                ).toLocaleString("en-US", {
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
