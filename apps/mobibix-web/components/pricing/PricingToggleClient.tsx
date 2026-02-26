"use client";

import { useState } from "react";
import Link from "next/link";
import type { Plan } from "../../app/pricing/page";

export function PricingToggleClient({ plans }: { plans: Plan[] }) {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "YEARLY"
  );
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            MobiBix
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/auth"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Sign In
            </Link>
            <Link
              href="/auth"
              className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 px-4 text-center">
        <div className="container mx-auto max-w-3xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-10">
            Built for Indian mobile shop owners. Start free, grow with
            confidence.
          </p>
          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-2 bg-muted p-1 rounded-lg mb-4">
            {(["MONTHLY", "YEARLY"] as const).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBillingCycle(cycle)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  billingCycle === cycle
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {cycle === "MONTHLY" ? "Monthly" : "Yearly"}
                {cycle === "YEARLY" && (
                  <span className="ml-2 text-xs bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300 px-1.5 py-0.5 rounded-full">
                    Save up to 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      {plans.length === 0 ? (
        <section className="py-10 px-4 text-center text-muted-foreground">
          <p>Pricing plans are loading. Please refresh or try again shortly.</p>
        </section>
      ) : (
        <section className="pb-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => {
                const pricing = plan.pricing.find(
                  (p) => p.cycle === billingCycle
                );
                const isPro = plan.level === 2;
                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl border p-8 flex flex-col ${
                      isPro
                        ? "border-teal-500 bg-gradient-to-b from-teal-50/50 to-background dark:from-teal-900/10"
                        : "border-border bg-card"
                    }`}
                  >
                    {isPro && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gradient-to-r from-teal-500 to-cyan-400 text-white text-xs font-bold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}
                    <div className="mb-6">
                      <h2 className="text-xl font-bold mb-1">{plan.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {plan.tagline}
                      </p>
                    </div>
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          {pricing?.priceFormatted ?? "—"}
                        </span>
                        <span className="text-muted-foreground text-sm">
                          /{billingCycle === "MONTHLY" ? "mo" : "yr"}
                        </span>
                      </div>
                      {billingCycle === "YEARLY" && plan.savings.yearly > 0 && (
                        <p className="text-sm text-teal-600 dark:text-teal-400 mt-1">
                          Save {plan.savings.yearlyFormatted} per year
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/auth?plan=${plan.id}&billing=${billingCycle}`}
                      className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all mb-6 ${
                        isPro
                          ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500"
                          : "bg-muted text-foreground hover:bg-muted/80"
                      }`}
                    >
                      Start 14-Day Free Trial
                    </Link>
                    <div className="space-y-3 flex-1">
                      {plan.features.map((feature, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <svg
                            className="w-5 h-5 text-teal-500 flex-shrink-0 mt-0.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Compare Table */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">Compare Plans</h2>
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  {plans.map((plan) => (
                    <th key={plan.id} className="text-center p-4 font-semibold">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    label: "Shops",
                    render: (p: Plan) => p.limits.maxShops || "Unlimited",
                  },
                  {
                    label: "Staff Accounts",
                    render: (p: Plan) => p.limits.maxStaff || "Unlimited",
                  },
                  {
                    label: "IMEI Tracking",
                    render: () => (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ),
                  },
                  {
                    label: "Repair Job Cards",
                    render: () => (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ),
                  },
                  {
                    label: "GST Billing",
                    render: () => (
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    ),
                  },
                ].map(({ label, render }) => (
                  <tr key={label} className="border-b border-border last:border-0">
                    <td className="p-4 text-sm">{label}</td>
                    {plans.map((plan) => (
                      <td key={plan.id} className="text-center p-4 text-sm">
                        {render(plan)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "What happens after the 14-day free trial?",
                a: "After your trial ends, choose a paid plan to continue. If you don't, your account will move to a limited free tier.",
              },
              {
                q: "Can I switch plans anytime?",
                a: "Yes! Upgrade or downgrade anytime. Changes take effect immediately and we prorate any charges.",
              },
              {
                q: "Are prices inclusive of GST?",
                a: "All prices shown are inclusive of 18% GST. You'll see the full breakdown on your invoice.",
              },
              {
                q: "Do you offer refunds?",
                a: "Refund requests are evaluated case by case. Contact support@REMOVED_DOMAIN within 7 days of billing.",
              },
              {
                q: "What payment methods do you accept?",
                a: "All major credit/debit cards, UPI, net banking, and wallets through Razorpay.",
              },
            ].map(({ q, a }, i) => (
              <div
                key={i}
                className="border border-border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full text-left p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <span className="font-semibold">{q}</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${openFaq === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-muted-foreground text-sm">{a}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>All prices inclusive of 18% GST · Cancel anytime · 14-day free trial</p>
          <p className="mt-2">© 2026 MobiBix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
