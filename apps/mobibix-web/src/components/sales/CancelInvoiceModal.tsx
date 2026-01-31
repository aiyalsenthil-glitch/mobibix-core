"use client";

import { useState } from "react";
import { cancelInvoice } from "@/services/sales.api";
import { useTheme } from "@/context/ThemeContext";

interface CancelInvoiceModalProps {
  invoiceId: string;
  invoiceNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CancelInvoiceModal({
  invoiceId,
  invoiceNumber,
  isOpen,
  onClose,
  onSuccess,
}: CancelInvoiceModalProps) {
  const { theme } = useTheme();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Please provide a cancellation reason");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await cancelInvoice(invoiceId);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to cancel invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${
          theme === "dark" ? "bg-stone-900 text-white" : "bg-white text-gray-900"
        }`}
      >
        <div className="p-6 border-b border-gray-200 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Cancel Invoice</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-100 dark:border-red-900/30">
            <p className="text-sm text-red-700 dark:text-red-300 font-medium">
              Warning: Cancelling Invoice #{invoiceNumber}
            </p>
            <ul className="text-xs text-red-600 dark:text-red-400 list-disc list-inside mt-2 space-y-1">
              <li>Stock will be returned to inventory</li>
              <li>Financial entry will be reversed</li>
              <li>This action cannot be undone</li>
            </ul>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-1 opacity-70">
              Reason for Cancellation *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isSubmitting}
              placeholder="e.g. Customer returned goods, Wrong entry..."
              rows={3}
              className={`w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 ${
                theme === "dark"
                  ? "bg-black/20 border-white/20"
                  : "bg-white border-gray-300"
              }`}
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="px-6 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
            >
              {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
