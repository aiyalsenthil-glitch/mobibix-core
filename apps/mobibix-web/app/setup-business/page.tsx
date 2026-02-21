"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, Loader2 } from "lucide-react";

export default function SetupBusinessPage() {
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
      // Even if API logout fails, force clear and redirect
      window.location.href = "/auth";
    } finally {
      setIsLoggingOut(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-8">
      <div className="text-center space-y-4 max-w-xl">
        <h2 className="text-emerald-500 font-medium">Setup required</h2>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Finish setting up your business
        </h1>
        <p className="text-zinc-400 text-lg">
          Your account is authenticated but not linked to a tenant yet. Complete the
          business setup to continue.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
          <Link
            href="/auth?intendedMode=signin"
            className="w-full sm:w-auto px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-xl transition-all"
          >
            Switch account
          </Link>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors px-4 py-2 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <LogOut className="w-4 h-4" />
            )}
            Logout
          </button>
          <span className="text-gray-500">Coming soon</span>
        </div>
      </div>
    </div>
  );
}
