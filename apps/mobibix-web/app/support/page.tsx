"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";
import { motion } from "framer-motion";

export default function SupportPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30 px-6">
      <Header />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="container mx-auto max-w-4xl pt-44 pb-20 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-20"
        >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-10 shadow-sm">
                24/7 Dedicated Assistance
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-6 tracking-tighter uppercase leading-none italic">How can we help?</h1>
            <p className="text-xl text-muted-foreground font-bold max-w-2xl mx-auto leading-relaxed">
                Our team is standing by to help you modernize your retail business. From onboarding to troubleshooting, we&apos;ve got you covered.
            </p>
        </motion.div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Email Support */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-10 rounded-[3.5rem] border border-border bg-card/40 backdrop-blur-3xl hover:bg-card transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 group"
            >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-8 border border-primary/20 group-hover:bg-primary transition-colors duration-500 shadow-lg">
                    <svg className="w-8 h-8 text-primary group-hover:text-primary-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                </div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Email Support</h3>
                <p className="text-muted-foreground font-bold mb-8 leading-relaxed">
                    For technical issues, billing queries, or feature requests. We usually respond within 24 hours.
                </p>
                <a href="mailto:support@REMOVED_DOMAIN" className="inline-flex items-center gap-3 text-primary font-black uppercase tracking-[0.2em] text-sm group-hover:gap-5 transition-all">
                    support@REMOVED_DOMAIN
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </a>
            </motion.div>

            {/* WhatsApp CRM Support */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="p-10 rounded-[3.5rem] border border-border bg-card/40 backdrop-blur-3xl hover:bg-card transition-all duration-500 hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 group"
            >
                <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mb-8 border border-green-500/20 group-hover:bg-green-500 transition-colors duration-500 shadow-lg">
                    <svg className="w-8 h-8 text-green-500 group-hover:text-black transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                </div>
                <h3 className="text-2xl font-black mb-4 uppercase tracking-tight">Direct WhatsApp</h3>
                <p className="text-muted-foreground font-bold mb-8 leading-relaxed">
                    Priority support for Pro plan users. Instant chat with our onboarding specialists.
                </p>
                <div className="text-muted-foreground/60 font-black uppercase tracking-[0.2em] text-xs">
                    Available for PRO plan members
                </div>
            </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="mt-24 p-12 rounded-[3.5rem] border border-border bg-muted/20 backdrop-blur-3xl text-center shadow-xl"
        >
            <h4 className="text-xl font-black mb-4 uppercase tracking-widest text-foreground">Knowledge Base</h4>
            <p className="text-muted-foreground font-bold mb-8 max-w-lg mx-auto leading-relaxed">
                Detailed guides on managing inventory, GST billing, and staff permissions. Empower your team with our library.
            </p>
            <Link href="/support/kb" className="inline-block px-12 py-5 rounded-2xl bg-foreground text-background font-black uppercase tracking-widest hover:brightness-110 shadow-xl transition-all active:scale-95">
                Browse Guides
            </Link>
        </motion.div>
      </div>
      <Footer />
    </div>
  );
}
