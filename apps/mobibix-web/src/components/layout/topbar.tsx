"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export function Topbar() {
  const { authUser, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace("/signin");
  };

  return (
    <header className="fixed left-60 right-0 top-0 h-16 bg-stone-900 border-b border-white/10 flex items-center justify-between px-6 z-10">
      {/* Business/Tenant Name */}
      <div>
        <p className="text-sm text-stone-400">Business</p>
        <p className="text-lg font-semibold text-white">
          {authUser?.name || "Shop Name"}
        </p>
      </div>

      {/* User Info + Logout */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm text-white">{authUser?.email || "User"}</p>
          <p className="text-xs text-stone-400 capitalize">
            {authUser?.role || "member"}
          </p>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 text-sm bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/20 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
