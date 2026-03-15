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

import WhatsAppComingSoon from "@/components/whatsapp/WhatsAppComingSoon";

function WhatsAppPageContent({ authUser }: { authUser: any }) {
  // Temporarily showing Coming Soon as per user request
  return <WhatsAppComingSoon />;
}
