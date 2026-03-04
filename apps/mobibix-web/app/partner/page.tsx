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
  ArrowRight
} from "lucide-react";

export const metadata: Metadata = {
  title: "Partner Program — Affiliate & Reseller | MobiBix",
  description: "Join the MobiBix Partner Program. Earn up to 30% recurring commission by referring mobile repair shops, hardware distributors, and tech influencers.",
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
            <DollarSign className="w-4 h-4" /> Earn 30% Recurring Commission
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
              {
                icon: Network,
                title: "Parts Distributors",
                desc: "You supply screens, batteries, and OEM parts to local repair shops.",
                clients: "100s of B2B clients",
              },
              {
                icon: MonitorSmartphone,
                title: "Tech YouTubers",
                desc: "You review mobile tech or provide B2B IT/Business advice on YouTube.",
                clients: "10K–500K subscribers",
              },
              {
                icon: Building2,
                title: "Hardware Wholesalers",
                desc: "Regional electronics and computer repair equipment wholesalers.",
                clients: "50–500 shops each",
              },
              {
                icon: Settings2,
                title: "WhatsApp API Resellers",
                desc: "Agencies selling WhatsApp Business APIs looking for vertical SaaS to pitch.",
                clients: "B2B sales channels",
              },
            ].map((p, idx) => (
              <div key={idx} className="p-8 rounded-[2rem] bg-card border border-border flex flex-col items-center text-center transition-transform hover:-translate-y-2 group">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <p.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{p.title}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6 flex-1">
                  {p.desc}
                </p>
                <div className="inline-block px-3 py-1 bg-muted rounded-lg text-xs font-bold text-foreground opacity-70">
                  Reach: {p.clients}
                </div>
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
                  { icon: TrendingUp, title: "30% First Year Revenue", desc: "Get 30% commission on every subscriber you refer for their entire first year." },
                  { icon: Clock, title: "60-Day Cookie Window", desc: "Your link gets credited even if they wait up to two months before signing up." },
                  { icon: ShieldCheck, title: "Transparent Tracking", desc: "Monitor your clicks, signups, and commission payouts in real-time." },
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
                <div className="absolute inset-0 bg-card border border-border rounded-[3rem] -rotate-3 p-10 flex flex-col justify-center items-center text-center transform-gpu shadow-2xl">
                  <span className="text-6xl font-black italic mb-4">30%</span>
                  <p className="text-lg font-bold mb-6">Revenue Share for 12 Months</p>
                  <div className="w-full h-px bg-border my-6" />
                  <p className="text-sm font-bold text-muted-foreground">
                    Example: Refer 50 shops at $50/mo. <br/> You earn <span className="text-foreground">$750/month</span> pure recurring profit.
                  </p>
                </div>
              </div>
            </div>
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
