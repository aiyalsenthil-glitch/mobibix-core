"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import {
  getInvoice,
  updateInvoice,
  type SalesInvoice,
  type PaymentMode,
  type CreateInvoiceDto,
  type InvoiceItemDetail,
} from "@/services/sales.api";
import { useAuth } from "@/hooks/useAuth";
import {
  listProducts,
  type ShopProduct,
  ProductType,
} from "@/services/products.api";
import { getStockBalances } from "@/services/stock.api";
import { useTheme } from "@/context/ThemeContext";
import { useShop } from "@/context/ShopContext";
import { InvoiceItemModal } from "@/components/sales/InvoiceItemModal";
import { type InvoiceItem } from "@/services/sales.api";

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

  const { authUser } = useAuth();
  const { selectedShop } = useShop();
  const userRole = authUser?.role;
  const isOwner = userRole === "owner";


  const [invoice, setInvoice] = useState<EditableInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [imeiHighlight, setImeiHighlight] = useState(false);

  // Editable fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerState, setCustomerState] = useState("");
  const [customerGstin, setCustomerGstin] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<
    Array<{ mode: PaymentMode; amount: number }>
  >([{ mode: "CASH", amount: 0 }]);
  const [invoiceDate, setInvoiceDate] = useState("");
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editableItems, setEditableItems] = useState<InvoiceItemDetail[]>([]);

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

        // Load products with stock balances for stock-aware display
        if (data.shopId) {
          try {
            const [productsResponse, balances] = await Promise.all([
              listProducts(data.shopId),
              getStockBalances(data.shopId),
            ]);
            // Handle paginated response
            const productList = Array.isArray(productsResponse)
              ? productsResponse
              : productsResponse.data;
            const balanceMap = new Map(balances.map((b) => [b.productId, b]));
            const merged: ShopProduct[] = productList.map((p) => {
              const b = balanceMap.get(p.id);
              const stockQty = b?.stockQty ?? p.stockQty ?? 0;
              const isNegative = b?.isNegative ?? stockQty < 0;
              return { ...p, stockQty, isNegative };
            });
            setProducts(merged);
          } catch (stockErr) {
            console.error("Failed to load stock data:", stockErr);
          }
        }

        // Initialize payment methods
        const invoiceData = data;
        if (
          invoiceData.payments &&
          invoiceData.payments.length > 0
        ) {
          setPaymentMethods(
            invoiceData.payments.map((p) => ({
              mode: p.method,
              amount: p.amount,
            })),
          );
        } else {
          setPaymentMethods([
            { mode: data.paymentMode as PaymentMode, amount: data.totalAmount },
          ]);
        }

        // Initialize items
        setEditableItems(data.items || []);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load invoice");
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

  // Recalculate Totals Locally
  const subTotal = editableItems.reduce(
    (sum, item) => sum + (item.lineTotal || item.rate * item.quantity),
    0,
  );
  const gstTotal = editableItems.reduce(
    (sum, item) => sum + (item.gstAmount || 0),
    0,
  );
  const totalAmount = subTotal + gstTotal;

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
    setImeiHighlight(false);

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
        items: editableItems.map((item) => ({
          shopProductId: item.shopProductId,
          quantity: item.quantity,
          rate: item.rate,
          gstRate: item.gstRate || 0,
          gstAmount: item.gstAmount || 0,
          imeis: item.imeis && item.imeis.length > 0 ? item.imeis : undefined,
          serialNumbers: item.serialNumbers && item.serialNumbers.length > 0 ? item.serialNumbers : undefined,
          warrantyDays: item.warrantyDays,
          hsnCode: item.hsnCode,
        })),
      };

      await updateInvoice(invoiceId, payload as unknown as CreateInvoiceDto);
      router.push(`/sales?shopId=${shopId}`);
    } catch (err: unknown) {
      const msg = (err instanceof Error ? err.message : "Failed to save invoice") as string;
      if (msg.includes("Insufficient stock")) {
        setError("Insufficient stock. Please add purchase or reduce quantity.");
      } else if (msg.includes("Serialized products require IMEI")) {
        setError("Serialized products require IMEI.");
        setImeiHighlight(true);
      } else if (msg.includes("IMEI is not available")) {
        setError("One or more IMEIs are already sold or unavailable.");
      } else {
        setError(msg);
      }
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
          Invoice Items
        </h2>

        <div className="overflow-x-auto mb-4">
          <table className="w-full text-left text-sm">
            <thead
              className={`border-b ${theme === "dark" ? "border-white/10 text-stone-400" : "border-gray-100 text-gray-500"}`}
            >
              <tr>
                <th className="py-3 px-2">Item</th>
                <th className="py-3 px-2">Qty</th>
                <th className="py-3 px-2">Rate</th>
                <th className="py-3 px-2">GST</th>
                <th className="py-3 px-2 text-right">Total</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${theme === "dark" ? "divide-white/5" : "divide-gray-50"}`}
            >
              {editableItems.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="py-8 text-center text-gray-400 italic"
                  >
                    No items added yet.
                  </td>
                </tr>
              )}
              {editableItems.map((item, idx) => (
                <tr
                  key={`${item.shopProductId}-${idx}`}
                  className={
                    theme === "dark" ? "text-gray-200" : "text-gray-700"
                  }
                >
                  <td className="py-3 px-2 font-medium">
                    {products.find((p) => p.id === item.shopProductId)?.name ||
                      "Unknown Product"}
                  </td>
                  <td className="py-3 px-2">{item.quantity}</td>
                  <td className="py-3 px-2">₹{item.rate.toFixed(2)}</td>
                  <td className="py-3 px-2">
                    ₹{(item.gstAmount || 0).toFixed(2)} ({item.gstRate || 0}%)
                  </td>
                  <td className="py-3 px-2 text-right font-semibold">
                    ₹
                    {(
                      item.lineTotal ||
                      item.rate * item.quantity + (item.gstAmount || 0)
                    ).toFixed(2)}
                  </td>
                  <td className="py-3 px-2 text-right">
                    <button
                      onClick={() => {
                        setEditableItems(
                          editableItems.filter((_, i) => i !== idx),
                        );
                      }}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          type="button"
          onClick={() => setIsItemModalOpen(true)}
          className={`w-full py-2 border-2 border-dashed rounded-lg font-medium transition ${
            theme === "dark"
              ? "border-white/10 text-stone-400 hover:bg-white/5"
              : "border-gray-200 text-gray-500 hover:bg-gray-50"
          }`}
        >
          + Add Product / Service
        </button>

        <InvoiceItemModal
          isOpen={isItemModalOpen}
          shopId={invoice.shopId}
          gstEnabled={selectedShop?.gstEnabled || false}
          onClose={() => setIsItemModalOpen(false)}
          onAdd={async (newItem) => {
            const detail: InvoiceItemDetail = {
              shopProductId: newItem.shopProductId,
              quantity: newItem.quantity,
              rate: newItem.rate,
              gstRate: newItem.gstRate,
              gstAmount: newItem.gstAmount,
              lineTotal: newItem.rate * newItem.quantity + (newItem.gstAmount || 0),
              hsnCode: newItem.hsnCode,
            };
            setEditableItems([...editableItems, detail]);
          }}
        />
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
