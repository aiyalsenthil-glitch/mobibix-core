"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function OwnerDashboard() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const { authUser, isAuthenticated, isLoading, logout } = useAuth();
  const [shopId, setShopId] = useState<string>("");

  const apiBase = useMemo(
    () => process.env.NEXT_PUBLIC_API_URL ?? "http://localhost_REPLACED:3000/api",
    [],
  );

  const ownerDashboardUrl = useMemo(() => {
    const base = `${apiBase}/mobileshop/dashboard/owner`;
    return shopId ? `${base}?shopId=${encodeURIComponent(shopId)}` : base;
  }, [apiBase, shopId]);

  const stockSummaryUrl = useMemo(() => {
    if (!shopId) return `${apiBase}/mobileshop/stock/summary?shopId=...`;
    return `${apiBase}/mobileshop/stock/summary?shopId=${encodeURIComponent(shopId)}`;
  }, [apiBase, shopId]);

  const kpiUrl = useMemo(() => {
    if (!shopId) return `${apiBase}/mobileshop/stock/kpi/overview?shopId=...`;
    return `${apiBase}/mobileshop/stock/kpi/overview?shopId=${encodeURIComponent(shopId)}&period=MONTH`;
  }, [apiBase, shopId]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (authUser?.role !== "owner" || authUser?.tenantId !== tenantId) {
      router.replace("/unauthorized");
    }
  }, [authUser, isAuthenticated, isLoading, router, tenantId]);

  if (!authUser || authUser.role !== "owner") {
    return <div className="p-6 text-white">Loading owner dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-blue-300">Tenant</p>
            <h1 className="text-3xl font-bold">Owner Dashboard</h1>
            <p className="text-sm text-gray-400">Tenant ID: {tenantId}</p>
          </div>
          <button
            onClick={logout}
            className="self-start md:self-auto rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white hover:border-blue-400 transition"
          >
            Logout
          </button>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">Mobile Shop</p>
              <h2 className="text-xl font-semibold">API quick links</h2>
              <p className="text-xs text-gray-500">
                Provide a shopId to hit owner/stock endpoints (uses JWT auth).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={shopId}
                onChange={(e) => setShopId(e.target.value)}
                placeholder="Shop ID"
                className="bg-white/10 border border-white/20 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <LinkRow
              label="Owner dashboard"
              description="GET /mobileshop/dashboard/owner?shopId"
              href={ownerDashboardUrl}
            />
            <LinkRow
              label="Staff dashboard"
              description="GET /mobileshop/dashboard/staff"
              href={`${apiBase}/mobileshop/dashboard/staff`}
            />
            <LinkRow
              label="Shops list"
              description="GET /mobileshop/shops"
              href={`${apiBase}/mobileshop/shops`}
            />
            <LinkRow
              label="Stock summary"
              description="GET /mobileshop/stock/summary?shopId"
              href={stockSummaryUrl}
            />
            <LinkRow
              label="Stock KPI overview"
              description="GET /mobileshop/stock/kpi/overview?shopId"
              href={kpiUrl}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function LinkRow({
  label,
  description,
  href,
}: {
  label: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="block bg-white/5 border border-white/10 rounded-lg px-4 py-3 hover:border-blue-400 transition-colors"
    >
      <div className="flex justify-between items-center gap-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
        <span className="text-xs text-blue-300">Open</span>
      </div>
      <p className="text-[11px] text-gray-500 break-all mt-2">{href}</p>
    </a>
  );
}
