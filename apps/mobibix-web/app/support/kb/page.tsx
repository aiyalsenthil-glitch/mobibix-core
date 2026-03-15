"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "../../../components/layout/Header";
import { Footer } from "../../../components/layout/Footer";
import { motion } from "framer-motion";

const categories = [
  {
    title: "Getting Started",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    articles: [
      { title: "Quick Setup Guide", slug: "quick-setup" },
      { title: "Optimising your Dashboard", slug: "dashboard-optimisation" },
      { title: "User Profile & Settings", slug: "profile-settings" },
    ],
  },
  {
    title: "Inventory & Spare Parts",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    articles: [
      { title: "Adding Repair Parts", slug: "adding-parts" },
      { title: "Tracking Serialised Stock", slug: "serialised-stock" },
      { title: "Low Stock Notifications", slug: "low-stock-alerts" },
    ],
  },
  {
    title: "Repair Workflow",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    articles: [
      { title: "Creating Job Cards", slug: "creating-job-cards" },
      { title: "Assigning Technicians", slug: "assigning-technicians" },
      { title: "Repair Pipeline Management", slug: "repair-pipeline" },
    ],
  },
  {
    title: "Billing & GST",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    articles: [
      { title: "Generating GST Invoices", slug: "gst-invoices" },
      { title: "Credit & Debit Notes", slug: "credit-debit-notes" },
      { title: "Tax Filing Reports", slug: "tax-reports" },
    ],
  },
  {
    title: "WhatsApp CRM",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    articles: [
      { title: "Automated Updates", slug: "whatsapp-automation" },
      { title: "Broadcasting Campaigns", slug: "whatsapp-broadcasts" },
      { title: "Customer Link Tracking", slug: "customer-links" },
    ],
  },
  {
    title: "Staff & Security",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    articles: [
      { title: "Role-Based Access Control", slug: "rbac" },
      { title: "Audit Logs", slug: "audit-logs" },
      { title: "Two-Factor Authentication", slug: "2fa" },
    ],
  },
];

export default function KnowledgeBasePage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = categories.filter(cat => 
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.articles.some(art => art.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500 selection:bg-primary/30 px-6">
      <Header />

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/5 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto max-w-6xl pt-44 pb-32 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm">
            Self-Service Learning Hub
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter uppercase leading-none italic">Help Centre</h1>
          <div className="max-w-xl mx-auto relative group">
            <input 
              type="text" 
              placeholder="Search guides, tutorials & articles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-card/40 backdrop-blur-xl border border-border group-hover:border-primary/50 focus:border-primary focus:ring-4 focus:ring-primary/10 rounded-2xl py-5 px-6 pl-14 font-bold transition-all outline-none"
            />
            <svg className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredCategories.map((cat, idx) => (
            <motion.div
              key={cat.title}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="p-8 rounded-[2.5rem] border border-border bg-card/30 backdrop-blur-3xl hover:border-primary/30 hover:bg-card/50 transition-all duration-500 group"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6 border border-primary/20 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500">
                {cat.icon}
              </div>
              <h3 className="text-xl font-black mb-6 uppercase tracking-tight">{cat.title}</h3>
              <div className="space-y-4">
                {cat.articles.map(art => (
                  <Link 
                    key={art.slug} 
                    href={`/support/kb/${art.slug}`}
                    className="flex items-center gap-3 text-muted-foreground hover:text-primary font-bold transition-colors group/link"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/30 group-hover/link:bg-primary transition-colors" />
                    {art.title}
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-20">
            <h4 className="text-2xl font-black text-muted-foreground uppercase tracking-tight">No guides found for &quot;{searchQuery}&quot;</h4>
            <p className="mt-4 font-bold text-muted-foreground/60">Try searching for different keywords or browse our categories above.</p>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
