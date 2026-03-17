"use client";

import { useEffect, useState } from "react";
import {
  EWayBill,
  getEWayBill,
  cancelEWayBill,
} from "@/services/ewaybill.api";

const EWB_THRESHOLD = 50_000; // rupees

interface Props {
  invoiceId: string;
  totalAmount: number;   // rupees
  customerGstin?: string | null;
  customerDistanceKm?: number | null;  // pre-stored distance for auto-fill
}

const CANCEL_REASONS = [
  { value: 1, label: "Duplicate" },
  { value: 2, label: "Order Cancelled" },
  { value: 3, label: "Data Entry Mistake" },
] as const;

export function EWayBillPanel({ invoiceId, totalAmount, customerGstin }: Props) {
  const [ewb, setEwb] = useState<EWayBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);

  // Cancel form state
  const [cancelRsn, setCancelRsn] = useState<1 | 2 | 3>(2);
  const [cancelRmrk, setCancelRmrk] = useState("");

  // Only shown for B2B invoices above threshold
  const isEligible = !!customerGstin && totalAmount > EWB_THRESHOLD;

  useEffect(() => {
    if (!isEligible) return;
    getEWayBill(invoiceId)
      .then(setEwb)
      .catch(() => setEwb(null))
      .finally(() => setLoading(false));
  }, [invoiceId, isEligible]);

  if (!isEligible) return null;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 p-4">
        <div className="h-4 w-32 bg-slate-200 dark:bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  const canCancel =
    ewb?.status === "GENERATED" &&
    ewb.generatedAt &&
    Date.now() - new Date(ewb.generatedAt).getTime() < 24 * 60 * 60 * 1000;

  async function handleCancel(e: React.FormEvent) {
    e.preventDefault();
    if (!ewb) return;
    setError(null);
    try {
      setSubmitting(true);
      const result = await cancelEWayBill(ewb.id, {
        cancelRsnCode: cancelRsn,
        cancelRmrk: cancelRmrk.trim() || undefined,
      });
      setEwb(result);
      setShowCancelForm(false);
    } catch (err: any) {
      setError(err.message ?? "Cancellation failed");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-xl border border-slate-300 dark:border-white/10 bg-slate-50 dark:bg-black/40 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-400/70 transition";

  return (
    <div className="rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-900/10 p-4">
      <h3 className="text-sm font-semibold text-sky-900 dark:text-sky-100 mb-3">
        E-Way Bill
      </h3>

      {/* ── GENERATED ── */}
      {ewb?.status === "GENERATED" && (
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-3">
            <div>
              <p className="text-xs font-bold text-emerald-900 dark:text-emerald-100 tracking-wide">
                EWB No: {ewb.ewbNumber}
              </p>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                Valid until{" "}
                {ewb.validUpto
                  ? new Date(ewb.validUpto).toLocaleString("en-IN")
                  : "—"}
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                {ewb.transMode} · {ewb.vehicleNumber ?? "—"} · {ewb.distance} km
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold text-white uppercase">
              Active
            </span>
          </div>

          {canCancel && !showCancelForm && (
            <button
              onClick={() => setShowCancelForm(true)}
              className="text-xs text-rose-500 hover:underline"
            >
              Cancel E-Way Bill
            </button>
          )}

          {showCancelForm && (
            <form onSubmit={handleCancel} className="space-y-2 pt-1">
              <select
                value={cancelRsn}
                onChange={(e) => setCancelRsn(Number(e.target.value) as 1 | 2 | 3)}
                className={inputCls}
              >
                {CANCEL_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Remarks (optional)"
                value={cancelRmrk}
                onChange={(e) => setCancelRmrk(e.target.value)}
                className={inputCls}
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1.5 rounded-lg bg-rose-500 hover:bg-rose-600 text-white text-xs font-semibold disabled:opacity-50 transition"
                >
                  {submitting ? "Cancelling…" : "Confirm Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCancelForm(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition"
                >
                  Back
                </button>
              </div>
              {error && <p className="text-xs text-rose-500">{error}</p>}
            </form>
          )}
        </div>
      )}

      {/* ── CANCELLED ── */}
      {ewb?.status === "CANCELLED" && (
        <div className="rounded-xl border border-slate-300 dark:border-white/10 bg-slate-100 dark:bg-white/5 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
            Cancelled
          </p>
          {ewb.cancelReason && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Reason: {ewb.cancelReason}
            </p>
          )}
        </div>
      )}

      {/* ── NOT YET ELIGIBLE / BETA NOTICE (shown when no active EWB) ── */}
      {(!ewb?.status || ewb.status === "DRAFT" || ewb.status === "FAILED" || ewb.status === "GENERATING") && (
        <div className="space-y-3 mt-1">
          <div className="flex items-start gap-3 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 px-4 py-3">
            <span className="text-lg shrink-0">🚧</span>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200 mb-1">
                E-Way Bill — Beta (Not Yet Available)
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Sorry, you have not been shortlisted as one of the taxpayers generating more than{" "}
                <strong>25,000 invoices per month</strong>. NIC is rolling out direct API access in batches —
                you will be considered in the next batch.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-sky-200 dark:border-sky-500/20 bg-sky-50/50 dark:bg-sky-900/10 px-4 py-3 space-y-1.5">
            <p className="text-xs font-semibold text-sky-800 dark:text-sky-200">
              What you can do right now
            </p>
            <ul className="text-xs text-sky-700 dark:text-sky-300 space-y-1 list-disc list-inside leading-relaxed">
              <li>
                Log in to{" "}
                <span className="font-mono font-medium">ewaybillgst.gov.in</span>{" "}
                with your GSTIN and generate the E-Way Bill manually.
              </li>
              <li>
                Note the EWB number and attach it to this invoice for your records.
              </li>
              <li>
                Once NIC grants API access to your GSTIN, generation will work directly from here.
              </li>
            </ul>
          </div>

          <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
            🔬 This feature is in beta — NIC E-Way Bill API access is being expanded in phases.
          </p>
        </div>
      )}
    </div>
  );
}
