"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
} from "@/services/sales.api";
import { getAccessToken, decodeAccessToken } from "@/services/auth.api";
import { useTheme } from "@/context/ThemeContext";
import { useShopSelection } from "@/hooks/useShopSelection";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-200",
  UPI: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  CARD: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  BANK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export default function SalesPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const {
    shops,
    selectedShopId,
    selectedShop,
    isLoadingShops,
    error: shopError,
    selectShop,
    hasMultipleShops,
  } = useShopSelection();

  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-load invoices when shop is selected
  useEffect(() => {
    if (selectedShopId) {
      loadInvoices();
    }
  }, [selectedShopId]);

  const loadInvoices = async () => {
    if (!selectedShopId) {
      setError("Please select a shop first");
      setInvoices([]);
      return;
    }

    // Debug: Check JWT token claims
    const token = getAccessToken();
    if (token) {
      const claims = decodeAccessToken(token);
      console.log("🔍 JWT Token Claims:", {
        userId: claims.sub,
        tenantId: claims.tenantId,
        role: claims.role,
      });
      console.log("📦 Selected Shop ID:", selectedShopId);

      if (!claims.tenantId) {
        setError(
          "Your account is not associated with any tenant/shop. Please contact support or set up your business profile first.",
        );
        setInvoices([]);
        return;
      }
    } else {
      setError("Authentication required. Please log in again.");
      setInvoices([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await listInvoices(selectedShopId);
      setInvoices(data);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to load invoices";
      console.error("Load invoices error:", err);

      // Provide helpful error messages
      if (errorMessage.includes("Invalid shop")) {
        setError(
          "This shop doesn't belong to your account. The shop may belong to a different tenant or you may need to log in with the correct account.",
        );
      } else if (
        errorMessage.includes("Unauthorized") ||
        errorMessage.includes("401")
      ) {
        setError("Your session has expired. Please log in again.");
      } else {
        setError(errorMessage);
      }
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    if (!selectedShopId) {
      alert("Please select a shop first");
      return;
    }
    router.push(`/sales/create?shopId=${selectedShopId}`);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Sales
        </h1>
        <button
          onClick={handleCreateInvoice}
          disabled={!selectedShopId}
          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg"
        >
          + Create Invoice
        </button>
      </div>

      {/* Shop Filter Section - Only show if multiple shops */}
      {hasMultipleShops && (
        <div
          className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-lg p-4 mb-6 shadow-sm`}
        >
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label
                className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-stone-300" : "text-black"}`}
              >
                Select Shop
              </label>
              {isLoadingShops ? (
                <div
                  className={`px-4 py-2 border rounded-lg ${theme === "dark" ? "bg-white/5 border-white/10 text-stone-400" : "bg-gray-50 border-gray-200 text-black"}`}
                >
                  Loading shops...
                </div>
              ) : shops.length === 0 ? (
                <div
                  className={`px-4 py-2 border rounded-lg ${theme === "dark" ? "bg-white/5 border-white/10 text-stone-400" : "bg-gray-50 border-gray-200 text-black"}`}
                >
                  No shops available
                </div>
              ) : (
                <select
                  value={selectedShopId}
                  onChange={(e) => selectShop(e.target.value)}
                  className={`w-full px-4 py-2 rounded-lg font-medium focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 border ${
                    theme === "dark"
                      ? "bg-stone-900 border-white/20 text-white"
                      : "bg-white border-gray-300 text-black"
                  }`}
                >
                  <option
                    value=""
                    className={
                      theme === "dark"
                        ? "bg-stone-900 text-white"
                        : "bg-white text-black"
                    }
                  >
                    -- Select a shop --
                  </option>
                  {shops.map((shop) => (
                    <option
                      key={shop.id}
                      value={shop.id}
                      className={
                        theme === "dark"
                          ? "bg-stone-900 text-white"
                          : "bg-white text-black"
                      }
                    >
                      {shop.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div
          className={`border px-4 py-3 rounded-lg mb-6 ${theme === "dark" ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {error}
        </div>
      )}
      {shopError && (
        <div
          className={`border px-4 py-3 rounded-lg mb-4 ${theme === "dark" ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {shopError}
        </div>
      )}
      {isLoading ? (
        <div
          className={`text-center py-12 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
        >
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <p
            className={`mb-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
          >
            {selectedShopId
              ? "No invoices found"
              : "Please select a shop and press Refresh to view invoices"}
          </p>
          {selectedShopId && (
            <button
              onClick={handleCreateInvoice}
              className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold transition shadow-lg"
            >
              Create your first invoice
            </button>
          )}
        </div>
      ) : (
        <div
          className={`border rounded-lg overflow-hidden shadow-sm ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"}`}
        >
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead
                className={`border-b ${theme === "dark" ? "bg-white/5 border-white/10" : "bg-gray-50 border-gray-200"}`}
              >
                <tr>
                  {[
                    "Invoice #",
                    "Customer",
                    "Amount",
                    "Payment",
                    "Status",
                    "Date",
                  ].map((header) => (
                    <th
                      key={header}
                      className={`text-left px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-stone-300" : "text-black"}`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody
                className={`divide-y ${theme === "dark" ? "divide-white/10" : "divide-gray-200"}`}
              >
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className={`transition ${theme === "dark" ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                  >
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
                    >
                      {inv.invoiceNumber}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-300" : "text-black"}`}
                    >
                      {inv.customerName || "-"}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm font-semibold ${theme === "dark" ? "text-white" : "text-black"}`}
                    >
                      $
                      {inv.totalAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_BADGES[inv.paymentMode]}`}
                      >
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[inv.status]}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                    >
                      {new Date(inv.invoiceDate).toLocaleDateString()}{" "}
                      {new Date(inv.invoiceDate).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
