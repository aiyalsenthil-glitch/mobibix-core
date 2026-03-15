"use client";

import { useState, useEffect } from "react";
import { getSalesReport, type SalesReportItem } from "@/services/reports.api";
import { listShops, type Shop } from "@/services/shops.api";

interface DailySalesData {
  date: string;
  invoiceCount: number;
  totalSales: number;
  totalPaid: number;
  totalPending: number;
}

export default function DailySalesReportPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [selectedShopId, setSelectedShopId] = useState("");
  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [data, setData] = useState<DailySalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadShops = async () => {
      try {
        const shopsData = await listShops();
        setShops(shopsData);
        if (shopsData.length > 0) setSelectedShopId(shopsData[0].id);
      } catch (err) {
        console.error("Failed to load shops:", err);
      }
    };
    loadShops();
  }, []);

  useEffect(() => {
    if (selectedShopId) {
      loadData();
    }
  }, [selectedShopId, startDate, endDate]);

  const loadData = async () => {
    if (!selectedShopId) return;

    try {
      setIsLoading(true);
      setError(null);
      const salesData = await getSalesReport({
        shopId: selectedShopId,
        startDate,
        endDate,
      });

      // Group by date
      const grouped = salesData.reduce(
        (acc, item) => {
          const date = new Date(item.date).toISOString().split("T")[0];
          if (!acc[date]) {
            acc[date] = {
              date,
              invoiceCount: 0,
              totalSales: 0,
              totalPaid: 0,
              totalPending: 0,
            };
          }
          acc[date].invoiceCount += 1;
          acc[date].totalSales += item.totalAmount;
          acc[date].totalPaid += item.paidAmount;
          acc[date].totalPending += item.pendingAmount;
          return acc;
        },
        {} as Record<string, DailySalesData>,
      );

      const dailyData = Object.values(grouped).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      );

      setData(dailyData);
    } catch (err: any) {
      setError(err.message || "Failed to load sales data");
    } finally {
      setIsLoading(false);
    }
  };

  const totals = data.reduce(
    (acc, item) => ({
      invoices: acc.invoices + item.invoiceCount,
      sales: acc.sales + item.totalSales,
      paid: acc.paid + item.totalPaid,
      pending: acc.pending + item.totalPending,
    }),
    { invoices: 0, sales: 0, paid: 0, pending: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Daily Sales Report</h1>
        <p className="mt-2 text-gray-600">
          View consolidated daily sales with payment status
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop
            </label>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setStartDate(getFirstDayOfMonth());
              setEndDate(new Date().toISOString().split("T")[0]);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
          >
            This Month
          </button>
          <button
            onClick={() => {
              const today = new Date().toISOString().split("T")[0];
              setStartDate(today);
              setEndDate(today);
            }}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded"
          >
            Today
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Total Invoices</h3>
          <p className="text-2xl font-bold text-blue-600 mt-1">
            {totals.invoices}
          </p>
        </div>
        <div className="rounded-lg bg-linear-to-br from-green-50 to-green-100 border border-green-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Total Sales</h3>
          <p className="text-2xl font-bold text-green-600 mt-1">
            ₹{totals.sales.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-linear-to-br from-teal-50 to-teal-100 border border-teal-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Collected</h3>
          <p className="text-2xl font-bold text-teal-600 mt-1">
            ₹{totals.paid.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-linear-to-br from-amber-50 to-amber-100 border border-amber-200 p-4">
          <h3 className="text-sm font-medium text-gray-700">Pending</h3>
          <p className="text-2xl font-bold text-amber-600 mt-1">
            ₹{totals.pending.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No sales data for selected period</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoices
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Sales
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collected
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pending
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Collection %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((row) => {
                const collectionRate =
                  row.totalSales > 0
                    ? ((row.totalPaid / row.totalSales) * 100).toFixed(1)
                    : "0.0";

                return (
                  <tr key={row.date} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {row.invoiceCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ₹{row.totalSales.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 text-right">
                      ₹{row.totalPaid.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-amber-600 text-right">
                      ₹{row.totalPending.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                      {collectionRate}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getFirstDayOfMonth(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
}
