"use client";

import { type PaymentMode } from "@/hooks/useInvoiceForm";
import { type TradeInVoucher } from "@/services/tradein.api";
import { type Shop } from "@/services/shops.api";
import { UpiQrCode } from "./UpiQrCode";
import { Trash2, IndianRupee, Zap, CheckCircle2 } from "lucide-react";

interface SplitPayment {
  id: string;
  mode: Exclude<PaymentMode, "MIXED" | "TCV">;
  amount: string;
}

interface PaymentPanelProps {
  shop: Shop;
  // Totals
  subtotal: number;
  totalGst: number;
  grandTotal: number;
  loyaltyDiscount: number;
  // Payment
  paymentMode: PaymentMode;
  onPaymentModeChange: (m: PaymentMode) => void;
  splitPayments: SplitPayment[];
  onSplitChange: (splits: SplitPayment[]) => void;
  // TCV Voucher
  appliedVoucher: TradeInVoucher | null;
  tcvBalanceMode: PaymentMode;
  onTcvBalanceModeChange: (m: PaymentMode) => void;
  voucherCode: string;
  onVoucherCodeChange: (v: string) => void;
  voucherLookupLoading: boolean;
  voucherError: string | null;
  onVoucherLookup: () => void;
  onRemoveVoucher: () => void;
  // Submit
  loading: boolean;
  onSubmit: () => void;
  hasCustomer: boolean;
  hasItems: boolean;
}

const PAYMENT_MODES: { mode: PaymentMode; label: string; color: string; activeColor: string }[] = [
  { mode: "CASH",   label: "Cash",   color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-emerald-500 text-white border-emerald-400 shadow-emerald-400/30 shadow-lg" },
  { mode: "UPI",    label: "UPI",    color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-violet-500 text-white border-violet-400 shadow-violet-400/30 shadow-lg" },
  { mode: "CARD",   label: "Card",   color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-teal-500 text-white border-teal-400 shadow-teal-400/30 shadow-lg" },
  { mode: "BANK",   label: "Bank",   color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-blue-500 text-white border-blue-400 shadow-blue-400/30 shadow-lg" },
  { mode: "CREDIT", label: "Credit", color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-indigo-500 text-white border-indigo-400 shadow-indigo-400/30 shadow-lg" },
  { mode: "MIXED",  label: "Split",  color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-amber-500 text-white border-amber-400 shadow-amber-400/30 shadow-lg" },
  { mode: "TCV",    label: "🎟 TCV", color: "bg-slate-100 dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10", activeColor: "bg-orange-500 text-white border-orange-400 shadow-orange-400/30 shadow-lg" },
];

export function PaymentPanel({
  shop,
  subtotal,
  totalGst,
  grandTotal,
  loyaltyDiscount,
  paymentMode,
  onPaymentModeChange,
  splitPayments,
  onSplitChange,
  appliedVoucher,
  tcvBalanceMode,
  onTcvBalanceModeChange,
  voucherCode,
  onVoucherCodeChange,
  voucherLookupLoading,
  voucherError,
  onVoucherLookup,
  onRemoveVoucher,
  loading,
  onSubmit,
  hasCustomer,
  hasItems,
}: PaymentPanelProps) {
  const voucherCredit = appliedVoucher ? Math.min(appliedVoucher.amount, grandTotal) : 0;
  const cashDue = Math.max(0, grandTotal - voucherCredit);
  const splitTotal = splitPayments.reduce((a, p) => a + (parseFloat(p.amount) || 0), 0);

  let submitHint = "";
  if (!hasCustomer) submitHint = "Select a customer to continue";
  else if (!hasItems) submitHint = "Add at least one product";

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Running Total Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-gradient-to-b from-slate-50 to-white dark:from-white/8 dark:to-white/5 backdrop-blur-xl p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-4">
          Invoice Total
        </p>
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Subtotal</span>
            <span>₹{subtotal.toFixed(2)}</span>
          </div>
          {shop.gstEnabled && (
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
              <span>GST</span>
              <span>₹{totalGst.toFixed(2)}</span>
            </div>
          )}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm text-emerald-600 dark:text-emerald-400">
              <span>♦ Loyalty</span>
              <span>-₹{loyaltyDiscount.toFixed(2)}</span>
            </div>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-end">
          <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Grand Total</span>
          <span className="text-3xl font-black text-teal-600 dark:text-teal-400 leading-none">
            ₹{grandTotal.toFixed(2)}
          </span>
        </div>

        {/* TCV Breakdown */}
        {appliedVoucher && (
          <div className="mt-4 pt-4 border-t border-amber-300/30 dark:border-amber-500/20 space-y-2 text-xs">
            <div className="flex justify-between text-amber-700 dark:text-amber-300">
              <span>🎟 Trade Credit ({appliedVoucher.voucherCode})</span>
              <span className="font-semibold">-₹{voucherCredit.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-bold text-teal-700 dark:text-teal-300">
              <span>Cash to Collect</span>
              <span>₹{cashDue.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Payment Mode */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-white/5 backdrop-blur-xl p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-3">
          Payment Mode
        </p>
        <div className="grid grid-cols-4 gap-2">
          {PAYMENT_MODES.map(({ mode, label, color, activeColor }) => (
            <button
              key={mode}
              onClick={() => { onPaymentModeChange(mode); if (mode !== "TCV") onRemoveVoucher(); }}
              className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-200 ${paymentMode === mode ? activeColor : color}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* UPI QR Code */}
        {paymentMode === "UPI" && shop.upiId && grandTotal > 0 && (
          <UpiQrCode upiId={shop.upiId} amount={grandTotal} shopName={shop.name} />
        )}
        {paymentMode === "UPI" && !shop.upiId && (
          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            ⚠️ UPI ID not configured for this shop. Add it in Shop Settings to show QR.
          </div>
        )}

        {/* MIXED / Split */}
        {paymentMode === "MIXED" && (
          <div className="mt-4 rounded-xl border border-amber-400/20 bg-amber-50/50 dark:bg-amber-400/5 p-3 space-y-3">
            {splitPayments.map((payment, idx) => (
              <div key={payment.id} className="flex gap-2 items-center">
                <select
                  value={payment.mode}
                  onChange={(e) => {
                    const s = [...splitPayments];
                    s[idx].mode = e.target.value as any;
                    onSplitChange(s);
                  }}
                  className="w-20 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-slate-900 dark:text-white"
                >
                  <option value="CASH">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="BANK">Bank</option>
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">₹</span>
                  <input
                    type="number"
                    value={payment.amount}
                    onChange={(e) => {
                      const s = [...splitPayments];
                      s[idx].amount = e.target.value;
                      onSplitChange(s);
                    }}
                    className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/40 text-xs text-slate-900 dark:text-white"
                  />
                </div>
                {splitPayments.length > 1 && (
                  <button onClick={() => onSplitChange(splitPayments.filter((_, i) => i !== idx))} className="text-rose-400 hover:text-rose-600">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            <button
              onClick={() => onSplitChange([...splitPayments, { id: crypto.randomUUID(), mode: "CASH", amount: "" }])}
              className="text-xs font-semibold text-amber-700 dark:text-amber-300 hover:text-amber-800"
            >
              + Add row
            </button>
            <div className={`flex justify-between text-xs font-bold pt-2 border-t border-amber-200 dark:border-amber-700/30 ${splitTotal > grandTotal + 1 ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"}`}>
              <span>Total</span>
              <span>₹{splitTotal.toFixed(2)} / ₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* TCV Voucher  */}
        {paymentMode === "TCV" && (
          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-50/50 dark:bg-amber-900/20 p-3 space-y-3">
            <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">
              🎟 Trade-in Credit Voucher — GST on full invoice value (CBIC Circular 243/2024)
            </p>
            {!appliedVoucher ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. TCV-0001"
                    value={voucherCode}
                    onChange={(e) => onVoucherCodeChange(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === "Enter" && onVoucherLookup()}
                    className="flex-1 rounded-lg border border-amber-300 dark:border-amber-600 bg-white dark:bg-black/40 px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  />
                  <button
                    type="button"
                    onClick={onVoucherLookup}
                    disabled={voucherLookupLoading || !voucherCode.trim()}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold disabled:opacity-50"
                  >
                    {voucherLookupLoading ? "..." : "Validate"}
                  </button>
                </div>
                {voucherError && <p className="text-[10px] text-rose-600 dark:text-rose-400">{voucherError}</p>}
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-100 dark:bg-amber-900/30 px-3 py-2">
                  <div>
                    <p className="text-xs font-bold text-amber-900 dark:text-amber-100">
                      {appliedVoucher.voucherCode} — ₹{appliedVoucher.amount.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">
                      {appliedVoucher.customerName} · Exp {new Date(appliedVoucher.expiresAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <button type="button" onClick={onRemoveVoucher} className="text-[10px] text-rose-500 hover:underline">Remove</button>
                </div>
                {appliedVoucher.amount < grandTotal && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                      Balance ₹{(grandTotal - appliedVoucher.amount).toLocaleString("en-IN")} — collect via:
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {(["CASH", "UPI", "BANK", "CARD"] as PaymentMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => onTcvBalanceModeChange(m)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition ${tcvBalanceMode === m ? "bg-teal-500 text-white border-teal-400" : "bg-white dark:bg-black/40 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10"}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <div className="mt-auto">
        {submitHint && (
          <p className="text-center text-[10px] text-slate-400 dark:text-slate-500 mb-2 flex items-center justify-center gap-1">
            <span>⚠</span> {submitHint}
          </p>
        )}
        <button
          onClick={onSubmit}
          disabled={loading || !hasCustomer || !hasItems}
          className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all duration-200
            bg-gradient-to-r from-teal-500 to-emerald-500
            text-white
            shadow-[0_12px_30px_rgba(13,148,136,0.4)]
            hover:shadow-[0_16px_40px_rgba(13,148,136,0.5)] hover:scale-[1.01]
            disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none
            flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Invoice...
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Confirm & Create Invoice
            </>
          )}
        </button>
      </div>
    </div>
  );
}
