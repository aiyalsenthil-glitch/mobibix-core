"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Script from "next/script";
import { getSubscription, getAvailablePlans, upgradeSubscription, downgradeSubscription, checkDowngradeEligibility, toggleAutoRenew, type SubscriptionDetails, type Plan } from "@/services/tenant.api";
import { getLoyaltyConfig, LoyaltyConfig } from "@/services/loyalty.api";
import DowngradeBlockerModal from "./DowngradeBlockerModal";
import { Check, AlertCircle, Loader2, Zap, Shield, Crown, CreditCard, RefreshCw, Gift } from "lucide-react";
import { LoyaltySettings } from "@/components/loyalty/LoyaltySettings";
import { useShop } from "@/context/ShopContext";
import { useAuth } from "@/hooks/useAuth";
import { AccountDeletionDialog } from "@/components/settings/AccountDeletionDialog";

import { PaymentHistory } from "@/components/billing/PaymentHistory";

// Marketing features mapping
const PLAN_MARKETING_FEATURES: Record<string, string[]> = {
  "MobiBix Trial": [
    "1 Shop Limit",
    "Staff Management",
    "Basic Invoice Management",
    "Digital Inventory Catalog",
    "Limited Reports"
  ],
  "MobiBix Standard": [
    "Multiple Shops Support",
    "Complete Invoice Management",
    "Advanced Repair Tracking",
    "Purchase & Supplier Management",
    "Staff Management",
    "Real-time Inventory Sync",
    "Standard Business Reports",
    "GST/VAT Ready Invoicing"
  ],
  "MobiBix Pro": [
    "Everything in Standard",
    "WhatsApp CRM Automation",
    "Business Intelligence Analytics",
    "Custom Branded Invoices",
    "Priority 24/7 Support",
    "Bulk Data Export Tools"
  ],
  "Standard": [ // Fallback for plain names
    "Multiple Shops Support",
    "Complete Invoice Management",
    "Advanced Repair Tracking",
    "Purchase & Supplier Management",
    "Staff Management",
    "Real-time Inventory Sync",
    "Standard Business Reports",
    "GST/VAT Ready Invoicing"
  ]
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { selectedShopId } = useShop();
  const [activeTab, setActiveTab] = useState<"SUBSCRIPTION" | "BILLING" | "LOYALTY" | "LEGAL">("SUBSCRIPTION");
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [loyaltyConfig, setLoyaltyConfig] = useState<LoyaltyConfig | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null);
  const [autoRenewLoading, setAutoRenewLoading] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<"MONTHLY" | "QUARTERLY" | "YEARLY">("MONTHLY");
  const [billingType, setBillingType] = useState<"AUTOPAY" | "MANUAL">("AUTOPAY");
  const [paymentSuccessToast, setPaymentSuccessToast] = useState(false);

  // Downgrade Modal State
  const [downgradeModalOpen, setDowngradeModalOpen] = useState(false);
  const [downgradeBlockers, setDowngradeBlockers] = useState<string[]>([]);
  const [targetPlanForDowngrade, setTargetPlanForDowngrade] = useState<Plan | null>(null);
  const [deletionDialogOpen, setDeletionDialogOpen] = useState(false);

  const { authUser } = useAuth();
  // Fix: Comparison should be lowercase as useAuth normalizes the role
  const isOwner = authUser?.role === "owner" || authUser?.isSystemOwner;

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, plansData] = await Promise.all([
        getSubscription(),
        getAvailablePlans(),
      ]);
      setSubscription(subData.current);
      setPlans(plansData);
      
      // smart default: if current is manual and autoRenew is false, maybe default to MANUAL?
      // But we prefer AUTOPAY. Keep default AUTOPAY.
      if (subData.current.autoRenew) {
          setBillingType("AUTOPAY");
      }
    } catch (err: any) {
      console.error("Failed to load settings data", err);
      setError(err.message || "Failed to load subscription details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Show success banner if redirected back from manual payment link
    if (searchParams.get("payment") === "success") {
      setPaymentSuccessToast(true);
      router.replace("/settings", { scroll: false });
    }

    // Check for tab in URL
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "loyalty") {
      setActiveTab("LOYALTY");
    } else if (tab === "billing") {
      setActiveTab("BILLING");
    }
  }, []);

  useEffect(() => {
    const loadLoyalty = async () => {
      try {
        const config = await getLoyaltyConfig(selectedShopId);
        setLoyaltyConfig(config);
      } catch (err) {
        console.error("Failed to load loyalty config", err);
      }
    };
    loadLoyalty();
  }, [selectedShopId]);

  const handleAutoRenewToggle = async () => {
    if (!subscription) return;
    
    // Safety: ensure it's not a restricted trial if we still want that, 
    // but for your PRO Promo (which is status: ACTIVE), it should work.
    const enabling = !subscription.autoRenew;
    let message = "";

    if (enabling) {
        if (subscription.billingType === "AUTOPAY") {
            message = "Enable Auto-Renewal? Your saved card will be automatically charged at the end of the current cycle.";
        } else {
            message = "Enable Auto-Renewal? You will receive an email and a payment link 7 days before your plan expires to help you renew manually.";
        }
    } else {
        message = "Turn off Auto-Renewal? Your plan will not renew automatically and will expire at the end of the current cycle.";
    }

    if (!confirm(message)) return;

    try {
      setAutoRenewLoading(true);
      const newState = !subscription.autoRenew;
      const result = await toggleAutoRenew(newState);
      // Sync with backend result
      setSubscription(prev => prev ? { ...prev, autoRenew: result.autoRenew } : null);
    } catch (err: any) {
      alert("Failed to update auto-renewal settings: " + err.message);
    } finally {
      setAutoRenewLoading(false);
    }
  };

  const handleRazorpayPayment = (options: any) => {
      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any){
        setError(`Payment Failed: ${response.error.description}`);
      });
      rzp.open();
  };

  const handlePlanChange = async (plan: Plan) => {
    if (!subscription) return;

    // Fix: usage of 'level' instead of 'planLevel'
    // Also consider moving from Trial to ANY plan as an upgrade/activation
    const isUpgrade = plan.level > (subscription.level ?? 0) || subscription.isTrial;

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
        const action = billingType === "AUTOPAY" ? "Enable AutoPay" : "Pay Manually";
        if (!confirm(`Confirm upgrade to ${plan.displayName} (${selectedCycle})?\nAction: ${action}`)) {
            return;
        }
    }

    try {
      setProcessingPlanId(plan.id);
      setError(null);

      if (isUpgrade) {
        // Upgrade with Billing Type
        const response = await upgradeSubscription(plan.id, selectedCycle, billingType);
        
        if (response.paymentLink) {
            // Manual Flow
             window.location.href = response.paymentLink;
             return; // Redirecting
        } else if (response.REMOVED_PAYMENT_INFRASubscriptionId) {
            // AutoPay Flow
            const REMOVED_PAYMENT_INFRAKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
            if (!REMOVED_PAYMENT_INFRAKey) {
              console.error("NEXT_PUBLIC_RAZORPAY_KEY_ID is not configured");
              alert("Payment configuration error. Please contact support.");
              return;
            }
            const options = {
                key: REMOVED_PAYMENT_INFRAKey,
                subscription_id: response.REMOVED_PAYMENT_INFRASubscriptionId,
                name: "MobiBix SaaS",
                description: `${plan.displayName} Subscription`,
                handler: async function (response: any) {
                     // Success
                     alert("Subscription Authorization Successful! Activating plan...");
                     await loadData(); // Reload to see active status
                },
                prefill: {
                    name: "", // Can prefill if we have user data in context
                    email: "",
                    contact: ""
                },
                theme: {
                    color: "#4F46E5"
                }
            };
            handleRazorpayPayment(options);
        } else {
            alert(`Successfully upgraded to ${plan.displayName}!`);
            await loadData();
        }

      } else {
        // Fallback
        await downgradeSubscription(plan.id, selectedCycle); 
        alert(`Downgrade to ${plan.displayName} scheduled. Changes will apply at next renewal.`);
        await loadData();
      }

    } catch (err: any) {
      console.error('Plan change failed:', err);
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
      
      alert(`Downgrade to ${targetPlanForDowngrade.displayName} scheduled. Changes will apply at next renewal.`);

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
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
    <Script src="https://checkout.REMOVED_PAYMENT_INFRA.com/v1/checkout.js" strategy="lazyOnload" />
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-500">
            Manage your plan, billing history, and system configurations.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-stone-900 p-1 rounded-xl mb-8 w-fit border border-gray-200 dark:border-stone-800">
        <button
          onClick={() => setActiveTab("SUBSCRIPTION")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "SUBSCRIPTION"
              ? "bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-stone-300"
          }`}
        >
          Subscription Plan
        </button>
        <button
          onClick={() => setActiveTab("BILLING")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
            activeTab === "BILLING"
              ? "bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-stone-300"
          }`}
        >
          Payment History
        </button>
        <button
          onClick={() => setActiveTab("LOYALTY")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "LOYALTY"
              ? "bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-stone-300"
          }`}
        >
          <Gift size={16} /> Loyalty Rewards
        </button>
        <button
          onClick={() => setActiveTab("LEGAL")}
          className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
            activeTab === "LEGAL"
              ? "bg-white dark:bg-stone-800 text-teal-600 dark:text-teal-400 shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:hover:text-stone-300"
          }`}
        >
          <Shield size={16} /> Legal & Privacy
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {activeTab === "BILLING" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <PaymentHistory />
        </div>
      ) : activeTab === "LOYALTY" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <LoyaltySettings initialConfig={loyaltyConfig} />
        </div>
      ) : activeTab === "LEGAL" ? (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl p-8 shadow-sm">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2 uppercase tracking-tight">
              <Shield className="text-teal-500" /> Compliance & Legal Documents
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <a href="/terms" target="_blank" className="p-6 rounded-xl border border-gray-100 dark:border-stone-800 hover:bg-gray-50 dark:hover:bg-stone-800 transition-all group">
                <h3 className="font-bold mb-2 group-hover:text-teal-500 transition-colors">Terms of Service</h3>
                <p className="text-xs text-gray-500">View our legally binding platform agreement.</p>
              </a>
              <a href="/privacy" target="_blank" className="p-6 rounded-xl border border-gray-100 dark:border-stone-800 hover:bg-gray-50 dark:hover:bg-stone-800 transition-all group">
                <h3 className="font-bold mb-2 group-hover:text-teal-500 transition-colors">Privacy Policy</h3>
                <p className="text-xs text-gray-500">Learn how we process and protect your data.</p>
              </a>
              <a href="/data-deletion" target="_blank" className="p-6 rounded-xl border border-gray-100 dark:border-stone-800 hover:bg-gray-50 dark:hover:bg-stone-800 transition-all group">
                <h3 className="font-bold mb-2 group-hover:text-teal-500 transition-colors">Data Deletion</h3>
                <p className="text-xs text-gray-500">Procedures for account and record removal.</p>
              </a>
            </div>

            <div className="mt-12 pt-8 border-t border-gray-100 dark:border-stone-800">
              <h3 className="text-sm font-black uppercase tracking-widest text-red-500 mb-4">Danger Zone</h3>
              <div className="p-6 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 flex flex-col md:flex-row justify-between items-center gap-6">
                 <div>
                    <h4 className="font-bold text-red-700 dark:text-red-400">Permanently Delete Account</h4>
                    <p className="text-xs text-red-600/70 max-w-md">Once deleted, your shop records, invoices, and customer data cannot be recovered. Active subscriptions will be immediately cancelled.</p>
                 </div>
                 {isOwner ? (
                   <button 
                    onClick={() => setDeletionDialogOpen(true)}
                    className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-all shadow-md active:scale-95"
                   >
                     Request Deletion
                   </button>
                 ) : (
                   <p className="text-xs text-gray-500 italic">Only the account owner can request deletion.</p>
                 )}
              </div>
            </div>
          </div>
          <AccountDeletionDialog 
            isOpen={deletionDialogOpen} 
            onClose={() => setDeletionDialogOpen(false)} 
          />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* Payment success banner (returned from manual payment link) */}
      {paymentSuccessToast && (
        <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
          <Check className="w-4 h-4 shrink-0" />
          <span>Payment successful! Your subscription has been activated.</span>
          <button onClick={() => setPaymentSuccessToast(false)} className="ml-auto text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Current Subscription Card */}
      {subscription && (
        <div className="bg-white dark:bg-stone-900 border border-gray-200 dark:border-stone-800 rounded-2xl p-6 mb-10 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-2 h-full bg-indigo-500"></div>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-indigo-600 tracking-wider uppercase">Current Plan</span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    subscription.subscriptionStatus === "ACTIVE"
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                  }`}
                >
                  {subscription.subscriptionStatus}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase ${
                    subscription.billingType === "AUTOPAY"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {subscription.billingType === "AUTOPAY" ? "Auto-Debit" : "Manual Renewal"}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {subscription.plan}
              </h2>
              <p className="text-gray-500 text-sm mt-1">
                {subscription.autoRenew
                  ? `Renews in ${subscription.daysLeft} days`
                  : `Expires in ${subscription.daysLeft} days`}
              </p>
              {subscription.billingType === "AUTOPAY" && subscription.autopayStatus === "HALTED" && (
                <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>
                    Auto-debit failed — your bank declined the charge.{" "}
                    <button
                      onClick={() => router.push("/settings?tab=billing")}
                      className="underline font-medium"
                    >
                      Update payment method
                    </button>
                  </span>
                </div>
              )}
            </div>
            
             {/* Auto Renew Toggle */}
             <div className="flex items-center gap-3 bg-gray-50 dark:bg-stone-800 px-4 py-2 rounded-lg border border-gray-100 dark:border-stone-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto Renewal</span>
                <button
                    onClick={handleAutoRenewToggle}
                    disabled={autoRenewLoading}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                        subscription.autoRenew ? "bg-indigo-600" : "bg-gray-200"
                    }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            subscription.autoRenew ? "translate-x-6" : "translate-x-1"
                        }`}
                    />
                </button>
             </div>
          </div>
          
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-stone-800 grid grid-cols-2 sm:grid-cols-4 gap-4">
               <div>
                  <div className="text-xs text-gray-500 uppercase">Shops</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{subscription.maxShops === null ? "Unlimited" : subscription.maxShops}</div>
               </div>
               <div>
                  <div className="text-xs text-gray-500 uppercase">Staff</div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{subscription.maxStaff === null ? "Unlimited" : subscription.maxStaff}</div>
               </div>
               <div>
                  <div className="text-xs text-gray-500 uppercase">Members</div>
                   <div className="font-semibold text-gray-900 dark:text-gray-100">{subscription.memberLimit === null ? "Unlimited" : subscription.memberLimit}</div>
               </div>
           </div>
        </div>
      )}

      {/* Available Plans Selector */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Upgrade your plan
        </h3>
        
        {/* Cycle Toggle */}
        <div className="inline-flex flex-col sm:flex-row items-center gap-4 bg-gray-50 dark:bg-stone-900/50 p-2 rounded-2xl border border-gray-200 dark:border-stone-800">
            {/* Payment Mode */}
             <div className="flex bg-white dark:bg-stone-900 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-stone-800">
                <button
                    onClick={() => setBillingType("AUTOPAY")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                        billingType === "AUTOPAY"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <RefreshCw size={16} /> AutoPay
                </button>
                <button
                    onClick={() => setBillingType("MANUAL")}
                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                        billingType === "MANUAL"
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    <CreditCard size={16} /> Pay Manually
                </button>
            </div>

            <div className="w-px h-8 bg-gray-300 dark:bg-stone-700 hidden sm:block"></div>

            {/* Billing Cycle */}
            <div className="flex bg-white dark:bg-stone-900 rounded-xl p-1 shadow-sm border border-gray-200 dark:border-stone-800">
                <button
                    onClick={() => setSelectedCycle("MONTHLY")}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedCycle === "MONTHLY"
                        ? "bg-gray-900 dark:bg-stone-700 text-white shadow-md"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    Monthly
                </button>
                <button
                    onClick={() => setSelectedCycle("QUARTERLY")}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedCycle === "QUARTERLY"
                        ? "bg-gray-900 dark:bg-stone-700 text-white shadow-md"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    Quarterly <span className="text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full">-5%</span>
                </button>
                <button
                    onClick={() => setSelectedCycle("YEARLY")}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    selectedCycle === "YEARLY"
                        ? "bg-gray-900 dark:bg-stone-700 text-white shadow-md"
                        : "text-gray-500 hover:text-gray-900"
                    }`}
                >
                    Yearly <span className="text-[10px] bg-green-500 text-white px-1.5 py-0.5 rounded-full">-15%</span>
                </button>
            </div>
        </div>
        
        {/* Caption */}
        <p className="text-sm text-gray-500 mt-3">
            {billingType === "AUTOPAY" 
                ? "Auto-renewal enabled. Cancel anytime." 
                : "Manual payment required for each renewal."}
        </p>

      </div>

      <div className="grid md:grid-cols-3 gap-8 items-start">
        {plans.map((plan) => {
          const isCurrent = plan.isCurrent;
          const isUpgrade = plan.canUpgrade; // Note: logic in handlePlanChange overrides this visually if we want
          const cycleData = plan.billingCycles.find(c => c.cycle === selectedCycle) 
            || plan.billingCycles[0];

          // Determine Icon
          let PlanIcon = Shield;
          if (plan.name.includes("Pro")) PlanIcon = Crown;
          if (plan.name.includes("Trial")) PlanIcon = Zap;

          return (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-stone-900 rounded-2xl border transition-all duration-300 flex flex-col h-full ${
                isCurrent
                  ? "border-indigo-500 ring-2 ring-indigo-500 shadow-lg scale-105 z-10"
                  : "border-gray-200 dark:border-stone-800 hover:border-indigo-300 hover:shadow-xl"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide">
                  Current Plan
                </div>
              )}

              <div className="p-8 pb-4">
                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-4 text-indigo-600 dark:text-indigo-400">
                    <PlanIcon size={24} />
                </div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white">{plan.displayName}</h4>
                <p className="text-gray-500 text-sm mt-2 min-h-[40px]">{plan.description || plan.tagline || "Perfect for growing businesses"}</p>
                
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                    ₹{(cycleData.price / 100).toFixed(0)}
                  </span>
                  <span className="text-gray-500 font-medium">/{selectedCycle === "YEARLY" ? "yr" : "mo"}</span>
                </div>
                {selectedCycle === "YEARLY" && (
                    <p className="text-xs text-green-600 font-medium mt-1">
                        Billed annually (Save 15%)
                    </p>
                )}
              </div>

              <div className="p-8 pt-4 flex-grow border-t border-gray-100 dark:border-stone-800 mt-4">
                <ul className="space-y-3">
                     {/* Prefer Marketing Features, else fallback to raw caps */}
                     {(PLAN_MARKETING_FEATURES[plan.displayName] || plan.features || []).map((f, i) => (
                         <li key={i} className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300">
                             <Check size={18} className="text-green-500 mt-0.5 flex-shrink-0" />
                             <span>{f}</span>
                         </li>
                     ))}
                </ul>
              </div>

              <div className="p-8 pt-0">
                <button
                    onClick={() => handlePlanChange(plan)}
                    disabled={isCurrent || processingPlanId !== null}
                    className={`w-full py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 ${
                    isCurrent
                        ? "bg-gray-100 dark:bg-stone-800 text-gray-400 cursor-not-allowed"
                        : plan.level > (subscription?.level ?? 0)
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg"
                        : "bg-white dark:bg-stone-900 border-2 border-gray-200 dark:border-stone-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-stone-800"
                    }`}
                >
                    {processingPlanId === plan.id ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin" /> Processing...
                        </div>
                    ) : isCurrent ? (
                        "Current Plan"
                    ) : plan.level > (subscription?.level ?? 0) ? (
                        billingType === "AUTOPAY" ? (
                            <>Subscribe <RefreshCw size={16} /></>
                        ) : (
                            <>Pay Now <CreditCard size={16} /></>
                        )
                    ) : (
                        "Downgrade"
                    )}
                </button>
                
                {/* Temporary Bypass Button */}

              </div>
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
      )}
    </div>
    </>
  );
}
