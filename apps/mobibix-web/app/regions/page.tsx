import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import Link from "next/link";

export default function RegionsIndexPage() {
  const regions = [
    { name: "India", slug: "india", flag: "🇮🇳" },
    { name: "UAE", slug: "uae", flag: "🇦🇪" },
    { name: "Saudi Arabia", slug: "saudi-arabia", flag: "🇸🇦" },
    { name: "Malaysia", slug: "malaysia", flag: "🇲🇾" },
    { name: "Indonesia", slug: "indonesia", flag: "🇮🇩" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-4xl text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tighter italic">Global Presence</h1>
          <p className="text-xl text-muted-foreground font-bold">MobiBix is localising the future of mobile retail across the world.</p>
        </div>

        <div className="container mx-auto max-w-5xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {regions.map((r) => (
            <Link key={r.slug} href={`/regions/${r.slug}`} className="group p-10 rounded-[2.5rem] bg-card border border-border hover:border-primary transition-all text-center">
              <div className="text-5xl mb-6">{r.flag}</div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2 group-hover:text-primary">{r.name}</h3>
              <div className="mt-8 inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs">
                Explore {r.name}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
