import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import Link from "next/link";
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Service Locations | MobiBix — Available Across India",
  description: "MobiBix mobile shop management software is available in all major Indian cities. Specialized GST billing, IMEI tracking, and repair management for your local market.",
  alternates: {
    canonical: "https://REMOVED_DOMAIN/locations"
  }
};

export default function LocationsIndexPage() {
  const cities = [
    'mumbai', 'delhi', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad',
    'jaipur', 'surat', 'lucknow', 'nagpur', 'indore', 'bhopal', 'visakhapatnam', 'patna',
    'vadodara', 'ludhiana', 'nashik', 'coimbatore', 'kochi', 'chandigarh'
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 px-6">
      <Header />
      <main className="pt-44 pb-32">
        <div className="container mx-auto max-w-4xl text-center mb-24">
            <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full border border-border bg-muted/50 text-muted-foreground text-[10px] font-black uppercase tracking-[0.3em] mb-12 shadow-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Local Presence
            </div>
          <h1 className="text-5xl md:text-8xl font-black mb-8 uppercase tracking-tighter italic leading-[0.85]">
            MobiBix for <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-indigo-500">Your City.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-bold max-w-2xl mx-auto">
            From Mumbai to Chandigarh, we empower local mobile retailers with global-grade software.
          </p>
        </div>

        <div className="container mx-auto max-w-6xl grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-8">
          {cities.map((city) => (
            <Link 
                key={city} 
                href={`/locations/${city}`} 
                className="group p-8 rounded-[2rem] bg-card border border-border hover:border-primary transition-all text-center hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1"
            >
              <h3 className="text-lg md:text-xl font-black uppercase tracking-tight group-hover:text-primary transition-colors">
                {city.charAt(0).toUpperCase() + city.slice(1)}
              </h3>
              <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                 Explore
                 <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
