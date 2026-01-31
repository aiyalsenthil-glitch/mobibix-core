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
        {plans.map((plan) => (
          <li
            key={plan.id}
            className="bg-white/10 rounded p-3 flex flex-col md:flex-row md:items-center md:justify-between"
          >
            <div>
              <div className="font-semibold text-white">{plan.name}</div>
              <div className="text-xs text-gray-400">
                Code: {plan.code} | Price: ₹{plan.price} | Duration:{" "}
                {plan.durationDays} days
              </div>
            </div>
            <button className="mt-2 md:mt-0 px-3 py-1 rounded bg-teal-600 text-white text-xs hover:bg-teal-700">
              Edit
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
