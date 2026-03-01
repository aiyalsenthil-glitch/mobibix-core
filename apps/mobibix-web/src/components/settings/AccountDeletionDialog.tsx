"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  Loader2, 
  ShieldAlert, 
  CheckCircle2,
  X
} from "lucide-react";
import { requestDeletion } from "@/services/tenant.api";

interface AccountDeletionDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountDeletionDialog({ isOpen, onClose }: AccountDeletionDialogProps) {
  const [step, setStep] = useState<"FORM" | "SUCCESS">("FORM");
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!acknowledged) return;
    
    try {
      setLoading(true);
      setError(null);
      await requestDeletion({ acknowledged, reason });
      setStep("SUCCESS");
    } catch (err: any) {
      setError(err.message || "Failed to submit deletion request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-stone-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-stone-800 animate-in zoom-in-95 duration-200">
        
        {step === "FORM" ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-stone-800 flex justify-between items-center bg-red-50/30 dark:bg-red-950/10">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                  <ShieldAlert size={20} />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Delete Account</h2>
              </div>
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-gray-100 dark:hover:bg-stone-800 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} /> Irreversible Action
                </h3>
                <ul className="text-xs text-red-700 dark:text-red-300 space-y-2 list-disc pl-4">
                  <li>Your business profile and all shop data will be queued for deletion.</li>
                  <li>Invoices, customer records, and inventory history will be permanently wiped.</li>
                  <li>All active subscriptions will be cancelled immediately.</li>
                  <li>This request requires manual review by Aiyal Groups Admin.</li>
                </ul>
              </div>

              <div className="space-y-4">
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input 
                    type="checkbox" 
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-red-600 focus:ring-red-500"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    I understand that this action is permanent and irreversible. I authorize Aiyal Groups to delete all my data associated with this tenant.
                  </span>
                </label>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Reason for deletion (Optional)
                  </label>
                  <textarea 
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Closing business, moving to another platform..."
                    className="w-full h-24 p-3 rounded-xl border border-gray-200 dark:border-stone-800 bg-gray-50 dark:bg-stone-950 text-sm focus:ring-2 focus:ring-red-500 outline-none transition-all"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs flex items-center gap-2">
                  <AlertTriangle size={14} /> {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 bg-gray-50 dark:bg-stone-900/50 border-t border-gray-100 dark:border-stone-800 flex gap-3">
              <button 
                onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-stone-800 font-bold text-sm hover:bg-white dark:hover:bg-stone-800 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmit}
                disabled={!acknowledged || loading}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  acknowledged && !loading
                    ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none"
                    : "bg-gray-200 dark:bg-stone-800 text-gray-400 cursor-not-allowed"
                }`}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : "Submit Request"}
              </button>
            </div>
          </>
        ) : (
          <div className="p-12 text-center space-y-6">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Request Submitted</h2>
              <p className="text-sm text-gray-500 max-w-xs mx-auto">
                Your account deletion request has been sent to our compliance team. We will review and process it within 7-10 business days.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="w-full py-3 bg-gray-900 dark:bg-stone-800 text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
