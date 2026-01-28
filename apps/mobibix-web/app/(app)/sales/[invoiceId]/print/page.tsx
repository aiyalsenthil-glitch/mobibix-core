"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getInvoice, type SalesInvoice } from "@/services/sales.api";
import { numberToIndianWords } from "@/utils/numberToWords";
import { QRCodeSVG } from "qrcode.react";

export default function PrintInvoicePage() {
  const params = useParams<{ invoiceId: string }>();
  const searchParams = useSearchParams();
  const shopId = searchParams.get("shopId") || "";

  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!params?.invoiceId) {
        setError("Missing invoice id");
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(null);
        const data = await getInvoice(params.invoiceId);
        setInvoice(data);
      } catch (err: any) {
        setError(err.message || "Failed to load invoice");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [params?.invoiceId]);

  useEffect(() => {
    if (invoice) {
      // Trigger browser print when invoice is loaded
      setTimeout(() => {
        try {
          window.print();
        } catch {}
      }, 300);
    }
  }, [invoice]);

  const verifyUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/verify/${params.invoiceId}`
      : "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-red-600">
        {error}
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        Invoice not found
      </div>
    );
  }

  // Default terms
  const defaultTerms = [
    "All disputes subject to local jurisdiction.",
    "Warranty void if label is tampered with.",
    "Goods once sold will not be taken back.",
  ];

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-4xl mx-auto border border-black">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold">Shop Name</h1>
              <p className="text-sm mt-1">Address Line 1, Address Line 2</p>
              <p className="text-sm">City, State</p>
              <p className="text-sm">Phone: +91-XXXXX-XXXXX</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-bold">Tax Invoice</h2>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-2 gap-6 px-6 py-4 border-b border-black">
          <div>
            <p className="text-sm font-bold">BILLED TO:</p>
            <p className="font-semibold">{invoice.customerName}</p>
            {invoice.customerPhone && (
              <p className="text-sm">{invoice.customerPhone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm">
              <span className="font-bold">Invoice No:</span>{" "}
              {invoice.invoiceNumber}
            </p>
            <p className="text-sm">
              <span className="font-bold">Date:</span>{" "}
              {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full">
          <thead>
            <tr className="bg-gray-100 border-b border-black">
              <th className="text-left px-4 py-2 text-sm">S/No</th>
              <th className="text-left px-4 py-2 text-sm">Description</th>
              <th className="text-center px-4 py-2 text-sm">HSN/SAC</th>
              <th className="text-center px-4 py-2 text-sm">Qty</th>
              <th className="text-right px-4 py-2 text-sm">Rate</th>
              <th className="text-right px-4 py-2 text-sm">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items?.map((item, idx) => (
              <tr key={idx} className="border-b">
                <td className="px-4 py-2 text-sm">{idx + 1}</td>
                <td className="px-4 py-2 text-sm">Item {idx + 1}</td>
                <td className="px-4 py-2 text-sm text-center">
                  {item.hsnCode || "-"}
                </td>
                <td className="px-4 py-2 text-sm text-center">
                  {item.quantity}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  ₹{item.rate.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-sm text-right">
                  ₹{(item.lineTotal || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Section */}
        <div className="flex justify-between px-6 py-4 border-b border-black">
          <div className="w-1/2">
            <p className="text-sm font-bold mb-2">Amount in Words:</p>
            <p className="text-sm italic">
              {numberToIndianWords(invoice.totalAmount)}
            </p>
          </div>
          <div className="w-1/2">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>₹{(invoice.subTotal || 0).toFixed(2)}</span>
              </div>
              {invoice.gstAmount !== undefined && invoice.gstAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>GST:</span>
                  <span>₹{invoice.gstAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-lg border-t border-black pt-2">
                <span>Grand Total:</span>
                <span>₹{invoice.totalAmount.toFixed(2)}</span>
              </div>
              {/* Payment Information */}
              {invoice.paymentMode && (
                <>
                  <div className="flex justify-between text-sm pt-2 border-t border-black">
                    <span>Payment Mode:</span>
                    <span className="font-semibold">
                      {invoice.paymentMode === "CASH"
                        ? "CASH"
                        : invoice.paymentMode === "UPI"
                          ? "UPI"
                          : invoice.paymentMode === "CARD"
                            ? "CARD"
                            : invoice.paymentMode === "BANK"
                              ? "BANK TRANSFER"
                              : "CREDIT"}
                    </span>
                  </div>
                  {invoice.paymentMode === "CREDIT" && (
                    <div className="flex justify-between text-sm font-bold pt-1">
                      <span>Balance Due:</span>
                      <span>₹{invoice.totalAmount.toFixed(2)}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer with QR and Terms */}
        <div className="flex justify-between items-start px-6 py-4">
          <div className="w-2/3">
            <p className="text-sm font-bold mb-2">Terms & Conditions</p>
            <ol className="text-xs space-y-1">
              {defaultTerms.map((term: string, idx: number) => (
                <li key={idx}>
                  {idx + 1}. {term}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col items-center">
            {verifyUrl && (
              <>
                <QRCodeSVG value={verifyUrl} size={128} />
                <p className="text-xs mt-2 text-center font-semibold">
                  Scan QR to verify
                </p>
              </>
            )}
            <div className="mt-6 text-center">
              <p className="text-sm font-bold">Shop Name</p>
              <p className="text-xs mt-8">(Authorized Signatory)</p>
            </div>
          </div>
        </div>

        {/* Trust Signals Footer */}
        <div className="px-6 py-3 border-t border-black text-center">
          <p className="text-xs text-gray-700">
            This is a computer-generated invoice
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Scan QR code above to verify invoice authenticity
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          @page {
            margin: 0.5cm;
          }
        }
      `}</style>
    </div>
  );
}
