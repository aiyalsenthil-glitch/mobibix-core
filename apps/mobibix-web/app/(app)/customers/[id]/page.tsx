"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCustomer,
  getCustomerStats,
  type Customer,
  type CustomerStats,
} from "@/services/customers.api";
import { CustomerTimeline, CustomerNotes } from "@/components/crm";
import { AddFollowUpModal } from "@/components/crm/AddFollowUpModal";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Star,
  Briefcase,
  Clock,
  PhoneCall,
  TrendingUp,
  AlertCircle,
  Calendar,
} from "lucide-react";

type Tab = "overview" | "timeline" | "follow-ups" | "notes";

const LIFECYCLE_STYLES: Record<
  string,
  { label: string; cls: string }
> = {
  PROSPECT: { label: "Prospect", cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  ACTIVE: { label: "Active", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" },
  INACTIVE: { label: "Inactive", cls: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  CHURNED: { label: "Churned", cls: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
};

function fmt(n: number) {
  return `₹${(n / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CustomerProfilePage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);

  useEffect(() => {
    Promise.all([getCustomer(customerId), getCustomerStats(customerId)])
      .then(([c, s]) => {
        setCustomer(c);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  if (loading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 w-64 bg-gray-200 dark:bg-white/10 rounded" />
        <div className="h-32 bg-gray-200 dark:bg-white/10 rounded-xl" />
        <div className="h-48 bg-gray-200 dark:bg-white/10 rounded-xl" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-8 text-center text-gray-500">
        Customer not found.{" "}
        <Link href="/dashboard/customers" className="text-teal-500 underline">
          Back to list
        </Link>
      </div>
    );
  }

  const lifecycle = customer.customerLifecycle;

  return (
    <div className="max-w-4xl mx-auto space-y-6 p-6">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header Card */}
      <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-500/15 flex items-center justify-center text-xl font-bold text-teal-600 dark:text-teal-400 flex-shrink-0">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {customer.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {customer.phone && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Phone className="w-3.5 h-3.5" />
                    {customer.phone}
                  </span>
                )}
                {customer.email && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail className="w-3.5 h-3.5" />
                    {customer.email}
                  </span>
                )}
                {customer.state && (
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {customer.state}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {lifecycle && (
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${LIFECYCLE_STYLES[lifecycle]?.cls}`}
                  >
                    {LIFECYCLE_STYLES[lifecycle]?.label}
                  </span>
                )}
                {customer.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowFollowUpModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors flex-shrink-0"
          >
            <PhoneCall className="w-4 h-4" />
            Add Follow-up
          </button>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Total Spend"
            value={fmt(stats.totalSpend)}
            icon={<TrendingUp className="w-4 h-4 text-teal-500" />}
          />
          <StatCard
            label="Jobs"
            value={String(stats.jobCount)}
            icon={<Briefcase className="w-4 h-4 text-blue-500" />}
          />
          <StatCard
            label="Invoices"
            value={String(stats.invoiceCount)}
            icon={<Star className="w-4 h-4 text-amber-500" />}
          />
          <StatCard
            label="Outstanding"
            value={fmt(stats.currentOutstanding)}
            icon={<AlertCircle className="w-4 h-4 text-red-500" />}
            highlight={stats.currentOutstanding > 0}
          />
        </div>
      )}

      {/* Next follow-up banner */}
      {stats?.nextFollowUp && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <Calendar className="w-4 h-4 text-blue-500 flex-shrink-0" />
          <div className="text-sm">
            <span className="font-medium text-blue-700 dark:text-blue-300">
              Next follow-up:
            </span>{" "}
            <span className="text-blue-600 dark:text-blue-400">
              {fmtDate(stats.nextFollowUp.followUpAt)} —{" "}
              {stats.nextFollowUp.purpose}
            </span>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b dark:border-gray-800">
        <div className="flex gap-1">
          {(["overview", "timeline", "follow-ups", "notes"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? "border-teal-500 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-white"
              }`}
            >
              {t.replace("-", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === "overview" && stats && (
        <div className="grid sm:grid-cols-2 gap-4">
          <InfoCard title="Last Job">
            {stats.lastJob ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {stats.lastJob.deviceBrand} {stats.lastJob.deviceModel}
                </p>
                <p className="text-gray-500">
                  #{stats.lastJob.jobNumber} · {fmtDate(stats.lastJob.createdAt)}
                </p>
                <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-xs rounded">
                  {stats.lastJob.status}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No jobs yet</p>
            )}
          </InfoCard>
          <InfoCard title="Last Invoice">
            {stats.lastInvoice ? (
              <div className="text-sm space-y-1">
                <p className="font-medium text-gray-900 dark:text-white">
                  {fmt(stats.lastInvoice.totalAmount)}
                </p>
                <p className="text-gray-500">
                  #{stats.lastInvoice.invoiceNumber} ·{" "}
                  {fmtDate(stats.lastInvoice.createdAt)}
                </p>
                <span className="inline-block px-2 py-0.5 bg-gray-100 dark:bg-white/8 text-xs rounded">
                  {stats.lastInvoice.status}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-400">No invoices yet</p>
            )}
          </InfoCard>
          <InfoCard title="Loyalty Balance">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {stats.loyaltyBalance} pts
            </p>
          </InfoCard>
          <InfoCard title="Last Interaction">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {fmtDate(stats.lastInteractionDate)}
              </p>
            </div>
          </InfoCard>
        </div>
      )}

      {tab === "timeline" && (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
          <CustomerTimeline customerId={customerId} showFilter={true} />
        </div>
      )}

      {tab === "follow-ups" && (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Follow-ups
            </h3>
            <button
              onClick={() => setShowFollowUpModal(true)}
              className="text-sm text-teal-500 hover:text-teal-600 font-medium"
            >
              + Add
            </button>
          </div>
          <CustomerTimeline
            customerId={customerId}
            showFilter={false}
            defaultSource="CRM"
          />
        </div>
      )}

      {tab === "notes" && (
        <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            Notes
          </h3>
          <CustomerNotes customerId={customerId} />
        </div>
      )}

      <AddFollowUpModal
        customerId={customerId}
        customerName={customer.name}
        isOpen={showFollowUpModal}
        onClose={() => setShowFollowUpModal(false)}
        onSuccess={() => setShowFollowUpModal(false)}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        {icon}
      </div>
      <p
        className={`text-xl font-bold ${
          highlight
            ? "text-red-600 dark:text-red-400"
            : "text-gray-900 dark:text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
        {title}
      </p>
      {children}
    </div>
  );
}
