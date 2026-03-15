"use client";

import { useState, useEffect } from "react";
import { adjustStock, type ShopProduct } from "@/services/products.api";
import { validateStockAdjustment } from "@/lib/inventory.utils";

interface StockAdjustmentModalProps {
  product: ShopProduct;
  shopId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type AdjustmentType = "IN" | "OUT" | "ADJUSTMENT";

const ADJUSTMENT_REASONS = {
  IN: [
    "Purchase",
    "Return from customer",
    "Correction",
    "Transfer in",
    "Other",
  ],
  OUT: ["Sale", "Damaged", "Expired", "Loss", "Transfer out", "Other"],
  ADJUSTMENT: [
    "Stock count difference",
    "Theft recovery",
    "Bulk adjustment",
    "Other",
  ],
};

export function StockAdjustmentModal({
  product,
  shopId,
  isOpen,
  onClose,
  onSuccess,
}: StockAdjustmentModalProps) {
  // State
  const [type, setType] = useState<AdjustmentType>("IN");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setType("IN");
      setQuantity(1);
      setReason("");
      setReference("");
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    const validation = validateStockAdjustment(
      {
        productId: product.id,
        quantity,
        type,
        reason,
        reference,
      },
      product.stock || 0,
    );

    if (!validation.valid) {
      setError(validation.error || "Validation failed");
      return;
    }

    try {
      setIsSubmitting(true);
      await adjustStock(shopId, product.id, {
        quantity,
        type,
        reason,
        reference,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
        onSuccess();
      }, 1500);
    } catch (err: unknown) {
      console.error("Failed to adjust stock:", err);
      setError((err as any)?.message || "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const currentStock = product.stock || 0;
  const reasons = ADJUSTMENT_REASONS[type];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md transform rounded-lg bg-white shadow-xl transition-all">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Adjust Stock
            </h2>
            <p className="mt-1 text-sm text-gray-600">{product.name}</p>
            <p className="mt-1 text-sm font-medium text-gray-900">
              Current Stock: {currentStock} units
            </p>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="space-y-4 p-6">
            {/* Success Message */}
            {success && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                <p className="text-sm font-medium text-green-700">
                  ✓ Stock adjusted successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Adjustment Type Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Adjustment Type
              </label>
              <div className="flex gap-2">
                {(["IN", "OUT", "ADJUSTMENT"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      setReason("");
                    }}
                    className={`flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition ${
                      type === t
                        ? "border-blue-600 bg-blue-50 text-blue-600"
                        : "border-gray-300 text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {t === "IN"
                      ? "📦 Stock In"
                      : t === "OUT"
                        ? "📤 Stock Out"
                        : "🔄 Adjust"}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Quantity *
              </label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                min="1"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              {type === "OUT" && quantity > currentStock && (
                <p className="text-xs text-red-600">
                  ⚠️ Cannot remove more than available ({currentStock} units)
                </p>
              )}
            </div>

            {/* Reason Selector */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Reason *
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select a reason</option>
                {reasons.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Reference
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="e.g., Purchase Order #, Invoice #"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* New Stock Preview */}
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-xs text-gray-600">Stock after adjustment:</p>
              <p className="mt-1 text-lg font-bold text-gray-900">
                {type === "IN"
                  ? currentStock + quantity
                  : currentStock - quantity}{" "}
                units
              </p>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || success || quantity < 1}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmitting && (
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                )}
                {success ? "✓ Done" : "Confirm Adjustment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
