"use client";

import { PageTabs } from "@/components/ui/page-tabs";

const tabs = [
  { label: "Stock Management", href: "/inventory" },
  { label: "IMEI Tracker", href: "/inventory/imei" },
  { label: "Negative Stock Report", href: "/inventory/negative-stock" },
  { label: "Stock Correction", href: "/inventory/stock-correction" },
];

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <PageTabs tabs={tabs} />
      {children}
    </>
  );
}
