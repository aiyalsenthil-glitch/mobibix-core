"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listInvoices,
  type SalesInvoice,
  type PaymentMode,
} from "@/services/sales.api";
import { listShops, type Shop } from "@/services/shops.api";
import { SalesInvoiceModal } from "./SalesInvoiceModal";

const PAYMENT_MODE_LABELS: Record<PaymentMode, string> = {
  CASH: "Cash",
  UPI: "UPI",
  CARD: "Card",
  BANK: "Bank",
};

export default function SalesPage() {
  const router = useRouter();
  const [shops, setShops] = useState<Shop[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Load shops on component mount
  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        setError(null);
        const data = await listShops();
        setShops(data);
        // Auto-select first shop
        if (data.length > 0) {
          setSelectedShopId(data[0].id);
        }
      } catch (err: any) {
        console.error("Error loading shops:", err);
        setError(err.message || "Failed to load shops");
      } finally {
        setIsLoadingShops(false);
      }
    };

    loadShops();
  }, []);

  const loadInvoices = async () => {
    if (!selectedShopId) {
      setError("Please select a shop");
      setInvoices([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log(`Loading invoices for shop: ${selectedShopId}`);
      const data = await listInvoices(selectedShopId);
      console.log(`Loaded ${data.length} invoices`, data);
      setInvoices(data);
    } catch (err: any) {
      console.error("Error loading invoices:", err);
      setError(err.message || "Failed to load invoices");
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRowClick = (invoiceId: string) => {
    router.push(`/sales/${invoiceId}`);
  };

  const handleAddNew = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    loadInvoices();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Sales Invoices</h1>
        <button
          onClick={handleAddNew}
          disabled={!selectedShopId}
          className="px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg font-medium transition"
        >
          + New Invoice
        </button>
      </div>

      {/* Shop Filter Section */}
      <div className="bg-white/5 border border-white/10 rounded-lg p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-stone-400 mb-2">
              Select Shop
            </label>
            {isLoadingShops ? (
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-stone-400">
                Loading shops...
              </div>
            ) : shops.length === 0 ? (
              <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-stone-400">
                No shops available
              </div>
            ) : (
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Select a shop --</option>
                {shops.map((shop) => (
                  <option
                    key={shop.id}
                    value={shop.id}
                    className="bg-stone-900"
                  >
                    {shop.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={loadInvoices}
            disabled={!selectedShopId || isLoading}
            className="mt-6 px-6 py-2 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-500/50 text-white rounded-lg font-medium transition"
          >
            {isLoading ? "Loading..." : "List"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-stone-400">
          Loading invoices...
        </div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-stone-400 mb-4">
            {selectedShopId ? "No sales yet" : "Select a shop and click List"}
          </p>
          {selectedShopId && (
            <button
              onClick={handleAddNew}
              className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg font-medium transition"
            >
              Create your first invoice
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Invoice No.
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Payment Mode
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {invoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => handleRowClick(invoice.id)}
                    className="hover:bg-white/5 transition cursor-pointer"
                  >
                    <td className="px-4 py-3 text-sm text-white font-medium">
                      {invoice.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">
                      ₹ {invoice.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">
                      {PAYMENT_MODE_LABELS[invoice.paymentMode]}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-medium ${
                          invoice.status === "PAID"
                            ? "bg-green-500/20 text-green-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">
                      {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && selectedShopId && (
        <SalesInvoiceModal shopId={selectedShopId} onClose={handleModalClose} />
      )}
    </div>
  );
}
