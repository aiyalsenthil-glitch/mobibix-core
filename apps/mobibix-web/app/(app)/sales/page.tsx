"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
  type PaymentStatus,
} from "@/services/sales.api";
import { getAccessToken, decodeAccessToken } from "@/services/auth.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { NoShopsAlert } from "../components/NoShopsAlert";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  CREDIT: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  CANCELLED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  PARTIALLY_PAID:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  UNPAID: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  CANCELLED: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-200",
  UPI: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  CARD: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300",
  BANK: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  CREDIT:
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
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
  } = useShop();

  // Get user role for permission checks
  const token = getAccessToken();
  const userRole = token ? decodeAccessToken(token).role : null;
  const isOwner = userRole === "OWNER";

  // Use modern hook for async data loading with built-in race condition prevention
  const {
    data: invoices = [],
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(async () => {
      if (!selectedShopId) {
        return [];
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
          throw new Error(
            "Your account is not associated with any tenant/shop. Please contact support or set up your business profile first.",
          );
        }
      } else {
        throw new Error("Authentication required. Please log in again.");
      }

      return await listInvoices(selectedShopId);
    }, [selectedShopId]),
    [selectedShopId],
    [] as SalesInvoice[], // Initial data
  );

  // Transform error messages for better UX
  const displayError = error
    ? error.includes("Invalid shop")
      ? "This shop doesn't belong to your account. The shop may belong to a different tenant or you may need to log in with the correct account."
      : error.includes("Unauthorized") || error.includes("401")
        ? "Your session has expired. Please log in again."
        : error
    : null;

  const handleCreateInvoice = () => {
    if (!selectedShopId) {
      alert("Please select a shop first");
      return;
    }
    router.push(`/sales/create?shopId=${selectedShopId}`);
  };

  const handlePrint = (invoiceId: string, invoiceNumber: string) => {
    router.push(`/sales/${invoiceId}?action=print&shopId=${selectedShopId}`);
  };

  const handleShare = (invoiceId: string, invoiceNumber: string) => {
    const shareUrl = `${window.location.origin}/sales/${invoiceId}?shopId=${selectedShopId}`;
    const text = `Invoice ${invoiceNumber}`;
    if (navigator.share) {
      navigator.share({ title: text, url: shareUrl });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareUrl);
      alert("Invoice link copied to clipboard");
    }
  };

  const handleEdit = (invoiceId: string) => {
    if (!isOwner) {
      alert("Only owner can edit invoices");
      return;
    }
    router.push(`/sales/${invoiceId}/edit?shopId=${selectedShopId}`);
  };

  const handleCancel = async (invoiceId: string, invoiceNumber: string) => {
    if (!isOwner) {
      alert("Only owner can cancel invoices");
      return;
    }
    if (!confirm(`Cancel invoice ${invoiceNumber}?`)) {
      return;
    }
    try {
      // Import and use cancelInvoice from API
      const { cancelInvoice } = await import("@/services/sales.api");
      await cancelInvoice(invoiceId);
      reload();
    } catch (err: any) {
      alert(err.message || "Failed to cancel invoice");
    }
  };

  const formatDate = (date: string | Date) => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
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
      {isLoadingShops ? (
        <div
          className={`${theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"} border rounded-lg p-4 mb-6 shadow-sm`}
        >
          <div className="text-stone-400">Loading shops...</div>
        </div>
      ) : shops.length === 0 ? null : (
        hasMultipleShops && (
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
              </div>
            </div>
          </div>
        )
      )}

      {error && (
        <div
          className={`border px-4 py-3 rounded-lg mb-6 ${theme === "dark" ? "bg-red-500/15 border-red-500/40 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {displayError}
        </div>
      )}
      {shopError && (
        <div
          className={`border px-4 py-3 rounded-lg mb-4 ${theme === "dark" ? "bg-red-500/20 border-red-500/50 text-red-300" : "bg-red-50 border-red-200 text-red-700"}`}
        >
          {shopError}
        </div>
      )}
      {shops.length === 0 ? (
        <div className="mb-6">
          <NoShopsAlert variant="compact" />
        </div>
      ) : !selectedShopId ? (
        <div className="text-center py-12">
          <p
            className={`mb-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
          >
            Please select a shop from the filter above to view invoices
          </p>
        </div>
      ) : isLoading ? (
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
            No invoices found
          </p>
          <button
            onClick={handleCreateInvoice}
            className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold transition shadow-lg"
          >
            Create your first invoice
          </button>
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
                    "Actions",
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
                {invoices.map((inv) => {
                  // Determine if row should have highlight (has balance > 0)
                  const hasBalance = inv.balanceAmount && inv.balanceAmount > 0;
                  const rowBgClass = hasBalance
                    ? theme === "dark"
                      ? "bg-amber-500/5 hover:bg-amber-500/10"
                      : "bg-amber-50 hover:bg-amber-100/50"
                    : theme === "dark"
                      ? "hover:bg-white/5"
                      : "hover:bg-gray-50";

                  return (
                    <tr key={inv.id} className={`transition ${rowBgClass}`}>
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
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-white" : "text-black"}`}
                      >
                        <div className="space-y-1">
                          <div className="font-bold">
                            ₹
                            {inv.totalAmount.toLocaleString("en-US", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </div>
                          {inv.paidAmount !== undefined && (
                            <div
                              className={`text-xs ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                            >
                              Paid: ₹
                              {inv.paidAmount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                          {inv.balanceAmount !== undefined && (
                            <div
                              className={`text-xs font-semibold ${
                                inv.balanceAmount > 0
                                  ? theme === "dark"
                                    ? "text-red-400"
                                    : "text-red-600"
                                  : theme === "dark"
                                    ? "text-green-400"
                                    : "text-green-600"
                              }`}
                            >
                              Balance: ₹
                              {inv.balanceAmount.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </div>
                          )}
                        </div>
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
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            inv.paymentStatus
                              ? PAYMENT_STATUS_COLORS[inv.paymentStatus]
                              : STATUS_COLORS[inv.status]
                          }`}
                        >
                          {inv.paymentStatus || inv.status}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                      >
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              handlePrint(inv.id, inv.invoiceNumber)
                            }
                            title="Print Invoice"
                            className={`px-2 py-1 rounded text-sm transition ${
                              theme === "dark"
                                ? "text-blue-400 hover:bg-blue-500/20"
                                : "text-blue-600 hover:bg-blue-50"
                            }`}
                          >
                            🖨️
                          </button>
                          <button
                            onClick={() =>
                              handleShare(inv.id, inv.invoiceNumber)
                            }
                            title="Share Invoice"
                            className={`px-2 py-1 rounded text-sm transition ${
                              theme === "dark"
                                ? "text-green-400 hover:bg-green-500/20"
                                : "text-green-600 hover:bg-green-50"
                            }`}
                          >
                            📤
                          </button>
                          {isOwner &&
                            (inv.status === "PAID" ||
                              inv.status === "CREDIT") && (
                              <button
                                onClick={() => handleEdit(inv.id)}
                                title="Edit Invoice"
                                className={`px-2 py-1 rounded text-sm transition ${
                                  theme === "dark"
                                    ? "text-amber-400 hover:bg-amber-500/20"
                                    : "text-amber-600 hover:bg-amber-50"
                                }`}
                              >
                                ✏️
                              </button>
                            )}
                          {isOwner &&
                            (inv.status === "PAID" ||
                              inv.status === "CREDIT") && (
                              <button
                                onClick={() =>
                                  handleCancel(inv.id, inv.invoiceNumber)
                                }
                                title="Cancel Invoice"
                                className={`px-2 py-1 rounded text-sm transition ${
                                  theme === "dark"
                                    ? "text-red-400 hover:bg-red-500/20"
                                    : "text-red-600 hover:bg-red-50"
                                }`}
                              >
                                ❌
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}{" "}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
