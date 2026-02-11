"use client";

import { PageTabs } from "@/components/ui/page-tabs";

const tabs = [
  { label: "Receipts", href: "/receipts" },
  { label: "Vouchers", href: "/vouchers" },
];

export function PaymentTabs() {
  return <PageTabs tabs={tabs} />;
}
