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

      <div className="container mx-auto max-w-3xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter">Account & Data Deletion Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: March 01, 2026</p>
        
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-gray-400 font-medium leading-relaxed">
          <p className="text-lg text-white font-bold italic border-l-4 border-teal-500 pl-6">
            This Account and Data Deletion Policy explains your rights regarding your data and outlines the exact procedures for requesting the deletion of your account and associated personal data from the Aiyal Groups Platform.
          </p>
          
          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">1. How to Request Account Deletion</h2>
            <p className="mb-4">We provide clear, accessible methods to request the deletion of your account and all associated data. You may choose either of the following methods:</p>
            
            <h3 className="text-xl font-bold text-white mb-2 underline decoration-teal-500/30">Option A: In-App Deletion (Recommended)</h3>
            <p className="mb-4">You can initiate a permanent account deletion directly from within your MobiBix dashboard (Web or Android app). Navigate to <strong>Settings &gt; Legal &amp; Privacy</strong> and click on the <strong>Request Account Deletion</strong> button.</p>
            
            <h3 className="text-xl font-bold text-white mb-2 underline decoration-teal-500/30">Option B: Email Request Method</h3>
            <p>If you cannot access your account, you can request account deletion via email to <strong>privacy@aiyalgroups.com</strong>. Include your registered Full Name, Business Name, and Registered Phone Number.</p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">2. Deletion Timeline &amp; Process</h2>
            <p className="mb-4">Once your identity is verified and the deletion request is confirmed:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Grace Period:</strong> Your account will be immediately deactivated and logged out.</li>
              <li><strong>Deletion Window:</strong> We follow a strict **30-day deletion timeline**. Data is permanently deleted from active systems and scheduled for deletion from backups.</li>
              <li><strong>Subscription Cancellation:</strong> Account deletion permanently cancels any active subscription and cannot be reversed.</li>
              <li><strong>Token Revocation:</strong> All authentication tokens and third-party access (Meta/WhatsApp) will be immediately revoked.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">3. What Data Is Deleted</h2>
            <p className="mb-4">We permanently erase your Personal Identifiable Information (PII), Authentication Data, and non-financial Business Profile details.</p>
            <p className="p-4 bg-white/5 border border-white/10 rounded-lg text-sm italic">
              Note: Financially recorded entries (Invoices, GST logs) are retained for statutory timeframes as required by Indian law (up to 8 years).
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Contact Our Data Protection Officer</h2>
            <p>
              If you have questions regarding this policy, please contact us at:
              <br />
              <a href="mailto:privacy@aiyalgroups.com" className="text-teal-500 hover:text-teal-400 font-black tracking-wide">
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
