"use client";

import { useState, useEffect } from "react";
import { recordPayment, type PaymentMode } from "@/services/purchases.api";

interface SupplierPaymentModalProps {
  purchaseId: string;
  balanceAmount: number;
  supplierName: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SupplierPaymentModal({
  purchaseId,
  balanceAmount,
  supplierName,
  isOpen,
  onClose,
  onSuccess,
}: SupplierPaymentModalProps) {
  const [amount, setAmount] = useState(balanceAmount);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMode>("CASH");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setAmount(balanceAmount);
      setPaymentMethod("CASH");
      setPaymentReference("");
      setNotes("");
      setError(null);
    }
  }, [isOpen, balanceAmount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (amount <= 0) {
      setError("Payment amount must be greater than 0");
      return;
    }
    if (amount > balanceAmount + 1) {
      setError(
        `Payment amount (₹${amount}) exceeds balance due (₹${balanceAmount})`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await recordPayment(purchaseId, {
        amount: Number(amount),
        paymentMethod,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to record payment");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-stone-900 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold">Record Supplier Payment</h2>
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
                Supplier
              </span>
              <span className="font-semibold">{supplierName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Balance Due
              </span>
              <span className="text-lg font-bold text-red-600 dark:text-red-400">
                ₹{balanceAmount.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                Payment Amount
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value))}
                disabled={isSubmitting}
                min="1"
                step="0.01"
                className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMode)
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

            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                Payment Reference / Note
              </label>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Check No, UPI Ref, etc."
                disabled={isSubmitting}
                className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                Additional Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this payment"
                disabled={isSubmitting}
                rows={3}
                className="w-full p-2 rounded border focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white resize-none"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-400 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || amount <= 0}
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
