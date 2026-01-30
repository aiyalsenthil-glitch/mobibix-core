"use client";

import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { getReceipt, type Receipt } from "@/services/receipts.api";
import { useTheme } from "@/context/ThemeContext";

export default function ReceiptDetailPage() {
  const router = useRouter();
  const params = useParams();
  const receiptId = params.receiptId as string;
  const { theme } = useTheme();

  const {
    data: receipt,
    isLoading,
    error,
  } = useDeferredAsyncData(
    useCallback(async () => {
      if (!receiptId) return null;
      return await getReceipt(receiptId);
    }, [receiptId]),
    [receiptId],
    null as Receipt | null
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (amount: number | undefined) => {
    if (amount === undefined) return "₹0.00";
    return amount.toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
    });
  };

  if (isLoading) {
    return (
      <div className={`p-8 text-center ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>
        Loading receipt details...
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Receipt not found"}
        </div>
        <button
          onClick={handleBack}
          className="mt-4 text-teal-600 hover:underline"
        >
          &larr; Back to Receipts
        </button>
      </div>
    );
  }

  const statusColor =
    receipt.status === "ACTIVE"
      ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
      : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300";

  return (
    <div className="max-w-3xl mx-auto pb-12">
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
        <button
          onClick={() => router.push(`/print/receipt/${receipt.id}`)}
          className={`px-4 py-2 border rounded-lg font-medium transition ${
            theme === "dark" 
              ? "border-white/20 hover:bg-white/10 text-white" 
              : "border-gray-300 hover:bg-gray-50 text-gray-700"
          }`}
        >
          Print Receipt
        </button>
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
              {receipt.receiptId}
            </h1>
            <div className={`text-sm ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>
              Created on {formatDate(receipt.createdAt)}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor}`}>
            {receipt.status}
          </span>
        </div>

        {/* Details Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x ${
           theme === "dark" ? "divide-white/10" : "divide-gray-100"
        }`}>
          <div className="p-6 space-y-4">
            <div>
                <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Customer</p>
                <p className={`font-medium text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>{receipt.customerName}</p>
                {receipt.customerPhone && <p className={theme === "dark" ? "text-stone-400" : "text-gray-500"}>{receipt.customerPhone}</p>}
            </div>
            
            {receipt.linkedInvoiceId && (
                <div>
                     <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Linked Invoice</p>
                     <button 
                        onClick={() => router.push(`/sales/${receipt.linkedInvoiceId}`)}
                        className="text-teal-600 hover:underline font-medium"
                     >
                        View Invoice
                     </button>
                </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
                <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Amount Received</p>
                <p className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {formatCurrency(receipt.amount)}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Payment Mode</p>
                    <span className={`px-2 py-1 rounded text-sm font-bold inline-block border ${
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}>
                        {receipt.paymentMethod}
                    </span>
                </div>
                {receipt.transactionRef && (
                    <div>
                        <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Reference</p>
                        <p className={`font-mono text-sm ${theme === "dark" ? "text-stone-300" : "text-gray-600"}`}>{receipt.transactionRef}</p>
                    </div>
                )}
            </div>
            {receipt.narration && (
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Narration</p>
                    <p className={`italic ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}>{receipt.narration}</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
