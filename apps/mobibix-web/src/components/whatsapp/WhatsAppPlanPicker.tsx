'use client';

/**
 * WhatsAppPlanPicker
 * ──────────────────
 * Renders WA Official plan tiers with MONTHLY/YEARLY billing toggle
 * and SINGLE PAY / AUTO-PAY selection per plan.
 *
 * Integrates directly with Razorpay:
 * - Single Pay  → createOrder()     → Razorpay Checkout (order_id)   → verifyPayment()
 * - Auto-Pay    → createSubscription() → Razorpay Checkout (subscription_id) → webhook activates
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  createOrder,
  createSubscriptionOrder,
  verifyPayment,
  getWaOfficialPlans,
  WaPlanOption,
} from '@/services/payments.api';
import { Check, Loader2, RefreshCw, Zap } from 'lucide-react';

interface WhatsAppPlanPickerProps {
  onSuccess: (planCode: string) => void;
}

type Cycle = 'MONTHLY' | 'YEARLY';
type PayMode = 'SINGLE' | 'AUTOPAY';

// Hard-coded plan metadata (avoids an extra API field)
const PLAN_META: Record<string, { color: string; highlight: boolean; badge?: string }> = {
  WA_OFFICIAL_STARTER:  { color: 'teal',   highlight: false },
  WA_OFFICIAL_PRO:      { color: 'violet', highlight: true,  badge: 'Most Popular' },
  WA_OFFICIAL_BUSINESS: { color: 'indigo', highlight: false },
};

const COLOR_MAP: Record<string, { ring: string; btn: string; badge: string; check: string }> = {
  teal:   { ring: 'ring-teal-500',   btn: 'bg-teal-600 hover:bg-teal-700',     badge: 'bg-teal-100 text-teal-700',   check: 'text-teal-500' },
  violet: { ring: 'ring-violet-500', btn: 'bg-violet-600 hover:bg-violet-700', badge: 'bg-violet-100 text-violet-700', check: 'text-violet-500' },
  indigo: { ring: 'ring-indigo-500', btn: 'bg-indigo-600 hover:bg-indigo-700', badge: 'bg-indigo-100 text-indigo-700', check: 'text-indigo-500' },
};

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.REMOVED_PAYMENT_INFRA.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay SDK failed to load'));
    document.head.appendChild(script);
  });
}

export default function WhatsAppPlanPicker({ onSuccess }: WhatsAppPlanPickerProps) {
  const [plans, setPlans]       = useState<WaPlanOption[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [cycle, setCycle]       = useState<Cycle>('MONTHLY');
  const [payModes, setPayModes] = useState<Record<string, PayMode>>({});
  const [paying, setPaying]     = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    try {
      const data = await getWaOfficialPlans();
      // Filter only WA_OFFICIAL_* plans, sort by level ascending
      const wa = data.filter((p) => p.code.startsWith('WA_OFFICIAL_'));
      setPlans(wa);
      // Default pay mode per plan
      const defaults: Record<string, PayMode> = {};
      wa.forEach((p) => (defaults[p.code] = 'SINGLE'));
      setPayModes(defaults);
    } catch {
      setError('Failed to load plans. Please refresh.');
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  function getPrice(plan: WaPlanOption): number | null {
    const entry = plan.prices?.find((p) => p.billingCycle === cycle);
    return entry?.price ?? null;
  }

  function hasAutoPay(plan: WaPlanOption): boolean {
    const entry = plan.prices?.find((p) => p.billingCycle === cycle);
    return !!entry?.REMOVED_PAYMENT_INFRAPlanId;
  }

  async function handlePurchase(plan: WaPlanOption) {
    const mode  = payModes[plan.code] ?? 'SINGLE';
    const price = getPrice(plan);
    if (!price) return;

    setPaying(plan.code);
    setError(null);

    try {
      await loadRazorpay();
    } catch {
      setError('Failed to load payment SDK. Check your internet connection.');
      setPaying(null);
      return;
    }

    try {
      if (mode === 'SINGLE') {
        // ── SINGLE PAY FLOW ──────────────────────────────────────────────────
        const order = await createOrder(plan.id, cycle);

        await new Promise<void>((resolve, reject) => {
          const RzpCtor = (window as any).Razorpay;
          const rzp = new RzpCtor({
            key:         order.key,
            order_id:    order.orderId,
            amount:      order.amount,
            currency:    'INR',
            name:        'MobiBix',
            description: `${plan.name} – ${cycle}`,
            theme:       { color: '#7c3aed' },
            modal:       { ondismiss: () => reject(new Error('dismissed')) },
            handler: async (response: any) => {
              try {
                await verifyPayment({
                  orderId:      response.REMOVED_PAYMENT_INFRA_order_id,
                  paymentId:    response.REMOVED_PAYMENT_INFRA_payment_id,
                  signature:    response.REMOVED_PAYMENT_INFRA_signature,
                  planId:       plan.id,
                  billingCycle: cycle,
                });
                resolve();
              } catch (e) {
                reject(e);
              }
            },
          });
          rzp.open();
        });

        onSuccess(plan.code);
      } else {
        // ── AUTO-PAY FLOW ────────────────────────────────────────────────────
        const sub = await createSubscriptionOrder(plan.id, cycle as 'MONTHLY' | 'YEARLY');

        await new Promise<void>((resolve, reject) => {
          const RzpCtor = (window as any).Razorpay;
          const rzp = new RzpCtor({
            key:             sub.key,
            subscription_id: sub.subscriptionId,
            name:            'MobiBix',
            description:     `${plan.name} – ${cycle} Auto-Pay`,
            theme:           { color: '#7c3aed' },
            modal:           { ondismiss: () => reject(new Error('dismissed')) },
            handler: () => resolve(), // activation via subscription.activated webhook
          } as any);
          rzp.open();
        });

        onSuccess(plan.code);
      }
    } catch (err: any) {
      if (err?.message !== 'dismissed') {
        setError(err?.message || 'Payment failed. Please try again.');
      }
    } finally {
      setPaying(null);
    }
  }

  if (loadingPlans) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-violet-600 mr-2" />
        <span className="text-gray-500 font-medium">Loading plans...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing cycle toggle */}
      <div className="flex items-center justify-center">
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl p-1 flex gap-1">
          <button
            onClick={() => setCycle('MONTHLY')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${
              cycle === 'MONTHLY'
                ? 'bg-white dark:bg-slate-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setCycle('YEARLY')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 ${
              cycle === 'YEARLY'
                ? 'bg-white dark:bg-slate-700 shadow text-gray-900 dark:text-white'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            Yearly
            <span className="text-[10px] font-black bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-sm text-red-700 font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <Button variant="ghost" size="sm" className="h-7 text-red-600" onClick={fetchPlans}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const meta   = PLAN_META[plan.code] ?? { color: 'violet', highlight: false };
          const colors = COLOR_MAP[meta.color];
          const price  = getPrice(plan);
          const mode   = payModes[plan.code] ?? 'SINGLE';
          const canAutoPay = hasAutoPay(plan);
          const isLoading = paying === plan.code;

          const monthlyEquiv =
            cycle === 'YEARLY' && price ? Math.round(price / 12) : price;

          return (
            <Card
              key={plan.code}
              className={`rounded-3xl border-2 overflow-hidden transition-all bg-white dark:bg-slate-900 ${
                meta.highlight
                  ? `border-violet-500 shadow-lg shadow-violet-100 dark:shadow-none ring-2 ${colors.ring}`
                  : 'border-gray-100 dark:border-slate-800 shadow-sm'
              }`}
            >
              {meta.badge && (
                <div className={`text-[10px] font-black uppercase tracking-widest text-center py-1.5 text-white ${
                  meta.color === 'violet' ? 'bg-violet-600' : meta.color === 'teal' ? 'bg-teal-600' : 'bg-indigo-600'
                }`}>
                  {meta.badge}
                </div>
              )}
              <CardContent className="p-6 space-y-4">
                {/* Price */}
                <div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
                    {plan.name.replace('WhatsApp Official – ', '')}
                  </p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">
                      ₹{(monthlyEquiv! / 100).toLocaleString('en-IN')}
                    </span>
                    <span className="text-sm text-gray-400 dark:text-gray-500 font-medium pb-0.5">/mo</span>
                  </div>
                  {cycle === 'YEARLY' && price && (
                    <p className="text-xs text-green-600 font-bold mt-0.5">
                      ₹{(price / 100).toLocaleString('en-IN')} billed annually
                    </p>
                  )}
                  <p className="text-xs text-gray-500 font-medium mt-1">{plan.tagline}</p>
                </div>

                {/* Features */}
                <ul className="space-y-2">
                  {(plan.featuresJson || []).map((feat, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300`}>
                      <Check className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${colors.check}`} />
                      {feat}
                    </li>
                  ))}
                </ul>

                {/* Pay mode selector */}
                <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-1 flex gap-1">
                  <button
                    onClick={() => setPayModes((p) => ({ ...p, [plan.code]: 'SINGLE' }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      mode === 'SINGLE' ? 'bg-white dark:bg-slate-700 shadow text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    Pay Once
                  </button>
                  <button
                    onClick={() => canAutoPay && setPayModes((p) => ({ ...p, [plan.code]: 'AUTOPAY' }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                      mode === 'AUTOPAY' ? 'bg-white dark:bg-slate-700 shadow text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
                    } ${!canAutoPay ? 'opacity-40 cursor-not-allowed' : ''}`}
                    title={!canAutoPay ? 'AutoPay not available for this cycle' : undefined}
                  >
                    <Zap className="w-3 h-3" /> Auto-Pay
                  </button>
                </div>

                {mode === 'AUTOPAY' && (
                  <p className="text-[10px] text-gray-400 font-medium -mt-2 text-center">
                    Renews automatically · Cancel anytime
                  </p>
                )}

                {/* CTA */}
                <Button
                  className={`w-full rounded-2xl h-11 font-bold text-white ${colors.btn}`}
                  disabled={isLoading || !price}
                  onClick={() => handlePurchase(plan)}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {isLoading
                    ? 'Processing...'
                    : mode === 'AUTOPAY'
                    ? 'Subscribe — Auto-Pay'
                    : `Pay ₹${(price! / 100).toLocaleString('en-IN')}`}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="text-center text-xs text-gray-400">
        Secured by Razorpay · All prices inclusive of taxes · Cancel anytime
      </p>
    </div>
  );
}
