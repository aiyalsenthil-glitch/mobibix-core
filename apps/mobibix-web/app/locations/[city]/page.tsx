import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { Breadcrumbs } from "../../../components/layout/Breadcrumbs";
import Link from "next/link";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle, ArrowRight, Star, Shield, Zap } from "lucide-react";

// ─── City Data ────────────────────────────────────────────────────────────────
const CITY_DATA: Record<string, {
  displayName: string;
  state: string;
  tier: 1 | 2;
  shopCount: string;  // Approximate market size for social proof
  localNote: string;  // City-specific copy line
  gstState: string;   // State for GST context
}> = {
  // Tier 1
  mumbai:    { displayName: "Mumbai",    state: "Maharashtra", tier: 1, shopCount: "2,400+", localNote: "From Dharavi to Dadar to Malad, mobile repair shops trust MobiBix.", gstState: "Maharashtra (SGST 9% + CGST 9%)" },
  delhi:     { displayName: "Delhi",     state: "Delhi",       tier: 1, shopCount: "3,100+", localNote: "Covering Lajpat Nagar, Nehru Place, and every gali in between.", gstState: "Delhi (CGST + IGST for interstate)" },
  bangalore: { displayName: "Bangalore", state: "Karnataka",   tier: 1, shopCount: "1,900+", localNote: "From Koramangala to Whitefield, tech-savvy shops choose MobiBix.", gstState: "Karnataka (SGST 9% + CGST 9%)" },
  hyderabad: { displayName: "Hyderabad", state: "Telangana",   tier: 1, shopCount: "1,700+", localNote: "Serving shops across Secunderabad, Ameerpet, and Old City.", gstState: "Telangana (SGST 9% + CGST 9%)" },
  chennai:   { displayName: "Chennai",   state: "Tamil Nadu",  tier: 1, shopCount: "1,500+", localNote: "Built for busy repair markets in T. Nagar, Anna Nagar, and Velachery.", gstState: "Tamil Nadu (SGST 9% + CGST 9%)" },
  kolkata:   { displayName: "Kolkata",   state: "West Bengal", tier: 1, shopCount: "1,200+", localNote: "From New Market to Ultadanga, Kolkata shops run leaner with MobiBix.", gstState: "West Bengal (SGST 9% + CGST 9%)" },
  pune:      { displayName: "Pune",      state: "Maharashtra", tier: 1, shopCount: "1,100+", localNote: "Trusted by repair shops in Kothrud, Viman Nagar, and Hinjewadi.", gstState: "Maharashtra (SGST 9% + CGST 9%)" },
  ahmedabad: { displayName: "Ahmedabad", state: "Gujarat",     tier: 1, shopCount: "980+",   localNote: "Powering mobile shops across Maninagar, CG Road, and Naranpura.", gstState: "Gujarat (SGST 9% + CGST 9%)" },
  // Tier 2
  jaipur:         { displayName: "Jaipur",         state: "Rajasthan",    tier: 2, shopCount: "640+",  localNote: "From Johari Bazaar to Vaishali Nagar, MobiBix fits every shop.", gstState: "Rajasthan (SGST 9% + CGST 9%)" },
  surat:          { displayName: "Surat",           state: "Gujarat",      tier: 2, shopCount: "720+",  localNote: "Gujarat's fastest-growing mobile market deserves modern software.", gstState: "Gujarat (SGST 9% + CGST 9%)" },
  lucknow:        { displayName: "Lucknow",         state: "Uttar Pradesh",tier: 2, shopCount: "580+",  localNote: "Nawabi city, modern billing — MobiBix GST invoices in seconds.", gstState: "Uttar Pradesh (SGST 9% + CGST 9%)" },
  nagpur:         { displayName: "Nagpur",          state: "Maharashtra",  tier: 2, shopCount: "410+",  localNote: "Central India's repair hub gets its billing sorted with MobiBix.", gstState: "Maharashtra (SGST 9% + CGST 9%)" },
  indore:         { displayName: "Indore",          state: "Madhya Pradesh",tier: 2, shopCount: "490+", localNote: "India's cleanest city — now with the cleanest billing software.", gstState: "Madhya Pradesh (SGST 9% + CGST 9%)" },
  bhopal:         { displayName: "Bhopal",          state: "Madhya Pradesh",tier: 2, shopCount: "310+", localNote: "City of Lakes shops track repairs and stock with MobiBix.", gstState: "Madhya Pradesh (SGST 9% + CGST 9%)" },
  visakhapatnam:  { displayName: "Visakhapatnam",   state: "Andhra Pradesh",tier: 2, shopCount: "370+", localNote: "Vizag's growing tech market is modernising with MobiBix.", gstState: "Andhra Pradesh (SGST 9% + CGST 9%)" },
  patna:          { displayName: "Patna",           state: "Bihar",        tier: 2, shopCount: "290+",  localNote: "Bihar's capital city shops manage jobs and billing in one place.", gstState: "Bihar (SGST 9% + CGST 9%)" },
  vadodara:       { displayName: "Vadodara",        state: "Gujarat",      tier: 2, shopCount: "350+",  localNote: "Baroda's repair shops track every IMEI and every rupee.", gstState: "Gujarat (SGST 9% + CGST 9%)" },
  ludhiana:       { displayName: "Ludhiana",        state: "Punjab",       tier: 2, shopCount: "420+",  localNote: "Punjab's industrial hub gets enterprise-grade repair software.", gstState: "Punjab (SGST 9% + CGST 9%)" },
  nashik:         { displayName: "Nashik",          state: "Maharashtra",  tier: 2, shopCount: "280+",  localNote: "Wine city, clean books — MobiBix GST billing for Nashik shops.", gstState: "Maharashtra (SGST 9% + CGST 9%)" },
  coimbatore:     { displayName: "Coimbatore",      state: "Tamil Nadu",   tier: 2, shopCount: "390+",  localNote: "Tamil Nadu's Manchester powers its repair shops with MobiBix.", gstState: "Tamil Nadu (SGST 9% + CGST 9%)" },
  kochi:          { displayName: "Kochi",           state: "Kerala",       tier: 2, shopCount: "340+",  localNote: "Kerala's tech corridor shops manage repairs end-to-end with MobiBix.", gstState: "Kerala (SGST 9% + CGST 9%)" },
  chandigarh:     { displayName: "Chandigarh",      state: "Punjab/Haryana",tier: 2, shopCount: "230+", localNote: "India's most planned city — planned repair management with MobiBix.", gstState: "Punjab/Haryana (SGST 9% + CGST 9%)" },
};

const VALID_CITIES = Object.keys(CITY_DATA);

export async function generateStaticParams() {
  return VALID_CITIES.map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city } = await params;
  const data = CITY_DATA[city.toLowerCase()];
  if (!data) return { title: "MobiBix" };
  return {
    title: `Mobile Shop Billing Software in ${data.displayName} | MobiBix`,
    description: `MobiBix helps ${data.displayName} mobile repair shops manage job cards, track IMEI inventory, generate GST invoices, and grow revenue. Trusted by ${data.shopCount} shops across ${data.state}.`,
    keywords: `mobile shop software ${data.displayName}, mobile repair billing ${data.displayName}, GST billing ${data.displayName}, job card software ${data.displayName}`,
    alternates: { canonical: `https://REMOVED_DOMAIN/locations/${city.toLowerCase()}` },
    openGraph: {
      title: `Mobile Shop Software in ${data.displayName} — MobiBix`,
      description: `${data.shopCount} mobile repair shops in ${data.displayName} trust MobiBix for billing, job cards, and stock management.`,
    },
  };
}

const FEATURES = [
  { icon: Zap, title: "Job Card Management", desc: "Create repair job cards in seconds. Track status from intake to delivery with customer SMS updates." },
  { icon: Shield, title: "GST-Compliant Invoicing", desc: "Generate GSTR-1 ready invoices with correct SGST/CGST split. Export to CA in one click." },
  { icon: CheckCircle, title: "IMEI & Stock Tracking", desc: "Track every device by IMEI. Know your stock value, fast-movers, and dead stock instantly." },
  { icon: Star, title: "Multi-Shop Support", desc: "Own multiple locations? Manage all shops from one account with separate P&L per branch." },
];

export default async function LocationPage({ params }: { params: Promise<{ city: string }> }) {
  const { city } = await params;
  const data = CITY_DATA[city.toLowerCase()];
  if (!data) notFound();

  const { displayName, state, tier, shopCount, localNote, gstState } = data;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />

      {/* Hero */}
      <section className="relative pt-40 pb-24 px-6 text-center overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-primary/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/8 rounded-full blur-[130px] pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10 flex flex-col items-center">
          
          <Breadcrumbs 
            items={[
              { name: "Home", item: "https://REMOVED_DOMAIN/" },
              { name: "Locations", item: "https://REMOVED_DOMAIN/locations" },
              { name: displayName, item: `https://REMOVED_DOMAIN/locations/${city.toLowerCase()}` }
            ]}
          />

          <span className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full border border-primary/20 bg-primary/5 text-xs font-black uppercase tracking-widest text-primary mb-8 mt-4">
            {state} · Tier {tier} City
          </span>
          <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
            Mobile Shop Software <br className="hidden md:block" /> for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">{displayName}</span>
          </h1>
          <p className="text-xl text-muted-foreground font-bold mb-4 max-w-3xl mx-auto leading-relaxed">
            {localNote}
          </p>
          <p className="text-sm font-bold text-muted-foreground/70 mb-10">
            Trusted by <strong className="text-foreground">{shopCount} mobile repair shops</strong> across {state}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/pricing"
              className="px-8 py-4 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-xl shadow-primary/25"
            >
              Start Free Trial — {displayName}
            </Link>
            <Link
              href="/contact-us"
              className="px-8 py-4 rounded-2xl border border-border font-black uppercase tracking-widest text-sm hover:bg-muted transition-all"
            >
              Talk to Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-20 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-center mb-12">
            Everything a {displayName} mobile shop needs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <div key={i} className="p-6 rounded-[2rem] bg-card border border-border flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-base mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GST local context */}
      <section className="px-6 py-20 border-t border-border">
        <div className="container mx-auto max-w-4xl">
          <div className="grid md:grid-cols-2 gap-10">
            <div className="p-8 rounded-[2rem] border border-border bg-card">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">
                {displayName} GST Billing
              </h3>
              <p className="text-muted-foreground font-bold leading-relaxed mb-4">
                Pre-configured for <strong>{gstState}</strong>. MobiBix auto-splits SGST/CGST for local sales and applies IGST for interstate transactions — no manual configuration needed.
              </p>
              <ul className="space-y-2">
                {["GSTR-1 export in one click", "HSN code support (8517 series)", "Reverse charge handling", "CA-ready monthly summary"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-8 rounded-[2rem] border border-border bg-card">
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-4">
                {displayName} Support
              </h3>
              <p className="text-muted-foreground font-bold leading-relaxed mb-4">
                We understand the specific challenges mobile shops in {displayName} face — from tracking second-hand stock to managing walk-in customers and WhatsApp orders.
              </p>
              <ul className="space-y-2">
                {["Hindi + English interface", "WhatsApp customer updates", "Technician performance reports", "Bulk IMEI import from Excel"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm font-medium">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 bg-card border-t border-border">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-6">
            Start your {displayName} free trial
          </h2>
          <p className="text-muted-foreground font-bold mb-10 text-lg">
            Join {shopCount} mobile repair shops across {state} using MobiBix. No credit card. 14 days free.
          </p>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-3 px-10 py-5 rounded-2xl bg-primary text-background font-black uppercase tracking-widest text-sm hover:brightness-110 transition-all shadow-2xl shadow-primary/30"
          >
            Get Started Free <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Schema.org LocalBusiness JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "MobiBix",
            "applicationCategory": "BusinessApplication",
            "operatingSystem": "Web, Android",
            "description": `Mobile shop billing and repair management software for ${displayName}`,
            "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR", "description": "14-day free trial" },
            "areaServed": { "@type": "City", "name": displayName, "containedInPlace": { "@type": "State", "name": state } },
          }),
        }}
      />

      <Footer compact={true} />
    </div>
  );
}
