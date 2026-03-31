"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X, Check } from "lucide-react";
import {
  listPriceAlerts,
  dismissPriceAlert,
  claimPriceAlert,
  type PriceAlert,
} from "@/services/price-alerts.api";

interface Props {
  shopId: string;
}

export function PriceAlertsBanner({ shopId }: Props) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!shopId) return;
    listPriceAlerts(shopId, "PENDING")
      .then((data) => setAlerts(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [shopId]);

  const handleDismiss = async (id: string) => {
    await dismissPriceAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleClaim = async (id: string) => {
    await claimPriceAlert(id);
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (loading || alerts.length === 0) return null;

  return (
    <div className="mb-6 border border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
        <span className="font-semibold text-amber-800 dark:text-amber-300">
          Supplier Price Drop Alerts ({alerts.length})
        </span>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-center justify-between bg-white dark:bg-slate-800 border border-amber-200 dark:border-slate-700 rounded-lg px-4 py-3"
          >
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                {alert.shopProduct?.name || "Product"}
              </div>
              <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                Price dropped: ₹{alert.previousPrice.toFixed(2)} → ₹
                {alert.newPrice.toFixed(2)} (₹{alert.priceDrop.toFixed(2)} drop)
                · {alert.quantityAtRisk} units at risk · Potential credit: ₹
                {alert.potentialCredit.toFixed(2)}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4 shrink-0">
              <button
                onClick={() => handleClaim(alert.id)}
                className="flex items-center gap-1 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg"
              >
                <Check size={12} /> Claim Credit
              </button>
              <button
                onClick={() => handleDismiss(alert.id)}
                className="text-gray-400 hover:text-red-500"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
