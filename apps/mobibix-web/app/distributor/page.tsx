import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import {
  Network,
  ShoppingBag,
  TrendingUp,
  Users,
  QrCode,
  Package,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Star,
  Zap,
  Globe,
  LogIn,
} from "lucide-react";

export const metadata: Metadata = {
  title: "MobiBix Distributor Network — Wholesale B2B Platform for Mobile Parts Distributors India",
  description:
    "MobiBix Distributor Network is a free B2B wholesale platform for mobile phone parts distributors in India. Manage your retailer network, share a catalog, track orders, and earn commissions — all from one hub.",
  keywords: [
    "mobile phone distributor software India",
    "B2B wholesale platform mobile shops",
    "distributor management software India",
    "mobile parts wholesale software",
    "retailer network management",
    "phone parts distributor platform",
    "B2B mobile accessories distributor",
    "wholesale order management mobile",
    "distributor ERP India",
    "mobile repair shop wholesale",
  ],
  alternates: { canonical: "https://REMOVED_DOMAIN/distributor" },
  openGraph: {
    title: "MobiBix Distributor Network — Free Wholesale B2B Hub for Mobile Distributors",
    description:
      "Grow your retailer network. Share catalog. Track orders. Earn commissions. Free for distributors — no plan required.",
    url: "https://REMOVED_DOMAIN/distributor",
    siteName: "MobiBix",
    type: "website",
  },
};

export default function DistributorPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 text-center z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/8 rounded-full blur-[130px] pointer-events-none" />

        <div className="container mx-auto max-w-4xl relative z-10">
          <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-indigo-400/30 bg-indigo-500/10 text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-8">
            <Network className="w-4 h-4" /> Free for Distributors · No Subscription Required
          </span>

          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
            Your Retailer <br className="hidden md:block" /> Network. <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">Automated.</span>
          </h1>

          <p className="text-xl text-muted-foreground font-bold mb-10 max-w-3xl mx-auto leading-relaxed">
            MobiBix Distributor Network is a free B2B wholesale hub for mobile phone parts and accessories distributors across India.
            Publish your catalog, receive purchase orders from retailers, track shipments, and grow your network — all from one dashboard.
          </p>

          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/distributor/signup"
              className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/25"
            >
              Create Free Distributor Account
            </Link>
            <Link
              href="/auth"
              className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" /> Distributor Sign In
            </Link>
          </div>

          <p className="text-xs text-muted-foreground mt-5 font-medium">
            Already a MobiBix ERP user? Sign in at <Link href="/auth" className="text-indigo-600 font-bold hover:underline">/auth</Link> — your distributor hub activates automatically.
          </p>
        </div>
      </section>

      {/* Who is this for */}
      <section className="px-6 py-20 relative z-10 bg-muted/30">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Built for Mobile Parts Distributors</h2>
            <p className="text-muted-foreground font-bold max-w-2xl mx-auto">
              If you supply mobile screens, batteries, spare parts, or accessories to local shops, this platform is built specifically for you.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Package,
                title: "Mobile Spare Parts Dealers",
                desc: "LCD screens, batteries, charging ports — publish your entire spare parts catalog and let retailers browse and order 24/7.",
                badge: "50–500 retailers",
              },
              {
                icon: Globe,
                title: "Regional Accessories Wholesalers",
                desc: "Cases, earphones, chargers, cables — manage inventory and wholesale pricing across your entire retailer network from one platform.",
                badge: "District-level reach",
              },
              {
                icon: Users,
                title: "Refurbished Phone Distributors",
                desc: "Grade A/B refurb handsets — create catalog items with per-unit wholesale pricing and stock quantities. Retailers browse and place orders directly from your hub.",
                badge: "Per-unit wholesale",
              },
            ].map((item, i) => (
              <div key={i} className="p-8 rounded-[2rem] bg-card border border-border flex flex-col items-center text-center transition-transform hover:-translate-y-2 group">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <item.icon className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6 flex-1">{item.desc}</p>
                <div className="inline-block px-3 py-1 bg-indigo-500/10 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400">{item.badge}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-24 relative z-10 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Everything You Need to Run Wholesale</h2>
            <p className="text-muted-foreground font-bold max-w-2xl mx-auto">
              One free platform replaces WhatsApp group ordering, Excel stock sheets, and manual invoicing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[
              {
                icon: ShoppingBag,
                title: "Wholesale Catalog Management",
                desc: "Publish products with wholesale pricing, brand, category, and live stock levels. Retailers see real-time availability — no more \"check karo bhai\" calls.",
                color: "indigo",
              },
              {
                icon: Package,
                title: "Purchase Order Inbox",
                desc: "Retailers submit structured purchase orders directly to your dashboard. Confirm, ship, or reject — orders are tracked end-to-end with status updates.",
                color: "violet",
              },
              {
                icon: TrendingUp,
                title: "Live Sales Attribution",
                desc: "When a retailer sells a product they purchased from you, MobiBix records the attribution. See which products and retailers are driving your network volume.",
                color: "emerald",
              },
              {
                icon: BarChart3,
                title: "Analytics Overview",
                desc: "Monthly revenue, units sold, active retailers, top performing products — all in a single glassmorphic dashboard view. Know your network at a glance.",
                color: "blue",
              },
              {
                icon: QrCode,
                title: "QR Code & Referral Link Sharing",
                desc: "Every distributor gets a unique referral link and a downloadable QR code. Retailers scan the QR at onboarding and are automatically linked to your network.",
                color: "amber",
              },
              {
                icon: Star,
                title: "Partner Commission Tracking",
                desc: "If you are also a MobiBix Partner, your referral commissions are integrated into the same dashboard. See earnings, pending payouts, and total paid in one place.",
                color: "rose",
              },
            ].map((f, i) => {
              const colors: Record<string, string> = {
                indigo: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
                violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
                emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
                blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
              };
              return (
                <div key={i} className="flex gap-5 p-6 rounded-2xl bg-card border border-border hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
                  <div className={`w-12 h-12 rounded-xl ${colors[f.color]} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                    <f.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">{f.title}</h3>
                    <p className="text-muted-foreground text-sm font-medium leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="px-6 py-24 bg-muted/30 border-t border-border relative z-10">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-4">Get Started in 3 Steps</h2>
            <p className="text-muted-foreground font-bold max-w-xl mx-auto">No paperwork. No approval process. No credit card.</p>
          </div>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Create Your Free Distributor Account",
                desc: "Sign up at REMOVED_DOMAIN/distributor/signup using your Google account or email. Choose your brand name and a unique referral code like DIST-SHARMA or DIST-NOKIA2024.",
              },
              {
                step: "02",
                title: "Publish Your Catalog & Share Your Code",
                desc: "Add your products — screens, batteries, accessories — with wholesale prices and stock quantities. Share your QR code (downloadable PNG) or referral link with your retailer contacts via WhatsApp.",
              },
              {
                step: "03",
                title: "Receive Orders. Ship. Track Revenue.",
                desc: "Retailers link to your network using your code, browse your catalog, and place purchase orders. You confirm and ship from your dashboard. MobiBix tracks attribution when they sell your products.",
              },
            ].map((s, i) => (
              <div key={i} className="flex gap-6 items-start p-8 rounded-[2rem] bg-card border border-border">
                <div className="text-5xl font-black text-indigo-200 dark:text-indigo-900 select-none flex-shrink-0">{s.step}</div>
                <div className="pt-2">
                  <h3 className="text-xl font-bold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground font-medium leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ERP Upgrade Section */}
      <section className="px-6 py-24 border-t border-border relative z-10">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col lg:flex-row gap-12 items-center">
            <div className="lg:w-1/2 space-y-6">
              <span className="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-black uppercase tracking-widest">Optional Upgrade</span>
              <h2 className="text-4xl font-black uppercase tracking-tighter leading-tight">
                Also run your own shop? Get MobiBix ERP.
              </h2>
              <p className="text-muted-foreground font-bold leading-relaxed">
                The Distributor Network is free — always. But if you also operate a retail or repair shop, upgrade to MobiBix ERP and get both sidebars: your full shop ERP <em>and</em> your distributor hub, side by side.
              </p>
              <ul className="space-y-3 pt-2">
                {[
                  "POS billing, job cards, inventory management",
                  "IMEI tracking and purchase orders (GRN)",
                  "WhatsApp CRM and automated reminders",
                  "Multi-shop support with role-based access",
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all"
              >
                View ERP Pricing <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="lg:w-1/2 w-full">
              <div className="rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Zap className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-black uppercase tracking-wider">Distributor + ERP Mode</h3>
                </div>
                <p className="text-indigo-100 font-medium text-sm leading-relaxed">
                  When you activate a MobiBix ERP plan, your account automatically gains access to both interfaces. One login, two powerful tools.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Retailer Orders", sub: "Distributor Hub" },
                    { label: "POS Sales", sub: "ERP Module" },
                    { label: "Wholesale Catalog", sub: "Distributor Hub" },
                    { label: "Job Cards", sub: "ERP Module" },
                  ].map((item, i) => (
                    <div key={i} className="bg-white/10 rounded-xl p-3 text-center">
                      <p className="text-xs font-black">{item.label}</p>
                      <p className="text-[10px] text-indigo-200 mt-1">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-32 relative z-10 border-t border-border bg-card">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
            Ready to grow your <br /> retailer network?
          </h2>
          <p className="text-muted-foreground font-bold mb-10 text-lg">
            Free account. No credit card. Set up your distributor hub in under 5 minutes.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/distributor/signup"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-600/30"
            >
              Create Free Account <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-3 px-10 py-5 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
            >
              <LogIn className="w-4 h-4" /> Sign In
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Want to earn commissions by referring shops instead?{" "}
            <Link href="/partner" className="text-primary font-bold hover:underline">Join the Partner Program →</Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
