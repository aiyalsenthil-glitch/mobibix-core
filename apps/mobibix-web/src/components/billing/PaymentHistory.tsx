"use client";

import { useEffect, useState } from "react";
import { getPaymentHistory, retryPayment, type PaymentRecord } from "@/services/payments.api";
import { useTheme } from "@/context/ThemeContext";
import { CreditCard, AlertCircle, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
  PENDING: "bg-amber-500/10 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
  FAILED: "bg-red-500/10 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
  EXPIRED: "bg-gray-500/10 text-gray-600 border-gray-200 dark:bg-gray-500/20 dark:text-gray-400 dark:border-gray-500/30",
};

const STATUS_ICONS: Record<string, any> = {
  SUCCESS: CheckCircle2,
  PENDING: Clock,
  FAILED: XCircle,
  EXPIRED: AlertCircle,
};

export function PaymentHistory() {
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
      alert("Payment retry initiated. Please check your email or dashboard for updates.");
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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-gray-500 text-sm">Loading payment history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Payment History</h3>
          <p className="text-sm text-gray-500">Track all your transactions and billing attempts</p>
        </div>
        <button 
          onClick={loadPayments}
          className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1.5"
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {payments.length === 0 ? (
        <div className={`rounded-2xl border p-12 text-center ${isDark ? "bg-stone-900/50 border-stone-800" : "bg-gray-50 border-gray-200"}`}>
          <div className="w-16 h-16 bg-gray-100 dark:bg-stone-800 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard size={32} className="text-gray-400" />
          </div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">No payments found</h4>
          <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
            You haven't made any payments yet. Subscribe to a plan to see your history here.
          </p>
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${isDark ? "bg-stone-900/50 border-stone-800" : "bg-white border-gray-200 shadow-sm"}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className={`${isDark ? "bg-stone-800/80 border-b border-stone-700" : "bg-gray-50 border-b border-gray-100"}`}>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-stone-400">Transaction Date</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-stone-400">Plan & Cycle</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-stone-400">Amount</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-stone-400 text-center">Status</th>
                  <th className="px-6 py-4 font-semibold text-gray-600 dark:text-stone-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-stone-800">
                {payments.map((payment) => {
                  const StatusIcon = STATUS_ICONS[payment.status] || AlertCircle;
                  return (
                    <tr
                      key={payment.id}
                      className={`transition-colors ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"}`}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatDate(payment.createdAt)}
                        </div>
                        <div className="text-xs text-gray-500">ID: {payment.id.slice(-8).toUpperCase()}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {payment.plan?.name || "Standard Plan"}
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{payment.billingCycle?.toLowerCase()} billing</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">
                        {formatAmount(payment.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${STATUS_COLORS[payment.status] || STATUS_COLORS.EXPIRED}`}>
                            <StatusIcon size={14} />
                            {payment.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {payment.status === "FAILED" && (
                          <button
                            onClick={() => handleRetry(payment.id)}
                            disabled={!!retrying}
                            className="text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50"
                          >
                            {retrying === payment.id ? "Retrying..." : "Retry Now"}
                          </button>
                        )}
                        {payment.status === "SUCCESS" && (
                          <span className="text-xs text-green-600 font-medium italic">Confirmed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
