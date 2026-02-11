"use client";

import { useParams } from "next/navigation";
import { CrmDashboardWidgets } from "@/components/crm";

import { CustomerTabs } from "@/components/crm/CustomerTabs";

export default function CrmDashboardPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;

  return (
    <div className="space-y-6">
      <CustomerTabs />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Customer relationships, follow-ups, and metrics
        </p>
      </div>

      {/* CRM Dashboard Widgets */}
      <CrmDashboardWidgets />
    </div>
  );
}
