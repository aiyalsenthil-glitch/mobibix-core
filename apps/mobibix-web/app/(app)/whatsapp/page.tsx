"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createWhatsAppCampaign,
  getWhatsAppDashboard,
  getWhatsAppLogs,
  scheduleWhatsAppCampaign,
  sendWhatsAppMessage,
  WhatsAppDashboard,
  WhatsAppLog,
} from "@/services/whatsapp.api";
import { authenticatedFetch } from "@/services/auth.api";
import WhatsAppCrmPromo from "../whatsapp-crm/components/WhatsAppCrmPromo";
import WhatsAppCrmContactSupport from "../whatsapp-crm/components/WhatsAppCrmContactSupport";
import WhatsAppCrmDashboard from "../whatsapp-crm/components/WhatsAppCrmDashboard";
import WhatsAppRetailInbox from "../whatsapp-crm/components/WhatsAppRetailInbox";
import WhatsAppDashboardView from "./components/WhatsAppDashboardView";
import { NumberSelector } from "./components/NumberSelector";
import { useAuth } from "@/hooks/useAuth";
import {
  WhatsAppNumberProvider,
  useWhatsAppNumber,
} from "@/context/WhatsAppNumberContext";

interface CrmStatus {
  hasSubscription: boolean;
  isEnabled: boolean;
  hasPhoneNumber: boolean;
  phoneNumber?: string | null; // ✅ Added
  moduleType?: string;
  whatsappAllowed?: boolean;
}

export default function WhatsAppPage() {
  const { authUser } = useAuth();

  return (
    <WhatsAppNumberProvider tenantId={authUser?.tenantId}>
      <WhatsAppPageContent />
    </WhatsAppNumberProvider>
  );
}

function WhatsAppPageContent() {
  const searchParams = useSearchParams();
  const showPromo = searchParams.get("promo") === "true";
  const isOnboarding = searchParams.get("onboarding") === "true";
  const [crmStatus, setCrmStatus] = useState<CrmStatus | null>(null);
  const [dashboard, setDashboard] = useState<WhatsAppDashboard | null>(null);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [campaigning, setCampaigning] = useState(false);
  const [activeTab, setActiveTab] = useState<"dashboard" | "inbox">(
    "dashboard",
  );
  const { selectedNumberId } = useWhatsAppNumber();

  // Set default tab based on onboarding status
  useEffect(() => {
    if (isOnboarding) {
      setActiveTab("inbox");
    }
  }, [isOnboarding]);

  const [sendForm, setSendForm] = useState({
    phone: "",
    templateId: "",
    parameters: "",
  });

  const [campaignForm, setCampaignForm] = useState({
    name: "",
    templateId: "",
    scheduledAt: "",
  });

  const featureFlags = dashboard?.features ?? {};
  const quotaExhausted = Boolean(
    dashboard?.monthlyQuota && dashboard?.remainingQuota === 0,
  );

  const quotaPercent = useMemo(() => {
    if (!dashboard?.monthlyQuota || dashboard.monthlyQuota <= 0) return 0;
    return Math.min(
      100,
      Math.round((dashboard.usedQuota / dashboard.monthlyQuota) * 100),
    );
  }, [dashboard]);

  const loadData = async () => {
    try {
      setLoading(true);

      // 1. Check WhatsApp CRM subscription status
      const statusResponse = await authenticatedFetch(
        "/user/whatsapp-crm/check-status",
      );

      if (!statusResponse.ok) {
        throw new Error("Failed to load WhatsApp status");
      }

      const statusData = await statusResponse.json();
      setCrmStatus(statusData);

      // If no subscription, stop here (promo will show)
      if (
        !statusData.hasSubscription &&
        statusData.moduleType !== "MOBILE_SHOP"
      ) {
        setLoading(false);
        return;
      }

      // 2. Load Dashboard Stats (for the 'Dashboard' tab)
      // Only if we have access
      try {
        const dash = await getWhatsAppDashboard();
        setDashboard(dash);

        if (dash.features?.reports) {
          const logQuery =
            selectedNumberId !== "ALL"
              ? { whatsAppNumberId: selectedNumberId }
              : {};
          const recentLogs = await getWhatsAppLogs(logQuery);
          setLogs(recentLogs.slice(0, 10));
        } else {
          setLogs([]);
        }
      } catch (dashErr) {
        console.warn("Failed to load dashboard stats", dashErr);
        // Don't block the whole page if dashboard stats fail (might be permission issue)
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load WhatsApp data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedNumberId]);

  const handleSend = async () => {
    if (!sendForm.phone || !sendForm.templateId) {
      setError("Phone and template ID are required.");
      return;
    }

    try {
      setSending(true);
      setError(null);
      await sendWhatsAppMessage({
        phone: sendForm.phone,
        templateId: sendForm.templateId,
        parameters: sendForm.parameters
          ? sendForm.parameters.split(",").map((p) => p.trim())
          : undefined,
        whatsAppNumberId:
          selectedNumberId !== "ALL" ? selectedNumberId : undefined,
      });
      await loadData(); // Refresh logs/stats
      setSendForm({ phone: "", templateId: "", parameters: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  const handleCreateCampaign = async () => {
    if (!campaignForm.name || !campaignForm.templateId) {
      setError("Campaign name and template ID are required.");
      return;
    }

    try {
      setCampaigning(true);
      setError(null);
      const campaign = await createWhatsAppCampaign({
        name: campaignForm.name,
        templateId: campaignForm.templateId,
      });

      if (campaignForm.scheduledAt) {
        await scheduleWhatsAppCampaign(campaign.id, {
          scheduledAt: campaignForm.scheduledAt,
        });
      }

      await loadData();
      setCampaignForm({ name: "", templateId: "", scheduledAt: "" });
    } catch (err: any) {
      setError(err?.message || "Failed to create campaign");
    } finally {
      setCampaigning(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
          <p className="text-muted-foreground">Loading WhatsApp...</p>
        </div>
      </div>
    );
  }

  // Show promo if no subscription AND not allowed via main plan (and not retail demo)
  const hasAccess = crmStatus?.hasSubscription || crmStatus?.whatsappAllowed;

  if (showPromo || (crmStatus && !hasAccess)) {
    return <WhatsAppCrmPromo />;
  }

  const isRetailDemo = crmStatus?.moduleType === "MOBILE_SHOP";

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow max-w-md text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1 flex p-1.5 gap-2 w-fit">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "dashboard" ? "bg-teal-50 text-teal-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
          >
            📊 Campaigns & Usage
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab === "inbox" ? "bg-teal-50 text-teal-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
          >
            💬 Retail Inbox
          </button>
        </div>
        <NumberSelector />
      </div>

      {/* Tab Content */}
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {!crmStatus?.hasPhoneNumber ? (
          <WhatsAppCrmDashboard
            hasPhoneNumber={false}
            moduleType={crmStatus?.moduleType}
            whatsappAllowed={crmStatus?.whatsappAllowed}
            hasAddon={crmStatus?.hasSubscription}
          />
        ) : activeTab === "dashboard" ? (
          dashboard ? (
            <WhatsAppDashboardView
              dashboard={dashboard}
              logs={logs}
              featureFlags={featureFlags}
              quotaExhausted={quotaExhausted}
              quotaPercent={quotaPercent}
              sendForm={sendForm}
              setSendForm={setSendForm}
              campaignForm={campaignForm}
              setCampaignForm={setCampaignForm}
              sending={sending}
              campaigning={campaigning}
              onSend={handleSend}
              onCreateCampaign={handleCreateCampaign}
              onRefresh={loadData}
              hasAddon={crmStatus?.hasSubscription}
            />
          ) : (
            <div className="p-8 text-center text-gray-500">
              Failed to load dashboard statistics.
            </div>
          )
        ) : isRetailDemo ? (
          <WhatsAppRetailInbox
            disabled={!crmStatus?.whatsappAllowed}
            sendingNumber={crmStatus?.phoneNumber}
          />
        ) : !crmStatus?.isEnabled || isOnboarding ? (
          <WhatsAppCrmContactSupport />
        ) : (
          <WhatsAppCrmDashboard
            hasPhoneNumber={crmStatus?.hasPhoneNumber || false}
            moduleType={crmStatus?.moduleType}
            whatsappAllowed={crmStatus?.whatsappAllowed}
            hasAddon={crmStatus?.hasSubscription}
          />
        )}
      </div>
    </div>
  );
}
