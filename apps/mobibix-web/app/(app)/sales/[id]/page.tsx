"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getInvoice,
  cancelInvoice,
  type SalesInvoice,
} from "@/services/sales.api";
import { decodeAccessToken, getAccessToken } from "@/services/auth.api";
import { EditInvoiceModal } from "./EditInvoiceModal";

const PAYMENT_MODE_LABELS = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK: "Bank",
};

export default function InvoiceDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Get user role from token
    const token = getAccessToken();
    if (token) {
      const decoded = decodeAccessToken(token);
      setUserRole(decoded.role || null);
    }
  }, []);

  const loadInvoice = async () => {
    if (!params?.id) return;

    try {
      setIsLoading(true);
      setError(null);
      const data = await getInvoice(params.id);
      setInvoice(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoice();
  }, [params?.id]);

  const handleEdit = () => {
    setIsEditModalOpen(true);
  };

  const handleEditClose = () => {
    setIsEditModalOpen(false);
    loadInvoice();
  };

  const handleCancel = async () => {
    if (!invoice) return;

    if (
      !confirm(
        `Are you sure you want to cancel invoice ${invoice.invoiceNumber}? This will reverse stock and finances.`,
      )
    ) {
      return;
    }

    try {
      setIsCancelling(true);
      await cancelInvoice(invoice.id);
      await loadInvoice(); // Refresh to show updated status
    } catch (err: any) {
      alert(err.message || "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleBack = () => {
    router.push("/sales");
  };

  const isOwner = userRole === "owner";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-stone-400">Loading invoice...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
        >
          ← Back to Sales
        </button>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-4">
        <div className="text-stone-400">Invoice not found</div>
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg"
        >
          ← Back to Sales
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={handleBack}
            className="text-teal-400 hover:text-teal-300 mb-2"
          >
            ← Back to Sales
          </button>
          <h1 className="text-3xl font-bold text-white">
            Invoice {invoice.invoiceNumber}
          </h1>
        </div>
        {isOwner && invoice.status !== "CANCELLED" && (
          <div className="flex gap-3">
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
            >
              Edit Invoice
            </button>
            <button
              onClick={handleCancel}
              disabled={isCancelling}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white rounded-lg font-medium transition"
            >
              {isCancelling ? "Cancelling..." : "Cancel Invoice"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-lg p-6 space-y-6">
        {/* Status Banner */}
        <div
          className={`px-4 py-3 rounded-lg ${
            invoice.status === "PAID"
              ? "bg-green-500/20 border border-green-500/50 text-green-300"
              : "bg-red-500/20 border border-red-500/50 text-red-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-semibold">Status: {invoice.status}</span>
            <span className="text-sm">
              {new Date(invoice.invoiceDate).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Customer & Payment Info */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              Customer Details
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-stone-400">Name:</span>{" "}
                <span className="text-white">
                  {invoice.customerName || "Walk-in"}
                </span>
              </div>
              <div>
                <span className="text-stone-400">Phone:</span>{" "}
                <span className="text-white">
                  {invoice.customerPhone || "-"}
                </span>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-white mb-3">
              Payment Info
            </h2>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-stone-400">Mode:</span>{" "}
                <span className="text-white">
                  {PAYMENT_MODE_LABELS[invoice.paymentMode]}
                </span>
              </div>
              <div>
                <span className="text-stone-400">Total Amount:</span>{" "}
                <span className="text-white font-semibold text-lg">
                  ₹ {invoice.totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Notes */}
        <div className="pt-4 border-t border-white/10">
          <p className="text-sm text-stone-400">
            Invoice created on {new Date(invoice.createdAt).toLocaleString()}
          </p>
          {invoice.status === "CANCELLED" && (
            <p className="text-sm text-red-400 mt-2">
              ⚠️ This invoice has been cancelled. Stock and finances have been
              reversed.
            </p>
          )}
        </div>
      </div>

      {isEditModalOpen && invoice && (
        <EditInvoiceModal invoice={invoice} onClose={handleEditClose} />
      )}
    </div>
  );
}
