"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Building2 } from "lucide-react";
import { getAccessToken } from "@/services/auth.api";

// Assumes user is authenticated and holds a backend JWT
export default function OnboardingPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateBusiness(e: React.FormEvent) {
    e.preventDefault();

    if (!businessName.trim()) {
      setError("Business name is required");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        router.push("/signin");
        return;
      }

      const apiBase =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";
      const res = await fetch(`${apiBase}/tenants`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: businessName,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create business");
      }

      // On success redirect to dashboard; backend should link tenant
      router.push("/dashboard");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-teal-400" />
          <h1 className="text-xl font-semibold">Set up your business</h1>
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

          {error && <p className="text-sm text-red-400">{error}</p>}

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
    </div>
  );
}
