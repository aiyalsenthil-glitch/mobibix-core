"use client";

import { useState, useEffect } from "react";
import { type PaymentMode, collectPayment } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";

interface CollectPaymentModalProps {
  invoiceId: string;
  balanceAmount: number;
  customerName: string;
  customerId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface PaymentRow {
  mode: PaymentMode;
  amount: number;
}

export function CollectPaymentModal({
  invoiceId,
  balanceAmount,
  customerName,
  customerId,
  isOpen,
  onClose,
  onSuccess,
}: CollectPaymentModalProps) {
  // No changes needed here, just removing the line.
  const [rows, setRows] = useState<PaymentRow[]>([
    { mode: "CASH", amount: balanceAmount },
  ]);
  const [transactionRef, setTransactionRef] = useState("");
  const [narration, setNarration] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setRows([{ mode: "CASH", amount: balanceAmount }]);
      setTransactionRef("");
      setNarration("");
      setError(null);
    }
  }, [isOpen, balanceAmount]);

  const addRow = () => {
    setRows([...rows, { mode: "UPI", amount: 0 }]);
  };

  const removeRow = (index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    setRows(newRows);
  };

  const updateRow = (index: number, field: keyof PaymentRow, value: any) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };
    setRows(newRows);
  };

  const calculateTotal = () => {
    return rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validations
    const total = calculateTotal();
    if (total <= 0) {
      setError("Total payment amount must be greater than 0");
      return;
    }
    if (total > balanceAmount + 1) {
      // 1 Rupee tolerance for JS float issues
      setError(
        `Total amount (₹${total}) exceeds due balance (₹${balanceAmount})`,
      );
      return;
    }

    if (rows.some((r) => r.amount <= 0)) {
      setError("All payment rows must have an amount > 0");
      return;
    }

    if (rows.some((r) => r.mode === "CREDIT")) {
      setError("CREDIT is not a valid payment mode for collections");
      return;
    }

    try {
      setIsSubmitting(true);
      await collectPayment(invoiceId, {
        paymentMethods: rows.map((r) => ({
          mode: r.mode,
          amount: Number(r.amount),
        })),
        transactionRef: transactionRef || undefined,
        narration: narration || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to collect payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const totalEntered = calculateTotal();
  const remaining = balanceAmount - totalEntered;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-stone-900 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold">Collect Payment</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6 bg-blue-50 dark:bg-blue-500/10 p-4 rounded-lg">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Customer
              </span>
              <span className="font-semibold">{customerName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Balance Due
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                ₹{balanceAmount.toLocaleString()}
              </span>
            </div>
            {customerId && (
              <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-500/30 text-sm text-blue-700 dark:text-blue-300">
                💳 Loyalty points will be earned upon payment
              </div>
            )}
          </div>

          <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2">
            {rows.map((row, index) => (
              <div key={index} className="flex gap-3 items-start">
                <div className="w-1/3">
                  <label className="block text-xs font-medium mb-1 opacity-70">
                    Mode
                  </label>
                  <select
                    value={row.mode}
                    onChange={(e) =>
                      updateRow(index, "mode", e.target.value as PaymentMode)
                    }
                    disabled={isSubmitting}
                    className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK">Bank Transfer</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1 opacity-70">
                    Amount
                  </label>
                  <input
                    type="number"
                    value={row.amount}
                    onChange={(e) =>
                      updateRow(index, "amount", parseFloat(e.target.value))
                    }
                    disabled={isSubmitting}
                    min="1"
                    step="0.01"
                    className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
                  />
                </div>
                {rows.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="mt-6 text-red-500 hover:text-red-700 transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addRow}
            className="text-sm text-teal-500 hover:text-teal-600 font-medium mb-6 flex items-center gap-1 transition-colors"
          >
            + Add another payment method
          </button>

          <div className="grid grid-cols-1 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                Transaction Ref / Note
              </label>
              <input
                type="text"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                placeholder="Check No, UPI Ref, etc."
                disabled={isSubmitting}
                className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div
            className={`flex justify-between items-center p-4 rounded-lg mb-6 ${
              remaining < 0
                ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300"
                : "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300"
            }`}
          >
            <span className="text-sm font-medium">Total Paying:</span>
            <span className="font-bold text-lg">
              ₹{totalEntered.toLocaleString()}
            </span>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || totalEntered <= 0 || remaining < -1}
              className="px-6 py-2 rounded-lg font-bold text-white bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
            >
              {isSubmitting ? "Processing..." : "Confirm Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
