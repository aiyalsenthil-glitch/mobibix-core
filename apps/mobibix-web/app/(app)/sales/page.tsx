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
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-500/15 dark:text-gray-400",
  FINAL: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  CREDIT: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400", // Changed from blue to amber for credit
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
    data: invoicesData,
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

  const invoices = invoicesData || [];

  // Transform error messages for better UX
  const displayError = error
    ? error.includes("Invalid shop")
      ? "This shop doesn't belong to your account. The shop may belong to a different tenant or you may need to log in with the correct account."
      : error.includes("Unauthorized") || error.includes("401")
        ? "Your session has expired. Please log in again."
        : error
    : null;


  const [collectingInvoice, setCollectingInvoice] = useState<SalesInvoice | null>(
    null,
  );
  const [cancellingInvoice, setCancellingInvoice] = useState<{ id: string; number: string } | null>(null);

  // CRM Modals State
  const [timelineCustomerId, setTimelineCustomerId] = useState<string | null>(null);
  const [timelineCustomerName, setTimelineCustomerName] = useState<string>("");
  const [followUpData, setFollowUpData] = useState<{
    customerId: string;
    customerName: string;
    defaultPurpose: string;
    defaultType: FollowUpType;
  } | null>(null);

  const handleCreateInvoice = () => {
    if (!selectedShopId) {
      alert("Please select a shop first");
      return;
    }
    router.push(`/sales/create?shopId=${selectedShopId}`);
  };

  const handlePrint = (invoiceId: string, invoiceNumber: string) => {
    router.push(`/print/invoice/${invoiceId}?shopId=${selectedShopId}`);
  };

  const handleShare = (invoiceId: string, invoiceNumber: string) => {
    const shareUrl = `${window.location.origin}/print/invoice/${invoiceId}?shopId=${selectedShopId}`;
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
                            inv.status === 'VOIDED'
                              ? STATUS_COLORS['VOIDED']
                              : inv.paymentStatus
                                ? PAYMENT_STATUS_COLORS[inv.paymentStatus]
                                : STATUS_COLORS[inv.status]
                          }`}
                        >
                          {inv.status === 'VOIDED' ? 'VOIDED' : (inv.paymentStatus || inv.status)}
                        </span>
                      </td>
                      <td
                        className={`px-4 py-3 text-sm ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                      >
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                           {/* Collect Payment Button */}
                           {inv.balanceAmount && inv.balanceAmount > 0 ? (
                            <button
                              onClick={() => handleCollectPayment(inv)}
                              title="Collect Payment"
                              className="px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30 transition shadow-sm border border-green-200 dark:border-green-500/30"
                            >
                              Collect ₹
                            </button>
                           ) : null}

                          {/* View Button */}
                          <button
                            onClick={() =>
                              router.push(
                                `/sales/${inv.id}?shopId=${selectedShopId}`,
                              )
                            }
                            title="View Invoice"
                            className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                          >
                            <svg
                              className={`w-4 h-4 ${theme === "dark" ? "text-blue-400" : "text-blue-600"}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </button>

                          {/* CRM Actions */}
                          <button
                            onClick={() => {
                              setTimelineCustomerId(inv.customerId || "");
                              setTimelineCustomerName(inv.customerName || "Customer");
                            }}
                            title="View History"
                            className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                          >
                            🕒
                          </button>
                          <button
                            onClick={() => {
                              setFollowUpData({
                                customerId: inv.customerId || "",
                                customerName: inv.customerName || "Customer",
                                defaultPurpose: `Follow up on invoice ${inv.invoiceNumber}`,
                                defaultType: "PHONE_CALL",
                              });
                            }}
                            title="Add Follow-up"
                            className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                          >
                            📋
                          </button>

                          {/* Print Button - Hidden for voided invoices */}
                          {inv.status !== 'VOIDED' && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/sales/${inv.id}/invoice?shopId=${selectedShopId}`,
                                )
                              }
                              title="Print Invoice"
                              className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                            >
                              <svg
                                className={`w-4 h-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                                />
                              </svg>
                            </button>
                          )}

                          {/* Share Button - Hidden for voided invoices */}
                          {inv.status !== 'VOIDED' && (
                            <button
                              onClick={() =>
                                router.push(
                                  `/sales/${inv.id}/share?shopId=${selectedShopId}`,
                                )
                              }
                              title="Share Invoice"
                              className={`p-2 rounded ${theme === "dark" ? "hover:bg-white/10" : "hover:bg-zinc-200"} transition`}
                            >
                              <svg
                                className={`w-4 h-4 ${theme === "dark" ? "text-stone-400" : "text-zinc-600"}`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                                />
                              </svg>
                            </button>
                          )}
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
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Collect Payment Modal */}
      {collectingInvoice && (
        <CollectPaymentModal
          invoiceId={collectingInvoice.id}
          balanceAmount={collectingInvoice.balanceAmount || 0}
          customerName={collectingInvoice.customerName || "Customer"}
          isOpen={!!collectingInvoice}
          onClose={() => setCollectingInvoice(null)}
          onSuccess={() => {
            reload();
          }}
        />
      )}

      {/* Cancel Invoice Modal */}
      {cancellingInvoice && (
        <CancelInvoiceModal
          invoiceId={cancellingInvoice.id}
          invoiceNumber={cancellingInvoice.number}
          isOpen={!!cancellingInvoice}
          onClose={() => setCancellingInvoice(null)}
          onSuccess={() => {
            setCancellingInvoice(null);
            reload();
          }}
        />
      )}

      {/* CRM Modals */}
      <CustomerTimelineDrawer
        isOpen={!!timelineCustomerId}
        customerId={timelineCustomerId || ""}
        customerName={timelineCustomerName}
        onClose={() => {
          setTimelineCustomerId(null);
          setTimelineCustomerName("");
        }}
      />

      {followUpData && (
        <AddFollowUpModal
          isOpen={!!followUpData}
          customerId={followUpData.customerId || ""}
          customerName={followUpData.customerName || "Customer"}
          defaultPurpose={followUpData.defaultPurpose}
          defaultType={followUpData.defaultType}
          onClose={() => setFollowUpData(null)}
          onSuccess={() => {
            // refresh something if needed
          }}
        />
      )}
    </div>
  );
}
