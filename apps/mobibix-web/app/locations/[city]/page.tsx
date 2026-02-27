import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import { Metadata } from "next";

// This simulates fetching valid cities from a CMS or database.
const VALID_CITIES = ["delhi", "mumbai", "bangalore", "hyderabad", "chennai", "kolkata", "surat", "pune", "jaipur", "ahmedabad"];

export async function generateStaticParams() {
  return VALID_CITIES.map((city) => ({
    city: city,
  }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const cityName = resolvedParams.city.charAt(0).toUpperCase() + resolvedParams.city.slice(1);
  return {
    title: `Best Mobile Shop Billing Software in ${cityName} | MobiBix`,
    description: `Run your mobile shop efficiently in ${cityName}. Track IMEI, manage repairs, and generate GST bills with MobiBix. Built for electronics retailers in ${cityName}.`,
    alternates: {
      canonical: `https://REMOVED_DOMAIN/locations/${resolvedParams.city}`
    }
  };
}

export default async function LocationPage({ params }: { params: Promise<{ city: string }> }) {
  const resolvedParams = await params;
  const cityName = resolvedParams.city.charAt(0).toUpperCase() + resolvedParams.city.slice(1);

  if (!VALID_CITIES.includes(resolvedParams.city.toLowerCase())) {
     // Usually, you would return a 404 here, but this is a stub.
     return <div>City not found</div>;
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
      <Header />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none text-center">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="container mx-auto max-w-4xl pt-44 pb-20 px-6 relative z-10">
        {/* Hero Section Localized */}
        <div className="text-center mb-24">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm">
                Local Retailer Solutions
            </div>
            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase leading-none italic">
                Mobile Shop Software <br className="hidden md:block" /> for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">{cityName}</span>.
            </h1>
            <p className="text-xl text-muted-foreground font-bold max-w-2xl mx-auto leading-relaxed">
                Join top mobile retailers in {cityName} who manage their IMEI inventory, repair jobs, and GST billing entirely through MobiBix.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/auth" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl shadow-primary/20">
                    Start {cityName} Trial
                </Link>
            </div>
        </div>

        {/* Localized Trust Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-20">
            <div className="p-10 rounded-[3rem] border border-border bg-card/40 backdrop-blur-3xl">
                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">Localized for {cityName} GST</h3>
                <p className="text-muted-foreground font-bold leading-relaxed">
                    Our software is pre-configured for state-specific SGST, CGST, and IGST billing frameworks. Generate compliant invoices ready for your local CA.
                </p>
            </div>
            <div className="p-10 rounded-[3rem] border border-border bg-card/40 backdrop-blur-3xl">
                <h3 className="text-2xl font-black uppercase mb-4 tracking-tighter">Regional Suppport</h3>
                <p className="text-muted-foreground font-bold leading-relaxed">
                    We understand the specific problems mobile shops in {cityName} face—from tracking expensive second-hand stock to managing unruly technicians.
                </p>
            </div>
        </div>
      </div>
      <Footer compact={true} />
    </div>
  );
}
