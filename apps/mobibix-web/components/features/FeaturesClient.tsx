import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import Link from "next/link";
import { WaitlistForm } from "./WaitlistForm";

const features = [
  {
    title: "IMEI & Serial Management",
    description: "Complete tracking of every device in your inventory. Scan IMEIs for sales, purchases, and transfers with zero errors.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m0 11v1m5-10.45a9 9 0 11-10 0M12 7V3m0 0L9 6m3-3l3 3" />
      </svg>
    ),
    color: "from-blue-500 to-cyan-400",
    href: "#imei-inventory",
  },
  {
    title: "Repair Job Pipeline",
    description: "Manage repair jobs from entry to delivery. Track technician assignments, spare parts used, and notify customers via WhatsApp.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: "from-primary to-primary/60",
    href: "/features/repair-pipeline",
  },
  {
    title: "GST Cloud Billing",
    description: "Generate GST-compliant invoices in seconds. Automated tax calculations (CGST, SGST, IGST) and professional print layouts.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    color: "from-purple-500 to-indigo-400",
    href: "/features/gst-billing",
  },
  {
    title: "Multi-Shop Synchronization",
    description: "Run multiple branches from a single dashboard. Real-time stock visibility across all locations and centralized reporting.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5" />
      </svg>
    ),
    color: "from-orange-500 to-rose-400",
    href: "/features/multi-shop",
  },
  {
    title: "WhatsApp CRM & Marketing",
    description: "Send automated payment reminders, repair status updates, and marketing campaigns directly to your customers' WhatsApp.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    color: "from-primary to-blue-500",
    href: "#whatsapp-crm",
  },
  {
    title: "Advanced Profit Analytics",
    description: "Understand your margins. Real-time reports on sales, expenses, and net profit with beautiful charts and data exports.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4v16m17-16v16" />
      </svg>
    ),
    color: "from-cyan-500 to-blue-400",
    href: "/features/profit-analytics",
  },
  {
    title: "Distributor Network",
    description: "Connect your shop to wholesale distributors. Control what each distributor sees, get restock suggestions, and manage purchase orders — free for distributors.",
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    color: "from-indigo-500 to-violet-500",
    href: "/distributor",
  },
];

const serviceSchema = {
  "@context": "https://schema.org",
  "@type": "Service",
  serviceType: "Mobile Shop POS & Management Software",
  provider: { "@type": "Organization", name: "Mobibix", url: "https://REMOVED_DOMAIN" },
  areaServed: "India",
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Mobibix Features",
    itemListElement: features.map((f) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: f.title, description: f.description },
    })),
  },
};

export function FeaturesClient() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 transition-colors duration-500 px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceSchema) }}
      />
      <Header />

      {/* Background Effects — static, no animate-pulse */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
      </div>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-start z-10 overflow-hidden">
        <div className="h-28 md:h-44 w-full shrink-0" />
        <div className="container mx-auto max-w-4xl text-center">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-border bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] mb-12 shadow-sm">
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            Core Capabilities
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-12 leading-[0.85] uppercase italic">
            Engineered for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-500">Retail Excellence.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-16 max-w-3xl mx-auto leading-relaxed font-bold">
            Mobibix isn&apos;t just a billing app. It&apos;s a complete Operating System designed to scale your mobile shop from a local store to a regional powerhouse.
          </p>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative py-32 px-6 z-10">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <div
                key={i}
                className="group relative p-10 rounded-[3rem] border border-border bg-card/40 backdrop-blur-3xl hover:bg-card transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-2"
              >
                <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${f.color} p-4 mb-8 shadow-xl shadow-black/20 group-hover:scale-110 transition-transform duration-500`}>
                  <div className="text-background">{f.icon}</div>
                </div>
                <h3 className="text-2xl font-black mb-4 tracking-tight group-hover:text-primary transition-colors uppercase">{f.title}</h3>
                <p className="text-muted-foreground font-bold leading-relaxed text-lg group-hover:text-foreground transition-colors">
                  {f.description}
                </p>
                <Link href={f.href} className="mt-8 pt-8 border-t border-border opacity-0 group-hover:opacity-100 transition-opacity duration-500 cursor-pointer block">
                  <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                    Learn More
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMEI Section */}
      <section id="imei-inventory" className="py-40 px-6 relative z-10 overflow-hidden">
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div>
              <div className="text-primary font-black uppercase tracking-[0.4em] text-xs mb-8">Hardware-First Software</div>
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-10 leading-[0.9] uppercase italic">Smart Inventory for Smart Devices.</h2>
              <p className="text-xl text-muted-foreground font-bold mb-12 leading-relaxed">
                Stop wrestling with spreadsheets. MobiBix creates a digital twin of every device in your shop. Scan an IMEI once, and we track it through its entire journey—from purchase to sale to after-sales service.
              </p>
              <div className="space-y-6">
                {["Zero-Error Barcode Scanning", "Serial Number History & Logs", "Stock Transfer between Branches", "Low Stock Smart Alerts"].map((text, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-foreground/80 font-black uppercase tracking-widest text-xs">{text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-500 opacity-20 blur-[100px]" />
              <div className="relative rounded-[3rem] border border-border bg-card/40 p-3 backdrop-blur-3xl shadow-2xl">
                <div className="rounded-[2.5rem] overflow-hidden border border-border aspect-video bg-muted/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
                      <svg className="w-10 h-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground">Inventory Dashboard Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WhatsApp CRM Section */}
      <section id="whatsapp-crm" className="py-40 px-6 relative z-10 overflow-hidden bg-muted/10 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm">
              Coming Soon Feature
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter mb-8 leading-tight uppercase italic">
              The Ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600">WhatsApp CRM</span>{" "}
              <br className="hidden md:block" /> built inside your POS.
            </h2>
            <p className="text-xl text-muted-foreground font-bold mb-16 max-w-3xl mx-auto leading-relaxed">
              Our engineering team has completely finished the deepest WhatsApp integration in the Indian mobile retail market. We are currently waiting on final Meta Business approval to turn it on via the official Cloud API.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mb-20">
              {[
                { color: "green", label: "Digital Receipts", desc: "Send GST invoices via WhatsApp instantly at checkout. No print needed.", icon: <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />, fill: true },
                { color: "orange", label: "Repair Alerts", desc: "Auto-notify clients when their repair job is ready for pickup to get paid faster.", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />, fill: false },
                { color: "indigo", label: "Shared Inbox", desc: "Your entire team can reply to customers from one single authorized WhatsApp number.", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />, fill: false },
              ].map(({ color, label, desc, icon, fill }) => (
                <div key={label} className="p-8 rounded-[2.5rem] bg-card border border-border shadow-lg">
                  <div className={`w-12 h-12 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-6`}>
                    <svg className={`w-6 h-6 text-${color}-500`} fill={fill ? "currentColor" : "none"} stroke={fill ? undefined : "currentColor"} viewBox="0 0 24 24">{icon}</svg>
                  </div>
                  <h4 className="font-black text-foreground uppercase tracking-tight mb-2">{label}</h4>
                  <p className="text-sm font-bold text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>

            <div className="p-12 rounded-[3.5rem] bg-gradient-to-br from-card to-background border border-border shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-[80px]" />
              <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-foreground relative z-10 italic">Skip the Line. Get It First.</h3>
              <WaitlistForm />
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
