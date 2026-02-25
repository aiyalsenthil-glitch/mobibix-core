"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface PricingCycle {
  cycle: string;
  price: number;
  priceFormatted: string;
}

interface Plan {
  id: string;
  code: string;
  name: string;
  level: number;
  tagline: string;
  description: string;
  features: string[];
  pricing: PricingCycle[];
  limits: {
    maxStaff: number | null;
    maxShops: number | null;
    whatsappUtilityQuota: number;
    whatsappMarketingQuota: number;
  };
  savings: {
    yearly: number;
    yearlyPercent: number;
    yearlyFormatted: string;
  };
}

interface PricingData {
  GYM: Plan[];
  MOBILE_SHOP: Plan[];
}

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("YEARLY");
  const [pricingData, setPricingData] = useState<PricingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";
    fetch(`${apiBase}/plans/public/pricing?module=MOBILE_SHOP`)
      .then((res) => res.json())
      .then((data) => {
        setPricingData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load pricing:", err);
        setLoading(false);
      });
  }, []);

  const plans = pricingData?.MOBILE_SHOP || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading pricing...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            MobiBix
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/auth" className="text-sm text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Link
              href="/auth"
              className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-block px-3 py-1 rounded-full border border-border bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground mb-6">
            Transparent Pricing
          </span>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Simple, Scalable Pricing
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Start with a 14-day free trial. No credit card required. Cancel anytime.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="inline-flex items-center gap-3 p-1 rounded-lg bg-muted">
            <button
              onClick={() => setBillingCycle("MONTHLY")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === "MONTHLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("YEARLY")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-all ${
                billingCycle === "YEARLY"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                Save up to 28%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-8">
            {plans.map((plan, index) => {
              const price = plan.pricing.find((p) => p.cycle === billingCycle);
              const isPro = plan.code.includes("PRO");

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl border p-8 ${
                    isPro
                      ? "border-teal-500 bg-gradient-to-br from-teal-500/10 to-cyan-500/5 shadow-xl"
                      : "border-border bg-card"
                  }`}
                >
                  {isPro && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="px-4 py-1 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 text-white text-xs font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.tagline}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        {price?.priceFormatted || "₹0"}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingCycle === "MONTHLY" ? "month" : "year"}
                      </span>
                    </div>
                    {billingCycle === "YEARLY" && plan.savings.yearlyPercent > 0 && (
                      <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                        Save {plan.savings.yearlyFormatted} per year ({plan.savings.yearlyPercent}% off)
                      </p>
                    )}
                  </div>

                  <Link
                    href="/auth"
                    className={`block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all mb-6 ${
                      isPro
                        ? "bg-gradient-to-r from-teal-500 to-cyan-400 text-white hover:from-teal-600 hover:to-cyan-500"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    Start 14-Day Free Trial
                  </Link>

                  <div className="space-y-3">
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

      {/* Feature Comparison Table */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Compare Plans
          </h2>
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
                <tr className="border-b border-border">
                  <td className="p-4 text-sm">Shops</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-4 text-sm">
                      {plan.limits.maxShops || "Unlimited"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 text-sm">Staff Accounts</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-4 text-sm">
                      {plan.limits.maxStaff || "Unlimited"}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 text-sm font-medium">WhatsApp Marketing <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full ml-1">Coming Soon</span></td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-4 text-sm">
                      {plan.limits.whatsappMarketingQuota > 0 ? (
                        <span className="text-muted-foreground italic text-xs">
                          {plan.limits.whatsappMarketingQuota}/mo
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr className="border-b border-border">
                  <td className="p-4 text-sm font-medium">WhatsApp Utility <span className="text-[10px] bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full ml-1">Coming Soon</span></td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-4 text-sm">
                      {plan.limits.whatsappUtilityQuota > 0 ? (
                        <span className="text-muted-foreground italic text-xs">
                          {plan.limits.whatsappUtilityQuota}/mo
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-4 text-sm">Inventory Management</td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="text-center p-4 text-sm">
                      <span className="text-green-600 dark:text-green-400">✓</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-3xl">
          <h2 className="text-3xl font-bold text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <FAQItem
              question="What happens after the 14-day free trial?"
              answer="After your trial ends, you can choose to upgrade to a paid plan. If you don't upgrade, your account will be downgraded to a limited free tier with basic features."
            />
            <FAQItem
              question="Can I switch plans anytime?"
              answer="Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll prorate any charges."
            />
            <FAQItem
              question="Are prices inclusive of GST?"
              answer="All prices shown are inclusive of 18% GST. You'll see the full breakdown on your invoice."
            />
            <FAQItem
              question="Do you offer refunds?"
              answer="Refund requests are evaluated case by case. Contact us at support@REMOVED_DOMAIN within 7 days of your billing date and we'll review your request promptly."
            />
            <FAQItem
              question="What payment methods do you accept?"
              answer="We accept all major credit/debit cards, UPI, net banking, and wallets through Razorpay."
            />
            <FAQItem
              question="Can I manage multiple shops with one account?"
              answer="Yes! The Pro plan includes multi-shop support, allowing you to manage unlimited locations from a single account."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>All prices inclusive of 18% GST • Cancel anytime • 14-day free trial</p>
          <p className="mt-2">© 2026 MobiBix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <span className="font-semibold">{question}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 text-muted-foreground">
          {answer}
        </div>
      )}
    </div>
  );
}
