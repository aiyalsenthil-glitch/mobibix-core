"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";

interface InvoiceVerification {
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    total: number;
  }>;
  totalAmount: number;
  status: string;
  shopName: string;
  shopPhone: string;
}

export default function VerifyInvoicePage() {
  const params = useParams<{ invoiceId: string }>();
  const [invoice, setInvoice] = useState<InvoiceVerification | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        setLoading(true);
        const API_BASE_URL =
          process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";
        const response = await fetch(
          `${API_BASE_URL}/public/sales/invoice/${params.invoiceId}/verify`,
        );

        if (!response.ok) {
          throw new Error("Invoice not found or invalid");
        }

        const data = await response.json();
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || "Failed to verify invoice");
      } finally {
        setLoading(false);
      }
    };

    if (params.invoiceId) {
      loadInvoice();
    }
  }, [params.invoiceId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying invoice...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
              <svg
                className="h-8 w-8 text-red-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-600">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  const currentUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Verification Success Badge */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  ✓ Verified Invoice
                </h1>
                <p className="text-sm text-gray-500">
                  This invoice is authentic
                </p>
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="border-t border-gray-200 pt-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <p className="text-sm text-gray-500">Invoice Number</p>
                <p className="text-lg font-mono font-bold text-gray-900">
                  {invoice.invoiceNumber}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date</p>
                <p className="text-lg font-semibold text-gray-900">
                  {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Customer Name</p>
                <p className="text-lg font-semibold text-gray-900">
                  {invoice.customerName}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                    invoice.status === "PAID"
                      ? "bg-green-100 text-green-700"
                      : invoice.status === "CREDIT"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }`}
                >
                  {invoice.status}
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border rounded-lg overflow-hidden mb-6">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                      Item
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Rate
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item, idx) => (
                    <tr key={idx} className="bg-white">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.description}
                      </td>
                      <td className="px-4 py-3 text-sm text-center text-gray-600">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-gray-600">
                        ₹{item.rate.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                        ₹{item.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Total */}
            <div className="flex justify-end">
              <div className="w-64">
                <div className="flex justify-between items-center py-3 border-t-2 border-gray-900">
                  <span className="text-lg font-bold text-gray-900">
                    Grand Total
                  </span>
                  <span className="text-2xl font-bold text-teal-600">
                    ₹{invoice.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Shop Info */}
          <div className="border-t border-gray-200 mt-6 pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Issued by</p>
                <p className="text-lg font-semibold text-gray-900">
                  {invoice.shopName}
                </p>
                <p className="text-sm text-gray-600">📞 {invoice.shopPhone}</p>
              </div>
              <div className="flex flex-col items-center">
                <QRCodeSVG value={currentUrl} size={80} />
                <p className="text-xs text-gray-500 mt-2">Scan to verify</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-center text-sm text-gray-600">
          <p>
            This is a digitally verifiable invoice. No personal address or
            sensitive information is displayed.
          </p>
        </div>
      </div>
    </div>
  );
}
