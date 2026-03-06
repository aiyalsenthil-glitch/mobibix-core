import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { Plan } from "../../pricing/page";

async function fetchBasePrice(): Promise<string> {
  try {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost_REPLACED:3000/api";
    const res = await fetch(`${apiBase}/plans/public/pricing?module=MOBILE_SHOP`, { next: { revalidate: 3600 } });
    if (!res.ok) return "999";
    const json = await res.json();
    const plans: Plan[] = json?.data?.MOBILE_SHOP ?? json?.MOBILE_SHOP ?? [];
    const proPlan = plans.find(p => p.level === 2) || plans[0];
    const monthlyPrice = proPlan?.pricing?.find(p => p.cycle === "MONTHLY")?.price ?? 99900;
    return (monthlyPrice / 100).toString();
  } catch {
    return "999";
  }
}

// ─── Competitor Data ────────────────────────────────────────────────────────
interface CompetitorData {
  name: string;
  slug: string;
  tagline: string;
  targetAudience: string;
  pricingUSD: string;
  pricingINR: string;
  strengths: string[];
  weaknesses: string[];
  verdict: string;
  faq: { q: string; a: string }[];
}

const competitors: Record<string, CompetitorData> = {
  repairdesk: {
    name: "RepairDesk",
    slug: "repairdesk",
    tagline: "The global repair shop software, priced for the West",
    targetAudience: "US, UK & Australian repair shops",
    pricingUSD: "$75–$150/month",
    pricingINR: "₹6,200–₹12,400/month",
    strengths: [
      "Strong US/UK market presence",
      "Good integrations with Stripe & US payment gateways",
      "Large knowledge base and English support",
      "Mature feature set for Apple repair centres",
    ],
    weaknesses: [
      "Priced in USD — 6× more expensive than MobiBix for Indian shops",
      "No WhatsApp notifications (India's primary communication channel)",
      "No GST billing support for India",
      "No UPI or Razorpay payment collection",
      "English-only interface — not localised for India or MENA",
      "Support in US timezones — unhelpful for IST users",
    ],
    verdict:
      "RepairDesk is a solid choice for repair shops in the US and UK who bill in USD. For Indian mobile repair shops, it charges 6× more than MobiBix while missing the features that matter most in India — WhatsApp, GST billing, and UPI collection.",
    faq: [
      {
        q: "Is RepairDesk available in India?",
        a: "RepairDesk works in India but is priced in USD (~₹6,200+/month) and lacks GST billing and WhatsApp support, making MobiBix a far better choice for Indian repair shops.",
      },
      {
        q: "Does RepairDesk support WhatsApp notifications?",
        a: "No. RepairDesk does not have built-in WhatsApp notifications. MobiBix has native WhatsApp integration using the official WhatsApp Business API.",
      },
      {
        q: "Which is cheaper — RepairDesk or MobiBix?",
        a: "MobiBix starts from ₹{{price}}/month, while RepairDesk starts from approximately ₹6,200/month (~$75 USD). MobiBix is dramatically cheaper.",
      },
      {
        q: "Does RepairDesk support GST billing?",
        a: "No. RepairDesk does not support India's GST invoice format. MobiBix generates CGST, SGST, and IGST-compliant invoices automatically.",
      },
    ],
  },
  repairshopr: {
    name: "RepairShopr",
    slug: "repairshopr",
    tagline: "US-focused repair shop software with ticketing",
    targetAudience: "North American computer & phone repair shops",
    pricingUSD: "$49–$149/month",
    pricingINR: "₹4,000–₹12,300/month",
    strengths: [
      "Strong ticketing system for computer repairs",
      "Good marketing automation for US shops",
      "Integrates with QuickBooks",
      "Affordable starter plan in USD",
    ],
    weaknesses: [
      "No WhatsApp integration for customer notifications",
      "No GST or Indian tax billing support",
      "No UPI / Razorpay / Indian payment gateway integration",
      "US-centric UI not optimised for Indian or MENA workflows",
      "Limited mobile repair-specific features",
    ],
    verdict:
      "RepairShopr is popular with US computer repair shops but falls short for Indian mobile repair businesses that need WhatsApp notifications, GST billing, and UPI payment collection.",
    faq: [
      {
        q: "Is RepairShopr available in India?",
        a: "RepairShopr can be accessed in India but lacks critical features like WhatsApp notifications, GST billing, and UPI payment collection that Indian repair shops need.",
      },
      {
        q: "Does RepairShopr support WhatsApp?",
        a: "No. RepairShopr does not have built-in WhatsApp notifications. MobiBix natively sends repair status updates to customers via WhatsApp.",
      },
      {
        q: "How does MobiBix compare to RepairShopr for India?",
        a: "MobiBix is purpose-built for Indian repair shops — with INR pricing (starting at ₹{{price}}/month), GST billing, WhatsApp CRM, UPI collection, and India-time customer support. RepairShopr has none of these.",
      },
    ],
  },
  fixably: {
    name: "Fixably",
    slug: "fixably",
    tagline: "Enterprise Apple repair software for authorised service providers",
    targetAudience: "Apple Authorised Service Providers (EU/US)",
    pricingUSD: "€149+/month (Enterprise)",
    pricingINR: "₹13,500+/month",
    strengths: [
      "Deep Apple GSX integration",
      "Best-in-class for Apple Authorised Service Providers",
      "European GDPR compliance",
      "Advanced warranty claim management",
    ],
    weaknesses: [
      "Extremely expensive — starts at €149/month",
      "Designed only for Apple repairs, not general mobile repairs",
      "No WhatsApp, no Indian GST, no UPI",
      "Requires Apple authorisation to access full features",
      "Complete overkill for independent repair shops",
    ],
    verdict:
      "Fixably is exceptional for Apple Authorised Service Providers in Europe. For an independent mobile repair shop in India, it is prohibitively expensive and entirely wrong-fit.",
    faq: [
      {
        q: "Is Fixably good for Indian repair shops?",
        a: "No. Fixably is designed for Apple-authorised repair centres in Europe/US and costs ₹13,500+/month. MobiBix is purpose-built for Indian repair shops starting at ₹{{price}}/month.",
      },
      {
        q: "What is the best Fixably alternative for India?",
        a: "MobiBix is the best Fixably alternative for Indian repair shops. It supports all device brands (not just Apple), costs 13× less, and includes WhatsApp notifications and GST billing.",
      },
    ],
  },
  vyapar: {
    name: "Vyapar",
    slug: "vyapar",
    tagline: "India's favorite billing app — but not built for the repair workflow",
    targetAudience: "Small Indian retail shops & traders",
    pricingUSD: "~$5–$10/month",
    pricingINR: "₹400–₹800/month",
    strengths: [
      "Industry standard for simple GST billing in India",
      "Very affordable and works offline",
      "Excellent inventory management for boxed products",
      "Huge adoption across small towns in India",
    ],
    weaknesses: [
      "No specialized 'Job Card' system (essential for repair intake)",
      "Cannot track unique IMEIs effectively for repair history",
      "No repair status updates on WhatsApp (only billing), leading to more customer calls",
      "No technician performance or commission tracking for repairs",
      "No repair pipeline (Pending -> In-Progress -> Finished) system",
    ],
    verdict:
      "Vyapar is a brilliant Indian success story for general billing and accounting. If you sell products across a counter, it is arguably the best. However, a mobile repair shop doesn't just 'sell'; it manages service cycles. MobiBix is built for that cycle — from IMEI-linked job cards to automated WhatsApp updates when a phone is fixed.",
    faq: [
      {
        q: "Does Vyapar support GST billing for mobile shops?",
        a: "Yes, Vyapar is extremely strong at GST billing. However, MobiBix also generates 100% compliant Indian GST invoices (CGST/SGST/IGST) but adds mobile repair job cards and IMEI tracking on top.",
      },
      {
        q: "Can I track repair statuses in Vyapar?",
        a: "No. Vyapar does not have a repair pipeline. You cannot see which phones are pending or finished. MobiBix provides a visual repair dashboard and notifies customers automatically via WhatsApp.",
      },
      {
        q: "Why should a mobile shop owner choose MobiBix over Vyapar?",
        a: "Choose Vyapar if you only sell mobile accessories. Choose MobiBix if you do repairs. MobiBix manages the unique IMEIs of inward devices, assigns them to technicians, and sends automated 'Ready for Delivery' alerts.",
      },
    ],
  },
  khatabook: {
    name: "KhataBook",
    slug: "khatabook",
    tagline: "Simple digital ledger — not a repair shop system",
    targetAudience: "Small Indian traders needing basic credit tracking",
    pricingUSD: "Free / minimal",
    pricingINR: "Free",
    strengths: [
      "Free to use",
      "Simple credit/debit ledger",
      "Widely adopted in small Indian shops",
      "Easy to use with no training needed",
    ],
    weaknesses: [
      "No repair job card or ticket system",
      "No IMEI or device inventory management",
      "No WhatsApp automation or CRM",
      "No GST invoice generation",
      "No technician management or reporting",
    ],
    verdict:
      "KhataBook is a digital khata (ledger) — nothing more. Running a mobile repair business on KhataBook is like running a restaurant on a sticky note. MobiBix gives you the complete system.",
    faq: [
      {
        q: "Can I use KhataBook for my repair shop?",
        a: "KhataBook only tracks credit/debit. It has no job cards, no IMEI tracking, no WhatsApp notifications, and no GST billing. MobiBix is the complete solution for repair shops.",
      },
    ],
  },
  tally: {
    name: "TallyPrime",
    slug: "tally",
    tagline: "The king of Indian accounting — but a nightmare for repair shops",
    targetAudience: "CA-managed Indian businesses & large traders",
    pricingUSD: "~$20/month",
    pricingINR: "₹1,500+/month",
    strengths: [
      "Gold standard for Indian accounting & audit",
      "Deep inventory & reports for standard goods",
      "Favored by Accountants & Chartered Accountants",
      "Works 100% offline",
    ],
    weaknesses: [
      "Steep learning curve (requires accounting knowledge)",
      "No native mobile repair 'Job Card' system",
      "No automated WhatsApp notifications for repair updates",
      "Extremely complex to track hundreds of unique IMEIs",
      "Not cloud-native — difficult to access from home/mobile",
    ],
    verdict:
      "Tally is perfect for your CA, but wrong for your counter. While Tally is unbeatable for final balance sheets, it slows down your daily repair intake. MobiBix is designed for speed at the repair desk, with a UI that anyone can learn in 5 minutes.",
    faq: [
      {
        q: "Is Tally better than MobiBix for mobile shops?",
        a: "Tally is better for heavy accounting and auditing. MobiBix is better for daily operations, repair job cards, and WhatsApp CRM. Most modern shops use MobiBix for the counter and give reports to their CAs from it.",
      },
    ],
  },
  busy: {
    name: "Busy Accounting",
    slug: "busy",
    tagline: "Feature-rich Indian ERP — but over-complicated for repairs",
    targetAudience: "SMEs and large retailers in India",
    pricingUSD: "~$15/month",
    pricingINR: "₹1,200+/year",
    strengths: [
      "Highly configurable GST reports",
      "Strong inventory management for hardware stores",
      "Multi-branch accounting features",
      "One-time purchase options available",
    ],
    weaknesses: [
      "Legacy Windows-based UI (feels outdated)",
      "No specialized repair workflow (Intake -> Technician -> Delivery)",
      "Limited WhatsApp integration compared to official API",
      "Difficult for staff to learn without formal training",
      "No customer-facing repair status tracking",
    ],
    verdict:
      "Busy is a powerful ERP for wholesalers. But if you run a service-first mobile shop, Busy lacks the 'heart' of a repair business: the Job Card. MobiBix provides a modern, cloud-native experience that focuses on service efficiency.",
    faq: [
      {
        q: "Should I switch from Busy to MobiBix?",
        a: "If you are struggling to track which repair belongs to which customer or constantly getting calls from customers asking 'Is it fixed?', yes. MobiBix automates the service loop while Busy focuses only on the invoice.",
      },
    ],
  },
};

// ─── Metadata ───────────────────────────────────────────────────────────────
export async function generateStaticParams() {
  return Object.keys(competitors).map((slug) => ({ competitor: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ competitor: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const c = competitors[resolvedParams.competitor];
  if (!c) return { title: "Compare" };
  
  const basePrice = await fetchBasePrice();
  const description = `Honest comparison of MobiBix vs ${c.name}. See why Indian mobile repair shops are switching — WhatsApp notifications, GST billing, UPI collection, and starting at ₹${basePrice}/month.`.replace("{{price}}", basePrice);

  return {
    title: `MobiBix vs ${c.name} (${new Date().getFullYear()}) — Best Repair Shop Software for India`,
    description,
    alternates: { canonical: `https://REMOVED_DOMAIN/compare/${c.slug}` },
    openGraph: {
      title: `MobiBix vs ${c.name} — For Indian Repair Shops`,
      description: `Compare MobiBix and ${c.name} on price, features, and India-readiness.`,
      url: `https://REMOVED_DOMAIN/compare/${c.slug}`,
    },
  };
}

// ─── Component ──────────────────────────────────────────────────────────────
const Check = () => (
  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);
const Cross = () => (
  <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default async function ComparePage({ params }: { params: Promise<{ competitor: string }> }) {
  const resolvedParams = await params;
  const c = competitors[resolvedParams.competitor];
  if (!c) notFound();

  const basePrice = await fetchBasePrice();

  // Dynamically inject basePrice into FAQ
  const processedFaq = c.faq.map(item => ({
    q: item.q,
    a: item.a.replaceAll("{{price}}", basePrice)
  }));

  const isVyapar = resolvedParams.competitor === "vyapar";
  const isKhatabook = resolvedParams.competitor === "khatabook";
  const isTally = resolvedParams.competitor === "tally";
  const isBusy = resolvedParams.competitor === "busy";
  const isGlobal = !isVyapar && !isKhatabook && !isTally && !isBusy;
  const isIndianAcc = isVyapar || isTally || isBusy;

  const comparisonRows = [
    { feature: "WhatsApp Notifications", mobibix: true, competitor: isVyapar || isTally || isBusy },
    { feature: "GST Billing (CGST/SGST/IGST)", mobibix: true, competitor: isIndianAcc },
    { feature: "UPI / Razorpay Payment Collection", mobibix: true, competitor: isIndianAcc },
    { feature: "INR Pricing", mobibix: true, competitor: isIndianAcc || isKhatabook },
    { feature: "Repair Job Card Management", mobibix: true, competitor: !isIndianAcc && !isKhatabook },
    { feature: "IMEI & Serial Number Tracking", mobibix: true, competitor: false },
    { feature: "Multi-Shop Management", mobibix: true, competitor: !isIndianAcc && !isKhatabook },
    { feature: "Technician Performance Tracking", mobibix: true, competitor: false },
    { feature: "India-Time Customer Support", mobibix: true, competitor: isIndianAcc || isKhatabook },
    { feature: "Free 14-Day Trial", mobibix: true, competitor: true },
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: processedFaq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />

        {/* Hero */}
        <section className="relative pt-40 pb-24 px-6 overflow-hidden">
          <div className="fixed inset-0 z-0 pointer-events-none">
            <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[130px]" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[130px]" />
          </div>
          <div className="container mx-auto max-w-4xl text-center relative z-10">
            <span className="inline-block py-1 px-4 rounded-full border border-border bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8">
              Software Comparison {new Date().getFullYear()}
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
              MobiBix vs{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                {c.name}
              </span>
            </h1>
            <p className="text-xl text-muted-foreground font-bold mb-10 max-w-2xl mx-auto leading-relaxed">
              {c.tagline}. Here is an honest side-by-side for Indian mobile repair shop owners.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/signup"
                className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25 active:scale-95"
              >
                Try MobiBix Free — 14 Days
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
              >
                View Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Facts */}
        <section className="px-6 pb-20 relative z-10">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* MobiBix Card */}
              <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <span className="text-background font-black text-xs">M</span>
                  </div>
                  <div>
                    <div className="font-black text-lg uppercase tracking-tight">MobiBix</div>
                    <div className="text-xs font-bold text-primary uppercase tracking-widest">Built for India</div>
                  </div>
                </div>
                <div className="text-3xl font-black mb-1">₹{basePrice}<span className="text-base font-bold text-muted-foreground">/month</span></div>
                <div className="text-sm font-bold text-muted-foreground mb-6">14-day free trial · No credit card</div>
                <ul className="space-y-3">
                  {["WhatsApp + GST + UPI — all built-in", "IMEI & repair job management", "INR pricing, India-time support", "Multi-shop from one dashboard"].map((f) => (
                    <li key={f} className="flex items-center gap-3 text-sm font-bold">
                      <Check /> {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Competitor Card */}
              <div className="p-8 rounded-[2.5rem] bg-muted/30 border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                    <span className="font-black text-xs text-muted-foreground">{c.name[0]}</span>
                  </div>
                  <div>
                    <div className="font-black text-lg uppercase tracking-tight">{c.name}</div>
                    <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{c.targetAudience}</div>
                  </div>
                </div>
                <div className="text-3xl font-black mb-1">{c.pricingINR}<span className="text-base font-bold text-muted-foreground">/month</span></div>
                {isGlobal ? (
                  <div className="text-sm font-bold text-red-500 mb-6">{c.pricingUSD} (USD pricing)</div>
                ) : (
                  <div className="text-sm font-bold text-primary mb-6">Priced in INR</div>
                )}
                <ul className="space-y-3">
                  {c.weaknesses.slice(0, 4).map((w) => (
                    <li key={w} className="flex items-center gap-3 text-sm font-bold text-muted-foreground">
                      {isGlobal ? <Cross /> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30 mr-1" />} {w}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section className="px-6 pb-24 relative z-10">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-center">
              Feature-by-Feature Comparison
            </h2>
            <div className="rounded-[2.5rem] border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left p-6 font-black uppercase tracking-widest text-xs text-muted-foreground">Feature</th>
                    <th className="p-6 font-black uppercase tracking-widest text-xs text-primary text-center">MobiBix</th>
                    <th className="p-6 font-black uppercase tracking-widest text-xs text-muted-foreground text-center">{c.name}</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonRows.map((row, i) => (
                    <tr key={row.feature} className={`border-b border-border ${i % 2 === 0 ? "bg-card/20" : ""}`}>
                      <td className="p-6 font-bold text-foreground">{row.feature}</td>
                      <td className="p-6 text-center">{row.mobibix ? <span className="flex justify-center"><Check /></span> : <span className="flex justify-center"><Cross /></span>}</td>
                      <td className="p-6 text-center">{row.competitor ? <span className="flex justify-center"><Check /></span> : <span className="flex justify-center"><Cross /></span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="px-6 pb-24 relative z-10">
          <div className="container mx-auto max-w-4xl">
            <div className="p-12 rounded-[3rem] bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20">
              <h2 className="text-3xl font-black uppercase tracking-tighter mb-6">Our Honest Verdict</h2>
              <p className="text-lg font-bold text-foreground/80 leading-relaxed mb-8">{c.verdict}</p>
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all"
              >
                Start Free with MobiBix
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="px-6 pb-32 relative z-10">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {processedFaq.map(({ q, a }) => (
                <div key={q} className="p-8 rounded-[2rem] border border-border bg-card/30">
                  <h3 className="font-black text-lg mb-3 uppercase tracking-tight">{q}</h3>
                  <p className="text-muted-foreground font-bold leading-relaxed">{a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Footer compact={false} />
      </div>
    </>
  );
}
