"use client";

import { useState, useEffect, useRef } from "react";
import { createFollowUp, type FollowUpType } from "@/services/crm.api";
import { searchCustomers, type Customer } from "@/services/customers.api";

interface AddFollowUpModalProps {
  customerId?: string;
  customerName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultType?: FollowUpType;
  defaultPurpose?: string;
}

export function AddFollowUpModal({
  customerId: propCustomerId = "",
  customerName: propCustomerName,
  isOpen,
  onClose,
  onSuccess,
  defaultType = "PHONE_CALL",
  defaultPurpose = "",
}: AddFollowUpModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer picker state (used when no customerId is pre-filled)
  const [pickedCustomer, setPickedCustomer] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    type: defaultType,
    purpose: defaultPurpose,
    followUpAt: "",
  });

  const resolvedCustomerId = propCustomerId || pickedCustomer?.id || "";
  const resolvedCustomerName =
    propCustomerName || pickedCustomer?.name || undefined;
  const needsPicker = !propCustomerId;

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setFormData({ type: defaultType, purpose: defaultPurpose, followUpAt: "" });
      setPickedCustomer(null);
      setCustomerSearch("");
      setCustomerResults([]);
      setError(null);
    }
  }, [isOpen, defaultType, defaultPurpose]);

  // Customer search debounce
  useEffect(() => {
    if (!needsPicker) return;
    if (customerSearch.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchCustomers(customerSearch, 5);
        setCustomerResults(results);
      } catch {
        setCustomerResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch, needsPicker]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!resolvedCustomerId) {
      setError("Please select a customer");
      return;
    }
    if (!formData.purpose.trim() || !formData.followUpAt) {
      setError("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      await createFollowUp({
        customerId: resolvedCustomerId,
        type: formData.type,
        purpose: formData.purpose,
        followUpAt: formData.followUpAt,
      });

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
    setFormData({ type: "PHONE_CALL", purpose: "", followUpAt: "" });
    setPickedCustomer(null);
    setCustomerSearch("");
    setCustomerResults([]);
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

        {/* Customer Picker (when no customerId pre-filled) */}
        {needsPicker && !pickedCustomer && (
          <div className="mb-4 relative">
            <label className="block text-sm font-medium mb-2 text-slate-900 dark:text-white">
              Customer *
            </label>
            <input
              ref={searchRef}
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name or phone..."
              className="w-full bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-teal-400"
              autoFocus
            />
            {searching && (
              <p className="text-xs text-gray-500 mt-1">Searching...</p>
            )}
            {customerResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-lg shadow-lg overflow-hidden">
                {customerResults.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setPickedCustomer({ id: c.id, name: c.name });
                      setCustomerSearch("");
                      setCustomerResults([]);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {c.name}
                    </p>
                    {c.phone && (
                      <p className="text-xs text-gray-500">{c.phone}</p>
                    )}
                  </button>
                ))}
              </div>
            )}
            {customerSearch.trim().length >= 2 &&
              !searching &&
              customerResults.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">No customers found</p>
              )}
          </div>
        )}

        {/* Selected Customer Display */}
        {(resolvedCustomerName || pickedCustomer) && (
          <div className="bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10 rounded-lg p-3 mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Customer
              </p>
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {resolvedCustomerName}
              </p>
            </div>
            {needsPicker && (
              <button
                type="button"
                onClick={() => setPickedCustomer(null)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-white"
              >
                Change
              </button>
            )}
          </div>
        )}

        {/* Form — only show when customer is selected (or pre-filled) */}
        {(!needsPicker || resolvedCustomerId) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type */}
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-900 dark:text-white">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value as FollowUpType })
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
        )}
      </div>
    </div>
  );
}
