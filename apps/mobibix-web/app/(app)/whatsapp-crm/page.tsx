"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { authenticatedFetch } from "@/services/auth.api";
import WhatsAppCrmPromo from "./components/WhatsAppCrmPromo";
import WhatsAppCrmContactSupport from "./components/WhatsAppCrmContactSupport";
import WhatsAppCrmDashboard from "./components/WhatsAppCrmDashboard";

type CrmStatus = {
  hasSubscription: boolean;
  isEnabled: boolean;
  hasPhoneNumber: boolean;
  moduleType?: string; // ✅ Added
  whatsappAllowed?: boolean; // Added for plan checking
};

export default function WhatsAppCrmPage() {
  const searchParams = useSearchParams();
  const showPromo = searchParams.get("promo") === "true";
  const [status, setStatus] = useState<CrmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "success") {
       // Optional: Show a toast or message
       console.log("WhatsApp connected successfully!");
    } else if (statusParam === "error") {
       setError(searchParams.get("message") || "Connection failed");
    }

    async function fetchStatus() {
      try {
        const response = await authenticatedFetch("/user/whatsapp-crm/check-status");
        if (!response.ok) {
            throw new Error("Failed to load status");
        }
        const data: CrmStatus = await response.json();
        
        // Fetch subscription if not explicitly returned in check-status (or if we need more detail)
        // For now, let's assume check-status returns what we need, OR we add a secondary call.
        // Actually, the simplest way is to fetch usage summary which includes whatsapp limits/allowed.
        // But `check-status` might not have it. Let's look at `CrmStatus`.
        // If I can't change the backend easily right now avoiding backend changes if possible.
        // Wait, `getUsageSummary` has `whatsapp` limits.
        // Let's use `getSubscription` or `getRequest` if possible.
        // I'll update the type to include `whatsappAllowed` which we'll derive or fetch.
        
        // Temporarily, I will fetch subscription details to be sure.
        const subscriptionRes = await authenticatedFetch("/billing/subscription/current");
        let whatsappAllowed = false;
        if (subscriptionRes.ok) {
           const subData = await subscriptionRes.json();
           whatsappAllowed = subData.whatsappAllowed ?? false;
        }

        setStatus({ ...data, whatsappAllowed });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load WhatsApp CRM status";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading WhatsApp CRM...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // No subscription OR forced via query param → Show promotion
  // EXCEPTION: Allow MOBILE_SHOP (Retail Demo) to bypass this check
  // ALSO: If whatsappAllowed is true (from main plan), allow access
  const hasAccess = status?.hasSubscription || status?.whatsappAllowed;
  
  if (showPromo || (status && !hasAccess && status.moduleType !== 'MOBILE_SHOP')) {
    return <WhatsAppCrmPromo />;
  }

  if (!status) return null;

  if (!status) return null;

  // Has subscription but not enabled → Contact support
  if (!status.isEnabled) {
    return <WhatsAppCrmContactSupport />;
  }

  // Enabled → Load dashboard
  return <WhatsAppCrmDashboard 
    hasPhoneNumber={status.hasPhoneNumber} 
    moduleType={status.moduleType} 
    whatsappAllowed={status.whatsappAllowed} 
  />;
}
