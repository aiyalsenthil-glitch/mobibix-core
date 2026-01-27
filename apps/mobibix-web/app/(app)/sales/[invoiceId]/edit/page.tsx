"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  getInvoice,
  updateInvoice,
  type SalesInvoice,
  type PaymentMode,
} from "@/services/sales.api";
import { getAccessToken, decodeAccessToken } from "@/services/auth.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";

const PAYMENT_MODES: PaymentMode[] = ["CASH", "UPI", "CARD", "BANK", "CREDIT"];

interface EditableInvoice extends SalesInvoice {
  paymentMethods?: Array<{ mode: PaymentMode; amount: number }>;
}

export default function EditInvoicePage() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const invoiceId = params.invoiceId as string;
  const shopId = searchParams.get("shopId");

  const { selectedShop } = useShop();
  const token = getAccessToken();
  const userRole = token ? decodeAccessToken(token).role : null;
  const isOwner = userRole === "OWNER";

  const [invoice, setInvoice] = useState<EditableInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Editable fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ mode: PaymentMode; amount: number }>
  >([{ mode: "CASH", amount: 0 }]);
  const [invoiceDate, setInvoiceDate] = useState("");

  // Load invoice
  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const data = await getInvoice(invoiceId);
        setInvoice(data);
        setCustomerName(data.customerName || "");
        setCustomerPhone(data.customerPhone || "");
        setCustomerState(data.customerState || "");
        setCustomerGstin(data.customerGstin || "");
        setInvoiceDate(new Date(data.invoiceDate).toISOString().split("T")[0]);

        // Initialize payment methods
        if (data.paymentMethods && data.paymentMethods.length > 0) {
          setPaymentMethods(data.paymentMethods);
        } else {
          setPaymentMethods([
            { mode: data.paymentMode as PaymentMode, amount: data.totalAmount },
          ]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    if (invoiceId) {
      loadInvoice();
    }
  }, [invoiceId]);

  if (!isOwner) {
    return (
      <div className="text-center py-12">
        <p className={theme === "dark" ? "text-red-400" : "text-red-600"}>
          Only owner can edit invoices
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className={theme === "dark" ? "text-stone-400" : "text-zinc-600"}>
          Loading invoice...
        </p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className={theme === "dark" ? "text-red-400" : "text-red-600"}>
          Invoice not found
        </p>
        <button
          onClick={() => router.back()}
          className="mt-4 px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg"
        >
          Go Back
        </button>
      </div>
    );
  }

  const isPaid = invoice.status === "PAID";
  const isCredit = invoice.status === "CREDIT";
  const totalAmount = invoice.totalAmount;
  const totalPaid = paymentMethods.reduce((sum, p) => sum + p.amount, 0);
  const paymentDifference = totalAmount - totalPaid;
  const isBalanced = Math.abs(paymentDifference) < 0.01;

  const handleSave = async () => {
    if (!isBalanced) {
      setError(
        `Total payment (₹${totalPaid.toFixed(2)}) must match invoice total (₹${totalAmount.toFixed(2)})`,
      );
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const payload = {
        shopId: invoice.shopId,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName,
        customerPhone,
        customerState,
        customerGstin,
        paymentMethods: paymentMethods.filter((p) => p.amount > 0),
        pricesIncludeTax: false,
        items:
          invoice.items?.map((item) => ({
            shopProductId: item.shopProductId,
            quantity: item.quantity,
            rate: item.rate,
            gstRate: item.gstRate || 0,
            gstAmount: item.gstAmount || 0,
          })) || [],
      };

      await updateInvoice(invoiceId, payload as any);
      router.push(`/sales?shopId=${shopId}`);
    } catch (err: any) {
      setError(err.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1
          className={`text-3xl font-bold ${theme === "dark" ? "text-white" : "text-black"}`}
        >
          Edit Invoice {invoice.invoiceNumber}
        </h1>
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            isPaid
              ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
              : "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
          }`}
        >
          {invoice.status}
        </span>
      </div>

      {error && (
        <div
          className={`border px-4 py-3 rounded-lg mb-6 ${
            theme === "dark"
              ? "bg-red-500/15 border-red-500/40 text-red-300"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          {error}
        </div>
      )}

      <div
        className={`border rounded-lg p-6 shadow-sm mb-6 ${
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : "bg-white border-gray-200"
        }`}
      >
        <h2
          className={`text-lg font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          Customer Details {isPaid && "(Read-only)"}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-black"
              }`}
            >
              Customer Name
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              disabled={isPaid}
              className={`w-full px-4 py-2 border rounded-lg ${
                isPaid
                  ? "cursor-not-allowed opacity-50"
                  : "focus:outline-none focus:ring-2 focus:ring-teal-500"
              } ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-black"
              }`}
            >
              Phone
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              disabled={isPaid}
              className={`w-full px-4 py-2 border rounded-lg ${
                isPaid
                  ? "cursor-not-allowed opacity-50"
                  : "focus:outline-none focus:ring-2 focus:ring-teal-500"
              } ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-black"
              }`}
            >
              State
            </label>
            <input
              type="text"
              value={customerState}
              onChange={(e) => setCustomerState(e.target.value)}
              disabled={isPaid}
              className={`w-full px-4 py-2 border rounded-lg ${
                isPaid
                  ? "cursor-not-allowed opacity-50"
                  : "focus:outline-none focus:ring-2 focus:ring-teal-500"
              } ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              }`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${
                theme === "dark" ? "text-stone-300" : "text-black"
              }`}
            >
              GSTIN
            </label>
            <input
              type="text"
              value={customerGstin}
              onChange={(e) => setCustomerGstin(e.target.value)}
              disabled={isPaid}
              className={`w-full px-4 py-2 border rounded-lg ${
                isPaid
                  ? "cursor-not-allowed opacity-50"
                  : "focus:outline-none focus:ring-2 focus:ring-teal-500"
              } ${
                theme === "dark"
                  ? "bg-white/10 border-white/20 text-white"
                  : "bg-white border-gray-300 text-black"
              }`}
            />
          </div>
        </div>
      </div>

      <div
        className={`border rounded-lg p-6 shadow-sm mb-6 ${
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : "bg-white border-gray-200"
        }`}
      >
        <h2
          className={`text-lg font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          Invoice Date {isPaid && "(Read-only)"}
        </h2>

        <input
          type="date"
          value={invoiceDate}
          onChange={(e) => setInvoiceDate(e.target.value)}
          disabled={isPaid}
          className={`w-full px-4 py-2 border rounded-lg ${
            isPaid
              ? "cursor-not-allowed opacity-50"
              : "focus:outline-none focus:ring-2 focus:ring-teal-500"
          } ${
            theme === "dark"
              ? "bg-white/10 border-white/20 text-white"
              : "bg-white border-gray-300 text-black"
          }`}
        />
      </div>

      <div
        className={`border rounded-lg p-6 shadow-sm ${
          theme === "dark"
            ? "bg-white/5 border-white/10"
            : "bg-white border-gray-200"
        }`}
      >
        <h2
          className={`text-lg font-semibold mb-4 ${
            theme === "dark" ? "text-white" : "text-black"
          }`}
        >
          Payment Methods
        </h2>

        <div className="space-y-3 mb-4">
          {paymentMethods.map((payment, index) => (
            <div key={index} className="flex gap-3 items-end">
              <div className="flex-1">
                <label
                  className={`block text-xs font-medium mb-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  Method
                </label>
                <select
                  value={payment.mode}
                  onChange={(e) => {
                    const updated = [...paymentMethods];
                    updated[index].mode = e.target.value as PaymentMode;
                    setPaymentMethods(updated);
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === "dark"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-gray-300 text-black"
                  }`}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label
                  className={`block text-xs font-medium mb-1 ${
                    theme === "dark" ? "text-gray-400" : "text-gray-700"
                  }`}
                >
                  Amount
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={payment.amount === 0 ? "" : payment.amount}
                  onChange={(e) => {
                    const updated = [...paymentMethods];
                    updated[index].amount = parseFloat(e.target.value) || 0;
                    setPaymentMethods(updated);
                  }}
                  placeholder="0.00"
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm ${
                    theme === "dark"
                      ? "bg-white/10 border-white/20 text-white"
                      : "bg-white border-gray-300 text-black"
                  }`}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (paymentMethods.length > 1) {
                    setPaymentMethods(
                      paymentMethods.filter((_, i) => i !== index),
                    );
                  }
                }}
                disabled={paymentMethods.length === 1}
                className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => {
            setPaymentMethods([...paymentMethods, { mode: "CASH", amount: 0 }]);
          }}
          className="w-full px-4 py-2 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 rounded-lg font-medium transition text-sm"
        >
          + Add Payment Method
        </button>

        {/* Payment validation indicator */}
        <div
          className={`mt-4 pt-3 border-t ${
            theme === "dark" ? "border-white/10" : "border-gray-200"
          }`}
        >
          <div className="flex justify-between mb-2">
            <span
              className={theme === "dark" ? "text-stone-300" : "text-gray-700"}
            >
              Total Amount:
            </span>
            <span className="font-semibold">₹{totalAmount.toFixed(2)}</span>
          </div>
          <div
            className={`flex justify-between font-semibold ${
              isBalanced
                ? "text-green-600 dark:text-green-400"
                : "text-amber-600 dark:text-amber-400"
            }`}
          >
            <span>Total Paid:</span>
            <span>₹{totalPaid.toFixed(2)}</span>
          </div>
          {!isBalanced && (
            <div className="text-amber-600 dark:text-amber-400 text-sm mt-1">
              Difference: ₹{paymentDifference.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={handleSave}
          disabled={saving || !isBalanced}
          className="flex-1 px-6 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
        <button
          onClick={() => router.back()}
          className="flex-1 px-6 py-3 border rounded-lg font-bold transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
