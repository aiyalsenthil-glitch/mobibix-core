"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getSubscription,
  getAvailablePlans,
  upgradeSubscription,
  downgradeSubscription,
  checkDowngradeEligibility,
  type SubscriptionDetails,
  type Plan,
} from "@/services/tenant.api";
import DowngradeBlockerModal from "./DowngradeBlockerModal";

export default function SettingsPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(
    null,
  );
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");

  // Downgrade Modal State
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [downgradeBlockers, setDowngradeBlockers] = useState<string[]>([]);
  const [targetPlanForDowngrade, setTargetPlanForDowngrade] = useState<Plan | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, plansData] = await Promise.all([
        getSubscription(),
        getAvailablePlans(),
      ]);
      setSubscription(subData.current);
      // Filter plans by module if needed, but backend should handle it
      setPlans(plansData);
    } catch (err: any) {
      console.error("Failed to load settings data", err);
      setError(err.message || "Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePlanChange = async (plan: Plan) => {
    if (!subscription) return;

    const isUpgrade = plan.level > subscription.planLevel;

    if (!isUpgrade) {
      // 1. Run Pre-check
      try {
        setProcessingPlanId(plan.id);
        const eligibility = await checkDowngradeEligibility(plan.id);
        setProcessingPlanId(null);

        // 2. Open Modal with results
        setTargetPlanForDowngrade(plan);
        setDowngradeBlockers(eligibility.blockers);
        setDowngradeModalOpen(true);
        return; // Stop here, wait for modal confirmation
      } catch (err: any) {
        setProcessingPlanId(null);
        setError("Failed to check downgrade eligibility. Please try again.");
        return;
      }
    } else {
        if (!confirm(`Confirm upgrade to ${plan.name}? You will be charged immediately.`)) {
            return;
        }
    }

    try {
      setProcessingPlanId(plan.id);
      setError(null);

      if (isUpgrade) {
        await upgradeSubscription(plan.id, selectedCycle);
        alert(`Successfully upgraded to ${plan.name}!`);
      } else {
        // Should not happen here for downgrade, handled in confirmDowngrade
        // But keeping as fallback if flow changes
        await downgradeSubscription(plan.id, selectedCycle); 
        alert(
          `Downgrade to ${plan.name} scheduled. Changes will apply at next renewal.`,
        );
      }

      await loadData();
    } catch (err: any) {
      setError(err.message || "Plan change failed");
    } finally {
      setProcessingPlanId(null);
    }
  };

  const confirmDowngrade = async () => {
    if (!targetPlanForDowngrade) return;

    try {
      setDowngradeModalOpen(false); // Close modal
      setProcessingPlanId(targetPlanForDowngrade.id);
      setError(null);

      await downgradeSubscription(targetPlanForDowngrade.id, selectedCycle);
      
      alert(
        `Downgrade to ${targetPlanForDowngrade.name} scheduled. Changes will apply at next renewal.`,
      );

      await loadData();
    } catch (err: any) {
      setError(err.message || "Plan change failed");
    } finally {
        setProcessingPlanId(null);
        setTargetPlanForDowngrade(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-stone-400 animate-pulse">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings & Billing
          </h1>
          <p className="text-stone-500">
            Manage your subscription and billing details.
          </p>
        </div>

        {/* Cycle Selector */}
        <div className="bg-stone-100 dark:bg-stone-800 p-1 rounded-xl flex items-center w-fit">
          <button
            onClick={() => setSelectedCycle("MONTHLY")}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${
              selectedCycle === "MONTHLY"
                ? "bg-white dark:bg-stone-700 text-teal-600 dark:text-teal-400 shadow-sm"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setSelectedCycle("YEARLY")}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all flex items-center gap-2 ${
              selectedCycle === "YEARLY"
                ? "bg-white dark:bg-stone-700 text-teal-600 dark:text-teal-400 shadow-sm"
                : "text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            Yearly
            <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded text-[10px]">
              -15%
            </span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-600 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Current Subscription Card */}
      {subscription && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl p-6 mb-10 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Current Plan: {subscription.plan}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider ${
                    subscription.subscriptionStatus === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {subscription.subscriptionStatus}
                </span>
              </div>
              <p className="text-stone-500 text-sm">
                {subscription.isTrial
                  ? `Trial ends in ${subscription.daysLeft} days`
                  : `Renews in ${subscription.daysLeft} days`}
              </p>
            </div>
            
             {/* Usage Stats (Mini) */}
              <div className="flex gap-6 text-sm">
                <div>
                    <span className="block text-stone-500 text-xs uppercase">Shops</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                        {subscription.maxShops === null ? "Unlimited" : subscription.maxShops}
                    </span>
                 </div>
                 <div>
                    <span className="block text-stone-500 text-xs uppercase">Staff</span>
                     <span className="font-semibold text-gray-900 dark:text-white">
                        {subscription.maxStaff === null ? "Unlimited" : subscription.maxStaff}
                    </span>
                 </div>
              </div>
          </div>
        </div>
      )}

      {/* Available Plans */}
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Available Plans
      </h3>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.isCurrent;
          const isUpgrade = plan.canUpgrade;
          const isDowngrade = plan.canDowngrade;

          // Get price for selected cycle
          const cycleData = plan.billingCycles.find(c => c.cycle === selectedCycle) 
            || plan.billingCycles[0];

          return (
            <div
              key={plan.id}
              className={`relative border rounded-xl p-6 flex flex-col transition-all ${
                isCurrent
                  ? "border-teal-500 bg-teal-50/5 ring-1 ring-teal-500"
                  : "border-stone-200 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-700"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-teal-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-bl-lg rounded-tr-lg">
                  Current
                </div>
              )}

              <div className="mb-4">
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">
                  {plan.displayName}
                </h4>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    ₹{(cycleData.price / 100).toFixed(0)}
                  </span>
                  <span className="text-stone-500 text-sm">/{cycleData.cycle.toLowerCase()}</span>
                </div>
                {selectedCycle === "YEARLY" && (
                    <p className="text-[10px] text-stone-500 mt-1">
                        Billed ₹{((cycleData.price * 12) / 100).toFixed(0)} annually
                    </p>
                )}
              </div>

              <div className="flex-grow space-y-3 mb-6">
                <ul className="text-sm text-stone-600 dark:text-stone-300 space-y-2">
                     {plan.features?.map((f, i) => (
                         <li key={i} className="flex items-center gap-2">
                             <span className="text-teal-500 font-bold text-base leading-none">✓</span> {f}
                         </li>
                     ))}
                </ul>
              </div>

              <button
                onClick={() => handlePlanChange(plan)}
                disabled={isCurrent || processingPlanId !== null}
                className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all ${
                  isCurrent
                    ? "bg-stone-100 dark:bg-stone-800 text-stone-400 cursor-default"
                    : isUpgrade
                      ? "bg-teal-600 hover:bg-teal-700 text-white shadow-md hover:shadow-lg"
                      : "border border-stone-300 text-stone-600 hover:bg-stone-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                }`}
              >
                {processingPlanId === plan.id ? (
                  <span className="animate-pulse">Processing...</span>
                ) : isCurrent ? (
                  "Current Plan"
                ) : isUpgrade ? (
                  "Upgrade Plan"
                ) : (
                  "Downgrade"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <DowngradeBlockerModal 
        isOpen={downgradeModalOpen}
        onClose={() => {
            setDowngradeModalOpen(false);
            setTargetPlanForDowngrade(null);
        }}
        onConfirm={confirmDowngrade}
        blockers={downgradeBlockers}
        targetPlanName={targetPlanForDowngrade?.displayName || "Selected Plan"}
      />
    </div>
  );
}
