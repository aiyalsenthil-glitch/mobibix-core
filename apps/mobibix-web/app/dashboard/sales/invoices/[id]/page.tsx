"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getInvoice, type SalesInvoice } from "@/services/sales.api";
import { CollectPaymentModal } from "@/components/sales/CollectPaymentModal";
import { formatCurrency } from "@/lib/gst.utils";

export default function InvoiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setError("Invoice ID not found");
      setLoading(false);
      return;
    }

    const loadInvoice = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getInvoice(invoiceId);
        setInvoice(data);
      } catch (err: any) {
        console.error("Failed to load invoice:", err);
        setError(err.message || "Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="mx-auto max-w-2xl">
          <button
            onClick={() => router.back()}
            className="mb-6 text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Go Back
          </button>
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-red-700 font-semibold">Error</p>
            <p className="text-red-600 text-sm mt-1">
              {error || "Invoice not found"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const balanceAmount = invoice.balanceAmount || 0;
  const isPaid = balanceAmount === 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Invoice #{invoice.invoiceNumber || invoice.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-gray-600">
              {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 text-sm font-medium"
          >
            ← Back
          </button>
        </div>

        {/* Status Cards */}
        <div className="grid gap-3 md:grid-cols-3">
          <StatusCard
            label="Invoice Total"
            value={formatCurrency(invoice.totalAmount || 0)}
          />
          <StatusCard
            label="Paid Amount"
            value={formatCurrency(invoice.paidAmount || 0)}
            variant="success"
          />
          <StatusCard
            label="Balance Due"
            value={formatCurrency(balanceAmount)}
            variant={isPaid ? "success" : "warning"}
          />
        </div>

        {/* Invoice Details */}
        <div className="rounded-lg bg-white border border-gray-200 p-6 space-y-6">
          {/* Customer Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Customer Details
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-600">Name</p>
                <p className="font-medium text-gray-900">
                  {invoice.customerName || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Phone</p>
                <p className="font-medium text-gray-900">
                  {invoice.customerPhone || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">State</p>
                <p className="font-medium text-gray-900">
                  {invoice.customerState || "-"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">GSTIN</p>
                <p className="font-mono text-sm font-medium text-gray-900">
                  {invoice.customerGstin || "-"}
                </p>
              </div>
            </div>
          </div>

          {/* Items Section */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Product
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      Line Total
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      GST %
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-700">
                      GST Amt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.items && invoice.items.length > 0 ? (
                    invoice.items.map((item, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-200 hover:bg-gray-50"
                      >
                        <td className="px-4 py-3 text-gray-900">
                          {item.hsnCode ? `${item.hsnCode}` : "Item"}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.rate || 0)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(
                            (item.quantity || 0) * (item.rate || 0),
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {item.gstRate}%
                        </td>
                        <td className="px-4 py-3 text-right text-gray-600">
                          {formatCurrency(item.gstAmount || 0)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-3 text-center text-gray-600"
                      >
                        No items
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals Section */}
          <div className="border-t border-gray-200 pt-4">
            <div className="space-y-2 text-sm max-w-xs ml-auto">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span className="font-medium">
                  {formatCurrency(invoice.subTotal || 0)}
                </span>
              </div>
              {invoice.cgst !== undefined && invoice.cgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">CGST:</span>
                  <span className="font-medium">
                    {formatCurrency(invoice.cgst)}
                  </span>
                </div>
              )}
              {invoice.sgst !== undefined && invoice.sgst > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">SGST:</span>
                  <span className="font-medium">
                    {formatCurrency(invoice.sgst)}
                  </span>
                </div>
              )}
              {invoice.igst !== undefined && invoice.igst > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">IGST:</span>
                  <span className="font-medium">
                    {formatCurrency(invoice.igst)}
                  </span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2 flex justify-between font-bold text-base">
                <span>Total:</span>
                <span className="text-blue-600">
                  {formatCurrency(invoice.totalAmount || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payments Section */}
        {invoice.payments && invoice.payments.length > 0 && (
          <div className="rounded-lg bg-white border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Payment History
            </h3>
            <div className="space-y-3">
              {invoice.payments.map((payment, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-l-4 border-green-500 pl-4 py-2"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.method || "Payment"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {new Date(payment.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Ref: {payment.receiptNumber}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-center">
          {!isPaid && (
            <button
              onClick={() => setPaymentModalOpen(true)}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition"
            >
              💳 Record Payment
            </button>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {invoice && (
        <CollectPaymentModal
          invoiceId={invoice.id}
          balanceAmount={invoice.balanceAmount || 0}
          customerName={invoice.customerName || "Customer"}
          isOpen={paymentModalOpen}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => {
            setPaymentModalOpen(false);
            // Reload invoice
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}

/**
 * Status card component
 */
function StatusCard({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string;
  variant?: "default" | "success" | "warning";
}) {
  const variants = {
    default: "bg-blue-50 border-blue-200",
    success: "bg-green-50 border-green-200",
    warning: "bg-amber-50 border-amber-200",
  };

  return (
    <div className={`rounded-lg border p-4 ${variants[variant]}`}>
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
