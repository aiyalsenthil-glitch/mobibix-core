"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createVoucher,
  CreateVoucherRequest,
  VoucherType,
  PaymentMode,
} from "@/services/vouchers.api";
import { AlertCircle, Check, Loader } from "lucide-react";

export default function CreateVoucherPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const [formData, setFormData] = useState<CreateVoucherRequest>({
    paymentMethod: "CASH",
    amount: 0,
    voucherType: "EXPENSE",
  });

  const handleChange = (field: keyof CreateVoucherRequest, value: any) => {
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
    if (formData.amount <= 0) {
      return "Amount must be greater than 0";
    }
    if (!formData.paymentMethod) {
      return "Payment method is required";
    }
    if (formData.paymentMethod === "CREDIT") {
      return "CREDIT payments do NOT create vouchers. Record voucher only when payment is made.";
    }
    if (formData.voucherType === "SUPPLIER" && !formData.globalSupplierId) {
      return "Supplier is required for SUPPLIER type vouchers";
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
      const voucher = await createVoucher(formData);
      // Success - redirect to vouchers list
      router.push("/vouchers?success=created");
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

  const getVoucherTypeDescription = (type: VoucherType): string => {
    const descriptions: Record<VoucherType, string> = {
      SUPPLIER: "Payment to supplier for purchases",
      EXPENSE: "Expense payment (rent, utilities, etc)",
      SALARY: "Salary payment to staff",
      ADJUSTMENT: "Adjustment/miscellaneous payment",
    };
    return descriptions[type];
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Create Payment Voucher</h1>
        <p className="text-gray-600 mt-1">
          Record money paid out to suppliers and for expenses
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
          {/* Voucher Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Voucher Type <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.voucherType}
              onChange={(e) =>
                handleChange("voucherType", e.target.value as VoucherType)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="EXPENSE">Expense (Rent, Utilities, etc)</option>
              <option value="SUPPLIER">Supplier Payment</option>
              <option value="SALARY">Salary Payment</option>
              <option value="ADJUSTMENT">Adjustment / Miscellaneous</option>
            </select>
            <p className="text-sm text-gray-600 mt-2">
              {getVoucherTypeDescription(formData.voucherType as VoucherType)}
            </p>
          </div>

          {/* Supplier ID (Optional, Required for SUPPLIER type) */}
          {formData.voucherType === "SUPPLIER" && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Supplier <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                value={formData.globalSupplierId || ""}
                onChange={(e) =>
                  handleChange("globalSupplierId", e.target.value || undefined)
                }
                placeholder="Enter supplier ID or name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-sm text-gray-600 mt-2">
                Required for supplier payments
              </p>
            </div>
          )}

          {/* Expense Category (Optional, for EXPENSE type) */}
          {formData.voucherType === "EXPENSE" && (
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Expense Category
              </label>
              <select
                value={formData.expenseCategory || ""}
                onChange={(e) =>
                  handleChange("expenseCategory", e.target.value || undefined)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select category (optional)</option>
                <option value="RENT">Rent</option>
                <option value="ELECTRICITY">Electricity / Utilities</option>
                <option value="PHONE">Phone / Internet</option>
                <option value="SUPPLIES">Supplies</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="DONATION">Donation</option>
                <option value="MISC">Miscellaneous</option>
              </select>
            </div>
          )}

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
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Payment Method <span className="text-red-600">*</span>
            </label>
            <select
              value={formData.paymentMethod}
              onChange={(e) =>
                handleChange("paymentMethod", e.target.value as PaymentMode)
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank Transfer</option>
            </select>
            <p className="text-sm text-gray-600 mt-2">
              ⚠️ CREDIT payments do NOT create vouchers - record voucher only
              when payment is made
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
              placeholder="Add any notes about this voucher (optional)"
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
            <span className="font-semibold">Ready to create voucher</span>
          </div>

          {/* Confirmation Summary */}
          <div className="space-y-4 bg-gray-50 rounded-lg p-6 border border-gray-200">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Voucher Type</p>
                <p className="font-semibold text-gray-900">
                  {formData.voucherType}
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
              {formData.globalSupplierId && (
                <div>
                  <p className="text-sm text-gray-600">Supplier</p>
                  <p className="font-semibold text-gray-900">
                    {formData.globalSupplierId}
                  </p>
                </div>
              )}
              {formData.expenseCategory && (
                <div>
                  <p className="text-sm text-gray-600">Expense Category</p>
                  <p className="font-semibold text-gray-900">
                    {formData.expenseCategory}
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
            💡 <strong>This voucher will be recorded as money paid out.</strong>{" "}
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
                  Confirm & Create Voucher
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
