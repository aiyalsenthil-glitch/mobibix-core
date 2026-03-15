"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, CheckCircle2, Zap, MessageSquare, BarChart3 } from "lucide-react";

export default function WhatsAppPremiumPromoBanner() {
  return (
    <div className="relative overflow-hidden rounded-3xl group mb-8">
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-teal-600 via-emerald-600 to-blue-700 animate-gradient-slow group-hover:scale-105 transition-transform duration-700"></div>
      
      {/* Abstract Design Elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse"></div>
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-3xl -ml-24 -mb-24"></div>

      <div className="relative p-8 md:p-10 flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12 backdrop-blur-[2px]">
        {/* Text Content */}
        <div className="flex-1 space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300" />
            Premium Business Growth
          </div>
          
          <h2 className="text-3xl md:text-4xl xl:text-5xl font-black text-white leading-[1.1]">
            Unlock 10x Growth with <br />
            <span className="text-teal-200">WhatsApp Automation</span>
          </h2>
          
          <p className="text-lg text-teal-50/90 font-medium max-w-2xl leading-relaxed">
            Stop losing customers! Recover abandoned job cards, send automated payment reminders, and launch bulk marketing campaigns that actually convert.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="flex items-center gap-3 text-white/90 font-semibold bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-teal-400/20 flex items-center justify-center border border-teal-300/30">
                <Zap className="w-4 h-4 text-teal-200" />
              </div>
              <span className="text-sm">Auto-Payment Reminders</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 font-semibold bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-emerald-400/20 flex items-center justify-center border border-emerald-300/30">
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              </div>
              <span className="text-sm">Job Card Recovery</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 font-semibold bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-blue-400/20 flex items-center justify-center border border-blue-300/30">
                <MessageSquare className="w-4 h-4 text-blue-200" />
              </div>
              <span className="text-sm">Bulk Broadcasts</span>
            </div>
            <div className="flex items-center gap-3 text-white/90 font-semibold bg-white/5 p-3 rounded-2xl border border-white/10">
              <div className="w-8 h-8 rounded-lg bg-indigo-400/20 flex items-center justify-center border border-indigo-300/30">
                <BarChart3 className="w-4 h-4 text-indigo-200" />
              </div>
              <span className="text-sm">Conversion Tracking</span>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="flex flex-col items-center lg:items-end gap-6 w-full lg:w-auto">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 flex flex-col items-center gap-4 shadow-2xl w-full">
            <div className="flex flex-col items-center gap-1">
              <span className="text-sm font-bold text-teal-100 uppercase tracking-widest opacity-80">Plans Start At</span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-white">₹749</span>
                <span className="text-teal-100 text-sm font-medium">/month</span>
              </div>
            </div>
            
            <div className="flex gap-2 w-full justify-center">
              {[1499, 2499].map((p) => (
                <div key={p} className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex flex-col items-center">
                  <span className="text-xs font-bold text-white">₹{p}</span>
                  <span className="text-[8px] text-teal-100 uppercase font-bold opacity-60">Pro</span>
                </div>
              ))}
            </div>
            
            <p className="text-[10px] text-teal-50 uppercase tracking-widest font-bold opacity-75 text-center">
              Flexible Tiers • Priority Support
            </p>
          </div>

          <Link
            href="/whatsapp-crm?promo=true"
            className="w-full sm:w-auto bg-white hover:bg-teal-50 text-emerald-700 px-10 py-5 rounded-2xl font-black text-xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)] transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 group/btn"
          >
            Unlock Now
            <ArrowRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
          </Link>
          
          <p className="text-white/60 text-xs font-medium italic text-right">
            Trusted by 500+ service businesses
          </p>
        </div>
      </div>
    </div>
  );
}
