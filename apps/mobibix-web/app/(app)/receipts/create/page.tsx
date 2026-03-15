"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  createReceipt,
  CreateReceiptRequest,
  ReceiptType,
  PaymentMode,
} from "@/services/receipts.api";
import { getPartyBalance } from "@/services/parties.api";
import { PartySelector } from "@/components/common/PartySelector";
import { AlertCircle, Check, Loader } from "lucide-react";

export default function CreateReceiptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Outstanding Balance State
  const [outstandingBalance, setOutstandingBalance] = useState<number | null>(
    null,
  );
  const [fetchingBalance, setFetchingBalance] = useState(false);

  const [formData, setFormData] = useState<CreateReceiptRequest>({
    paymentMethod: "CASH",
    amount: 0,
    receiptType: "CUSTOMER",
    customerName: "",
    customerId: undefined, // New field for linked party
  });

  // Fetch balance when customerId changes
  useEffect(() => {
    if (formData.customerId) {
      const fetchBalance = async () => {
        setFetchingBalance(true);
        try {
          const result = await getPartyBalance(formData.customerId!);
          setOutstandingBalance(result.balance);
        } catch (err) {
          console.error("Failed to fetch balance:", err);
        } finally {
          setFetchingBalance(false);
        }
      };
      fetchBalance();
    } else {
      setOutstandingBalance(null);
    }
  }, [formData.customerId]);

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
      await createReceipt(formData);
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
          {/* Customer Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Customer Name <span className="text-red-600">*</span>
            </label>
            <div className="relative">
              {formData.customerName && formData.customerId ? (
                // Selected Customer View
                <div className="flex items-center justify-between p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <div>
                    <div className="font-medium text-blue-900">
                      {formData.customerName}
                    </div>
                    {/* Outstanding Balance Display */}
                    <div className="text-sm mt-1">
                      {fetchingBalance ? (
                        <span className="text-gray-500 flex items-center gap-1">
                          <Loader size={12} className="animate-spin" />
                          Checking balance...
                        </span>
                      ) : outstandingBalance !== null ? (
                        <span
                          className={`font-medium px-2 py-0.5 rounded text-xs ${
                            outstandingBalance > 0
                              ? "bg-red-100 text-red-700 border border-red-200"
                              : outstandingBalance < 0
                              ? "bg-green-100 text-green-700 border border-green-200"
                              : "bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          {outstandingBalance > 0
                            ? `Dues: ${formatCurrency(outstandingBalance / 100)}`
                            : outstandingBalance < 0
                            ? `Advance: ${formatCurrency(Math.abs(outstandingBalance) / 100)}`
                            : "No Dues"}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        customerId: undefined,
                        customerName: "",
                        customerPhone: undefined,
                      }));
                      setOutstandingBalance(null);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    Change
                  </button>
                </div>
              ) : (
                // Search Input
                <PartySelector
                  type="CUSTOMER"
                  onSelect={(party) => {
                    setFormData((prev) => ({
                      ...prev,
                      customerId: party.id,
                      customerName: party.name,
                      customerPhone: party.phone,
                    }));
                  }}
                  placeholder="Search customer..."
                />
              )}
            </div>
          </div>

          {/* Customer Phone (Show only if manually entered or extra info needed) */}
          {!formData.customerId && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Or Enter Details Manually
              </label>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={(e) => handleChange("customerName", e.target.value)}
                  placeholder="Customer Name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <input
                  type="tel"
                  value={formData.customerPhone || ""}
                  onChange={(e) =>
                    handleChange("customerPhone", e.target.value || undefined)
                  }
                  placeholder="Phone (Optional)"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Amount Received <span className="text-red-600">*</span>
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
          </div>

          {/* Payment Method */}
          <div className="grid grid-cols-2 gap-6">
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
            </div>

            {/* Receipt Type */}
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
                <option value="CUSTOMER">Customer Payment</option>
                <option value="GENERAL">General Income</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
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

          {/* Notes (Optional) */}
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
            {outstandingBalance !== null && (
               <div className="border-t pt-3 mt-3">
                 <p className="text-sm text-gray-600">Outstanding Balance After Payment</p>
                  <p className={`font-semibold ${outstandingBalance - formData.amount * 100 > 0 ? "text-red-600" : "text-green-600"}`}>
                    {formatCurrency((outstandingBalance - formData.amount * 100) / 100)}
                  </p>
               </div>
            )}
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
