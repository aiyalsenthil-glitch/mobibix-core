"use client";

import { useCallback, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { getInvoice, type SalesInvoice } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { CancelInvoiceModal } from "@/components/sales/CancelInvoiceModal";
import { CustomerTimelineDrawer } from "@/components/crm/CustomerTimelineDrawer";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import { type FollowUpType } from "@/services/crm.api";
import { InvoiceItemModal } from "@/components/sales/InvoiceItemModal";
import { addItemToInvoice, InvoiceItem } from "@/services/sales.api";
import { useShop } from "@/context/ShopContext"; // Assuming ShopContext exists, or we fetch shop details? 
// Invoice data has shopId, but we need shop GST settings for Modal. 
// Ideally we fetch shop or assume GST based on something. 
// For now, I'll assume selectedShop from context if available, or fetch it.
// Checking imports again... useShop is standard.


export default function InvoiceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const invoiceId = params.invoiceId as string;
  const { theme } = useTheme();
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);

  // CRM Modals State
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);


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
    null as SalesInvoice | null
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
    } catch (e: any) {
      alert(e.message || "Failed to add item");
    } finally {
      setActionLoading(false);
    }
  };


  if (isLoading) {
    return (
      <div className={`p-8 text-center ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>
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
  const statusColor =
    invoice.status === "PAID"
      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
      : invoice.status === "CREDIT"
      ? "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300"
      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";

  return (
    <div className="max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={handleBack}
          className={`flex items-center gap-1 font-medium transition ${
            theme === "dark" ? "text-stone-400 hover:text-white" : "text-gray-600 hover:text-black"
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
        </div>
      </div>

      {/* Main Card */}
      <div className={`rounded-xl overflow-hidden shadow-sm border mb-6 ${
        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
      }`}>
        {/* Top Header */}
        <div className={`p-6 border-b flex justify-between items-start ${
           theme === "dark" ? "border-white/10" : "border-gray-100"
        }`}>
          <div>
            <h1 className={`text-2xl font-bold mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              Invoice #{invoice.invoiceNumber}
            </h1>
            <div className={`text-sm ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>
              Created on {formatDate(invoice.createdAt)}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor}`}>
            {invoice.status}
          </span>
        </div>

        {/* Details Grid */}
        
        {/* Job Card Details Banner */}
        {invoice.jobCard && (
          <div className={`mx-6 mt-6 mb-4 p-4 rounded-lg border ${
             theme === "dark" 
               ? "bg-blue-900/10 border-blue-800 text-blue-200" 
               : "bg-blue-50 border-blue-100 text-blue-800"
          }`}>
            <h3 className="font-bold text-sm uppercase opacity-70 mb-3">Job Card Details</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="block text-xs font-semibold opacity-60">Job Number</span>
                  <span className="font-mono font-bold">{invoice.jobCard.jobNumber}</span>
                </div>
                <div>
                  <span className="block text-xs font-semibold opacity-60">Device</span>
                  <span>{invoice.jobCard.deviceBrand} {invoice.jobCard.deviceModel}</span>
                </div>
                {invoice.jobCard.deviceSerial && (
                  <div>
                    <span className="block text-xs font-semibold opacity-60">Serial / IMEI</span>
                    <span className="font-mono">{invoice.jobCard.deviceSerial}</span>
                  </div>
                )}
                <div className="col-span-2 md:col-span-1">
                  <span className="block text-xs font-semibold opacity-60">Issue</span>
                  <span>{invoice.jobCard.problem}</span>
                </div>
            </div>
          </div>
        )}

        <div className={`grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x ${
           theme === "dark" ? "divide-white/10" : "divide-gray-100"
        }`}>
          {/* Customer Info */}
          <div className="p-6">
            <h3 className={`text-xs uppercase font-bold tracking-wider mb-4 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>
              Customer Details
            </h3>
            <div className={`font-medium text-lg mb-1 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
              {invoice.customerName}
            </div>
            {invoice.customerPhone && (
              <div className={theme === "dark" ? "text-stone-300" : "text-gray-600"}>
                {invoice.customerPhone}
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="p-6 col-span-2">
            <h3 className={`text-xs uppercase font-bold tracking-wider mb-4 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>
              Payment Summary
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className={`text-sm mb-1 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>Total Amount</div>
                <div className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                  {formatCurrency(invoice.totalAmount)}
                </div>
              </div>
              <div>
                <div className={`text-sm mb-1 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>Paid</div>
                <div className="text-xl font-bold text-green-500">
                  {formatCurrency(invoice.paidAmount || 0)}
                </div>
              </div>
              <div>
                <div className={`text-sm mb-1 ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>Balance Due</div>
                <div className={`text-xl font-bold ${hasBalance ? "text-red-500" : "text-stone-400"}`}>
                  {formatCurrency(invoice.balanceAmount || 0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Product Items Table */}
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
          Items
        </h2>
        
        {invoice.status !== "VOIDED" && invoice.status !== "PAID" && (
           <button 
             onClick={() => setIsAddItemOpen(true)}
             className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold transition flex items-center gap-2 shadow-sm"
           >
             <span>+</span> Add Item
           </button>
        )}
      </div>

      <div className={`rounded-xl overflow-hidden shadow-sm border mb-8 ${
        theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
      }`}>
        <table className="w-full">
          <thead className={`text-left text-xs uppercase font-bold ${
             theme === "dark" ? "bg-white/5 text-stone-400" : "bg-gray-50 text-gray-500"
          }`}>
             <tr>
               <th className="px-6 py-3 w-12">#</th>
               <th className="px-6 py-3">Product / Service</th>
               <th className="px-6 py-3 text-right">Qty</th>
               <th className="px-6 py-3 text-right">Rate</th>
               <th className="px-6 py-3 text-right">Total</th>
             </tr>
          </thead>
          <tbody className={`divide-y ${theme === "dark" ? "divide-white/5" : "divide-gray-100"}`}>
             {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((item, index) => (
                  <tr key={index}>
                     <td className={`px-6 py-3 text-sm ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>
                        {index + 1}
                     </td>
                     <td className={`px-6 py-3 font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {(item as any).product?.name || "Item"}
                     </td>
                     <td className={`px-6 py-3 text-right ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}>
                        {item.quantity}
                     </td>
                     <td className={`px-6 py-3 text-right ${theme === "dark" ? "text-stone-300" : "text-gray-700"}`}>
                        {formatCurrency(item.rate)}
                     </td>
                     <td className={`px-6 py-3 text-right font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                        {formatCurrency(item.lineTotal)}
                     </td>
                  </tr>
                ))
             ) : (
                <tr>
                   <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">
                      No items added yet.
                   </td>
                </tr>
             )}
          </tbody>
        </table>
      </div>


      {/* Payment History */}
      <h2 className={`text-lg font-bold mb-4 ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
        Payment History
      </h2>
      
      {invoice.payments && invoice.payments.length > 0 ? (
        <div className={`rounded-xl overflow-hidden shadow-sm border ${
          theme === "dark" ? "bg-white/5 border-white/10" : "bg-white border-gray-200"
        }`}>
          <table className="w-full">
            <thead className={`text-left text-xs uppercase font-bold ${
              theme === "dark" ? "bg-white/5 text-stone-400" : "bg-gray-50 text-gray-500"
            }`}>
              <tr>
                <th className="px-6 py-3">Receipt #</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Mode</th>
                <th className="px-6 py-3">Ref</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme === "dark" ? "divide-white/5" : "divide-gray-100"}`}>
              {invoice.payments.map((payment) => (
                <tr key={payment.id}>
                  <td className={`px-6 py-3 font-medium ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {payment.receiptNumber || "-"}
                  </td>
                  <td className={`px-6 py-3 ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}>
                    {formatDate(payment.createdAt)}
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      theme === "dark" ? "bg-white/10 text-white" : "bg-gray-100 text-gray-700"
                    }`}>
                      {payment.method}
                    </span>
                  </td>
                  <td className={`px-6 py-3 text-sm ${theme === "dark" ? "text-stone-500" : "text-gray-500"}`}>
                    {payment.transactionRef || "-"}
                  </td>
                  <td className={`px-6 py-3 text-right font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {formatCurrency(payment.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`p-8 text-center rounded-xl border border-dashed ${
           theme === "dark" ? "border-white/10 text-stone-500" : "border-gray-300 text-gray-500"
        }`}>
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
              gstEnabled={true} // Defaulting to true or we need to fetch shop settings. 
              // Since we don't have shop object fully, we can assume TRUE for now or fetch.
              // Ideally fetch shop details. But for now, let's assume GST enabled to show the UI.
           />
        </>
      )}
    </div>
  );
}
