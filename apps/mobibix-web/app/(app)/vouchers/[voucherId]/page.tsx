"use client";

import { useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDeferredAsyncData } from "@/hooks/useDeferredAsyncData";
import { getVoucher, type PaymentVoucher } from "@/services/vouchers.api";
import { useTheme } from "@/context/ThemeContext";

export default function VoucherDetailPage() {
  const router = useRouter();
  const params = useParams();
  const voucherId = params.voucherId as string;
  const { theme } = useTheme();

  const {
    data: voucher,
    isLoading,
    error,
  } = useDeferredAsyncData(
    useCallback(async () => {
      if (!voucherId) return null;
      return await getVoucher(voucherId);
    }, [voucherId]),
    [voucherId],
    null as PaymentVoucher | null
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
        Loading voucher details...
      </div>
    );
  }

  if (error || !voucher) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || "Voucher not found"}
        </div>
        <button
          onClick={handleBack}
          className="mt-4 text-teal-600 hover:underline"
        >
          &larr; Back to Vouchers
        </button>
      </div>
    );
  }

  const statusColor =
    voucher.status === "ACTIVE"
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
          onClick={() => router.push(`/print/voucher/${voucher.id}`)}
          className={`px-4 py-2 border rounded-lg font-medium transition ${
            theme === "dark" 
              ? "border-white/20 hover:bg-white/10 text-white" 
              : "border-gray-300 hover:bg-gray-50 text-gray-700"
          }`}
        >
          Print Voucher
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
              {voucher.voucherId}
            </h1>
            <div className={`text-sm ${theme === "dark" ? "text-stone-400" : "text-gray-500"}`}>
              Created on {formatDate(voucher.createdAt)}
            </div>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor}`}>
            {voucher.status}
          </span>
        </div>

        {/* Details Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x ${
           theme === "dark" ? "divide-white/10" : "divide-gray-100"
        }`}>
          <div className="p-6 space-y-4">
            <div>
                <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Type</p>
                <span className={`px-2 py-1 rounded text-sm font-bold inline-block border ${
                    theme === "dark" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-blue-50 text-blue-700 border-blue-100"
                }`}>
                    {voucher.voucherType}
                </span>
            </div>
            
            {voucher.linkedPurchaseId && (
                <div>
                     <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Linked Purchase</p>
                     <button 
                        onClick={() => router.push(`/purchases/${voucher.linkedPurchaseId}`)}
                        className="text-teal-600 hover:underline font-medium"
                     >
                        View Purchase
                     </button>
                </div>
            )}
            
            {(voucher.globalSupplierId || voucher.expenseCategory) && (
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>
                        {voucher.globalSupplierId ? "Supplier" : "Expense Category"}
                    </p>
                     <p className={`font-medium text-lg ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                         {voucher.globalSupplierId ? "View Supplier" : voucher.expenseCategory}
                     </p>
                </div>
            )}
          </div>

          <div className="p-6 space-y-4">
            <div>
                <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Amount Paid</p>
                <p className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-gray-900"}`}>
                    {formatCurrency(voucher.amount)}
                </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Payment Mode</p>
                    <span className={`px-2 py-1 rounded text-sm font-bold inline-block border ${
                      theme === "dark" ? "bg-white/5 border-white/10 text-white" : "bg-gray-50 border-gray-200 text-gray-700"
                    }`}>
                        {voucher.paymentMethod}
                    </span>
                </div>
                {voucher.transactionRef && (
                    <div>
                        <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Reference</p>
                        <p className={`font-mono text-sm ${theme === "dark" ? "text-stone-300" : "text-gray-600"}`}>{voucher.transactionRef}</p>
                    </div>
                )}
            </div>
            {voucher.narration && (
                <div>
                    <p className={`text-xs uppercase font-bold tracking-wider mb-1 ${theme === "dark" ? "text-stone-500" : "text-gray-400"}`}>Narration</p>
                    <p className={`italic ${theme === "dark" ? "text-stone-400" : "text-gray-600"}`}>{voucher.narration}</p>
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
