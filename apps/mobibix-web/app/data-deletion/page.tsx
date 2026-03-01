import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Data Deletion Policy | MobiBix",
  description: "Account and data deletion policy for MobiBix Platform.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-4xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter text-foreground">Account & Data Deletion Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 1, 2026</p>
        
        <div className="max-w-none space-y-12 text-muted-foreground font-medium leading-relaxed">
          <p className="text-lg text-foreground font-bold italic border-l-4 border-teal-500 pl-6 bg-teal-500/5 py-4 rounded-r-xl">
            This Account and Data Deletion Policy explains your rights regarding your data and outlines the exact procedures for requesting the deletion of your account and associated personal data from the Aiyal Groups Platform.
          </p>
          
          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">1. How to Request Account Deletion</h2>
            <p>We provide clear, accessible methods to request the deletion of your account and all associated data. You may choose either of the following methods:</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div className="p-6 rounded-2xl border border-border bg-muted/50">
                <h3 className="text-xl font-bold text-foreground mb-2">Option A: In-App Deletion</h3>
                <p className="text-sm">Initiate a permanent account deletion directly from within your dashboard. Navigate to <strong>Settings &gt; Legal &amp; Privacy</strong> and click on the <strong>Request Account Deletion</strong> button.</p>
              </div>
              <div className="p-6 rounded-2xl border border-border bg-muted/50">
                <h3 className="text-xl font-bold text-foreground mb-2">Option B: Email Request</h3>
                <p className="text-sm">Request account deletion via email to <a href="mailto:privacy@aiyalgroups.com" className="text-teal-500 font-bold hover:underline">privacy@aiyalgroups.com</a>. Include your registered Full Name, Business Name, and Phone Number.</p>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">2. Deletion Timeline &amp; Process</h2>
            <ul className="list-disc pl-6 space-y-3 marker:text-teal-500">
              <li><strong>Grace Period:</strong> Your account will be immediately deactivated and logged out across all devices.</li>
              <li><strong>Deletion Window:</strong> We follow a strict **30-day deletion timeline**. Data is permanently deleted from active systems and scheduled for deletion from backups.</li>
              <li><strong>Subscription Cancellation:</strong> Account deletion permanently cancels any active subscription and cannot be reversed.</li>
              <li><strong>Token Revocation:</strong> All authentication tokens and third-party access (Meta/WhatsApp) will be immediately revoked at the start of the window.</li>
            </ul>
          </section>

          <section className="space-y-4">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">3. What Data Is Deleted</h2>
            <p>We permanently erase your Personal Identifiable Information (PII), Authentication Data, and non-financial Business Profile details.</p>
            <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-sm">
              <p className="font-bold flex items-center gap-2">
                 Note on Financial Records
              </p>
              <p className="mt-1">In strict adherence to Indian law (GST regulations), financially recorded entries (Invoices, GST logs) are retained for statutory timeframes (up to 8 years).</p>
            </div>
          </section>

          <section className="space-y-4 pt-12 border-t border-border">
            <h2 className="text-3xl font-black text-foreground uppercase tracking-tight">Contact Information</h2>
            <p>
              If you have questions regarding this policy, please contact our Data Protection Officer at:
              <br />
              <a href="mailto:privacy@aiyalgroups.com" className="text-teal-500 font-black hover:underline tracking-wide uppercase text-sm">
                privacy@aiyalgroups.com
              </a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
