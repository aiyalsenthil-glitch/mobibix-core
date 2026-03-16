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
import { getWhatsAppWebStatus, disconnectWhatsAppWeb } from "@/services/whatsapp.api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

function WhatsAppPageContent({ authUser }: { authUser: any }) {
  const [waStatus, setWaStatus] = useState<any>(null);
  const tenantId = authUser?.tenantId;

  const fetchStatus = async () => {
    if (!tenantId) return;
    try {
      const status = await getWhatsAppWebStatus(tenantId);
      setWaStatus(status);
    } catch (err) {
      console.error("Failed to load WA status");
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [tenantId]);

  if (waStatus?.status !== 'CONNECTED') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <h2 className="text-3xl font-black mb-6 text-gray-900">Link WhatsApp Web</h2>
        <QRScanner tenantId={tenantId} onConnected={fetchStatus} />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-3xl font-black text-gray-900">WhatsApp Automation</h2>
           <p className="text-sm text-gray-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis">Linked as +{waStatus.phoneNumber}</p>
        </div>
        <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => disconnectWhatsAppWeb(tenantId).then(fetchStatus)}>
          Disconnect
        </Button>
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
            Analytics dashboard coming soon in next update.
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
