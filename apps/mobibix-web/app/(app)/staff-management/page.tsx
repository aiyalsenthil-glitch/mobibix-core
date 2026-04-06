"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import PageTabs from "@/components/layout/PageTabs";
import StaffTab from "./components/StaffTab";
import RolesTab from "./components/RolesTab";
import ApprovalsTab from "./components/ApprovalsTab";
import CommissionTab from "./components/CommissionTab";
import LeaderboardTab from "./components/LeaderboardTab";
import { HelpGuide } from "@/components/common/HelpGuide";
import { useAuth } from "@/hooks/useAuth";

const COMMISSION_GUIDE = [
  {
    title: "What is Staff Commission?",
    description: "Commission rules automatically calculate earnings for each staff member on every sale. No manual calculations — MobiBix does it for you.",
    tip: "Set up rules once and every future invoice will generate earnings automatically.",
  },
  {
    title: "Choose a commission type",
    description: "Three types supported: % of Sale (e.g. 2% of ₹32,000 = ₹640), % of Profit (rewards margin, discourages over-discounting), or Fixed per Item (e.g. ₹20 per accessory sold).",
    tip: "Use % of Profit if your staff tend to give excessive discounts to close deals.",
  },
  {
    title: "Target the right people",
    description: "Rules can apply to All Staff, a specific Role (e.g. Technician, Supervisor), or a single staff member. You can also filter by product category.",
    tip: "Stack rules — e.g. all staff get 2% on everything, but your top performer gets an extra 5% on flagship phones.",
  },
  {
    title: "View the earnings ledger",
    description: "Every commission entry appears in the ledger with status PENDING. Review it at month-end to see who earned what.",
    tip: "Commissions are calculated automatically on invoice creation and never block a sale.",
  },
  {
    title: "Mark commissions as paid",
    description: "Select one or multiple PENDING entries and click 'Mark as Paid'. The timestamp is recorded so your payroll history is always accurate.",
    tip: "Use bulk select to pay out all of a staff member's commission in one click.",
  },
];

function StaffManagementContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { authUser: user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const canManageStaff = user?.role && ["owner", "admin", "manager"].includes(user.role.toLowerCase());

  // Wait until mounted to prevent hydration errors with search params
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !canManageStaff) {
      router.replace("/dashboard");
    }
  }, [mounted, canManageStaff, router]);

  const currentTab = searchParams.get("tab") || "staff";

  const handleTabChange = (tabId: string) => {
    router.replace(`${pathname}?tab=${tabId}`);
  };

  if (!mounted || !canManageStaff) return null;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 animate-fade-in pb-24">
      <div className="mb-8">
        <div className="flex items-center gap-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
          {currentTab === "commission" && (
            <HelpGuide title="Staff Commission Guide" subtitle="5-step guide" steps={COMMISSION_GUIDE} side="bottom" />
          )}
        </div>
        <p className="text-gray-500 mt-1 dark:text-slate-400">
          Manage your team access, customize roles and permissions, and review pending approval requests.
        </p>
      </div>

      <PageTabs
        tabs={[
          { id: "staff", label: "Staff Members" },
          { id: "roles", label: "Roles & Permissions" },
          { id: "approvals", label: "Approval Inbox" },
          { id: "commission", label: "💰 Commission" },
          { id: "leaderboard", label: "🏆 Leaderboard" },
        ]}
        activeTab={currentTab}
        onChange={handleTabChange}
      />

      <div className="mt-4">
        {currentTab === "staff" && <StaffTab />}
        {currentTab === "roles" && <RolesTab />}
        {currentTab === "approvals" && <ApprovalsTab />}
        {currentTab === "commission" && <CommissionTab />}
        {currentTab === "leaderboard" && <LeaderboardTab />}
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
