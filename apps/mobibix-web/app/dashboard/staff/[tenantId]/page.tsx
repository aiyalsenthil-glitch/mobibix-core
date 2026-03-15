"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function StaffDashboard() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const router = useRouter();
  const { authUser, isAuthenticated, isLoading, logout } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.replace("/auth");
      return;
    }
    if (authUser?.role !== "staff" || authUser?.tenantId !== tenantId) {
      router.replace("/unauthorized");
    }
  }, [authUser, isAuthenticated, isLoading, router, tenantId]);

  if (!authUser || authUser.role !== "staff") {
    return <div className="p-6 text-white">Loading staff dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-cyan-300">Tenant</p>
            <h1 className="text-3xl font-bold">Staff Dashboard</h1>
            <p className="text-sm text-gray-400">Tenant ID: {tenantId}</p>
          </div>
          <button
            onClick={logout}
            className="self-start md:self-auto rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white hover:border-lime-300 transition"
          >
            Logout
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400">Today&apos;s Sessions</p>
            <p className="text-2xl font-semibold">--</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-sm text-gray-400">Members Checked In</p>
            <p className="text-2xl font-semibold">--</p>
          </div>
        </div>
      </div>
    </div>
  );
}
