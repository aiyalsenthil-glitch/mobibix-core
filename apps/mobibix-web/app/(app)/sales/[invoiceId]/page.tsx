"use client";

import { useCallback, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { getInvoice, shareInvoiceWhatsApp, type SalesInvoice } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";
import { InvoiceItemModal } from "@/components/sales/InvoiceItemModal";
import { addItemToInvoice, InvoiceItem } from "@/services/sales.api";
import { EWayBillPanel } from "@/components/sales/EWayBillPanel";
import { useShop } from "@/context/ShopContext";
import { type Shop } from "@/services/shops.api";

const EWB_THRESHOLD_RUPEES = 50_000; // API returns totalAmount in rupees

function EWayBillSection({ invoice, selectedShop }: { invoice: SalesInvoice; selectedShop: Shop | null }) {
  const [showPanel, setShowPanel] = useState(false);
  const isEligible = !!invoice.customerGstin && invoice.totalAmount > EWB_THRESHOLD_RUPEES;
  if (!isEligible) return null;

  const autoGenerate = selectedShop?.autoGenerateEwayBill ?? false;

  if (!autoGenerate && !showPanel) {
    return (
      <div className="mb-6">
        <button
          onClick={() => {
            setShowPanel(true);
            setTimeout(() => document.getElementById('ewb-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
          }}
          className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-900/10 text-sky-700 dark:text-sky-300 text-sm font-medium hover:bg-sky-100 dark:hover:bg-sky-900/20 transition"
        >
          <span>E-Way Bill</span>
          <span className="text-xs bg-sky-200 dark:bg-sky-500/30 px-2 py-0.5 rounded-full">Generate</span>
        </button>
      </div>
    );
  }

  return (
    <div id="ewb-panel" className="mb-6">
      <EWayBillPanel
        invoiceId={invoice.id}
        totalAmount={invoice.totalAmount}
        customerGstin={invoice.customerGstin}
        customerDistanceKm={invoice.customerDistanceKm ?? null}
      />
    </div>
  );
}

export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const { theme } = useTheme();
  const { selectedShop } = useShop();
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // CRM Modals State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [waSending, setWaSending] = useState(false);
  const [waToast, setWaToast] = useState<string | null>(null);

  const {
    data: invoice,
    isLoading,
    error,
    reload,
  } = useDeferredAsyncData(
    useCallback(async () => {
      if (!invoiceId) return null;
      return await getInvoice(invoiceId);
    }, [invoiceId]),
    [invoiceId],
    null as SalesInvoice | null,
  );

  const handleBack = () => {
    router.back();
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "₹0.00";
    return amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
  };

  const handleAddItem = async (item: InvoiceItem) => {
    if (!invoice) return;
    try {
      setActionLoading(true);
      await addItemToInvoice(invoice.id, item);
      await reload();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to add item");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div
        className={`p-8 text-center ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
      >
        Loading invoice details...
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Invoice not found"}
        </div>
        <button
          onClick={handleBack}
          className="mt-4 text-teal-600 hover:underline"
        >
          &larr; Back to Invoices
        </button>
      </div>
    );
  }

  const hasBalance = (invoice.balanceAmount || 0) > 0;
  
  let statusText: string = invoice.status;
  let statusColor = "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";

  // Prioritize payment status over overall status to handle partial payments correctly
  if (invoice.status === "VOIDED") {
    statusText = "VOIDED";
    statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  } else if (invoice.paymentStatus === "PARTIALLY_PAID" || (hasBalance && invoice.paidAmount && invoice.paidAmount > 0)) {
    statusText = "PARTIALLY PAID";
    statusColor = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  } else if (invoice.paymentStatus === "UNPAID" || (hasBalance && (!invoice.paidAmount || invoice.paidAmount === 0))) {
    statusText = "UNPAID";
    statusColor = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  } else if (invoice.status === "PAID") {
    statusText = "PAID";
    statusColor = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
  } else if (invoice.status === "DRAFT") {
     statusText = "DRAFT";
     statusColor = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
  } else if (invoice.status === "CREDIT") {
     statusText = "CREDIT";
     statusColor = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
  }

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className={`flex items-center gap-1 font-medium transition ${
            theme === "dark"
              ? "text-stone-400 hover:text-white"
              : "text-gray-600 hover:text-black"
          }`}
        >
          &larr; Back
        </button>
        <div className="flex gap-2">
          {invoice.status !== "PAID" && invoice.status !== "VOIDED" && (
            <button
              onClick={() => setIsCancelModalOpen(true)}
              className="px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition dark:border-red-900/30 dark:text-red-400 dark:hover:bg-red-900/20"
            >
              Cancel Invoice
            </button>
          )}
          {hasBalance && invoice.status !== "VOIDED" && (
            <button
              onClick={() => setIsCollectModalOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold shadow-md transition"
            >
              Collect Payment
            </button>
          )}
          <button
            onClick={() => setIsTimelineOpen(true)}
            className={`px-4 py-2 border rounded-lg font-medium transition ${
              theme === "dark"
                ? "border-white/20 hover:bg-white/10 text-white"
                : "border-gray-300 hover:bg-gray-50 text-gray-700"
            }`}
            title="View Customer Interaction History"
          >
            🕒 History
          </button>
          <button
            onClick={() => setIsFollowUpOpen(true)}
            className={`px-4 py-2 border rounded-lg font-medium transition ${
              theme === "dark"
                ? "border-white/20 hover:bg-white/10 text-white"
                : "border-gray-300 hover:bg-gray-50 text-gray-700"
            }`}
            title="Schedule a Follow-up Task"
          >
            📋 Follow-up
          </button>
          {invoice.customerPhone && invoice.status !== "VOIDED" && (
            <button
              disabled={waSending}
              onClick={async () => {
                setWaSending(true);
                try {
                  const res = await shareInvoiceWhatsApp(invoice.id);
                  setWaToast(`Sent to ${res.phone}`);
                  setTimeout(() => setWaToast(null), 3000);
                } catch (e: any) {
                  setWaToast(e.message || "Failed to send");
                  setTimeout(() => setWaToast(null), 3000);
                } finally {
                  setWaSending(false);
                }
              }}
              className={`px-4 py-2 border rounded-lg font-medium transition flex items-center gap-1 ${
                theme === "dark"
                  ? "border-green-500/40 hover:bg-green-500/10 text-green-400"
                  : "border-green-500 hover:bg-green-50 text-green-700"
              } disabled:opacity-50`}
            >
              {waSending ? "Sending..." : "WhatsApp"}
            </button>
          )}
          <button
            onClick={() => router.push(`/print/invoice/${invoice.id}`)}
            className={`px-4 py-2 border rounded-lg font-medium transition ${
              theme === "dark"
                ? "border-white/20 hover:bg-white/10 text-white"
                : "border-gray-300 hover:bg-gray-50 text-gray-700"
            }`}
          >
            Print
          </button>
          {waToast && (
            <div className="absolute top-2 right-2 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg shadow z-50">
              {waToast}
            </div>
          )}
        </div>
      </div>

      {/* Main Card */}
      <div
        className={`rounded-xl overflow-hidden shadow-sm border mb-6 ${
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : "bg-white border-gray-200"
        }`}
      >
        {/* Top Header */}
        <div
          className={`p-6 border-b flex justify-between items-start ${
            theme === "dark" ? "border-white/10" : "border-gray-100"
          }`}
        >
          <div>
            <h1
              className={`text-2xl font-bold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
            >
              Invoice #{invoice.invoiceNumber}
            </h1>
            <div
              className={`text-sm ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
            >
              Created on {formatDate(invoice.createdAt)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor}`}
            >
              {statusText}
            </span>
            {/* 🛡️ JobCard-linked invoices cannot be edited */}
            {invoice.jobCard && (
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  theme === "dark"
                    ? "bg-blue-900/30 text-blue-300 border border-blue-700"
                    : "bg-blue-100 text-blue-700 border border-blue-300"
                }`}
              >
                📋 From Job Card
              </span>
            )}
          </div>
        </div>

        {/* Details Grid */}

        {/* Job Card Details Banner */}
        {invoice.jobCard && (
          <div
            className={`mx-6 mt-6 mb-4 p-4 rounded-lg border ${
              theme === "dark"
                ? "bg-blue-900/10 border-blue-800 text-blue-200"
                : "bg-blue-50 border-blue-100 text-blue-800"
            }`}
          >
            <h3 className="font-bold text-sm uppercase opacity-70 mb-3">
              Job Card Details
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="block text-xs font-semibold opacity-60">
                  Job Number
                </span>
                <span className="font-mono font-bold">
                  {invoice.jobCard.jobNumber}
                </span>
              </div>
              <div>
                <span className="block text-xs font-semibold opacity-60">
                  Device
                </span>
                <span>
                  {invoice.jobCard.deviceBrand} {invoice.jobCard.deviceModel}
                </span>
              </div>
              {invoice.jobCard.deviceSerial && (
                <div>
                  <span className="block text-xs font-semibold opacity-60">
                    Serial / IMEI
                  </span>
                  <span className="font-mono">
                    {invoice.jobCard.deviceSerial}
                  </span>
                </div>
              )}
              <div className="col-span-2 md:col-span-1">
                <span className="block text-xs font-semibold opacity-60">
                  Issue
                </span>
                <span>{invoice.jobCard.problem}</span>
              </div>
            </div>
          </div>
        )}

        <div
          className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${
            theme === "dark" ? "divide-white/10" : "divide-gray-100"
          }`}
        >
          {/* Customer Info */}
          <div className="p-6">
            <h3
              className={`text-xs uppercase font-bold tracking-wider mb-4 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}
            >
              Customer Details
            </h3>
            <div
              className={`font-medium text-lg mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
            >
              {invoice.customerName}
            </div>
            {invoice.customerPhone && (
              <div
                className={
                  theme === "dark" ? "text-stone-300" : "text-gray-600"
                }
              >
                {invoice.customerPhone}
              </div>
            )}
            {invoice.customerGstin && (
              <div className="text-xs font-mono mt-1 text-teal-600 dark:text-teal-400">
                GSTIN: {invoice.customerGstin}
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="p-6 col-span-2">
            <h3
              className={`text-xs uppercase font-bold tracking-wider mb-4 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}
            >
              Payment Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div
                  className={`text-sm mb-1 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
                >
                  Total Amount
                </div>
                <div
                  className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                >
                  {formatCurrency(invoice.totalAmount)}
                </div>
              </div>
              <div>
                <div
                  className={`text-sm mb-1 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
                >
                  Paid
                </div>
                <div className="text-xl font-bold text-green-500">
                  {formatCurrency(invoice.paidAmount || 0)}
                </div>
              </div>
              <div>
                <div
                  className={`text-sm mb-1 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}
                >
                  Balance Due
                </div>
                <div
                  className={`text-xl font-bold ${hasBalance ? "text-red-500" : "text-stone-400"}`}
                >
                  {formatCurrency(invoice.balanceAmount || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2
            className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
          >
            Items
          </h2>
          {/* 🛡️ Show read-only status for JobCard invoices */}
          {invoice.jobCard && (
            <p
              className={`text-xs mt-1 ${theme === "dark" ? "text-amber-400" : "text-amber-700"}`}
            >
              ℹ️ Parts are read-only. Service price can be adjusted before
              delivery.
            </p>
          )}
        </div>

        {/* 🛡️ Hide Add Item for JobCard-linked invoices, show help text instead */}
        {invoice.jobCard ? (
          <div
            className={`text-sm ${theme === "dark" ? "text-gray-400" : "text-gray-600"}`}
          >
            💡 Add spare parts from Job Card screen
          </div>
        ) : (
          invoice.status !== "VOIDED" &&
          invoice.status !== "PAID" && (
            <button
              onClick={() => setIsAddItemOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <span>+</span> Add Item
            </button>
          )
        )}
      </div>

      <div
        className={`rounded-xl overflow-hidden shadow-sm border mb-8 ${
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : "bg-white border-gray-200"
        }`}
      >
        <table className="w-full">
          <thead
            className={`text-left text-xs uppercase font-bold ${
              theme === "dark"
                ? "bg-white/5 text-stone-400"
                : "bg-gray-50 text-gray-500"
            }`}
          >
            <tr>
              <th className="px-6 py-3 w-12">#</th>
              <th className="px-6 py-3">Product / Service</th>
              <th className="px-6 py-3 text-right">Qty</th>
              <th className="px-6 py-3 text-right">Rate</th>
              <th className="px-6 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y ${theme === "dark" ? "divide-white/5" : "divide-gray-100"}`}
          >
            {invoice.items && invoice.items.length > 0 ? (
              invoice.items.map((item, index) => (
                <tr key={index}>
                  <td
                    className={`px-6 py-3 text-sm ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}
                  >
                    {index + 1}
                  </td>
                  <td
                    className={`px-6 py-3 font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {item.product?.name ||
                      item.itemName ||
                      "Item"}
                  </td>
                  <td
                    className={`px-6 py-3 text-right ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}
                  >
                    {item.quantity}
                  </td>
                  <td
                    className={`px-6 py-3 text-right ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}
                  >
                    {formatCurrency(item.rate)}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {formatCurrency(item.lineTotal)}
                  </td>
                  {invoice.status !== "PAID" && invoice.status !== "VOIDED" && (
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={async () => {
                          if (confirm("Remove item?")) {
                            try {
                              // Reuse removeItemFromInvoice or just update via API?
                              // Wait, we need an API to remove item from Detail Page context.
                              // Currently, updateInvoice handles items replacement.
                              // To "Delete", we need to call updateInvoice with items minus this one.
                              // OR call a dedicated endpoint? The edit page works by resubmitting the whole list.
                              // Let's rely on full list update logic if possible, OR check if we have removeItem API.
                              // Looking at imports... only addItemToInvoice is imported.
                              // I need to import updateInvoice.
                              const { updateInvoice } =
                                await import("@/services/sales.api");
                              const newItems = (invoice.items ?? [])
                                .filter((_, i) => i !== index)
                                .map((i) => ({
                                  shopProductId: i.shopProductId,
                                  quantity: i.quantity,
                                  rate: i.rate,
                                  gstRate: i.gstRate || 0,
                                  gstAmount: i.gstAmount,
                                }));

                              await updateInvoice(invoice.id, {
                                shopId: invoice.shopId,
                                items: newItems,
                                customerName: invoice.customerName ?? "",
                                paymentMode: invoice.paymentMode,
                                pricesIncludeTax: true,
                              });
                              reload();
                            } catch (e: unknown) {
                              alert(e instanceof Error ? e.message : "Failed to remove");
                            }
                          }
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={5}
                  className="px-6 py-8 text-center text-gray-500 italic"
                >
                  No items added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* E-Way Bill */}
      {invoice && <EWayBillSection invoice={invoice} selectedShop={selectedShop} />}

      {/* Payment History */}
      <h2
        className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}
      >
        Payment History
      </h2>

      {invoice.payments && invoice.payments.length > 0 ? (
        <div
          className={`rounded-xl overflow-hidden shadow-sm border ${
            theme === "dark"
              ? "bg-white/5 border-white/10"
              : "bg-white border-gray-200"
          }`}
        >
          <table className="w-full">
            <thead
              className={`text-left text-xs uppercase font-bold ${
                theme === "dark"
                  ? "bg-white/5 text-stone-400"
                  : "bg-gray-50 text-gray-500"
              }`}
            >
              <tr>
                <th className="px-6 py-3">Receipt #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Mode</th>
                <th className="px-6 py-3">Ref</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${theme === "dark" ? "divide-white/5" : "divide-gray-100"}`}
            >
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <td
                    className={`px-6 py-3 font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {payment.receiptNumber || "-"}
                  </td>
                  <td
                    className={`px-6 py-3 ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}
                  >
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-6 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        theme === "dark"
                          ? "bg-white/10 text-white"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {payment.method}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-3 text-sm ${theme === "dark" ? "text-stone-500" : "text-gray-500"}`}
                  >
                    {payment.transactionRef || "-"}
                  </td>
                  <td
                    className={`px-6 py-3 text-right font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}
                  >
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className={`p-8 text-center rounded-xl border border-dashed ${
            theme === "dark"
              ? "border-white/10 text-stone-500"
              : "border-gray-300 text-gray-500"
          }`}
        >
          No payment history available
        </div>
      )}

      {/* Modal */}
      {invoice && (
        <>
          <CollectPaymentModal
            invoiceId={invoice.id}
            balanceAmount={invoice.balanceAmount || 0}
            customerName={invoice.customerName || "Customer"}
            isOpen={isCollectModalOpen}
            onClose={() => setIsCollectModalOpen(false)}
            onSuccess={() => {
              reload();
            }}
          />
          <CancelInvoiceModal
            invoiceId={invoice.id}
            invoiceNumber={invoice.invoiceNumber}
            isOpen={isCancelModalOpen}
            onClose={() => setIsCancelModalOpen(false)}
            onSuccess={() => {
              reload();
            }}
          />

          <CustomerTimelineDrawer
            isOpen={isTimelineOpen}
            customerId={invoice.customerId || ""}
            customerName={invoice.customerName}
            onClose={() => setIsTimelineOpen(false)}
          />

          <AddFollowUpModal
            isOpen={isFollowUpOpen}
            customerId={invoice.customerId || ""}
            customerName={invoice.customerName}
            defaultPurpose={`Follow up on invoice ${invoice.invoiceNumber}`}
            defaultType="PHONE_CALL"
            onClose={() => setIsFollowUpOpen(false)}
            onSuccess={() => {}}
          />

          <InvoiceItemModal
            isOpen={isAddItemOpen}
            onClose={() => setIsAddItemOpen(false)}
            onAdd={handleAddItem}
            shopId={invoice.shopId}
            gstEnabled={selectedShop?.gstEnabled ?? true} // Use context shop settings if available
          />
        </>
      )}
    </div>
  );
}
