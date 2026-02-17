"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { ArrowRight, Building2, AlertCircle } from "lucide-react";
import {
  exchangeFirebaseToken,
  hasSessionHint,
  setAccessToken,
} from "@/services/auth.api";
import { createTenantWithToken } from "@/services/tenant.api";
import { useAuth } from "@/hooks/useAuth";

// Assumes user is authenticated and holds a backend JWT
export default function OnboardingPage() {
  const router = useRouter();
  const { logout, authUser, REMOVED_AUTH_PROVIDERUser } = useAuth();
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    // Check if user is authenticated; if not, redirect to signin
    if (!hasSessionHint()) {
      router.push("/signin");
    } else if (authUser?.tenantId) {
      // 🔒 User already has a tenant → redirect to dashboard
      console.log("ℹ️ User already has tenant, redirecting to dashboard...");
      router.push("/dashboard");
    } else {
      setCheckingAuth(false);
    }
  }, [authUser?.tenantId]);

  const handleSignOut = async () => {
    try {
      await logout();
      router.push("/signin");
      setError(null);
      setBusinessName("");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();

    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      if (!hasSessionHint()) {
        router.push("/signin");
        return;
      }

      if (!REMOVED_AUTH_PROVIDERUser) {
        setError(
          "Your session is invalid. Please sign out and sign in again to create a new account.",
        );
        return;
      }

      // Refresh backend session to avoid stale access token cookies.
      const exchange = await exchangeFirebaseToken(
        await REMOVED_AUTH_PROVIDERUser.getIdToken(),
      );

      const response = await createTenantWithToken(
        {
          name: businessName,
          tenantType: "MOBILE_SHOP",
        },
        exchange.accessToken,
      );

      // Full page reload to ensure auth context reinitializes with new tenant context
      window.location.href = "/dashboard";
      return;
    } catch (e: any) {
      console.error("Create tenant error:", e);

      // If user not found, suggest re-authentication
      if (e.message.includes("User not found")) {
        setError(
          "Your session is invalid. Please sign out and sign in again to create a new account.",
        );
        // Clear auth tokens so user is forced to re-authenticate
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("accessToken");
        setAccessToken(null);
      } else {
        setError(e.message || "Something went wrong");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      {checkingAuth ? (
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-center text-stone-400">
            Checking authentication...
          </p>
        </div>
      ) : (
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-teal-400" />
              <h1 className="text-xl font-semibold">Set up your business</h1>
            </div>
            <button
              onClick={handleSignOut}
              className="text-xs text-stone-400 hover:text-stone-200 transition"
            >
              Sign out
            </button>
          </div>

          <p className="mt-2 text-sm text-stone-400">
            Create your first business to start managing sales, service, and
            inventory.
          </p>

          <form onSubmit={handleCreateBusiness} className="mt-6 space-y-4">
            <div>
              <label className="mb-1 block text-sm text-stone-300">
                Business name
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Smart Tech Solutions"
                className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-sm text-white placeholder:text-stone-500 focus:border-teal-400 focus:outline-none"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-400">{error}</p>
                    <p className="mt-1 text-xs text-red-300">
                      Check the browser console for more details
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teal-500 px-4 py-2 text-sm font-medium text-black transition hover:bg-teal-400 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create business"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-stone-500">
            You can add shops, staff, and settings after setup.
          </p>
        </div>
      )}
    </div>
  );
}
