import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import {
  Building2,
  MonitorSmartphone,
  Network,
  Settings2,
  DollarSign,
  TrendingUp,
  Clock,
  ShieldCheck,
  ArrowRight,
  Sprout,
  Zap,
  Crown,
  Repeat,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Partner Program — Affiliate & Reseller | MobiBix",
  description: "Join the MobiBix Partner Program. Earn up to 30% first payment + 20% recurring commission by referring mobile repair shops. Four tiers — Starter to Elite.",
  alternates: { canonical: "https://REMOVED_DOMAIN/partner" },
};

export default function PartnerProgramPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 px-6 text-center z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[130px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl relative z-10">
          <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-primary/20 bg-primary/5 text-xs font-black uppercase tracking-widest text-primary mb-8">
            <DollarSign className="w-4 h-4" /> 30% First Payment · Up to 20% Every Renewal
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
            Grow With <br className="hidden md:block" /> The MobiBix Platform
          </h1>
          <p className="text-xl text-muted-foreground font-bold mb-10 max-w-3xl mx-auto leading-relaxed">
            Whether you are a phone parts distributor, tech YouTuber, or computer repair wholesaler, partner with MobiBix to provide immense value to your audience while building a lucrative recurring revenue stream.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/partner/apply"
              className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25"
            >
              Apply to Partner Program
            </Link>
            <Link
              href="/partner/login"
              className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
            >
              Partner Portal Login
            </Link>
          </div>
        </div>
      </section>

      {/* Target Audiences Grid */}
      <section className="px-6 py-20 relative z-10 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Who is this for?</h2>
            <p className="text-muted-foreground font-bold max-w-2xl mx-auto">
              Our highest earning partners fall into four key categories. We provide custom onboarding for each.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Network, title: "Parts Distributors", desc: "You supply screens, batteries, and OEM parts to local repair shops.", clients: "100s of B2B clients" },
              { icon: MonitorSmartphone, title: "Tech YouTubers", desc: "You review mobile tech or provide B2B IT/Business advice on YouTube.", clients: "10K–500K subscribers" },
              { icon: Building2, title: "Hardware Wholesalers", desc: "Regional electronics and computer repair equipment wholesalers.", clients: "50–500 shops each" },
              { icon: Settings2, title: "WhatsApp API Resellers", desc: "Agencies selling WhatsApp Business APIs looking for vertical SaaS to pitch.", clients: "B2B sales channels" },
            ].map((p, idx) => (
              <div key={idx} className="p-8 rounded-[2rem] bg-card border border-border flex flex-col items-center text-center transition-transform hover:-translate-y-2 group">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <p.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{p.title}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6 flex-1">{p.desc}</p>
                <div className="inline-block px-3 py-1 bg-muted rounded-lg text-xs font-bold text-foreground opacity-70">Reach: {p.clients}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section className="px-6 py-24 relative z-10 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            <div className="lg:w-1/2 space-y-6">
              <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-tight">
                Why partner with MobiBix?
              </h2>
              <p className="text-lg text-muted-foreground font-bold leading-relaxed">
                We believe in growing together. Our partner program offers an industry-leading revenue share alongside massive support for your ecosystem.
              </p>
              <ul className="space-y-5 pt-4">
                {[
                  { icon: TrendingUp, title: "30% on First Payment", desc: "Earn 30% commission every time a shop you referred makes their first subscription payment." },
                  { icon: Clock, title: "Up to 20% on Every Renewal", desc: "Keep earning on every renewal — monthly, quarterly, or annual. Your recurring rate grows as you advance through tiers." },
                  { icon: ShieldCheck, title: "+3 Months Free for Your Referrals", desc: "Shops that sign up using your code get 3 extra months free on their first paid plan — a powerful conversion tool." },
                ].map((item, i) => (
                  <li key={i} className="flex gap-4">
                    <div className="mt-1 w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-lg mb-1">{item.title}</h4>
                      <p className="text-muted-foreground text-sm font-medium">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="aspect-square w-full max-w-md mx-auto relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-blue-600/30 rounded-[3rem] rotate-6 transform-gpu" />
                <div className="absolute inset-0 bg-card border border-border rounded-[3rem] -rotate-3 p-8 flex flex-col justify-center items-center text-center transform-gpu shadow-2xl">
                  <div className="flex items-end gap-4 mb-5">
                    <div className="text-center">
                      <span className="text-5xl font-black italic">30%</span>
                      <p className="text-xs font-bold text-muted-foreground mt-1">First Payment</p>
                    </div>
                    <span className="text-3xl font-black text-muted-foreground mb-4">+</span>
                    <div className="text-center">
                      <span className="text-5xl font-black italic">20%</span>
                      <p className="text-xs font-bold text-muted-foreground mt-1">Recurring (Elite)</p>
                    </div>
                  </div>
                  <div className="w-full h-px bg-border mb-5" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Annual Plan · 50 Shops Example</p>
                  <div className="w-full space-y-2">
                    <div className="flex justify-between items-center px-3 py-2 bg-muted/60 rounded-xl">
                      <span className="text-xs font-bold text-muted-foreground">Year 1 commission</span>
                      <span className="text-lg font-black text-foreground">₹74,975</span>
                    </div>
                    <div className="flex justify-between items-center px-3 py-2 bg-primary/8 rounded-xl border border-primary/20">
                      <span className="text-xs font-bold text-primary">Recurring / year (Pro tier)</span>
                      <span className="text-lg font-black text-primary">₹22,493</span>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/50 mt-4">Based on ₹2,999/yr plan · Pro tier (15% recurring)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tier Teaser */}
      <section className="px-6 py-24 bg-muted/30 border-t border-border relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Four Tiers. Compounding Income.</h2>
            <p className="text-muted-foreground font-bold max-w-2xl mx-auto">
              Every tier earns the same 30% on first payments. Scale your network to unlock recurring income that grows automatically.
            </p>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {[
              { emoji: "🌱", name: "Starter", range: "0–4 shops", recurring: "5%", icon: Sprout, color: "from-slate-400 to-slate-600", featured: false },
              { emoji: "📈", name: "Growth", range: "5–20 shops", recurring: "10%", icon: TrendingUp, color: "from-blue-500 to-cyan-500", featured: false },
              { emoji: "⚡", name: "Pro", range: "21–50 shops", recurring: "15%", icon: Zap, color: "from-violet-600 to-indigo-600", featured: true },
              { emoji: "👑", name: "Elite", range: "50+ shops", recurring: "20%", icon: Crown, color: "from-amber-500 to-orange-500", featured: false },
            ].map((tier, i) => {
              const Icon = tier.icon;
              return (
                <div
                  key={i}
                  className={`relative rounded-[2rem] p-6 text-center border ${tier.featured ? "ring-2 ring-violet-500 bg-violet-50 dark:bg-violet-900/20 border-violet-200" : "bg-card border-border"}`}
                >
                  {tier.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-violet-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full">POPULAR</span>
                    </div>
                  )}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${tier.color} flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <p className="text-lg">{tier.emoji}</p>
                  <h3 className="font-black text-lg mt-1">{tier.name}</h3>
                  <p className="text-xs text-muted-foreground font-bold mb-3">{tier.range}</p>
                  <div className="flex items-center justify-center gap-1 p-2 bg-muted/60 rounded-xl">
                    <Repeat className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xl font-black">{tier.recurring}</span>
                    <span className="text-xs text-muted-foreground font-bold">recurring</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <Link
              href="/partner/tiers"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl border-2 border-primary text-primary font-black uppercase tracking-widest text-sm hover:bg-primary hover:text-background transition-all"
            >
              See Full Tier Breakdown & Earnings Calculator <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="px-6 py-32 relative z-10 border-t border-border bg-card">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
            Ready to become a partner?
          </h2>
          <p className="text-muted-foreground font-bold mb-10 text-lg">
            Apply today. Our team will review your application and provide you with a unique tracking link, promotional materials, and a demo account within 48 hours.
          </p>
          <Link
            href="/partner/apply"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
          >
            Apply to Partner Program <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
