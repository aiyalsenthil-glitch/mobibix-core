"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "../../../../components/layout/Header";
import { Footer } from "../../../../components/layout/Footer";
import { motion } from "framer-motion";

const articles: Record<string, { title: string; category: string; content: React.ReactNode }> = {
  "quick-setup": {
    title: "Quick Setup Guide",
    category: "Getting Started",
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">Welcome to MobiBix! Setting up your shop for the first time takes less than 5 minutes. Follow these three simple steps to start managing your repairs professionally.</p>
        
        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">1. Configure your Profile</h3>
          <p>Navigate to Settings → Shop Profile. Ensure your shop name, address, and GST number are correctly entered. This information will appear on your automated job cards and invoices.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">2. Add your Technicians</h3>
          <p>Go to Staff Management. Add your team members and assign them roles. Technicians will only see the repairs assigned to them, keeping your dashboard clean and focused.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">3. Create your first Job Card</h3>
          <p>Click on &quot;New Repair&quot; from the dashboard. Enter the customer information and device details (don&apos;t forget the IMEI!). Once saved, your customer will receive their first WhatsApp notification automatically.</p>
        </div>

        <div className="p-8 rounded-[2rem] bg-primary/5 border border-primary/20 mt-12">
          <h4 className="font-black uppercase tracking-widest text-xs text-primary mb-2">Pro Tip</h4>
          <p className="font-bold">Connect your WhatsApp Business API early to ensure a 100% delivery rate for customer alerts.</p>
        </div>
      </div>
    ),
  },
  "gst-invoices": {
    title: "Generating GST Invoices",
    category: "Billing & GST",
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">MobiBix handles CGST, SGST, and IGST calculations automatically based on your shop location and the customer&apos;s state.</p>
        
        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">Invoice Settings</h3>
          <p>Under Settings → Billing, select whether your prices are exclusive or inclusive of tax by default. You can still override this on individual invoices if needed.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">Processing a Payment</h3>
          <p>When a repair is finished, click &quot;Generate Invoice&quot;. You can add additional spare parts or service charges. Select the payment method (Cash, UPI, Card) and the system will generate a PDF invoice instantly.</p>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">GST Reports</h3>
          <p>At the end of the month, go to Reports → Tax. Export your B2B and B2C reports in CSV format to hand over to your accountant for easy filing.</p>
        </div>
      </div>
    ),
  },
  "whatsapp-automation": {
    title: "Setting up Automated Updates",
    category: "WhatsApp CRM",
    content: (
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">Keep your customers informed without ever picking up the phone. MobiBix automates communication at every critical stage of the repair.</p>
        
        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">Trigger Points</h3>
          <p>Automated messages are sent when:</p>
          <ul className="list-disc pl-6 space-y-2 font-bold text-muted-foreground">
            <li>A new Job Card is created (Intake Receipt)</li>
            <li>A repair is assigned to a technician</li>
            <li>A repair is completed (Ready for Delivery)</li>
            <li>An invoice is generated and paid</li>
          </ul>
        </div>

        <div className="space-y-4">
          <h3 className="text-2xl font-black uppercase tracking-tight">Official API Benefits</h3>
          <p>MobiBix uses the official WhatsApp Business API, meaning your account never gets blocked for sending bulk updates, and you can use official &quot;verified&quot; message templates.</p>
        </div>
      </div>
    ),
  },
};

const defaultArticle = {
  title: "Guide placeholder",
  category: "Knowledge Base",
  content: (
    <div className="space-y-6">
      <p className="text-lg leading-relaxed italic">This detailed guide is currently being updated by our documentation team. Please check back shortly for full step-by-step instructions.</p>
      <div className="h-64 rounded-[2rem] bg-muted/20 border border-border border-dashed flex items-center justify-center">
        <span className="text-muted-foreground font-bold uppercase tracking-widest text-xs">Content under review</span>
      </div>
    </div>
  )
};

export default function KBArticlePage() {
  const { slug } = useParams();
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const article = articles[slug as string] || defaultArticle;

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30 px-6 font-sans">
      <Header />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-4xl pt-44 pb-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-12"
        >
          <Link href="/support/kb" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary font-black uppercase tracking-widest text-[10px] mb-8 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
            Back to Help Centre
          </Link>
          <div className="text-primary font-black uppercase tracking-[0.2em] text-[10px] mb-4">
            {article.category}
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter uppercase italic leading-none">{article.title}</h1>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="prose prose-invert max-w-none font-bold text-muted-foreground/80"
        >
          {article.content}
        </motion.div>

        <div className="mt-20 pt-10 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-8">
          <div className="font-bold text-muted-foreground/60">
            {feedbackGiven ? "Thanks for your feedback!" : "Was this article helpful?"}
          </div>
          {!feedbackGiven ? (
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setFeedbackGiven(true)}
                className="px-6 py-2 rounded-xl border border-border hover:border-emerald-500/50 hover:bg-emerald-500/5 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Yes, thanks!
              </button>
              <button 
                onClick={() => setFeedbackGiven(true)}
                className="px-6 py-2 rounded-xl border border-border hover:border-red-500/50 hover:bg-red-500/5 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
              >
                Not really
              </button>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="px-6 py-2 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-black uppercase tracking-widest"
            >
              We appreciate your input!
            </motion.div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
