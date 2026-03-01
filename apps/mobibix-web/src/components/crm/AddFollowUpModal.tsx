"use client";

import { useState, useEffect } from "react";
import { createFollowUp, type FollowUpType } from "@/services/crm.api";

interface AddFollowUpModalProps {
  customerId: string;
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: FollowUpType;
  defaultPurpose?: string;
}

export function AddFollowUpModal({
  customerId,
  customerName,
  isOpen,
  onClose,
  onSuccess,
  defaultType = "PHONE_CALL",
  defaultPurpose = "",
}: AddFollowUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: defaultType,
    purpose: defaultPurpose,
    followUpAt: "",
  });

  // Update form data when defaults change (e.g. when opening from a different job)
  useEffect(() => {
    if (isOpen) {
      setFormData((prev) => ({
        ...prev,
        type: defaultType,
        purpose: defaultPurpose,
      }));
    }
  }, [isOpen, defaultType, defaultPurpose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!formData.purpose.trim() || !formData.followUpAt) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createFollowUp({
        customerId,
        type: formData.type,
        purpose: formData.purpose,
        followUpAt: formData.followUpAt,
      });

      // Success
      onSuccess?.();
      onClose();
      resetForm();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create follow-up");
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      type: "PHONE_CALL",
      purpose: "",
      followUpAt: "",
    });
    setError(null);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/70">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-xl p-6 w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Add Follow-up
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Customer Info */}
        {customerName && (
          <div className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg p-3 mb-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">Customer</p>
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {customerName}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-900 dark:text-white">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  type: e.target.value as FollowUpType,
                })
              }
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-400"
            >
              <option value="PHONE_CALL">📞 Phone Call</option>
              <option value="EMAIL">📧 Email</option>
              <option value="VISIT">🚶 Visit</option>
              <option value="SMS">💬 SMS</option>
              <option value="WHATSAPP">📱 WhatsApp</option>
            </select>
          </div>

          {/* Purpose */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-900 dark:text-white">
              Purpose *
            </label>
            <textarea
              value={formData.purpose}
              onChange={(e) =>
                setFormData({ ...formData, purpose: e.target.value })
              }
              placeholder="e.g., Follow up on repair completion"
              rows={3}
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-teal-400 resize-none"
            />
          </div>

          {/* Date & Time */}
          <div>
            <label className="block text-sm font-medium mb-2 text-slate-900 dark:text-white">
              Follow-up Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.followUpAt}
              onChange={(e) =>
                setFormData({ ...formData, followUpAt: e.target.value })
              }
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 dark:bg-red-500/10 border border-red-300 dark:border-red-500/20 rounded-lg p-3">
              <p className="text-red-600 dark:text-red-400 text-sm">
                ⚠️ {error}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 text-slate-900 dark:text-white px-4 py-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Follow-up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
