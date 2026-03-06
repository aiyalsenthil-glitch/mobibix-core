import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../../components/layout/Header";
import { Footer } from "../../../../components/layout/Footer";
import { Breadcrumbs } from "../../../../components/layout/Breadcrumbs";
import { Plan } from "../../../pricing/page";

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

// ─── City Data ────────────────────────────────────────────────────────────
interface CityData {
  slug: string;
  name: string;
  region: string;
  state: string;
  headline: string;
  subheadline: string;
  localKeywords: string[];
  seoTitle: string;
  seoDesc: string;
}

const cities: Record<string, CityData> = {
  bangalore: {
    slug: "bangalore",
    name: "Bangalore",
    region: "india",
    state: "Karnataka",
    headline: "Best Mobile Repair Software for Bangalore Shops",
    subheadline: "Manage tech-savvy customers across Bengaluru with fast GST billing, instant WhatsApp alerts, and deep IMEI tracking.",
    localKeywords: ["SP Road", "Brigade Road", "Koramangala", "Indiranagar", "Electronics Shop Bangalore"],
    seoTitle: "Mobile Shop Billing & Repair Software in Bangalore | MobiBix",
    seoDesc: "Run your Bangalore mobile shop with MobiBix. Send WhatsApp updates, generate GST bills, and manage inventory easily. Start 14-day free trial."
  },
  hyderabad: {
    slug: "hyderabad",
    name: "Hyderabad",
    region: "india",
    state: "Telangana",
    headline: "Mobile Shop Management Software in Hyderabad",
    subheadline: "Automate your mobile retail business in Hyderabad. Replace manual Khata with automated GST billing and UPI payment tracking.",
    localKeywords: ["Jagdish Market", "Ameerpet", "Kukatpally", "Secunderabad", "Mobile Repair Hyderabad"],
    seoTitle: "Mobile Repair Shop Software Hyderabad — GST & WhatsApp | MobiBix",
    seoDesc: "MobiBix is the top mobile repair shop software for Hyderabad. Manage job cards, track IMEI, and send WhatsApp alerts. Free trial available."
  },
  pune: {
    slug: "pune",
    name: "Pune",
    region: "india",
    state: "Maharashtra",
    headline: "Complete Mobile Retail Software for Pune Shops",
    subheadline: "Grow your mobile shop in Pune. Track technician commissions, manage spare parts inventory, and delight customers with WhatsApp CRM.",
    localKeywords: ["Pimpri-Chinchwad", "Camp Market", "Shivaji Nagar", "FC Road", "Pune Mobile Shops"],
    seoTitle: "Mobile Shop Billing Software Pune — Repair & Inventory | MobiBix",
    seoDesc: "Best mobile repair billing software in Pune. Generate GST invoices, collect UPI, and track shop profitability. Try MobiBix free today."
  },
  ahmedabad: {
    slug: "ahmedabad",
    name: "Ahmedabad",
    region: "india",
    state: "Gujarat",
    headline: "Smart Mobile Shop Billing Software for Ahmedabad",
    subheadline: "Simplify daily operations for your Ahmedabad mobile shop. Fast GST invoicing, secure IMEI inventory, and automated status updates.",
    localKeywords: ["Relief Road", "CG Road", "Satellite", "Bapunagar", "Ahmedabad Mobile Accessories"],
    seoTitle: "Best Mobile Repair Software in Ahmedabad — GST Billing | MobiBix",
    seoDesc: "Manage your Ahmedabad mobile store with MobiBix. Perfect for IMEI tracking, job cards, and GST generation. Start your free trial."
  },
  kolkata: {
    slug: "kolkata",
    name: "Kolkata",
    region: "india",
    state: "West Bengal",
    headline: "Top Mobile Repair Software for Kolkata Retailers",
    subheadline: "Take control of your Kolkata mobile business. Stop revenue leaks with strict inventory control, daily sales reports, and Job Card automation.",
    localKeywords: ["Chandni Chowk", "Burrabazar", "Park Street", "Salt Lake", "Kolkata Mobile Market"],
    seoTitle: "Mobile Repair Shop Software Kolkata — Billing & IMEI | MobiBix",
    seoDesc: "MobiBix is the complete software for mobile repair shops in Kolkata. WhatsApp automation, GST billing, and Job Cards. Try it free."
  }
};

export async function generateStaticParams() {
  return Object.values(cities).map((city) => ({
    region: city.region,
    city: city.slug,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; city: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const c = cities[resolvedParams.city];
  
  if (!c || c.region !== resolvedParams.region) return { title: "City Region" };
  
  return {
    title: c.seoTitle,
    description: c.seoDesc,
    alternates: {
      canonical: `https://REMOVED_DOMAIN/regions/${c.region}/${c.slug}`,
    },
    openGraph: {
      title: c.seoTitle,
      description: c.seoDesc,
      url: `https://REMOVED_DOMAIN/regions/${c.region}/${c.slug}`,
      locale: "en_IN",
    },
  };
}

export default async function CityPage({ params }: { params: Promise<{ region: string; city: string }> }) {
  const resolvedParams = await params;
  const c = cities[resolvedParams.city];
  
  if (!c || c.region !== resolvedParams.region) notFound();

  const basePrice = await fetchBasePrice();

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `MobiBix for ${c.name}`,
    applicationCategory: "BusinessApplication",
    description: c.subheadline,
    url: `https://REMOVED_DOMAIN/regions/${c.region}/${c.slug}`,
    offers: {
      "@type": "Offer",
      price: basePrice,
      priceCurrency: "INR",
      priceValidUntil: "2027-01-01",
    },
    areaServed: { "@type": "City", name: c.name, containedInPlace: { "@type": "State", name: c.state } },
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
        <div className="fixed inset-0 z-0 pointer-events-none">
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
                { name: "India", item: `https://REMOVED_DOMAIN/regions/${c.region}` },
                { name: c.name, item: `https://REMOVED_DOMAIN/regions/${c.region}/${c.slug}` }
              ]}
            />

            <span className="inline-block py-1 px-4 rounded-full border border-border bg-muted/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-8 mt-4">
              📍 {c.name}, {c.state}
            </span>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
              {c.headline}
            </h1>
            <p className="text-xl text-muted-foreground font-bold mb-10 max-w-3xl mx-auto leading-relaxed">
              {c.subheadline}
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                href="/auth/signup"
                className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25"
              >
                Try Free in {c.name}
              </Link>
            </div>
          </div>
        </section>

        {/* Value Prop grid */}
        <section className="px-6 pb-24 relative z-10">
          <div className="container mx-auto max-w-5xl">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 {[
                     {
                         title: "GST Ready",
                         desc: "Generate full CGST/SGST invoices instantly for tax compliance."
                     },
                     {
                         title: "WhatsApp CRM",
                         desc: "Send automated repair status updates directly to the customer's WhatsApp."
                     },
                     {
                         title: "UPI & Cash Sync",
                         desc: "Track every rupee that comes into the shop across payment methods."
                     }
                 ].map(feature => (
                     <div key={feature.title} className="p-8 rounded-[2rem] bg-card/40 border border-border text-center">
                         <h3 className="text-xl font-black uppercase tracking-tight mb-4">{feature.title}</h3>
                         <p className="text-muted-foreground font-bold">{feature.desc}</p>
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
