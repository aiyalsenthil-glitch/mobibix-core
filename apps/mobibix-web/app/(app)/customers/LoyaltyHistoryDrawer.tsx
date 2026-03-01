"use client";

import { useState, useEffect } from "react";
import { getCustomerLoyaltyHistory, type LoyaltyTransaction } from "@/services/loyalty.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { X, TrendingUp, TrendingDown, Gift, RotateCcw, Clock } from "lucide-react";

interface LoyaltyHistoryDrawerProps {
  customerId: string;
  customerName: string;
  balance: number;
  onClose: () => void;
}

const typeConfig: Record<string, { label: string; color: string; darkColor: string; icon: React.ReactNode; sign: "+" | "-" }> = {
  EARN: {
    label: "Earned",
    color: "text-emerald-700 bg-emerald-50",
    darkColor: "text-emerald-400 bg-emerald-500/10",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    sign: "+",
  },
  REDEEM: {
    label: "Redeemed",
    color: "text-rose-700 bg-rose-50",
    darkColor: "text-rose-400 bg-rose-500/10",
    icon: <TrendingDown className="w-3.5 h-3.5" />,
    sign: "-",
  },
  MANUAL: {
    label: "Adjusted",
    color: "text-violet-700 bg-violet-50",
    darkColor: "text-violet-400 bg-violet-500/10",
    icon: <Gift className="w-3.5 h-3.5" />,
    sign: "+",
  },
  EXPIRE: {
    label: "Expired",
    color: "text-amber-700 bg-amber-50",
    darkColor: "text-amber-400 bg-amber-500/10",
    icon: <Clock className="w-3.5 h-3.5" />,
    sign: "-",
  },
  REVERSAL: {
    label: "Reversed",
    color: "text-gray-700 bg-gray-100",
    darkColor: "text-stone-400 bg-stone-500/10",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    sign: "-",
  },
};

function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

export function LoyaltyHistoryDrawer({
  customerId,
  customerName,
  balance,
  onClose,
}: LoyaltyHistoryDrawerProps) {
  const { theme } = useTheme();
  const { selectedShopId } = useShop();
  const isDark = theme === "dark";
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await getCustomerLoyaltyHistory(customerId, selectedShopId);
      setTransactions(data);
      setIsLoading(false);
    };
    load();
  }, [customerId, selectedShopId]);

  // Close on backdrop click
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-end"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdrop}
    >
      <div
        className={`h-full w-full max-w-md flex flex-col shadow-2xl animate-slide-in-right ${
          isDark
            ? "bg-[#1a1a2e] border-l border-white/10"
            : "bg-white border-l border-gray-200"
        }`}
        style={{ animation: "slideInRight 0.25s ease-out" }}
      >
        {/* Header */}
        <div
          className={`px-6 py-5 flex items-start justify-between border-b ${
            isDark ? "border-white/10" : "border-gray-100"
          }`}
        >
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
              Loyalty History
            </h2>
            <p className={`text-sm mt-0.5 ${isDark ? "text-stone-400" : "text-gray-500"}`}>
              {customerName}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? "hover:bg-white/10 text-stone-400" : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Balance Card */}
        <div className={`mx-6 mt-5 mb-2 rounded-xl p-4 ${isDark ? "bg-purple-500/10 border border-purple-500/20" : "bg-purple-50 border border-purple-100"}`}>
          <p className={`text-xs font-medium uppercase tracking-wider mb-1 ${isDark ? "text-purple-400" : "text-purple-600"}`}>
            Current Balance
          </p>
          <p className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            {balance} <span className={`text-lg font-medium ${isDark ? "text-stone-400" : "text-gray-500"}`}>pts</span>
          </p>
        </div>

        {/* Transactions */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`h-16 rounded-xl animate-pulse ${isDark ? "bg-white/5" : "bg-gray-100"}`} />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className={`flex flex-col items-center justify-center py-16 text-center ${isDark ? "text-stone-500" : "text-gray-400"}`}>
              <Gift className="w-12 h-12 mb-3 opacity-30" />
              <p className="font-medium">No transactions yet</p>
              <p className="text-sm mt-1">Points will appear here when earned or redeemed</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.MANUAL;
              const isPositive = config.sign === "+";
              return (
                <div
                  key={tx.id}
                  className={`rounded-xl p-4 flex items-start gap-3 ${
                    isDark ? "bg-white/5 border border-white/5" : "bg-gray-50 border border-gray-100"
                  }`}
                >
                  {/* Icon */}
                  <div className={`mt-0.5 p-2 rounded-lg flex-shrink-0 ${isDark ? config.darkColor : config.color}`}>
                    {config.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                        {config.label}
                      </span>
                      <span
                        className={`text-sm font-bold tabular-nums ${
                          isPositive
                            ? isDark ? "text-emerald-400" : "text-emerald-600"
                            : isDark ? "text-rose-400" : "text-rose-600"
                        }`}
                      >
                        {isPositive ? "+" : "-"}{Math.abs(tx.points)} pts
                      </span>
                    </div>
                    {tx.note && (
                      <p className={`text-xs mt-1 truncate ${isDark ? "text-stone-400" : "text-gray-500"}`}>
                        {tx.note}
                      </p>
                    )}
                    <p className={`text-xs mt-1 ${isDark ? "text-stone-600" : "text-gray-400"}`}>
                      {formatDate(tx.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
