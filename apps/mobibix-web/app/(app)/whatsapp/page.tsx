"use client";

import { useEffect, useState } from "react";
import {
  createWhatsAppCampaign,
  getWhatsAppDashboard,
  getWhatsAppLogs,
  scheduleWhatsAppCampaign,
  sendWhatsAppMessage,
  switchWhatsAppProvider,
  disconnectWhatsApp,
  clearWhatsAppInbox,
  getWhatsAppStatus,
  getWhatsAppWebStatus,
  disconnectWhatsAppWeb,
  WhatsAppDashboard,
  WhatsAppLog,
} from "@/services/whatsapp.api";
import WhatsAppDashboardView from "./components/WhatsAppDashboardView";
import { ServiceSelector } from "./components/ServiceSelector";
import AuthkeySetupForm from "./components/AuthkeySetupForm";
import MetaSetupForm from "./components/MetaSetupForm";
import QRScanner from "@/components/whatsapp/QRScanner";
import WhatsAppInbox from "@/components/whatsapp/WhatsAppInbox";
import { useAuth } from "@/hooks/useAuth";
import {
  WhatsAppNumberProvider,
} from "@/context/WhatsAppNumberContext";
import WhatsAppPlanPicker from "@/components/whatsapp/WhatsAppPlanPicker";
import MetaTemplateManager from "@/components/whatsapp/MetaTemplateManager";
import { getWaOfficialPlans } from "@/services/payments.api";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Settings2,
  LayoutDashboard,
  Inbox,
  Megaphone,
  Zap,
  RefreshCw,
} from "lucide-react";

export default function WhatsAppPage() {
  const { authUser } = useAuth();
  return (
    <WhatsAppNumberProvider tenantId={authUser?.tenantId}>
      <WhatsAppPageContent authUser={authUser} />
    </WhatsAppNumberProvider>
  );
}

type PageState =
  | "loading"
  | "select_mode"
  | "plan_required"
  | "REMOVED_TOKEN_setup"
  | "meta_setup"
  | "web_active"
  | "REMOVED_TOKEN_active"
  | "meta_active";

function WhatsAppPageContent({ authUser }: { authUser: any }) {
  const [waStatus, setWaStatus] = useState<any>(null);
  const [pageState, setPageState] = useState<PageState>("loading");
  const [switching, setSwitching] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const tenantId = authUser?.tenantId;

  const fetchStatus = async () => {
    if (!tenantId) return;
    setPageState("loading");
    try {
      const backendStatus = await getWhatsAppStatus();

      if (!backendStatus?.provider) {
        setPageState("select_mode");
        return;
      }

      setWaStatus(backendStatus);

      if (backendStatus.provider === "WEB_SOCKET") {
        const webStatus = await getWhatsAppWebStatus(tenantId);
        setWaStatus({ ...webStatus, provider: "WEB_SOCKET" });
        setPageState("web_active");
      } else if (backendStatus.provider === "AUTHKEY") {
        if (backendStatus.status === "PENDING" || backendStatus.status === "DISCONNECTED") {
          setPageState("REMOVED_TOKEN_setup");
        } else {
          setPageState("REMOVED_TOKEN_active");
        }
      } else if (backendStatus.provider === "META_CLOUD") {
        setPageState("meta_active");
      } else {
        setPageState("select_mode");
      }
    } catch {
      setPageState("select_mode");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [tenantId]);

  const handleModeSelect = async (provider: "WEB_SOCKET" | "AUTHKEY" | "META_CLOUD") => {
    if (provider === "META_CLOUD") {
      setPageState("meta_setup");
      return;
    }
    if (provider === "AUTHKEY") {
      // Check if tenant has an active WA Official plan before proceeding
      setSwitching(true);
      try {
        const plans = await getWaOfficialPlans();
        setSwitching(false);
        if (!plans || plans.length === 0) {
          setPageState("plan_required");
          return;
        }
        // Plans exist — proceed to switch + configure
        await switchWhatsAppProvider("AUTHKEY");
        setPageState("REMOVED_TOKEN_setup");
      } catch {
        setSwitching(false);
        setPageState("plan_required");
      }
      return;
    }
    setSwitching(true);
    try {
      await switchWhatsAppProvider("WEB_SOCKET");
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to switch provider");
    } finally {
      setSwitching(false);
    }
  };

  const handlePlanPurchased = async (_planCode: string) => {
    // Plan purchased — now switch to AUTHKEY and proceed to config
    setSwitching(true);
    try {
      await switchWhatsAppProvider("AUTHKEY");
      setPageState("REMOVED_TOKEN_setup");
    } catch (err: any) {
      alert(err.message || "Failed to activate provider");
    } finally {
      setSwitching(false);
    }
  };

  const handleAuthkeySuccess = () => {
    window.location.reload();
  };

  const handleMetaSuccess = () => {
    window.location.reload();
  };

  const handleClearInbox = async () => {
    if (!confirm("Clear synchronized inbox? This deletes message history but won't affect your phone.")) return;
    setClearing(true);
    try {
      await clearWhatsAppInbox(tenantId);
      window.location.reload();
    } catch {
      alert("Failed to clear inbox");
    } finally {
      setClearing(false);
    }
  };

  const handleSwitchMode = async () => {
    setSwitching(true);
    try {
      // Reset to mode selection
      await switchWhatsAppProvider("WEB_SOCKET"); // just to reset, user will re-pick
      setPageState("select_mode");
    } catch (err: any) {
      alert(err.message || "Failed to switch mode");
    } finally {
      setSwitching(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // ── Mode selection ───────────────────────────────────────────────────────────
  if (pageState === "select_mode") {
    return (
      <div className="p-8">
        <ServiceSelector onSelect={handleModeSelect} loading={switching} />
      </div>
    );
  }

  // ── Plan required (no active WA addon) ───────────────────────────────────────
  if (pageState === "plan_required") {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => setPageState("select_mode")}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Back to mode selection
          </button>
        </div>
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Zap className="w-3.5 h-3.5" /> ADDON REQUIRED
          </div>
          <h2 className="text-2xl font-bold text-foreground">Activate Official WhatsApp</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            Official API access requires a WA Official plan addon. Choose the plan
            that fits your volume, pay now, and continue setup.
          </p>
        </div>
        <WhatsAppPlanPicker onSuccess={handlePlanPurchased} />
      </div>
    );
  }

  // ── Authkey credentials form ─────────────────────────────────────────────────
  if (pageState === "REMOVED_TOKEN_setup") {
    return (
      <div className="p-8">
        <AuthkeySetupForm
          onSuccess={handleAuthkeySuccess}
          onBack={() => setPageState("select_mode")}
        />
      </div>
    );
  }

  // ── Meta Embedded Signup ─────────────────────────────────────────────────────
  if (pageState === "meta_setup") {
    return (
      <div className="p-8">
        <MetaSetupForm
          onSuccess={handleMetaSuccess}
          onBack={() => setPageState("select_mode")}
        />
      </div>
    );
  }

  // ── Active dashboard ─────────────────────────────────────────────────────────
  const isAuthkey = pageState === "REMOVED_TOKEN_active";
  const isMeta = pageState === "meta_active";
  const isWeb = pageState === "web_active";

  const providerLabel = isAuthkey
    ? "Official (Authkey)"
    : isMeta
    ? "Official Meta API"
    : "WhatsApp Web";

  const providerBadgeClass = isAuthkey
    ? "bg-violet-100 text-violet-700"
    : isMeta
    ? "bg-blue-100 text-blue-700"
    : "bg-emerald-100 text-emerald-700";

  return (
    <div className="p-4 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight">WhatsApp CRM</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${providerBadgeClass}`}>
              {providerLabel}
            </span>
            {waStatus?.phoneNumber && (
              <span className="text-xs text-muted-foreground font-mono">{waStatus.phoneNumber}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isWeb && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 font-bold text-teal-600 border-teal-100 hover:bg-teal-50"
              onClick={handleClearInbox}
              disabled={clearing || switching}
            >
              {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Clear Sync
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            className="rounded-xl h-9 font-bold text-foreground"
            onClick={handleSwitchMode}
            disabled={switching || clearing}
          >
            {switching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
            Switch Mode
          </Button>

          {isWeb && waStatus?.status === "CONNECTED" && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl h-9 font-bold text-red-600 border-red-100 hover:bg-red-50"
              onClick={async () => {
                if (!confirm("Logout from WhatsApp Web?")) return;
                try {
                  await disconnectWhatsAppWeb(tenantId);
                  await disconnectWhatsApp();
                } finally {
                  window.location.reload();
                }
              }}
            >
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-muted p-1 rounded-2xl h-12 w-full md:w-auto justify-start border mb-4 overflow-x-auto no-scrollbar">
          <TabsTrigger value="dashboard" className="rounded-xl px-6 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-xl px-6 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Inbox className="w-4 h-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="automation" className="rounded-xl px-6 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Zap className="w-4 h-4" /> Automations
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="rounded-xl px-6 font-bold data-[state=active]:bg-background data-[state=active]:shadow-sm gap-2">
            <Megaphone className="w-4 h-4" /> Broadcasts
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="focus-visible:ring-0">
          {isWeb && waStatus?.status !== "CONNECTED" ? (
            <QRScanner tenantId={tenantId} onConnected={fetchStatus} />
          ) : isWeb ? (
            <WebModeConnectedCard waStatus={waStatus} />
          ) : isAuthkey ? (
            <AuthkeyConnectedCard waStatus={waStatus} />
          ) : (
            <MetaDashboardContent tenantId={tenantId} />
          )}
        </TabsContent>

        {/* Inbox Tab */}
        <TabsContent value="inbox" className="focus-visible:ring-0">
          <WhatsAppInbox tenantId={tenantId} />
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automation" className="focus-visible:ring-0">
          <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-20 text-center">
            <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-2xl font-black text-foreground mb-2">Smart Automations</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Auto-replies, keyword triggers, and AI flows are coming soon to this unified dashboard.
            </p>
          </Card>
        </TabsContent>

        {/* Broadcasts Tab */}
        <TabsContent value="broadcasts" className="focus-visible:ring-0">
          {isMeta ? (
            <MetaTemplateManager />
          ) : isAuthkey ? (
            <AuthkeyBroadcastsCard />
          ) : (
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-20 text-center">
              <Megaphone className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-foreground mb-2">Broadcasts</h3>
              <p className="text-muted-foreground max-w-sm mx-auto">
                Bulk campaigns require Official WhatsApp (Authkey) for maximum compliance and delivery.
              </p>
              <Button
                variant="outline"
                className="mt-6 rounded-xl font-bold bg-violet-50 border-violet-100 text-violet-700"
                onClick={() => handleModeSelect("AUTHKEY")}
              >
                Upgrade to Official API
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function WebModeConnectedCard({ waStatus }: { waStatus: any }) {
  return (
    <div className="grid gap-6">
      <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white">
        <h3 className="text-2xl font-black mb-2">Web Mode Active</h3>
        <p className="opacity-80 font-medium">Real-time automation is active via your linked WhatsApp session.</p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-none shadow-sm p-6 bg-card">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
          <p className="text-xl font-black text-emerald-600">{waStatus?.status || "CONNECTED"}</p>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm p-6 bg-card">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Phone Number</p>
          <p className="text-xl font-black text-foreground">{waStatus?.phoneNumber || "—"}</p>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm p-6 bg-card">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Mode</p>
          <p className="text-xl font-black text-teal-600">WhatsApp Web</p>
        </Card>
      </div>
    </div>
  );
}

function AuthkeyConnectedCard({ waStatus }: { waStatus: any }) {
  return (
    <div className="grid gap-6">
      <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-violet-600 to-indigo-600 p-8 text-white">
        <h3 className="text-2xl font-black mb-2">Official WhatsApp Active</h3>
        <p className="opacity-80 font-medium">Powered by Authkey — official API with reliable delivery.</p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-none shadow-sm p-6 bg-card">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Status</p>
          <p className="text-xl font-black text-violet-600">{waStatus?.status || "ACTIVE"}</p>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm p-6 bg-card">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Phone Number</p>
          <p className="text-xl font-black text-foreground">{waStatus?.phoneNumber || "—"}</p>
        </Card>
        <Card className="rounded-3xl border-none shadow-sm p-6 bg-card">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Sender ID</p>
          <p className="text-xl font-black text-indigo-600">{waStatus?.REMOVED_TOKENSenderId || "—"}</p>
        </Card>
      </div>
    </div>
  );
}

function AuthkeyBroadcastsCard() {
  return (
    <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-20 text-center">
      <Megaphone className="w-12 h-12 text-violet-500 mx-auto mb-4" />
      <h3 className="text-2xl font-black text-foreground mb-2">Bulk Campaigns</h3>
      <p className="text-muted-foreground max-w-sm mx-auto">
        Bulk campaign builder for Authkey (up to 200 recipients per batch) is coming soon.
      </p>
    </Card>
  );
}

function MetaBroadcastsContent({ tenantId: _tenantId }: { tenantId: string }) {
  const [sendForm, setSendForm] = useState({ phone: "", templateId: "", parameters: "" });
  const [campaignForm, setCampaignForm] = useState({ name: "", templateId: "", scheduledAt: "" });
  const [sending, setSending] = useState(false);
  const [campaigning, setCampaigning] = useState(false);

  const handleSend = async () => {
    setSending(true);
    try {
      await sendWhatsAppMessage({
        phone: sendForm.phone,
        templateId: sendForm.templateId,
        parameters: sendForm.parameters ? sendForm.parameters.split(",").map((p) => p.trim()) : [],
      });
      setSendForm({ phone: "", templateId: "", parameters: "" });
    } catch (err: any) {
      alert(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleCreateCampaign = async () => {
    setCampaigning(true);
    try {
      const campaign = await createWhatsAppCampaign({
        name: campaignForm.name,
        templateId: campaignForm.templateId,
      });
      if (campaignForm.scheduledAt && (campaign as any)?.id) {
        await scheduleWhatsAppCampaign((campaign as any).id, { scheduledAt: campaignForm.scheduledAt });
      }
      setCampaignForm({ name: "", templateId: "", scheduledAt: "" });
    } catch (err: any) {
      alert(err.message || "Failed to create campaign");
    } finally {
      setCampaigning(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Manual Message</h2>
          <p className="text-sm text-muted-foreground">Send a one-off approved template message.</p>
        </div>
        <div className="grid gap-3">
          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Phone (e.g., 9876543210)" value={sendForm.phone} onChange={(e) => setSendForm((p) => ({ ...p, phone: e.target.value }))} />
          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Template ID" value={sendForm.templateId} onChange={(e) => setSendForm((p) => ({ ...p, templateId: e.target.value }))} />
          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Parameters (comma separated)" value={sendForm.parameters} onChange={(e) => setSendForm((p) => ({ ...p, parameters: e.target.value }))} />
          <button onClick={handleSend} disabled={sending} className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50">
            {sending ? "Sending..." : "Send Message"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Campaigns</h2>
          <p className="text-sm text-muted-foreground">Create and schedule bulk campaigns.</p>
        </div>
        <div className="grid gap-3">
          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Campaign name" value={campaignForm.name} onChange={(e) => setCampaignForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" placeholder="Template ID" value={campaignForm.templateId} onChange={(e) => setCampaignForm((p) => ({ ...p, templateId: e.target.value }))} />
          <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" type="datetime-local" value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm((p) => ({ ...p, scheduledAt: e.target.value }))} />
          <button onClick={handleCreateCampaign} disabled={campaigning} className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50">
            {campaigning ? "Saving..." : "Create Campaign"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MetaDashboardContent({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<{ dashboard: WhatsAppDashboard | null; logs: WhatsAppLog[] }>({
    dashboard: null,
    logs: [],
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboard, logs] = await Promise.all([
        getWhatsAppDashboard(),
        getWhatsAppLogs(),
      ]);
      setData({
        dashboard,
        logs: Array.isArray(logs) ? logs : (logs as any)?.data || [],
      });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  if (loading) {
    return (
      <div className="flex h-[40vh] items-center justify-center bg-card rounded-[2rem]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="font-bold text-muted-foreground">Syncing Meta Assets...</span>
      </div>
    );
  }

  if (!data.dashboard) {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-card p-20 text-center">
        <h3 className="text-2xl font-black text-foreground mb-2">Connect Meta Assets</h3>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
          Connect your Facebook account to sync Meta API assets.
        </p>
        <Button
          className="bg-blue-600 hover:bg-blue-700 rounded-xl px-12 h-12 font-bold shadow-lg shadow-blue-100"
          onClick={async () => {
            const { connectWhatsApp } = await import("@/services/whatsapp.api");
            const { url } = await connectWhatsApp();
            window.location.href = url;
          }}
        >
          Connect Facebook
        </Button>
      </Card>
    );
  }

  return (
    <WhatsAppDashboardView
      dashboard={data.dashboard}
      logs={data.logs}
      onRefresh={loadData}
      featureFlags={{ manualMessaging: true, bulkCampaign: true, reports: true }}
      quotaExhausted={false}
      quotaPercent={(data.dashboard.usedQuota / (data.dashboard.monthlyQuota || 1)) * 100}
      sendForm={{ phone: "", templateId: "", parameters: "" }}
      setSendForm={() => {}}
      campaignForm={{ name: "", templateId: "", scheduledAt: "" }}
      setCampaignForm={() => {}}
      sending={false}
      campaigning={false}
      onSend={() => {}}
      onCreateCampaign={() => {}}
      isPro={true}
      hasAddon={true}
    />
  );
}
