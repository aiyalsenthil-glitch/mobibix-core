"use client";

import { useEffect, useState } from "react";
import { listShops, type Shop } from "@/services/shops.api";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
} from "@/services/sales.api";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  PAID: "bg-green-500/15 text-green-400",
  CANCELLED: "bg-red-500/15 text-red-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-500/15 text-gray-200",
  UPI: "bg-purple-500/15 text-purple-300",
  CARD: "bg-teal-500/15 text-teal-300",
  BANK: "bg-amber-500/15 text-amber-300",
};

export default function SalesPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShops = async () => {
      try {
        setIsLoadingShops(true);
        const data = await listShops();
        setShops(data);
        // Auto-select first shop when available
        if (data.length > 0) setSelectedShopId(data[0].id);
      } catch (err: any) {
        setError(err.message || "Failed to load shops");
      } finally {
        setIsLoadingShops(false);
      }
    };

    loadShops();
  }, []);

  // Auto-load invoices whenever shop selection changes
  useEffect(() => {
    if (selectedShopId) {
      void loadInvoices();
    }
  }, [selectedShopId]);

  const loadInvoices = async () => {
    if (!selectedShopId) {
      setError("Please select a shop");
      setInvoices([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await listInvoices(selectedShopId);
      setInvoices(data);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    alert("Create Invoice coming soon – UI under construction.");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-white">Sales</h1>
        <button
          onClick={handleCreateInvoice}
          disabled={!selectedShopId}
          className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold transition shadow-lg"
        >
          + Create Invoice
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
                className="w-full px-4 py-2 bg-stone-900 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Select a shop --</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
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
            {isLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/15 border border-red-500/40 text-red-300 px-4 py-3 rounded-lg mb-6">
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
            {selectedShopId
              ? "No invoices found"
              : "Select a shop and click Refresh"}
          </p>
          {selectedShopId && (
            <button
              onClick={handleCreateInvoice}
              className="px-6 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white rounded-lg font-bold transition shadow-lg"
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
                    Invoice #
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Customer
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Amount
                  </th>
                  <th className="text-left px-4 py-3 text-sm font-semibold text-stone-300">
                    Payment
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
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-white/5 transition">
                    <td className="px-4 py-3 text-sm font-semibold text-white">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-300">
                      {inv.customerName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-white">
                      $
                      {inv.totalAmount.toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${PAYMENT_BADGES[inv.paymentMode]}`}
                      >
                        {inv.paymentMode}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[inv.status]}`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-400">
                      {new Date(inv.invoiceDate).toLocaleDateString()}{" "}
                      {new Date(inv.invoiceDate).toLocaleTimeString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
