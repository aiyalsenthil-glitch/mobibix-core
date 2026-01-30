"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createReceipt,
  CreateReceiptRequest,
  ReceiptType,
  PaymentMode,
} from "@/services/receipts.api";
import { AlertCircle, Check, Loader } from "lucide-react";

export default function CreateReceiptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [formData, setFormData] = useState<CreateReceiptRequest>({
    paymentMethod: "CASH",
    amount: 0,
    receiptType: "CUSTOMER",
    customerName: "",
  });

  const handleChange = (field: keyof CreateReceiptRequest, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleChangeAmount = (value: string) => {
    const numValue = parseInt(value, 10);
    handleChange("amount", isNaN(numValue) ? 0 : numValue);
  };

  const validateForm = (): string | null => {
    if (!formData.customerName.trim()) {
      return "Customer name is required";
    }
    if (formData.amount <= 0) {
      return "Amount must be greater than 0";
    }
    if (!formData.paymentMethod) {
      return "Payment method is required";
    }
    if (formData.paymentMethod === "CREDIT") {
      return "CREDIT payments do NOT create receipts. Record receipt only when payment is received.";
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Show confirmation
    setShowConfirmation(true);
  };

  const handleConfirmSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const receipt = await createReceipt(formData);
      // Success - redirect to receipts list
      router.push("/receipts?success=created");
    } catch (err) {
      setError((err as Error).message);
      setShowConfirmation(false);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Receipt</h1>
        <p className="text-gray-600 mt-1">
          Record money received from customers
        </p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">Validation Error</h3>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {!showConfirmation ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-lg border border-gray-200 p-8 space-y-6"
        >
          {/* Customer Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Customer Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={formData.customerName}
              onChange={(e) => handleChange("customerName", e.target.value)}
              placeholder="Enter customer name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Customer Phone (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Customer Phone
            </label>
            <input
              type="tel"
              value={formData.customerPhone || ""}
              onChange={(e) =>
                handleChange("customerPhone", e.target.value || undefined)
              }
              placeholder="Enter customer phone (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Amount <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-2 text-gray-600 font-medium">
                ₹
              </span>
              <input
                type="number"
                value={formData.amount || ""}
                onChange={(e) => handleChangeAmount(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {formData.amount > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                Amount in words: {/* Will need number-to-words utility */}
              </p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Payment Method <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) => handleChange("paymentMethod", e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank Transfer</option>
            </select>
            <p className="text-sm text-gray-600 mt-2">
              ⚠️ CREDIT payments do NOT create receipts - record receipt only
              when payment is received
            </p>
          </div>

          {/* Transaction Reference (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Transaction Reference
            </label>
            <input
              type="text"
              value={formData.transactionRef || ""}
              onChange={(e) =>
                handleChange("transactionRef", e.target.value || undefined)
              }
              placeholder="UPI ref / Cheque number / etc (optional)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Receipt Type (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Receipt Type
            </label>
            <select
              value={formData.receiptType}
              onChange={(e) =>
                handleChange("receiptType", e.target.value as ReceiptType)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CUSTOMER">Customer</option>
              <option value="GENERAL">General</option>
              <option value="ADJUSTMENT">Adjustment</option>
              <option value="PAYMENT">Payment</option>
            </select>
          </div>

          {/* Narration (Optional) */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Notes
            </label>
            <textarea
              value={formData.narration || ""}
              onChange={(e) =>
                handleChange("narration", e.target.value || undefined)
              }
              placeholder="Add any notes about this receipt (optional)"
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition"
            >
              {loading ? "Submitting..." : "Review & Submit"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        /* Confirmation Screen */
        <div className="bg-white rounded-lg border border-gray-200 p-8 space-y-6">
          <div className="flex items-center gap-3 text-green-700 bg-green-50 border border-green-200 rounded-lg p-4">
            <Check size={20} />
            <span className="font-semibold">Ready to create receipt</span>
          </div>

          {/* Confirmation Summary */}
          <div className="space-y-4 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Customer Name</p>
                <p className="font-semibold text-gray-900">
                  {formData.customerName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Amount</p>
                <p className="font-semibold text-gray-900">
                  {formatCurrency(formData.amount)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Payment Method</p>
                <p className="font-semibold text-gray-900">
                  {formData.paymentMethod}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Receipt Type</p>
                <p className="font-semibold text-gray-900">
                  {formData.receiptType}
                </p>
              </div>
              {formData.customerPhone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold text-gray-900">
                    {formData.customerPhone}
                  </p>
                </div>
              )}
              {formData.transactionRef && (
                <div>
                  <p className="text-sm text-gray-600">Transaction Ref</p>
                  <p className="font-semibold text-gray-900">
                    {formData.transactionRef}
                  </p>
                </div>
              )}
              {formData.narration && (
                <div className="col-span-2">
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="font-semibold text-gray-900">
                    {formData.narration}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4">
            💡 <strong>This receipt will be recorded as money received.</strong>{" "}
            It will appear in your financial reports and Daily Entry system.
          </div>

          {/* Confirmation Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleConfirmSubmit}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={18} />
                  Confirm & Create Receipt
                </>
              )}
            </button>
            <button
              onClick={() => setShowConfirmation(false)}
              disabled={loading}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Back to Form
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
