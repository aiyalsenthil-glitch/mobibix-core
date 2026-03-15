"use client";

import { useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { createManualAdjustment } from "@/services/loyalty.api";
import { Loader2, X, Plus, Minus } from "lucide-react";

interface ManualAdjustmentModalProps {
  customerId: string;
  customerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualAdjustmentModal({
  customerId,
  customerName,
  onClose,
  onSuccess,
}: ManualAdjustmentModalProps) {
  const { theme } = useTheme();
  const { selectedShopId } = useShop();
  const [points, setPoints] = useState<number>(0);
  const [reason, setReason] = useState("");
  const [type, setType] = useState<"ADD" | "DEDUCT">("ADD");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!points || points <= 0 || !reason.trim()) {
      setError("Please enter valid points and a reason.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const finalPoints = type === "ADD" ? points : -points;
      
      const response = await createManualAdjustment({
        customerId,
        points: finalPoints,
        reason,
        shopId: selectedShopId,
      });

      if (response.success) {
        onSuccess();
        onClose();
      } else {
        setError(response.error || "Failed to adjust balance");
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to adjust balance");
    } finally {
      setLoading(false);
    }
  };

  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${
          isDark ? "bg-slate-900 text-slate-50 border border-slate-700" : "bg-white text-gray-900"
        }`}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Adjust Loyalty Points</h2>
          <button 
            onClick={onClose} 
            className={`p-2 rounded-lg transition-colors ${
              isDark ? "hover:bg-slate-800 text-slate-400" : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <p className={`text-sm mb-4 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
          Adjust points for <span className="font-semibold text-teal-600 block text-lg">{customerName}</span>
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Add / Deduct Toggle */}
          <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setType("ADD")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === "ADD" 
                  ? "bg-white dark:bg-slate-700 shadow-sm text-green-600 dark:text-green-400" 
                  : "text-gray-500 dark:text-slate-400"
              }`}
            >
              <Plus size={16} /> Add Points
            </button>
            <button
              type="button"
              onClick={() => setType("DEDUCT")}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all ${
                type === "DEDUCT" 
                  ? "bg-white dark:bg-slate-700 shadow-sm text-red-600 dark:text-red-400" 
                  : "text-gray-500 dark:text-slate-400"
              }`}
            >
              <Minus size={16} /> Deduct Points
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Points to {type === "ADD" ? "Add" : "Deduct"}</label>
            <input
              type="number"
              min="1"
              value={points || ""}
              onChange={(e) => setPoints(Number(e.target.value))}
              className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none ${
                isDark ? "bg-slate-800 border-slate-700 placeholder-slate-500" : "bg-gray-50 border-gray-300"
              }`}
              placeholder="e.g. 100"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason for Adjustment</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Compensation for delay, or correcting manual entry"
              className={`w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-teal-500 outline-none resize-none ${
                isDark ? "bg-slate-800 border-slate-700 placeholder-slate-500" : "bg-gray-50 border-gray-300"
              }`}
              required
            />
            <p className="mt-1 text-xs opacity-70">This will be tracked in the loyalty audit log.</p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors ${
                isDark ? "bg-slate-800 hover:bg-slate-700" : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                type === "ADD" 
                  ? "bg-teal-600 hover:bg-teal-700 focus:ring-teal-500" 
                  : "bg-red-600 hover:bg-red-700 focus:ring-red-500"
              } disabled:opacity-75`}
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {type === "ADD" ? "Credit Points" : "Debit Points"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
