"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getVouchers,
  PaymentVoucher,
  VoucherStatus,
  PaymentMode,
  VoucherType,
} from "@/services/vouchers.api";
import { AlertCircle, Plus, Trash2 } from "lucide-react";
import { PaymentTabs } from "@/components/sales/PaymentTabs";
import { useShop } from "@/context/ShopContext";

export default function VouchersPage() {
  const { shops, selectedShopId, selectShop, hasMultipleShops } = useShop();
  const [vouchers, setVouchers] = useState<PaymentVoucher[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Filters
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<
    PaymentMode | ""
  >("");
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | "">("");
  const [voucherTypeFilter, setVoucherTypeFilter] = useState<VoucherType | "">(
    "",
  );
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getVouchers({
        shopId: selectedShopId || undefined,
        skip: currentPage * pageSize,
        take: pageSize,
        paymentMethod: paymentMethodFilter || undefined,
        status: statusFilter || undefined,
        voucherType: voucherTypeFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      });
      setVouchers(result.data);
      setTotal(result.total);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
  }, [
    currentPage,
    paymentMethodFilter,
    statusFilter,
    voucherTypeFilter,
    startDateFilter,
    endDateFilter,
    selectedShopId,
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-IN");
  };

  const totalPages = Math.ceil(total / pageSize);

  const voucherTypeColors: Record<string, string> = {
    SUPPLIER: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    EXPENSE: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    SALARY: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    ADJUSTMENT: "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300",
  };

  return (
    <div className="space-y-6">
      <PaymentTabs />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold dark:text-white">Payment Vouchers</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Record money paid out to suppliers and expenses
          </p>
        </div>
        <Link
          href="/vouchers/create"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
        >
          <Plus size={20} />
          New Voucher
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 p-6 space-y-4 transition-colors">
        <h2 className="font-semibold text-gray-900 dark:text-white">Filters</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {hasMultipleShops && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shop
              </label>
              <select
                value={selectedShopId}
                onChange={(e) => {
                  selectShop(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
              >
                <option value="">All Shops</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Payment Mode
            </label>
            <select
              value={paymentMethodFilter}
              onChange={(e) => {
                setPaymentMethodFilter(e.target.value as PaymentMode | "");
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            >
              <option value="">All Payment Methods</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="BANK">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Voucher Type
            </label>
            <select
              value={voucherTypeFilter}
              onChange={(e) => {
                setVoucherTypeFilter(e.target.value as VoucherType | "");
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            >
              <option value="">All Types</option>
              <option value="SUPPLIER">Supplier</option>
              <option value="EXPENSE">Expense</option>
              <option value="SALARY">Salary</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as VoucherStatus | "");
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => {
                setStartDateFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => {
                setEndDateFilter(e.target.value);
                setCurrentPage(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-950 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
          <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
          <div>
            <h3 className="font-semibold text-red-900">
              Error loading vouchers
            </h3>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Vouchers Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-slate-800 overflow-hidden transition-colors">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading vouchers...</div>
          </div>
        ) : vouchers.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 font-medium">No vouchers found</p>
              <Link
                href="/vouchers/create"
                className="text-blue-600 hover:underline mt-2 inline-block"
              >
                Create your first voucher
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Voucher ID
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Payment Mode
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-200">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-800">
                  {vouchers.map((voucher) => (
                    <tr
                      key={voucher.id}
                      className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition"
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/vouchers/${voucher.id}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm"
                        >
                          {voucher.voucherId}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">
                        {formatDate(voucher.date)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            voucherTypeColors[voucher.voucherType] ||
                            "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300"
                          }`}
                        >
                          {voucher.voucherType}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(voucher.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          {voucher.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            voucher.status === "ACTIVE"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                              : "bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-300"
                          }`}
                        >
                          {voucher.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {voucher.status === "ACTIVE" && (
                          <button className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-slate-800 bg-gray-50 dark:bg-slate-950">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {currentPage * pageSize + 1} to{" "}
                {Math.min((currentPage + 1) * pageSize, total)} of {total}{" "}
                vouchers
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-300 transition"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(totalPages - 1, currentPage + 1))
                  }
                  disabled={currentPage >= totalPages - 1}
                  className="px-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-slate-800 dark:text-gray-300 transition"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
