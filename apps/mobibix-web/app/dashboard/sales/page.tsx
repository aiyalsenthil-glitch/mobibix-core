"use client";

import { useEffect, useState } from "react";
import { listShops, type Shop } from "@/services/shops.api";
import {
  listInvoices,
  type SalesInvoice,
  type InvoiceStatus,
  type PaymentMode,
} from "@/services/sales.api";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-500/15 text-gray-400",
  FINAL: "bg-blue-500/15 text-blue-400",
  PAID: "bg-green-500/15 text-green-400",
  CREDIT: "bg-amber-500/15 text-amber-400",
  VOIDED: "bg-red-500/15 text-red-400",
};

const PAYMENT_BADGES: Record<PaymentMode, string> = {
  CASH: "bg-gray-500/15 text-gray-200",
  UPI: "bg-purple-500/15 text-purple-300",
  CARD: "bg-teal-500/15 text-teal-300",
  BANK: "bg-amber-500/15 text-amber-300",
  CREDIT: "bg-indigo-500/15 text-indigo-300",
};

export default function SalesPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [isLoadingShops, setIsLoadingShops] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");

  // Simple debounce for search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  // Auto-load invoices whenever shop selection or filters change
  useEffect(() => {
    if (selectedShopId) {
      void loadInvoices();
    }
  }, [selectedShopId, statusFilter, debouncedSearchQuery]);

  const loadInvoices = async () => {
    if (!selectedShopId) {
      setError("Please select a shop");
      setInvoices([]);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await listInvoices(selectedShopId, false, {
        status: statusFilter === "ALL" ? undefined : statusFilter,
        customerName: debouncedSearchQuery || undefined,
      });
      // Handle both paginated and non-paginated responses
      const invoicesList = Array.isArray(data) ? data : data.data;
      setInvoices(invoicesList);
    } catch (err: any) {
      setError(err.message || "Failed to load invoices");
      setInvoices([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvoice = () => {
    // Navigate to create invoice page
    window.location.href = "/dashboard/sales/create";
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

      {/* Filters Section */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
          {/* Shop Selection */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-stone-400 mb-2">
              Select Shop
            </label>
            {isLoadingShops ? (
              <div className="px-4 py-2 bg-stone-900/50 border border-white/10 rounded-xl text-stone-500 animate-pulse">
                Loading shops...
              </div>
            ) : (
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full px-4 py-2 bg-stone-900 border border-white/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all cursor-pointer"
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

          {/* Search Filter */}
          <div className="md:col-span-4 relative">
            <label className="block text-sm font-medium text-stone-400 mb-2">
              Search Invoice/Customer
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
              <Input
                placeholder="Invoice #, Name or Phone"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-stone-900 border-white/20 rounded-xl focus-visible:ring-teal-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-stone-400 mb-2">
              Status
            </label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 bg-stone-900 border-white/20 rounded-xl text-white focus:ring-teal-500">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-white/10 text-white">
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="FINAL">Final</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="CREDIT">Credit</SelectItem>
                <SelectItem value="VOIDED">Voided</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Refresh Button or Clear */}
          <div className="md:col-span-1 flex gap-2">
            <button
              onClick={loadInvoices}
              disabled={!selectedShopId || isLoading}
              className="w-full h-10 flex items-center justify-center bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white rounded-xl transition-all"
              title="Refresh results"
            >
              <Search className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            {(statusFilter !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
                className="w-full h-10 flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-all"
                title="Clear all filters"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
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
