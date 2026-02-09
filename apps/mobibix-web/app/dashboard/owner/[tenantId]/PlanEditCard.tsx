"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function PlanEditCard() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/plans?tenantId=${tenantId}`);
        if (!res.ok) throw new Error("Failed to fetch plans");
        const data = await res.json();
        setPlans(data);
      } catch (err: any) {
        setError(err.message || "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, [tenantId]);

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-6">
      <h2 className="text-lg font-bold mb-2 text-teal-300">Edit Plans</h2>
      {loading && <div>Loading plans...</div>}
      {error && <div className="text-red-400">{error}</div>}
      {!loading && !error && plans.length === 0 && <div>No plans found.</div>}
      <ul className="space-y-2">
        {plans.map((plan) => {
          // Get cheapest billing cycle for display
          const cheapestCycle = plan.billingCycles?.reduce((min: any, cycle: any) =>
            cycle.price < min.price ? cycle : min
          , plan.billingCycles[0]);

          return (
            <li
              key={plan.id}
              className="bg-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center md:justify-between hover:bg-white/15 transition-colors gap-4"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <div className="font-bold text-white text-lg">{plan.displayName || plan.name}</div>
                  {plan.tagline && (
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded-full border border-teal-500/30">
                      {plan.tagline}
                    </span>
                  )}
                </div>
                
                {plan.description && (
                  <p className="text-sm text-gray-400 mt-1 line-clamp-1">{plan.description}</p>
                )}

                <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  <span>Code: <span className="text-gray-300">{plan.code}</span></span>
                  {cheapestCycle && (
                    <span>
                      Starting: <span className="text-teal-400 font-semibold">₹{(cheapestCycle.price / 100).toFixed(0)}</span> / {cheapestCycle.cycle.toLowerCase()}
                    </span>
                  )}
                  {plan.billingCycles?.length > 1 && (
                    <span className="text-gray-500 italic">({plan.billingCycles.length} plans available)</span>
                  )}
                </div>
              </div>
              <button className="px-5 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 shadow-lg shadow-teal-900/20 transition-all active:scale-95 whitespace-nowrap">
                Select Plan
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
