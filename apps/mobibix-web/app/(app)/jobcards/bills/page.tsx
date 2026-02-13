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
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { NoShopsAlert } from "../../components/NoShopsAlert";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { type FollowUpType } from "@/services/crm.api";
import { JobCardsTabs } from "@/components/jobcards/JobCardsTabs";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  FINAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  CREDIT:
    "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  VOIDED: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
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

export default function JobCardBillsPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const { authUser } = useAuth();
  const {
    shops,
    selectedShopId,
    isLoadingShops,
    error: shopError,
    selectShop,
    hasMultipleShops,
  } = useShop();

  // Get user role for permission checks
  const userRole = authUser?.role;
  const isOwner = userRole === "OWNER";

  const {
    data: invoicesData,
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(async () => {
      if (!selectedShopId) {
        return [];
      }
      // Pass 'true' to filter only job card invoices
      const result = await listInvoices(selectedShopId, true);
      // Handle both paginated and non-paginated responses
      return Array.isArray(result) ? result : result.data;
    }, [selectedShopId]),
    [selectedShopId],
    [] as SalesInvoice[],
  );

  const invoices = invoicesData || [];

  const displayError = error
    ? error.includes("Invalid shop")
      ? "This shop doesn't belong to your account."
      : error
    : null;

  const [collectingInvoice, setCollectingInvoice] =
    useState<SalesInvoice | null>(null);
  const [cancellingInvoice, setCancellingInvoice] = useState<{
    id: string;
    number: string;
  } | null>(null);

  const handlePrint = (invoiceId: string, invoiceNumber: string) => {
    router.push(`/print/invoice/${invoiceId}?shopId=${selectedShopId}`);
  };

  const handleShare = (invoiceId: string, invoiceNumber: string) => {
    router.push(`/sales/${invoiceId}/share?shopId=${selectedShopId}`);
  };

  const handleEdit = (invoiceId: string) => {
    if (!isOwner) {
      alert("Only owner can edit invoices");
      return;
    }
    router.push(`/sales/${invoiceId}/edit?shopId=${selectedShopId}`);
  };

  const handleCancel = (invoiceId: string, invoiceNumber: string) => {
    if (!isOwner) {
      alert("Only owner can cancel invoices");
      return;
    }
    setCancellingInvoice({ id: invoiceId, number: invoiceNumber });
  };

  const handleCollectPayment = (invoice: SalesInvoice) => {
    setCollectingInvoice(invoice);
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
        <h2
          className={`text-xl font-bold ${theme === "dark" ? "text-stone-300" : "text-gray-800"}`}
        >
          Job Cards
        </h2>
        {/* No Create Invoice button here - these are auto-generated from Job Cards */}
      </div>

      <JobCardsTabs />

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

      {!selectedShopId ? (
        <div className="text-center py-12">
          <p
            className={`mb-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
          >
            Please select a shop to view job card bills
          </p>
        </div>
      ) : isLoading ? (
        <div
          className={`text-center py-12 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
        >
          Loading bills...
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <p
            className={`mb-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
          >
            No invoices linked to job cards found
          </p>
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
                            ₹{inv.totalAmount.toFixed(2)}
                          </div>
                          {inv.balanceAmount !== undefined && (
                            <div
                              className={`text-xs font-semibold ${inv.balanceAmount > 0 ? (theme === "dark" ? "text-red-400" : "text-red-600") : theme === "dark" ? "text-green-400" : "text-green-600"}`}
                            >
                              Balance: ₹{inv.balanceAmount.toFixed(2)}
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
                            inv.status === "VOIDED"
                              ? STATUS_COLORS["VOIDED"]
                              : inv.paymentStatus
                                ? PAYMENT_STATUS_COLORS[inv.paymentStatus]
                                : STATUS_COLORS[inv.status]
                          }`}
                        >
                          {inv.status === "VOIDED"
                            ? "VOIDED"
                            : inv.paymentStatus || inv.status}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                      >
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {inv.balanceAmount && inv.balanceAmount > 0 ? (
                            <button
                              onClick={() => handleCollectPayment(inv)}
                              title="Collect Payment"
                              className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30 transition shadow-sm border border-green-200 dark:border-green-500/30"
                            >
                              Collect ₹
                            </button>
                          ) : null}

                          <button
                            onClick={() =>
                              router.push(
                                `/sales/${inv.id}?shopId=${selectedShopId}`,
                              )
                            }
                            title="View Invoice"
                            className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                          >
                            👁️
                          </button>

                          {inv.status !== "VOIDED" && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/print/invoice/${inv.id}?shopId=${selectedShopId}&noQr=true`,
                                )
                              }
                              title="Print Invoice"
                              className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                            >
                              🖨️
                            </button>
                          )}

                          {isOwner &&
                            (inv.status === "PAID" ||
                              inv.status === "CREDIT") && (
                              <button
                                onClick={() => handleEdit(inv.id)}
                                title="Edit Invoice"
                                className={`px-2 py-1 rounded text-sm transition ${theme === "dark" ? "text-amber-400 hover:bg-amber-500/20" : "text-amber-600 hover:bg-amber-50"}`}
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
                                className={`px-2 py-1 rounded text-sm transition ${theme === "dark" ? "text-red-400 hover:bg-red-500/20" : "text-red-600 hover:bg-red-50"}`}
                              >
                                ❌
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {collectingInvoice && (
        <CollectPaymentModal
          invoiceId={collectingInvoice.id}
          balanceAmount={collectingInvoice.balanceAmount || 0}
          customerName={collectingInvoice.customerName || "Customer"}
          isOpen={!!collectingInvoice}
          onClose={() => setCollectingInvoice(null)}
          onSuccess={() => {
            setCollectingInvoice(null);
            reload();
          }}
        />
      )}

      {cancellingInvoice && (
        <CancelInvoiceModal
          isOpen={!!cancellingInvoice}
          invoiceId={cancellingInvoice.id}
          invoiceNumber={cancellingInvoice.number}
          onClose={() => setCancellingInvoice(null)}
          onSuccess={() => {
            setCancellingInvoice(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
