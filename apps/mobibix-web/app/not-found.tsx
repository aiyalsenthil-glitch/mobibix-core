import Link from "next/link";
import { Header } from "../components/layout/Header";
import { Footer } from "../components/layout/Footer";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
      <Header />
      
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <main className="container mx-auto max-w-4xl pt-44 pb-32 px-6 relative z-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm animate-bounce">
            Error 404
        </div>
        <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter uppercase italic leading-[0.85]">
            Lost in the <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-500 to-indigo-500">Retail Void?</span>
        </h1>
        <p className="text-xl text-muted-foreground font-bold mb-16 max-w-2xl mx-auto leading-relaxed">
            The page you are looking for doesn&apos;t exist or has been moved. Let&apos;s get your mobile shop back on track.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto mb-20">
            <Link href="/" className="px-10 py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-xl shadow-primary/20">
                Back to Home
            </Link>
            <Link href="/features" className="px-10 py-5 rounded-2xl border border-border text-foreground font-black uppercase tracking-widest hover:bg-muted transition-all">
                Explore Features
            </Link>
        </div>

        <div className="pt-20 border-t border-border">
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground mb-10">Popular Destinations</h2>
            <div className="flex flex-wrap justify-center gap-4">
                {['Pricing', 'Blog', 'Support', 'Compare'].map((label) => (
                    <Link 
                        key={label}
                        href={`/${label.toLowerCase()}`}
                        className="px-6 py-3 rounded-full bg-muted/30 border border-border text-[10px] font-black uppercase tracking-widest hover:border-primary/50 transition-all"
                    >
                        {label}
                    </Link>
                ))}
            </div>
        </div>
      </main>

      <Footer compact={false} />
    </div>
  );
}
