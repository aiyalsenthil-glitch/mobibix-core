"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PageTabs from "@/components/layout/PageTabs";
import StaffTab from "./components/StaffTab";
import RolesTab from "./components/RolesTab";
import ApprovalsTab from "./components/ApprovalsTab";

function StaffManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  
  // Wait until mounted to prevent hydration errors with search params
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTab = searchParams.get("tab") || "staff";

  const handleTabChange = (tabId: string) => {
    router.replace(`${pathname}?tab=${tabId}`);
  };

  if (!mounted) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in pb-24">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
        <p className="text-gray-500 mt-1 dark:text-slate-400">
          Manage your team access, customize roles and permissions, and review pending approval requests.
        </p>
      </div>

      <PageTabs
        tabs={[
          { id: "staff", label: "Staff Members" },
          { id: "roles", label: "Roles & Permissions" },
          { id: "approvals", label: "Approval Inbox" },
        ]}
        activeTab={currentTab}
        onChange={handleTabChange}
      />

      <div className="mt-4">
        {currentTab === "staff" && <StaffTab />}
        {currentTab === "roles" && <RolesTab />}
        {currentTab === "approvals" && <ApprovalsTab />}
      </div>
    </div>
  );
}

export default function StaffManagementPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Staff Management...</div>}>
      <StaffManagementContent />
    </Suspense>
  );
}
