"use client";

import { useEffect, useState } from "react";
import {
  EWayBill,
  EWayBillStatus,
  GenerateEWBDto,
  generateEWayBill,
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

export function EWayBillPanel({ invoiceId, totalAmount, customerGstin, customerDistanceKm }: Props) {
  const [ewb, setEwb] = useState<EWayBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelForm, setShowCancelForm] = useState(false);

  // Generate form state
  const [transMode, setTransMode] = useState<"ROAD" | "RAIL" | "AIR" | "SHIP">("ROAD");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [distance, setDistance] = useState(customerDistanceKm ? String(customerDistanceKm) : "");
  const [transporterName, setTransporterName] = useState("");

  // Cancel form state
  const [cancelRsn, setCancelRsn] = useState<1 | 2 | 3>(2);
  const [cancelRmrk, setCancelRmrk] = useState("");

  // Only shown for B2B invoices above threshold
  const isEligible = !!customerGstin && totalAmount > EWB_THRESHOLD;

  useEffect(() => {
    if (!isEligible) return;
    getEWayBill(invoiceId)
      .then(setEwb)
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

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dist = parseInt(distance, 10);
    if (!dist || dist < 1 || dist > 3000) {
      setError("Distance must be between 1 and 3000 km");
      return;
    }
    if (transMode === "ROAD" && !vehicleNumber.trim()) {
      setError("Vehicle number is required for ROAD transport");
      return;
    }
    const dto: GenerateEWBDto = {
      transMode,
      distance: dist,
      ...(vehicleNumber.trim() && { vehicleNumber: vehicleNumber.trim() }),
      ...(transporterName.trim() && { transporterName: transporterName.trim() }),
    };
    try {
      setSubmitting(true);
      const result = await generateEWayBill(invoiceId, dto);
      setEwb(result);
    } catch (err: any) {
      setError(err.message ?? "Generation failed");
    } finally {
      setSubmitting(false);
    }
  }

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

      {/* ── GENERATING ── */}
      {ewb?.status === "GENERATING" && (
        <div className="flex items-center gap-2 text-sm text-sky-700 dark:text-sky-300">
          <div className="h-4 w-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          Generating with NIC portal…
        </div>
      )}

      {/* ── FAILED ── */}
      {ewb?.status === "FAILED" && (
        <div className="space-y-2">
          <div className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-900/10 px-4 py-3">
            <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
              Generation failed
            </p>
            {ewb.rawResponse?.error != null && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-0.5">
                {String(ewb.rawResponse.error)}
              </p>
            )}
          </div>
          {/* Fall through to show form for retry */}
        </div>
      )}

      {/* ── FORM (DRAFT / FAILED / null) ── */}
      {(!ewb || ewb.status === "DRAFT" || ewb.status === "FAILED") && (
        <form onSubmit={handleGenerate} className="space-y-3 mt-2">
          <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
            ⚠ E-Way Bill required — invoice exceeds ₹50,000
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Transport Mode
              </label>
              <select
                value={transMode}
                onChange={(e) => setTransMode(e.target.value as typeof transMode)}
                className={inputCls}
              >
                <option value="ROAD">Road</option>
                <option value="RAIL">Rail</option>
                <option value="AIR">Air</option>
                <option value="SHIP">Ship</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Distance (km)
              </label>
              <input
                type="number"
                min={1}
                max={3000}
                placeholder="e.g. 250"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                className={inputCls}
                required
              />
            </div>
          </div>

          {transMode === "ROAD" && (
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
                Vehicle Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. KA01AB1234"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                className={inputCls}
                required={transMode === "ROAD"}
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">
              Transporter Name (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Delhivery"
              value={transporterName}
              onChange={(e) => setTransporterName(e.target.value)}
              className={inputCls}
            />
          </div>

          {error && <p className="text-xs text-rose-500">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold py-2.5 disabled:opacity-50 transition"
          >
            {submitting ? "Generating…" : "Generate E-Way Bill"}
          </button>
        </form>
      )}
    </div>
  );
}
