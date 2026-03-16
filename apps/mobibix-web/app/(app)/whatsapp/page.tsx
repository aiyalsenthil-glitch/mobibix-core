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
import { getWhatsAppWebStatus, disconnectWhatsAppWeb, switchWhatsAppProvider } from "@/services/whatsapp.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ServiceSelector } from "./components/ServiceSelector";
import { Loader2, Settings2, MessageSquare } from "lucide-react";

function WhatsAppPageContent({ authUser }: { authUser: any }) {
  const [waStatus, setWaStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const tenantId = authUser?.tenantId;

  const fetchStatus = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const status = await getWhatsAppWebStatus(tenantId);
      setWaStatus(status || { status: 'SELECT_SERVICE' });
    } catch (err) {
      console.error("Failed to load WA status");
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
      await fetchStatus();
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

  // 1. Selection Screen (Initial or Reset)
  if (!waStatus?.provider || waStatus?.status === 'SELECT_SERVICE') {
    return (
      <div className="p-8">
        <ServiceSelector onSelect={handleProviderSelect} loading={switching} />
      </div>
    );
  }

  // 2. WhatsApp Web Flow
  if (waStatus.provider === 'WEB_SOCKET') {
    if (waStatus.status !== 'CONNECTED') {
      return (
        <div className="p-8 max-w-4xl mx-auto space-y-6">
           <div className="flex justify-between items-center">
            <h2 className="text-3xl font-black text-gray-900">Link WhatsApp Web</h2>
            <Button variant="ghost" size="sm" className="text-gray-400 hover:text-gray-900" onClick={() => handleProviderSelect('META_CLOUD')}>
              <Settings2 className="w-4 h-4 mr-2" /> Switch to Official API
            </Button>
          </div>
          <QRScanner tenantId={tenantId} onConnected={fetchStatus} />
        </div>
      );
    }

    return (
      <div className="p-4 lg:p-8 space-y-6">
        <div className="flex justify-between items-center">
          <div>
             <h2 className="text-3xl font-black text-gray-900">WhatsApp Automation</h2>
             <p className="text-sm text-gray-500 font-medium">+ {waStatus.phoneNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleProviderSelect('META_CLOUD')} disabled={switching}>
              {switching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
              Switch to Official API
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => disconnectWhatsAppWeb(tenantId).then(fetchStatus)}>
              Disconnect
            </Button>
          </div>
        </div>

        <Tabs defaultValue="inbox" className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-xl mb-6">
            <TabsTrigger value="inbox" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Real-time Inbox</TabsTrigger>
            <TabsTrigger value="analytics" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">Bot Analytics</TabsTrigger>
          </TabsList>
          <TabsContent value="inbox">
            <WhatsAppInbox tenantId={tenantId} />
          </TabsContent>
          <TabsContent value="analytics">
            <Card className="rounded-[2rem] border-none shadow-sm bg-white p-12 text-center text-gray-400 italic">
              Analytics dashboard coming soon.
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // 3. Official Meta API Flow
  return (
    <div className="p-4 lg:p-8 space-y-6">
       <div className="flex justify-between items-center bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
               <MessageSquare className="text-white w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-blue-900">Official Meta Engine</h3>
              <p className="text-blue-600/70 text-sm font-medium">Enterprise-grade cloud messaging active.</p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="bg-white border-blue-200 text-blue-700 hover:bg-blue-50" onClick={() => handleProviderSelect('WEB_SOCKET')} disabled={switching}>
             {switching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
             Switch to WhatsApp Web
          </Button>
       </div>
       
       {/* 
          Official Meta Dashboard View would go here. 
          For now, we can show a placeholder or integrate WhatsAppDashboardView. 
          Since it requires many props, we'll need to fetch dashboard data.
       */}
       <Card className="rounded-[2.5rem] border-none shadow-sm bg-white p-20 text-center">
          <h3 className="text-2xl font-black text-gray-900 mb-2">Meta Cloud Integration</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">Your account is configured for the official Meta API. Use this for high-volume automated campaigns.</p>
          <div className="flex justify-center gap-3">
             <Button className="bg-blue-600 hover:bg-blue-700 rounded-xl px-8 font-bold">Manage Templates</Button>
             <Button variant="outline" className="rounded-xl px-8 font-bold">View Reports</Button>
          </div>
       </Card>
    </div>
  );
}
