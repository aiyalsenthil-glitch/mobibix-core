import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { Breadcrumbs } from "../../../components/layout/Breadcrumbs";


// ─── Region Data ────────────────────────────────────────────────────────────
interface RegionData {
  slug: string;
  name: string;
  currency: string;
  currencySymbol: string;
  price: string;
  lang: string;
  headline: string;
  subheadline: string;
  localFeatures: string[];
  paymentMethods: string[];
  testimonialName: string;
  testimonialCity: string;
  testimonialText: string;
  seoTitle: string;
  seoDesc: string;
}

const regions: Record<string, RegionData> = {
  india: {
    slug: "india",
    name: "India",
    currency: "INR",
    currencySymbol: "₹",
    price: "₹999",
    lang: "Hindi & English",
    headline: "Mobile Repair Shop Software Built for India",
    subheadline:
      "Manage job cards, send WhatsApp repair alerts, generate GST invoices, and collect payments via UPI — all from one platform trusted by 1,000+ Indian repair shops.",
    localFeatures: [
      "GST billing (CGST / SGST / IGST) — auto-calculated",
      "UPI & Razorpay payment collection",
      "WhatsApp repair status notifications (Official API)",
      "₹INR pricing — no USD conversion surprises",
      "India-time customer support (IST 9AM–9PM)",
      "Compliant with India's Right-to-Repair initiative",
    ],
    paymentMethods: ["UPI", "Razorpay", "PhonePe", "Paytm", "Bank Transfer"],
    testimonialName: "Ravi Kumar",
    testimonialCity: "Chennai",
    testimonialText:
      "MobiBix saved me hours every day. The WhatsApp notifications mean customers stop calling to check repair status. GST invoices in seconds. Truly built for Indian shops.",
    seoTitle:
      "Mobile Repair Shop Software India — GST, WhatsApp & UPI | MobiBix",
    seoDesc:
      "MobiBix is the #1 mobile repair shop software for India. Job cards, GST billing, WhatsApp notifications & UPI collection. 14-day free trial.",
  },
  uae: {
    slug: "uae",
    name: "UAE",
    currency: "AED",
    currencySymbol: "AED",
    price: "AED 49",
    lang: "English & Arabic",
    headline: "Mobile Repair Shop Software for the UAE",
    subheadline:
      "Manage repair jobs, send WhatsApp updates, generate VAT-compliant invoices, and collect payments — purpose-built for repair shops across Dubai, Abu Dhabi, and Sharjah.",
    localFeatures: [
      "VAT billing at 5% (UAE-compliant invoices)",
      "WhatsApp Business API notifications in English & Arabic",
      "AED pricing — no USD conversion",
      "Multi-location management for franchise networks",
      "English & Arabic interface support",
      "Gulf Standard Time customer support",
    ],
    paymentMethods: ["Credit Card", "Bank Transfer", "Digital Wallets"],
    testimonialName: "Ahmed Al Rashid",
    testimonialCity: "Dubai",
    testimonialText:
      "MobiBix transformed how we run our repair centre in Dubai. VAT invoices are perfect, and WhatsApp updates keep our customers happy.",
    seoTitle:
      "Mobile Repair Shop Software UAE — VAT Billing & WhatsApp | MobiBix",
    seoDesc:
      "MobiBix is the best mobile repair shop software for UAE. VAT-compliant billing, WhatsApp notifications, and multi-location management. Try free for 14 days.",
  },
  "saudi-arabia": {
    slug: "saudi-arabia",
    name: "Saudi Arabia",
    currency: "SAR",
    currencySymbol: "SAR",
    price: "SAR 50",
    lang: "English & Arabic",
    headline: "Mobile Repair Shop Software for Saudi Arabia",
    subheadline:
      "Run your repair business across Riyadh, Jeddah, and Dammam with VAT billing, WhatsApp notifications, and multi-branch management — all in one platform.",
    localFeatures: [
      "VAT billing compliant with ZATCA requirements",
      "Arabic interface support",
      "WhatsApp Business API notifications",
      "SAR pricing — transparent costs",
      "Multi-branch dashboard for franchise shops",
      "Customer repair status tracking link",
    ],
    paymentMethods: ["Mada", "SADAD", "Credit Card", "Bank Transfer"],
    testimonialName: "Khalid Al Otaibi",
    testimonialCity: "Riyadh",
    testimonialText:
      "Managing our repair chain across three cities in Saudi Arabia became simple with MobiBix. The WhatsApp alerts are a game changer for customer satisfaction.",
    seoTitle:
      "Mobile Repair Shop Software Saudi Arabia — VAT & WhatsApp | MobiBix",
    seoDesc:
      "MobiBix is the best repair shop software for Saudi Arabia. ZATCA-compliant VAT billing, WhatsApp notifications, and Arabic support. 14-day free trial.",
  },
  malaysia: {
    slug: "malaysia",
    name: "Malaysia",
    currency: "MYR",
    currencySymbol: "MYR",
    price: "MYR 69",
    lang: "English & Bahasa Malaysia",
    headline: "Mobile Repair Shop Software for Malaysia",
    subheadline:
      "Queue up repair jobs, notify customers on WhatsApp in seconds, and manage your Kuala Lumpur or Penang repair shop with ease.",
    localFeatures: [
      "WhatsApp repair status notifications",
      "SST billing support",
      "Multi-shop management",
      "MYR pricing — no conversion headaches",
      "Cloud-based access from anywhere",
      "Mobile app for technicians on the go",
    ],
    paymentMethods: ["FPX", "Touch 'n Go eWallet", "Boost", "Credit Card"],
    testimonialName: "Jason Lim",
    testimonialCity: "Kuala Lumpur",
    testimonialText:
      "The job card system and WhatsApp alerts mean we barely get calls asking about repair status anymore. MobiBix just works for Malaysian repair shops.",
    seoTitle:
      "Mobile Repair Shop Software Malaysia — WhatsApp & Job Cards | MobiBix",
    seoDesc:
      "MobiBix is the best repair shop software for Malaysia. WhatsApp notifications, job card management, and SST billing. Try free for 14 days.",
  },
  indonesia: {
    slug: "indonesia",
    name: "Indonesia",
    currency: "IDR",
    currencySymbol: "IDR",
    price: "IDR 199K",
    lang: "English & Bahasa Indonesia",
    headline: "Software Manajemen Toko Reparasi HP untuk Indonesia",
    subheadline:
      "Kelola pekerjaan reparasi, kirim notifikasi WhatsApp ke pelanggan, dan jalankan banyak cabang toko dari satu platform.",
    localFeatures: [
      "Notifikasi WhatsApp otomatis untuk pelanggan",
      "Manajemen job card dan teknisi",
      "Pelacakan IMEI dan stok suku cadang",
      "Harga dalam IDR",
      "Manajemen multi-toko",
      "PPN billing support",
    ],
    paymentMethods: ["GoPay", "OVO", "Dana", "BCA Transfer", "Mandiri"],
    testimonialName: "Budi Santoso",
    testimonialCity: "Jakarta",
    testimonialText:
      "MobiBix sangat membantu bisnis reparasi saya. Pelanggan langsung dapat notifikasi WhatsApp begitu HP selesai diperbaiki.",
    seoTitle:
      "Software Toko Reparasi HP Indonesia — WhatsApp & Job Card | MobiBix",
    seoDesc:
      "MobiBix adalah software manajemen toko reparasi HP terbaik untuk Indonesia. Notifikasi WhatsApp, job card, dan pelacakan IMEI. Coba gratis 14 hari.",
  },
};

export async function generateStaticParams() {
  return Object.keys(regions).map((slug) => ({ region: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const r = regions[resolvedParams.region];
  if (!r) return { title: "Region" };
  return {
    title: r.seoTitle,
    description: r.seoDesc,
    alternates: {
      canonical: `https://REMOVED_DOMAIN/regions/${r.slug}`,
      // Only inject hreflang tags if the region is UAE
      ...(r.slug === "uae"
        ? {
            languages: {
              en: "https://REMOVED_DOMAIN/regions/uae",
              ar: "https://REMOVED_DOMAIN/ar/regions/uae",
            },
          }
        : {}),
    },
    openGraph: {
      title: r.seoTitle,
      description: r.seoDesc,
      url: `https://REMOVED_DOMAIN/regions/${r.slug}`,
      locale: r.slug === "india" ? "en_IN" : r.slug === "uae" ? "ar_AE" : "en_GB",
    },
  };
}

export default async function RegionPage({ params }: { params: Promise<{ region: string }> }) {
  const resolvedParams = await params;
  const r = regions[resolvedParams.region];
  if (!r) notFound();

  const displayPrice = r.price;

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MobiBix",
    applicationCategory: "BusinessApplication",
    description: r.subheadline,
    url: `https://REMOVED_DOMAIN/regions/${r.slug}`,
    offers: {
      "@type": "Offer",
      price: displayPrice.replace(/[^0-9]/g, ""),
      priceCurrency: r.currency,
      priceValidUntil: "2027-01-01",
    },
    areaServed: { "@type": "Country", name: r.name },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Header />

        {/* Background */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[130px]" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[130px]" />
        </div>

        {/* Hero */}
        <section className="relative pt-40 pb-24 px-6 text-center z-10">
          <div className="container mx-auto max-w-4xl flex flex-col items-center">
            
            <Breadcrumbs 
              items={[
                { name: "Home", item: "https://REMOVED_DOMAIN/" },
                { name: "Regions", item: "https://REMOVED_DOMAIN/regions" },
                { name: r.name, item: `https://REMOVED_DOMAIN/regions/${r.slug}` }
              ]}
            />

            <span className="inline-block py-1 px-4 rounded-full border border-border bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8 mt-4">
              🌍 {r.name}
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
              {r.headline}
            </h1>
            <p className="text-xl text-muted-foreground font-bold mb-10 max-w-3xl mx-auto leading-relaxed">
              {r.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/signup"
                className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25"
              >
                Start Free — 14 Days, No Card
              </Link>
              <Link
                href="/pricing"
                className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
              >
                View {r.currencySymbol} Pricing
              </Link>
            </div>
          </div>
        </section>

        {/* Pricing Badge */}
        <section className="px-6 pb-20 relative z-10">
          <div className="container mx-auto max-w-4xl">
            <div className="p-10 rounded-[3rem] bg-gradient-to-br from-primary/10 to-blue-500/5 border border-primary/20 text-center">
              <div className="text-5xl font-black mb-2">
                {displayPrice}
                <span className="text-2xl font-bold text-muted-foreground">/month</span>
              </div>
              <p className="text-muted-foreground font-bold mb-6">
                Priced in {r.currency} · 14-day full-feature free trial · No credit card required
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {r.paymentMethods.map((p) => (
                  <span key={p} className="px-4 py-2 rounded-xl bg-muted/60 border border-border text-xs font-black uppercase tracking-widest">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Local Features */}
        <section className="px-6 pb-24 relative z-10">
          <div className="container mx-auto max-w-5xl">
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter mb-12 text-center">
              Built for {r.name} — Not a Generic Tool
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {r.localFeatures.map((f) => (
                <div key={f} className="flex items-start gap-4 p-6 rounded-[2rem] border border-border bg-card/30">
                  <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-bold text-foreground leading-relaxed">{f}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial */}
        <section className="px-6 pb-24 relative z-10">
          <div className="container mx-auto max-w-3xl">
            <div className="p-12 rounded-[3rem] bg-card border border-border text-center">
              <div className="text-4xl mb-8">💬</div>
              <blockquote className="text-xl font-bold italic leading-relaxed mb-8 text-foreground/90">
                &quot;{r.testimonialText}&quot;
              </blockquote>
              <div className="font-black uppercase tracking-widest text-sm text-primary">{r.testimonialName}</div>
              <div className="text-xs font-bold text-muted-foreground mt-1">{r.testimonialCity}, {r.name}</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-32 relative z-10">
          <div className="container mx-auto max-w-3xl text-center">
            <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter mb-6">
              Ready to Run a Smarter Repair Shop?
            </h2>
            <p className="text-muted-foreground font-bold mb-10 text-lg">
              Join repair shops across {r.name} who use MobiBix every day. Start free — no credit card, no commitment.
            </p>
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
            >
              Start Your Free 14-Day Trial
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        </section>

        <Footer compact={false} />
      </div>
    </>
  );
}
