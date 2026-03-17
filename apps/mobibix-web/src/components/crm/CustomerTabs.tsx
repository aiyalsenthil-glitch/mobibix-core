"use client";
import { PageTabs } from "@/components/ui/page-tabs";
import { useEffect, useState } from "react";
import { getFollowUpCounts } from "@/services/crm.api";

export function CustomerTabs() {
  const [counts, setCounts] = useState<{ total: number } | null>(null);

  useEffect(() => {
    const load = () => getFollowUpCounts().then(setCounts).catch(() => {});
    load();
    window.addEventListener("refresh-followup-counts", load);
    return () => window.removeEventListener("refresh-followup-counts", load);
  }, []);

  const tabs = [
    { label: "All Customers", href: "/customers" },
    { label: "CRM Dashboard", href: "/crm" },
    { label: "My Follow-ups", href: "/crm/follow-ups", count: counts?.total },
  ];

  return <PageTabs tabs={tabs} />;
}
