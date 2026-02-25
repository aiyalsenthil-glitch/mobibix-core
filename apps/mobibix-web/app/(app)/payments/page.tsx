"use client";

import { useEffect, useState } from "react";
import { getPaymentHistory, retryPayment, type PaymentRecord } from "@/services/payments.api";
import { useTheme } from "@/context/ThemeContext";

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  PENDING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  FAILED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPIRED: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

export default function PaymentHistoryPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  useEffect(() => {
    loadPayments();
  }, []);

  const loadPayments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPaymentHistory();
      setPayments(data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load payment history";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (paymentId: string) => {
    try {
      setRetrying(paymentId);
      await retryPayment(paymentId);
      await loadPayments();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Retry failed";
      setError(message);
    } finally {
      setRetrying(null);
    }
  };

  const formatAmount = (amount: number) => {
    // Amount is in paise, convert to rupees
    return `₹${(amount / 100).toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fade-in">
      <div className="mb-8">
        <h1 className={`text-3xl font-extrabold tracking-tight mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
          Payment History
        </h1>
        <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          View all subscription payments, their status, and retry failed transactions.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className={`rounded-xl border p-12 text-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className="animate-pulse flex flex-col items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
            <div className={`h-4 w-48 rounded ${isDark ? "bg-slate-700" : "bg-gray-200"}`} />
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className={`rounded-xl border p-12 text-center ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className="text-4xl mb-3">💳</div>
          <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>No payments yet</h3>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
            Your subscription payment history will appear here.
          </p>
        </div>
      ) : (
        <div className={`rounded-xl border overflow-hidden ${isDark ? "bg-slate-800/50 border-slate-700" : "bg-white border-gray-200"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={isDark ? "bg-slate-800 border-b border-slate-700" : "bg-gray-50 border-b border-gray-200"}>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Date</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Plan</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Cycle</th>
                  <th className={`px-4 py-3 text-right font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Amount</th>
                  <th className={`px-4 py-3 text-center font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Status</th>
                  <th className={`px-4 py-3 text-left font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Provider</th>
                  <th className={`px-4 py-3 text-center font-semibold ${isDark ? "text-slate-300" : "text-gray-600"}`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr
                    key={payment.id}
                    className={`border-b transition-colors ${isDark ? "border-slate-700/50 hover:bg-slate-700/30" : "border-gray-100 hover:bg-gray-50"}`}
                  >
                    <td className={`px-4 py-3 ${isDark ? "text-slate-300" : "text-gray-700"}`}>
                      {formatDate(payment.createdAt)}
                    </td>
                    <td className={`px-4 py-3 font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                      {payment.plan?.name || "—"}
                    </td>
                    <td className={`px-4 py-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {payment.billingCycle || "—"}
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${isDark ? "text-teal-400" : "text-teal-600"}`}>
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[payment.status] || STATUS_COLORS.EXPIRED}`}>
                        {payment.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {payment.provider}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {payment.status === "FAILED" && (
                        <button
                          onClick={() => handleRetry(payment.id)}
                          disabled={retrying === payment.id}
                          className="px-3 py-1 text-xs font-medium bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-lg transition-colors"
                        >
                          {retrying === payment.id ? "Retrying..." : "Retry"}
                        </button>
                      )}
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
