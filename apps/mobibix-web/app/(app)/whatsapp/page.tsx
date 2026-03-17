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
      <WhatsAppPageContent authUser={authUser} />
    </WhatsAppNumberProvider>
  );
}

import QRScanner from "@/components/whatsapp/QRScanner";
import WhatsAppInbox from "@/components/whatsapp/WhatsAppInbox";
import { getWhatsAppWebStatus, disconnectWhatsAppWeb, switchWhatsAppProvider, disconnectWhatsApp, clearWhatsAppInbox } from "@/services/whatsapp.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ServiceSelector } from "./components/ServiceSelector";
import { Loader2, Settings2, MessageSquare, LayoutDashboard, Inbox, Megaphone, Zap, RefreshCw } from "lucide-react";

function WhatsAppPageContent({ authUser }: { authUser: any }) {
  const [waStatus, setWaStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const tenantId = authUser?.tenantId;

  const handleClearInbox = async () => {
    if (!confirm("Are you sure you want to clear the synchronized inbox? This will delete previous message history but won't affect messages on your phone.")) return;
    setClearing(true);
    try {
      await clearWhatsAppInbox(tenantId);
      window.location.reload(); 
    } catch (err) {
      alert("Failed to clear inbox");
    } finally {
      setClearing(false);
    }
  };

  const fetchStatus = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { getWhatsAppStatus, getWhatsAppWebStatus } = await import("@/services/whatsapp.api");
      const backendStatus = await getWhatsAppStatus();
      
      if (!backendStatus?.provider) {
        setWaStatus({ status: 'SELECT_SERVICE' });
        return;
      }

      if (backendStatus.provider === 'WEB_SOCKET') {
        const webStatus = await getWhatsAppWebStatus(tenantId);
        setWaStatus({ ...webStatus, provider: 'WEB_SOCKET' });
      } else {
        setWaStatus(backendStatus);
      }
    } catch (err) {
      setWaStatus({ status: 'SELECT_SERVICE' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [tenantId]);

  const handleProviderSelect = async (provider: 'META_CLOUD' | 'WEB_SOCKET') => {
    setSwitching(true);
    try {
      await switchWhatsAppProvider(provider);
      window.location.reload();
    } catch (err: any) {
      alert(err.message || "Failed to switch provider");
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!waStatus?.provider || waStatus?.status === 'SELECT_SERVICE') {
    return (
      <div className="p-8">
        <ServiceSelector onSelect={handleProviderSelect} loading={switching} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">WhatsApp CRM</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${waStatus.provider === 'META_CLOUD' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {waStatus.provider === 'META_CLOUD' ? 'Official Meta API' : 'WhatsApp Web Service'}
            </span>
            <span className="text-xs text-gray-400 font-medium">Synced for {authUser?.email}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="rounded-xl h-9 font-bold text-teal-600 border-teal-100 hover:bg-teal-50" onClick={handleClearInbox} disabled={clearing || switching}>
              {clearing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Clear Sync
           </Button>
           <Button variant="outline" size="sm" className="rounded-xl h-9 font-bold text-gray-600" onClick={() => handleProviderSelect(waStatus.provider === 'META_CLOUD' ? 'WEB_SOCKET' : 'META_CLOUD')} disabled={switching || clearing}>
              {switching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings2 className="w-4 h-4 mr-2" />}
              Switch Provider
           </Button>
           {waStatus.provider === 'WEB_SOCKET' && waStatus.status === 'CONNECTED' && (
             <Button 
               variant="outline" 
               size="sm" 
               className="rounded-xl h-9 font-bold text-red-600 border-red-100 hover:bg-red-50" 
               onClick={async () => {
                 if (confirm("Logout from WhatsApp?")) {
                   try {
                     await disconnectWhatsAppWeb(tenantId);
                     await disconnectWhatsApp();
                     window.location.reload();
                   } catch (err) {
                     window.location.reload();
                   }
                 }
               }}
             >
                Logout
             </Button>
           )}
        </div>
      </div>

      <Tabs defaultValue="dashboard" value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-gray-100/80 p-1 rounded-2xl h-12 w-full md:w-auto justify-start border border-gray-200/50 mb-4 overflow-x-auto no-scrollbar">
          <TabsTrigger value="dashboard" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </TabsTrigger>
          <TabsTrigger value="inbox" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Inbox className="w-4 h-4" /> Inbox
          </TabsTrigger>
          <TabsTrigger value="automation" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Zap className="w-4 h-4" /> Automations
          </TabsTrigger>
          <TabsTrigger value="broadcasts" className="rounded-xl px-6 font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm gap-2">
            <Megaphone className="w-4 h-4" /> Broadcasts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="focus-visible:ring-0">
          {waStatus.provider === 'WEB_SOCKET' && waStatus.status !== 'CONNECTED' ? (
             <QRScanner tenantId={tenantId} onConnected={fetchStatus} />
          ) : waStatus.provider === 'META_CLOUD' ? (
             <MetaDashboardContent tenantId={tenantId} />
          ) : (
            <div className="grid gap-6">
                <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white">
                  <h3 className="text-2xl font-black mb-2">Web Service Connected</h3>
                  <p className="opacity-80 font-medium">Real-time automation is active via your linked browser session.</p>
                </Card>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                   <Card className="rounded-3xl border-none shadow-sm p-6 bg-white">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Link Status</p>
                      <p className="text-xl font-black text-emerald-600">CONNECTED</p>
                   </Card>
                   <Card className="rounded-3xl border-none shadow-sm p-6 bg-white">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                      <p className="text-xl font-black text-gray-900">{waStatus.phoneNumber || 'N/A'}</p>
                   </Card>
                   <Card className="rounded-3xl border-none shadow-sm p-6 bg-white">
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Provider</p>
                      <p className="text-xl font-black text-teal-600">WHATSAPP WEB</p>
                   </Card>
                </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inbox" className="focus-visible:ring-0">
           <WhatsAppInbox tenantId={tenantId} />
        </TabsContent>

        <TabsContent value="automation" className="focus-visible:ring-0">
           <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-20 text-center">
              <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">Smart Automations</h3>
              <p className="text-gray-500 max-w-sm mx-auto">Auto-replies, keyword triggers, and AI flows are coming soon to this unified dashboard.</p>
           </Card>
        </TabsContent>

        <TabsContent value="broadcasts" className="focus-visible:ring-0">
           {waStatus.provider === 'META_CLOUD' ? (
             <MetaDashboardContent tenantId={tenantId} /> 
           ) : (
             <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-20 text-center">
               <Megaphone className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
               <h3 className="text-2xl font-black text-gray-900 mb-2">Meta Broadcasts</h3>
               <p className="text-gray-500 max-w-sm mx-auto">Bulk campaigns are exclusively available on the Official Meta Engine for maximum compliance and delivery rates.</p>
               <Button variant="outline" className="mt-6 rounded-xl font-bold bg-indigo-50 border-indigo-100 text-indigo-700" onClick={() => handleProviderSelect('META_CLOUD')}>Switch to Meta Engine</Button>
             </Card>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetaDashboardContent({ tenantId }: { tenantId: string }) {
  const [data, setData] = useState<{ dashboard: WhatsAppDashboard | null; logs: WhatsAppLog[] }>({
    dashboard: null,
    logs: []
  });
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashboard, logs] = await Promise.all([
        getWhatsAppDashboard(),
        getWhatsAppLogs()
      ]);
      setData({ 
        dashboard, 
        logs: Array.isArray(logs) ? logs : (logs as any)?.data || [] 
      });
    } catch (err) {
      console.error("Failed to load Meta dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  if (loading) {
     return (
      <div className="flex h-[40vh] items-center justify-center bg-white rounded-[2rem]">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
        <span className="font-bold text-gray-500">Syncing Meta Assets...</span>
      </div>
    );
  }

  if (!data.dashboard) {
    return (
      <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-20 text-center">
          <h3 className="text-2xl font-black text-gray-900 mb-2">Connect Meta Assets</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Your engine is set to Official API, but assets are not yet synced. Please connect your Facebook account.</p>
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
      quotaPercent={data.dashboard.usedQuota / (data.dashboard.monthlyQuota || 1) * 100}
      sendForm={{ phone: '', templateId: '', parameters: '' }}
      setSendForm={() => {}}
      campaignForm={{ name: '', templateId: '', scheduledAt: '' }}
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
