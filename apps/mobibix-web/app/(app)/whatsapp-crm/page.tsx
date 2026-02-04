"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import WhatsAppCrmPromo from "./components/WhatsAppCrmPromo";
import WhatsAppCrmContactSupport from "./components/WhatsAppCrmContactSupport";
import WhatsAppCrmDashboard from "./components/WhatsAppCrmDashboard";

type CrmStatus = {
  hasSubscription: boolean;
  isEnabled: boolean;
  hasPhoneNumber: boolean;
};

export default function WhatsAppCrmPage() {
  const [status, setStatus] = useState<CrmStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const data = await apiFetch<CrmStatus>("/user/whatsapp-crm/status");
        setStatus(data);
      } catch (err: any) {
        setError(err.message || "Failed to load WhatsApp CRM status");
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

  // No subscription → Show promotion
  if (!status?.hasSubscription) {
    return <WhatsAppCrmPromo />;
  }

  // Has subscription but not enabled → Contact support
  if (!status.isEnabled) {
    return <WhatsAppCrmContactSupport />;
  }

  // Enabled → Load dashboard
  return <WhatsAppCrmDashboard hasPhoneNumber={status.hasPhoneNumber} />;
}
