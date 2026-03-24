"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getCustomer,
  getCustomerStats,
  getCustomerLogs,
  type Customer,
  type CustomerStats,
  type CustomerLogItem,
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
  Search,
  ShoppingBag,
  Wrench,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type Tab = "overview" | "timeline" | "follow-ups" | "notes" | "logs";

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

  // Logs state
  const [logs, setLogs] = useState<CustomerLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logType, setLogType] = useState<"ALL" | "PURCHASE" | "REPAIR">("ALL");
  const [logStartDate, setLogStartDate] = useState("");
  const [logEndDate, setLogEndDate] = useState("");
  const [logProduct, setLogProduct] = useState("");

  useEffect(() => {
    Promise.all([getCustomer(customerId), getCustomerStats(customerId)])
      .then(([c, s]) => {
        setCustomer(c);
        setStats(s);
      })
      .finally(() => setLoading(false));
  }, [customerId]);

  useEffect(() => {
    if (tab !== "logs") return;
    setLogsLoading(true);
    getCustomerLogs(customerId, {
      type: logType,
      startDate: logStartDate || undefined,
      endDate: logEndDate || undefined,
      product: logProduct || undefined,
    })
      .then((r) => setLogs(r.data))
      .finally(() => setLogsLoading(false));
  }, [customerId, tab, logType, logStartDate, logEndDate, logProduct]);

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
            <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-teal-500/15 flex items-center justify-center text-xl font-bold text-teal-600 dark:text-teal-400 shrink-0">
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
            className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-medium transition-colors shrink-0"
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
          <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
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
          {(["overview", "logs", "timeline", "follow-ups", "notes"] as Tab[]).map((t) => (
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

      {tab === "logs" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-4 space-y-3">
            {/* Type toggle */}
            <div className="flex gap-2">
              {(["ALL", "PURCHASE", "REPAIR"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLogType(t)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    logType === t
                      ? "bg-teal-500 text-white"
                      : "bg-gray-100 dark:bg-white/8 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/12"
                  }`}
                >
                  {t === "ALL" ? "All" : t === "PURCHASE" ? "Purchases" : "Repairs"}
                </button>
              ))}
            </div>
            {/* Date + product */}
            <div className="flex flex-wrap gap-3">
              <input
                type="date"
                value={logStartDate}
                onChange={(e) => setLogStartDate(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent dark:text-white"
                placeholder="From"
              />
              <input
                type="date"
                value={logEndDate}
                onChange={(e) => setLogEndDate(e.target.value)}
                className="px-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent dark:text-white"
                placeholder="To"
              />
              <div className="relative flex-1 min-w-[160px]">
                <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={logProduct}
                  onChange={(e) => setLogProduct(e.target.value)}
                  placeholder="Filter by product..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg border dark:border-gray-700 bg-transparent dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Results */}
          {logsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-400 text-sm">No records found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <LogCard key={log.id} log={log} />
              ))}
            </div>
          )}
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

function LogCard({ log }: { log: CustomerLogItem }) {
  const [expanded, setExpanded] = useState(false);
  const isPurchase = log.type === "PURCHASE";

  return (
    <div className="bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-xl overflow-hidden">
      <button
        className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-white/3 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div
          className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
            isPurchase
              ? "bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400"
              : "bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400"
          }`}
        >
          {isPurchase ? (
            <ShoppingBag className="w-4 h-4" />
          ) : (
            <Wrench className="w-4 h-4" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {isPurchase ? "Invoice" : "Job Card"}
              </span>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                #{log.ref}
              </p>
            </div>
            <div className="text-right shrink-0">
              {isPurchase && log.totalAmount !== undefined && (
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  ₹{log.totalAmount.toLocaleString("en-IN")}
                </p>
              )}
              {!isPurchase && (log.finalCost ?? log.estimatedCost) !== null && (
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  ₹{(log.finalCost ?? log.estimatedCost ?? 0).toLocaleString("en-IN")}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-0.5">
                {new Date(log.date).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {!isPurchase && (
            <p className="text-xs text-gray-500 mt-1">
              {log.deviceBrand} {log.deviceModel} · {log.status}
            </p>
          )}

          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                log.status === "PAID" || log.status === "DELIVERED"
                  ? "bg-green-100 dark:bg-green-500/15 text-green-600 dark:text-green-400"
                  : log.status === "UNPAID" || log.status === "PENDING"
                  ? "bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400"
                  : "bg-gray-100 dark:bg-white/8 text-gray-500 dark:text-gray-400"
              }`}
            >
              {log.status}
            </span>
            <span className="text-xs text-gray-400">
              {log.items.length} item{log.items.length !== 1 ? "s" : ""}
            </span>
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400 ml-auto" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-auto" />
            )}
          </div>
        </div>
      </button>

      {expanded && log.items.length > 0 && (
        <div className="border-t dark:border-gray-800 px-4 py-3 space-y-2 bg-gray-50 dark:bg-white/2">
          {log.items.map((item, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                  {item.productName}
                </p>
                {item.brand && (
                  <p className="text-xs text-gray-400">{item.brand}</p>
                )}
              </div>
              <div className="text-right shrink-0 ml-3">
                <p className="text-gray-700 dark:text-gray-300">×{item.quantity}</p>
                {item.rate !== null && (
                  <p className="text-xs text-gray-400">
                    ₹{item.rate.toLocaleString("en-IN")} each
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
