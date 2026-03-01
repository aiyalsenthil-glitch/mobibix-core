"use client";

import { useEffect, useState } from "react";
import { getCrmDashboard, type CrmDashboardMetrics } from "@/services/crm.api";
import { useAuth } from "@/hooks/useAuth";
import { usePermission } from "@/hooks/usePermission";

interface CrmDashboardWidgetsProps {
  shopId?: string;
  preset?: string;
}

export function CrmDashboardWidgets({
  shopId,
  preset = "LAST_30_DAYS",
}: CrmDashboardWidgetsProps) {
  const { authUser } = useAuth();
  const { hasPermission } = usePermission();
  const [metrics, setMetrics] = useState<CrmDashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboard();
  }, [shopId, preset]);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      const data = await getCrmDashboard(preset, shopId);
      setMetrics(data);
    } catch (err: unknown) {
      setError((err as any)?.message || "Failed to load CRM dashboard");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-xl p-6 animate-pulse"
          >
            <div className="h-4 bg-white/10 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-white/10 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
        <p className="text-red-400 text-sm">⚠️ {error}</p>
        <button
          onClick={loadDashboard}
          className="mt-3 text-sm text-teal-400 hover:underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">CRM Dashboard</h2>
        <button
          onClick={loadDashboard}
          className="text-sm text-teal-400 hover:underline"
        >
          Refresh
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Customers */}
        <MetricCard
          title="Total Customers"
          value={metrics.customers?.total || 0}
          subtitle={`${metrics.customers?.new30Days || 0} new (30 days)`}
          icon="👥"
        />

        {/* Follow-ups Due */}
        <MetricCard
          title="Follow-ups Due"
          value={metrics.followUps?.dueToday || 0}
          subtitle={
            (metrics.followUps?.overdue || 0) > 0
              ? `⚠️ ${metrics.followUps?.overdue} overdue`
              : `${metrics.followUps?.pending || 0} pending`
          }
          icon="📋"
          alert={(metrics.followUps?.overdue || 0) > 0}
        />

        {/* Outstanding Amount */}
        {hasPermission("report.view_financials") && (
          <MetricCard
            title="Outstanding Amount"
            value={`₹${(metrics.financials?.outstandingAmount || 0).toLocaleString()}`}
            subtitle="Credit invoices"
            icon="💰"
          />
        )}

        {/* Loyalty Points */}
        <MetricCard
          title="Loyalty Points"
          value={metrics.loyalty?.totalPointsIssued || 0}
          subtitle={`${metrics.loyalty?.customersWithPoints || 0} customers`}
          icon="⭐"
        />

        {/* WhatsApp Success */}
        <MetricCard
          title="WhatsApp Success"
          value={`${(metrics.whatsapp?.deliveryRate || 0).toFixed(1)}%`}
          subtitle={`${metrics.whatsapp?.messagesDelivered || 0}/${metrics.whatsapp?.messagesSent || 0} delivered`}
          icon="💬"
        />

        {/* Top Customers */}
        {hasPermission("report.view_financials") && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏆</span>
              <h3 className="font-semibold">Top Customers</h3>
            </div>
            <div className="space-y-2">
              {(metrics.financials?.topCustomers || []).slice(0, 3).map((customer) => (
                <div
                  key={customer.customerId}
                  className="flex justify-between items-center text-sm"
                >
                  <span className="text-gray-300 truncate">
                    {customer.customerName}
                  </span>
                  <span className="text-teal-400 font-medium">
                    ₹{customer.totalAmount.toLocaleString()}
                  </span>
                </div>
              ))}
              {!(metrics.financials?.topCustomers?.length) && (
                <p className="text-sm text-gray-500">No data yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  alert?: boolean;
}

function MetricCard({ title, value, subtitle, icon, alert }: MetricCardProps) {
  return (
    <div
      className={`bg-white/5 border rounded-xl p-6 transition-colors ${
        alert
          ? "border-red-500/30 bg-red-500/5"
          : "border-white/10 hover:border-teal-400/30"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{icon}</span>
        <h3 className="text-sm text-gray-400">{title}</h3>
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      <p className={`text-xs ${alert ? "text-red-400" : "text-gray-500"}`}>
        {subtitle}
      </p>
    </div>
  );
}
