"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { motion } from "framer-motion";
import {
  Sprout,
  TrendingUp,
  Zap,
  Crown,
  Check,
  ArrowRight,
  Calculator,
  ChevronDown,
  ChevronUp,
  Repeat,
  Star,
  Users,
  HeadphonesIcon,
  Megaphone,
  BadgePercent,
} from "lucide-react";

const TIERS = [
  {
    id: "starter",
    name: "Starter",
    icon: Sprout,
    emoji: "🌱",
    range: "0 – 4 shops",
    min: 0,
    max: 4,
    firstCommission: 30,
    recurringCommission: 5,
    color: "from-slate-400 to-slate-600",
    bgLight: "bg-slate-50 border-slate-200",
    bgDark: "dark:bg-slate-800/40 dark:border-slate-700",
    textColor: "text-slate-700 dark:text-slate-300",
    badgeBg: "bg-slate-100 dark:bg-slate-800",
    featured: false,
    perks: [
      "30% commission on first payment",
      "5% recurring on every renewal",
      "Dedicated partner portal access",
      "Promo code generator (up to 5 codes)",
      "Real-time commission dashboard",
      "Email support",
    ],
  },
  {
    id: "growth",
    name: "Growth",
    icon: TrendingUp,
    emoji: "📈",
    range: "5 – 20 shops",
    min: 5,
    max: 20,
    firstCommission: 30,
    recurringCommission: 10,
    color: "from-blue-500 to-cyan-500",
    bgLight: "bg-blue-50 border-blue-200",
    bgDark: "dark:bg-blue-900/20 dark:border-blue-700/50",
    textColor: "text-blue-700 dark:text-blue-300",
    badgeBg: "bg-blue-100 dark:bg-blue-900/40",
    featured: false,
    perks: [
      "30% commission on first payment",
      "10% recurring on every renewal",
      "Priority email support",
      "Co-branded landing page",
      "Monthly performance report",
      "Unlock custom bonus campaigns",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    emoji: "⚡",
    range: "21 – 50 shops",
    min: 21,
    max: 50,
    firstCommission: 30,
    recurringCommission: 15,
    color: "from-violet-600 to-indigo-600",
    bgLight: "bg-violet-50 border-violet-300",
    bgDark: "dark:bg-violet-900/20 dark:border-violet-700/50",
    textColor: "text-violet-700 dark:text-violet-300",
    badgeBg: "bg-violet-100 dark:bg-violet-900/40",
    featured: true,
    perks: [
      "30% commission on first payment",
      "15% recurring on every renewal",
      "Dedicated onboarding call on request",
      "WhatsApp group access (on request)",
      "Featured in MobiBix partner directory",
      "Co-marketing assistance on request",
      "Early access to new features",
    ],
  },
  {
    id: "elite",
    name: "Elite",
    icon: Crown,
    emoji: "👑",
    range: "50+ shops",
    min: 51,
    max: null,
    firstCommission: 30,
    recurringCommission: 20,
    color: "from-amber-500 to-orange-500",
    bgLight: "bg-amber-50 border-amber-300",
    bgDark: "dark:bg-amber-900/20 dark:border-amber-700/50",
    textColor: "text-amber-700 dark:text-amber-300",
    badgeBg: "bg-amber-100 dark:bg-amber-900/40",
    featured: false,
    perks: [
      "30% commission on first payment",
      "20% recurring on every renewal",
      "Named partner contact for escalations",
      "Custom payout terms (on agreement)",
      "MobiBix Elite badge + co-brand kit",
      "Revenue share on upsell revenue",
      "Invite to product roadmap reviews",
      "Annual partner summit invite",
    ],
  },
];

const PLAN_PRICE = 4999; // ₹/yr base plan

const FAQS = [
  {
    q: "How is my tier determined?",
    a: "Your tier is based on the total number of active paying shops under your referral code. Trial shops don't count — only shops with an active paid subscription.",
  },
  {
    q: "When does my tier upgrade?",
    a: "Tier upgrades happen automatically at the start of the next billing cycle after you cross the threshold. You'll receive an in-portal notification and email confirmation.",
  },
  {
    q: "What happens to my recurring commission when I upgrade tiers?",
    a: "The new recurring commission rate applies to all future renewal payments across all your referred shops — including those that joined before the upgrade. It's retroactive on future renewals.",
  },
  {
    q: "Is the 30% first payment rate the same at all tiers?",
    a: "Yes. Every tier earns 30% on the first payment from each referred shop. The tier system is designed to reward your commitment through increasing recurring income, not one-time payouts.",
  },
  {
    q: "When do I get paid?",
    a: "Commissions are verified after a 30-day hold period (for refund protection), then paid out monthly via bank transfer or UPI. You can track all pending and confirmed commissions in your partner portal.",
  },
  {
    q: "Can I lose my tier?",
    a: "Tiers are based on active shops. If shops churn and your count drops below a threshold, you move down at the next quarterly review. We notify you 30 days in advance so you can act.",
  },
];

export default function PartnerTiersPage() {
  const [shops, setShops] = useState(10);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const currentTier =
    shops >= 51
      ? TIERS[3]
      : shops >= 21
      ? TIERS[2]
      : shops >= 5
      ? TIERS[1]
      : TIERS[0];

  const yearlyPlanPrice = PLAN_PRICE;
  const firstPaymentEarning = Math.round((yearlyPlanPrice * currentTier.firstCommission) / 100);
  const recurringEarning = Math.round((yearlyPlanPrice * currentTier.recurringCommission) / 100);
  const year1 = shops * firstPaymentEarning; // first payment only — recurring starts at renewal (Year 2)
  const year2plus = shops * recurringEarning;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />

      {/* Hero */}
      <section className="relative pt-40 pb-16 px-6 text-center z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-0 right-[-10%] w-[40%] h-[40%] bg-violet-600/8 rounded-full blur-[130px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl relative z-10">
          <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-primary/20 bg-primary/5 text-xs font-black uppercase tracking-widest text-primary mb-8">
            <BadgePercent className="w-4 h-4" /> Partner Tier Program
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
            The More You Grow,<br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
              {" "}The More You Earn.
            </span>
          </h1>
          <p className="text-xl text-muted-foreground font-bold mb-6 max-w-3xl mx-auto leading-relaxed">
            Every tier earns <strong className="text-foreground">30% on first payments</strong>. Scale your network to unlock recurring income that compounds — up to <strong className="text-foreground">20% on every renewal, forever.</strong>
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4 mt-8">
            <Link
              href="/partner/apply"
              className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2"
            >
              Apply Now <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/partner/login"
              className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
            >
              Partner Login
            </Link>
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="px-6 py-20 relative z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Four Tiers. One Goal.</h2>
            <p className="text-muted-foreground font-bold max-w-xl mx-auto">
              Each tier unlocks higher recurring commissions and deeper partnership support.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {TIERS.map((tier, i) => {
              const Icon = tier.icon;
              return (
                <motion.div
                  key={tier.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                  className={`relative rounded-[2.5rem] border p-8 flex flex-col ${tier.bgLight} ${tier.bgDark} ${tier.featured ? "ring-2 ring-violet-500 scale-[1.03] shadow-2xl shadow-violet-500/10 z-10" : ""}`}
                >
                  {tier.featured && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full shadow-xl ring-4 ring-background">
                        MOST POPULAR
                      </span>
                    </div>
                  )}

                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mb-5 shadow-lg`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{tier.emoji}</span>
                      <h3 className={`text-2xl font-black tracking-tight ${tier.textColor}`}>{tier.name}</h3>
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${tier.badgeBg} ${tier.textColor}`}>
                      {tier.range}
                    </span>
                  </div>

                  <div className="mb-6 space-y-2">
                    <div className="flex items-center justify-between p-3 bg-white/60 dark:bg-black/20 rounded-xl">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">First Payment</span>
                      <span className="text-2xl font-black text-foreground">{tier.firstCommission}%</span>
                    </div>
                    <div className={`flex items-center justify-between p-3 bg-gradient-to-r ${tier.color} rounded-xl`}>
                      <span className="text-xs font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> Recurring
                      </span>
                      <span className="text-2xl font-black text-white">{tier.recurringCommission}%</span>
                    </div>
                  </div>

                  <ul className="space-y-2.5 flex-1">
                    {tier.perks.map((perk, j) => (
                      <li key={j} className="flex items-start gap-2.5">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.textColor}`} />
                        <span className="text-sm font-medium text-muted-foreground">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Earnings Calculator */}
      <section className="px-6 py-24 bg-muted/30 border-t border-border relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 py-1 px-3 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-black uppercase tracking-widest text-primary mb-4">
              <Calculator className="w-3.5 h-3.5" /> Earnings Calculator
            </span>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">
              See Your Potential
            </h2>
          </div>

          <div className="bg-card border border-border rounded-[3rem] p-8 md:p-12 shadow-xl">
            <div className="mb-8">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                  Shops in Your Network
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-black px-3 py-1 rounded-full ${currentTier.badgeBg} ${currentTier.textColor}`}>
                    {currentTier.emoji} {currentTier.name} Tier
                  </span>
                  <span className="text-3xl font-black text-foreground">{shops}</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={80}
                value={shops}
                onChange={(e) => setShops(Number(e.target.value))}
                className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-[10px] font-bold text-muted-foreground/60 mt-1">
                <span>1</span><span>Starter</span><span>Growth</span><span>Pro</span><span>Elite 50+</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="p-5 bg-muted/50 rounded-2xl text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground mb-2">First Payment Rate</p>
                <p className="text-4xl font-black text-foreground">{currentTier.firstCommission}%</p>
                <p className="text-xs text-muted-foreground mt-1">per shop</p>
              </div>
              <div className={`p-5 bg-gradient-to-br ${currentTier.color} rounded-2xl text-center shadow-lg`}>
                <p className="text-[11px] font-black uppercase tracking-widest text-white/80 mb-2">Recurring Rate</p>
                <p className="text-4xl font-black text-white">{currentTier.recurringCommission}%</p>
                <p className="text-xs text-white/70 mt-1">every renewal</p>
              </div>
              <div className="p-5 bg-primary/10 border border-primary/20 rounded-2xl text-center">
                <p className="text-[11px] font-black uppercase tracking-widest text-primary mb-2">Year 2+ Passive</p>
                <p className="text-4xl font-black text-foreground">₹{year2plus.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground mt-1">yearly, no new effort</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between px-5 py-4 bg-muted/60 rounded-2xl">
                <span className="text-sm font-bold text-muted-foreground">Year 1 total earnings ({shops} shops)</span>
                <span className="text-xl font-black text-foreground">₹{year1.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex items-center justify-between px-5 py-4 bg-primary/8 border border-primary/20 rounded-2xl">
                <div>
                  <span className="text-sm font-bold text-primary">Year 2 onwards (recurring only)</span>
                  <span className="text-xs text-muted-foreground ml-2">— just keep them subscribed</span>
                </div>
                <span className="text-xl font-black text-primary">₹{year2plus.toLocaleString("en-IN")}/yr</span>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/50 text-center mt-4">
              Based on ₹{PLAN_PRICE.toLocaleString("en-IN")}/yr plan · All figures in INR · Illustrative only
            </p>
          </div>
        </div>
      </section>

      {/* Tier Progression Visual */}
      <section className="px-6 py-24 border-t border-border relative z-10">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Your Growth Path</h2>
            <p className="text-muted-foreground font-bold">Every shop you bring in compounds your income. Here's what the journey looks like.</p>
          </div>

          <div className="relative">
            {/* Connector line */}
            <div className="absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-slate-300 via-violet-400 to-amber-400 hidden md:block" />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 relative z-10">
              {TIERS.map((tier, i) => {
                const Icon = tier.icon;
                return (
                  <motion.div
                    key={tier.id}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className={`w-20 h-20 rounded-[1.5rem] bg-gradient-to-br ${tier.color} flex items-center justify-center mb-4 shadow-xl`}>
                      <Icon className="w-9 h-9 text-white" />
                    </div>
                    <span className="text-lg font-black mb-1">{tier.emoji} {tier.name}</span>
                    <span className="text-xs font-bold text-muted-foreground mb-3">{tier.range}</span>
                    <div className="space-y-1 w-full">
                      <div className="text-center p-2 bg-muted/40 rounded-xl">
                        <span className="text-xs text-muted-foreground font-bold">Recurring</span>
                        <span className={`block text-xl font-black ${tier.textColor}`}>{tier.recurringCommission}%</span>
                      </div>
                    </div>
                    {tier.max && (
                      <div className="mt-3 flex items-center gap-1 text-muted-foreground/60">
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-[10px] font-bold">{tier.max + 1} shops → {TIERS[i + 1]?.name}</span>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* What You Get Beyond Commission */}
      <section className="px-6 py-24 bg-muted/30 border-t border-border relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">More Than Just Commission</h2>
            <p className="text-muted-foreground font-bold max-w-2xl mx-auto">We invest in partners who invest in growth. Every tier unlocks resources to help you close faster.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Users, title: "CRM Dashboard", desc: "Track every shop you referred — their plan, renewal date, and total commission earned per account.", tier: "All tiers" },
              { icon: Star, title: "Custom Promo Codes", desc: "Create up to 5 campaign-specific codes with custom trial durations or bonus months to convert leads faster.", tier: "All tiers" },
              { icon: HeadphonesIcon, title: "Partner Support", desc: "All partners get email support. Growth and above get faster response times. Pro and Elite partners can request a dedicated onboarding call.", tier: "Growth +" },
              { icon: Megaphone, title: "Co-Marketing Assistance", desc: "Pro and Elite partners can request co-marketing help — creatives, campaign guidance, or referral collateral — on a case-by-case basis.", tier: "Pro +" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-7 rounded-[2rem] bg-card border border-border"
              >
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                  <item.icon className="w-6 h-6 text-primary" />
                </div>
                <h4 className="font-black text-lg mb-2">{item.title}</h4>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed mb-4">{item.desc}</p>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/20 bg-primary/5 px-2.5 py-1 rounded-full">
                  {item.tier}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-24 border-t border-border relative z-10">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Tier FAQs</h2>
          </div>

          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-border rounded-2xl overflow-hidden bg-card">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left font-bold hover:bg-muted/30 transition-colors"
                >
                  <span className="pr-4">{faq.q}</span>
                  {openFaq === i ? <ChevronUp className="w-5 h-5 flex-shrink-0 text-primary" /> : <ChevronDown className="w-5 h-5 flex-shrink-0 text-muted-foreground" />}
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-muted-foreground font-medium leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 bg-card border-t border-border relative z-10">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
            Start at Starter. <br />Aim for Elite.
          </h2>
          <p className="text-muted-foreground font-bold mb-10 text-lg max-w-xl mx-auto">
            Every Elite partner started with their first referral. The program is designed so your income grows automatically as your network grows. Apply today.
          </p>
          <Link
            href="/partner/apply"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
          >
            Apply to Partner Program <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-xs text-muted-foreground/60 mt-5">Reviewed within 48 hours · No upfront cost · Cancel anytime</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
