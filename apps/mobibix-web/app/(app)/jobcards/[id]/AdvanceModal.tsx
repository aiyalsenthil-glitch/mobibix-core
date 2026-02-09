"use client";

import { useState } from "react";
import { addJobCardAdvance, refundJobCardAdvance } from "@/services/jobcard.api";

interface AdvanceModalProps {
  type: "ADD" | "REFUND";
  shopId: string;
  jobId: string;
  currentAdvance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdvanceModal({
  type,
  shopId,
  jobId,
  currentAdvance,
  onClose,
  onSuccess,
}: AdvanceModalProps) {
  const [amount, setAmount] = useState<number | string>("");
  const [mode, setMode] = useState("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const val = parseFloat(amount.toString());
    if (isNaN(val) || val <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }

    if (type === "REFUND" && val > currentAdvance) {
      setError(`Cannot refund more than current advance (₹${currentAdvance})`);
      return;
    }

    setIsSubmitting(true);
    try {
      if (type === "ADD") {
        await addJobCardAdvance(shopId, jobId, val, mode);
      } else {
        await refundJobCardAdvance(shopId, jobId, val, mode);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Operation failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = type === "ADD" ? "Add Advance" : "Refund Advance";
  const btnColor = type === "ADD" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <h3 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
          {type === "ADD" ? "💰" : "💸"} {title}
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
              Amount (₹)
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              autoFocus
              className="w-full px-4 py-3 text-lg border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            {type === "REFUND" && (
              <p className="text-xs text-gray-500 mt-1">
                Max refundable: ₹{currentAdvance}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 dark:text-gray-300">
              Payment Mode
            </label>
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-bold shadow-md transition disabled:opacity-50 ${btnColor}`}
            >
              {isSubmitting ? "Processing..." : title}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
