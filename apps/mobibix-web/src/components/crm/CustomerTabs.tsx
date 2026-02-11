"use client";

import { PageTabs } from "@/components/ui/page-tabs";

const tabs = [
  { label: "All Customers", href: "/customers" },
  { label: "CRM Dashboard", href: "/crm" },
];

export function CustomerTabs() {
  return <PageTabs tabs={tabs} />;
}
