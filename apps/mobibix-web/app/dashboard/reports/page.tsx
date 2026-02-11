"use client";

import { GstrReportViewer } from "@/components/invoices/GstrReportViewer";

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-6xl">
        <GstrReportViewer />
      </div>
    </div>
  );
}
