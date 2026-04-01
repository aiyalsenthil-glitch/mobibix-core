"use client";

import { Header } from "../layout/Header";
import { Footer } from "../layout/Footer";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

interface FeatureDetailProps {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  benefits: string[];
  capabilities: { title: string; desc: string }[];
  ctaText?: string;
}

export function FeatureDetail({
  title,
  subtitle,
  description,
  image,
  benefits,
  capabilities,
  ctaText = "Start Free Trial",
}: FeatureDetailProps) {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 overflow-hidden">
      <Header />
      
      {/* Background Glows */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-[160px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <main className="relative z-10 pt-32 md:pt-48 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Hero Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-40">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full border border-border bg-muted/30 backdrop-blur-xl text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-10">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                Retail OS Feature
              </div>
              <h1 className="text-5xl md:text-8xl font-black mb-10 tracking-tighter leading-[0.9] uppercase italic">
                {title}
              </h1>
              <p className="text-xl md:text-2xl font-bold text-muted-foreground mb-12 leading-relaxed italic">
                {subtitle}
              </p>
              <div className="flex flex-col sm:flex-row gap-6">
                <Link href="/auth" className="px-12 py-5 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:brightness-110 transition-all shadow-2xl shadow-primary/30 text-center">
                  {ctaText}
                </Link>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 1 }}
              className="relative group"
            >
              <div className="absolute -inset-4 bg-gradient-to-r from-primary/30 to-blue-500/30 rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition duration-1000" />
              <div className="relative rounded-[3rem] border border-border bg-card/50 backdrop-blur-3xl p-4 overflow-hidden shadow-2xl">
                <img src={image} alt={title} className="w-full h-auto rounded-[2.5rem] object-cover scale-100 group-hover:scale-105 transition-transform duration-1000" />
              </div>
            </motion.div>
          </div>

          {/* Core Description Section */}
          <div className="mb-40 max-w-4xl mx-auto text-center">
             <h2 className="text-4xl md:text-6xl font-black mb-12 uppercase tracking-tighter italic">Why it Matters.</h2>
             <p className="text-lg md:text-xl text-muted-foreground font-bold leading-relaxed mb-6">
                {description}
             </p>
          </div>

          {/* Capabilities Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-40">
            {capabilities.map((cap, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="p-10 rounded-[3rem] border border-border bg-card/30 backdrop-blur-3xl hover:border-primary/50 transition-all duration-500 group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-xl font-black mb-4 uppercase tracking-tight">{cap.title}</h3>
                <p className="text-muted-foreground font-bold text-sm leading-relaxed">{cap.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Benefits Bullet Points */}
          <section className="py-32 border-t border-border">
            <h2 className="text-3xl md:text-5xl font-black text-center mb-20 uppercase tracking-tighter italic">Engineered for Results.</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
               {benefits.map((benefit, i) => (
                 <div key={i} className="flex gap-4">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center mt-1">
                       <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-foreground font-black uppercase tracking-widest text-[10px] leading-6">{benefit}</span>
                 </div>
               ))}
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-48 text-center border-t border-border mt-20">
             <h2 className="text-5xl md:text-8xl font-black mb-12 uppercase tracking-tighter italic">Ready to Upgrade?</h2>
             <Link href="/auth" className="inline-block px-14 py-6 rounded-2xl bg-primary text-primary-foreground font-black uppercase tracking-widest hover:scale-105 transition-all shadow-3xl shadow-primary/40">
                Get Started Now
             </Link>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
