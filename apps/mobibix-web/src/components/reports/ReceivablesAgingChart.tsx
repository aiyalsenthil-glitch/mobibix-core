"use client";

import { useState, useEffect } from "react";
import { getReceivablesAging, type AgingReport } from "@/services/reports.api";

interface AgingChartProps {
  shopId?: string;
}

export function ReceivablesAgingChart({ shopId }: AgingChartProps) {
  const [data, setData] = useState<AgingReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [shopId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await getReceivablesAging(false);
      setData(result as AgingReport);
    } catch (err: any) {
      setError(err.message || "Failed to load receivables aging data");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-teal-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const maxAmount = Math.max(...data.buckets.map((b) => b.amount), 1);

  return (
    <div className="space-y-6">
      {/* Total Outstanding KPI */}
      <div className="rounded-lg bg-linear-to-br from-blue-50 to-blue-100 border border-blue-200 p-6">
        <h3 className="text-sm font-medium text-gray-700">Total Receivables</h3>
        <p className="text-3xl font-bold text-blue-600 mt-2">
          ₹{data.totalOutstanding.toLocaleString()}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Outstanding customer payments
        </p>
      </div>

      {/* Aging Buckets */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Aging Breakdown
        </h3>

        <div className="space-y-4">
          {data.buckets.map((bucket, index) => {
            const percentage = (bucket.amount / maxAmount) * 100;
            const colors = [
              "bg-green-500",
              "bg-yellow-500",
              "bg-orange-500",
              "bg-red-500",
            ];
            const color = colors[index] || "bg-gray-500";

            return (
              <div key={bucket.bucket} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    {bucket.bucket}
                  </span>
                  <span className="text-gray-900 font-semibold">
                    ₹{bucket.amount.toLocaleString()} ({bucket.count} invoices)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full ${color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Age Bucket
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoices
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % of Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.buckets.map((bucket) => {
              const percentOfTotal =
                data.totalOutstanding > 0
                  ? ((bucket.amount / data.totalOutstanding) * 100).toFixed(1)
                  : "0.0";

              return (
                <tr key={bucket.bucket}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {bucket.bucket}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ₹{bucket.amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {bucket.count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {percentOfTotal}%
                  </td>
                </tr>
              );
            })}
            <tr className="bg-gray-50 font-bold">
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                Total
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                ₹{data.totalOutstanding.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                {data.buckets.reduce((sum, b) => sum + b.count, 0)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                100%
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
