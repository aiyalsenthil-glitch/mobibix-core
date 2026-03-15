"use client";

import { ReceivablesAgingChart } from "@/components/reports/ReceivablesAgingChart";

export default function ReceivablesReportPage() {
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Receivables Aging Report
        </h1>
        <p className="mt-2 text-gray-600">
          Track customer payment aging and identify overdue accounts
        </p>
      </div>

      <ReceivablesAgingChart />
    </div>
  );
}
