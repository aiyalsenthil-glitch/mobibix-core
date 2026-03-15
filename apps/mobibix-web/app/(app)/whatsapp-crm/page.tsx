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

import WhatsAppComingSoon from "@/components/whatsapp/WhatsAppComingSoon";

export default function WhatsAppCrmPage() {
  // Temporarily showing Coming Soon as per user request
  return <WhatsAppComingSoon />;
}
