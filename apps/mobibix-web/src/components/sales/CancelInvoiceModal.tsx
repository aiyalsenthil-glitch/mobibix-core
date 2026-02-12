"use client";

import { useState } from "react";
import { cancelInvoice } from "@/services/sales.api";
import { cancelReceipt } from "@/services/receipts.api";
import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

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
  // No changes needed here, just removing the line.
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blockedByReceipts, setBlockedByReceipts] = useState<string[] | null>(null);
  const [cancellingAll, setCancellingAll] = useState(false);
  const [progress, setProgress] = useState<string>("");

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
      setBlockedByReceipts(null);
      await cancelInvoice(invoiceId);
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMessage = err.message || "Failed to cancel invoice";
      
      // Parse error message to extract receipt IDs
      if (errorMessage.includes("Cannot cancel invoice with active payment")) {
        const match = errorMessage.match(/receipt\(s\) first: (.+)/i);
        if (match) {
          const receiptIds = match[1].split(",").map((id: string) => id.trim());
          setBlockedByReceipts(receiptIds);
          setError("This invoice has active payment records.");
        } else {
          setError(errorMessage);
        }
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelAll = async () => {
    if (!reason.trim()) {
      setError("Please provide a cancellation reason");
      return;
    }

    if (!blockedByReceipts || blockedByReceipts.length === 0) return;

    // Confirm before proceeding
    const confirmMsg = `This will cancel ${blockedByReceipts.length} payment record(s) and the invoice. This action cannot be undone. Continue?`;
    if (!confirm(confirmMsg)) return;

    try {
      setCancellingAll(true);
      setError(null);

      // Cancel all receipts
      for (let i = 0; i < blockedByReceipts.length; i++) {
        setProgress(`Cancelling payment ${i + 1} of ${blockedByReceipts.length}...`);
        await cancelReceipt(blockedByReceipts[i], reason);
      }

      // Cancel invoice
      setProgress("Cancelling invoice...");
      await cancelInvoice(invoiceId);
      
      setProgress("Success!");
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Failed to cancel all");
      setProgress("");
    } finally {
      setCancellingAll(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden bg-white dark:bg-stone-900 text-slate-900 dark:text-white border border-slate-200 dark:border-white/10">
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Cancel Invoice</h2>
          <button
            onClick={onClose}
            disabled={cancellingAll || isSubmitting}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white disabled:opacity-50 transition-colors"
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
              disabled={isSubmitting || cancellingAll}
              placeholder="e.g. Customer returned goods, Wrong entry..."
              rows={3}
              className="w-full p-3 rounded-lg border focus:outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-black/20 border-slate-300 dark:border-white/20 text-slate-900 dark:text-white"
            />
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                    {error}
                  </p>
                  
                  {blockedByReceipts && blockedByReceipts.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-red-700 dark:text-red-400 font-semibold">
                        {blockedByReceipts.length} active payment record(s) found
                      </p>
                      <button
                        type="button"
                        onClick={handleCancelAll}
                        disabled={cancellingAll || !reason.trim()}
                        className="w-full px-4 py-2.5 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
                      >
                        {cancellingAll ? (
                          <span className="flex items-center gap-2 justify-center">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            {progress}
                          </span>
                        ) : (
                          `Cancel All Payments & Invoice`
                        )}
                      </button>
                      <p className="text-xs text-red-600 dark:text-red-400 text-center">
                        This will cancel all {blockedByReceipts.length} payment(s) and the invoice
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting || cancellingAll}
              className="px-4 py-2 rounded-lg font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10 transition disabled:opacity-50"
            >
              Close
            </button>
            {!blockedByReceipts && (
              <button
                type="submit"
                disabled={isSubmitting || !reason.trim()}
                className="px-6 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition"
              >
                {isSubmitting ? "Cancelling..." : "Confirm Cancel"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
