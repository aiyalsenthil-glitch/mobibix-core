"use client";

import { useState, useEffect } from "react";
import { Loader } from "lucide-react";
import { getPayablesAging, AgingReport, AgingBucket } from "@/services/reports.api";

export default function PayablesAgingPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AgingReport | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getPayablesAging(false);
        setData(result);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(val / 100);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Payables Aging</h1>
        <p className="text-gray-600 mt-1">
          Track outstanding payments to suppliers by age
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader className="animate-spin text-blue-600" size={32} />
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-sm font-medium text-gray-500 mb-1">Total Outstanding Payables</p>
            <p className="text-3xl font-bold text-red-600">
              {formatCurrency(data.totalOutstanding)}
            </p>
          </div>

          {/* Aging Buckets Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data.buckets.map((bucket: AgingBucket) => (
              <div key={bucket.bucket} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900">{bucket.bucket}</h3>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {bucket.count} Bills
                  </span>
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {formatCurrency(bucket.amount)}
                </p>
              </div>
            ))}
          </div>

           <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
             <p className="text-sm text-orange-800">
               💡 <strong>Cash Flow Management:</strong> Prioritize payments to key suppliers to maintain good standing. 
             </p>
           </div>
        </div>
      ) : (
        <p className="text-center text-gray-500 py-12">Failed to load detailed report.</p>
      )}
    </div>
  );
}
