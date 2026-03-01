import type { Metadata } from "next";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | MobiBix",
  description: "Privacy policy for MobiBix Mobile Shop OS.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-500">
      <Header />

      <div className="container mx-auto max-w-3xl pt-40 pb-20 px-6">
        <h1 className="text-5xl font-black mb-4 tracking-tighter">Privacy Policy</h1>
        <p className="text-teal-500 font-bold uppercase tracking-[0.2em] text-xs mb-12">Last updated: February 26, 2026</p>
        
        <div className="prose prose-invert prose-slate max-w-none space-y-8 text-gray-400 font-medium leading-relaxed">
          <p className="text-lg text-white font-bold">
            Aiyal Groups Platform ("we," "us," or "our") respects your privacy. This Privacy Policy details how we collect, use, process, and protect your personal and business data when you use MobiBix.
          </p>
          
          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">1. Information We Collect</h2>
            <p>
              We collect Account Information (name, email, phone), Business Information (GST, address), and Operational Data (customer details entered by you). We also collect device and usage metrics automatically to improve our services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">2. Data Storage &amp; Localization</h2>
            <p>
              Data may be processed and stored on secure cloud infrastructure located in India or other jurisdictions that maintain adequate data protection safeguards. We implement industry-standard security measures, including HTTPS/TLS encryption and secure Firebase authentication.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">3. Your Rights &amp; DPDP Compliance</h2>
            <p>
              In compliance with the Digital Personal Data Protection Act, 2023, you have the right to access, correct, and delete your data. You may withdraw marketing consent at any time through your settings or the unsubscribe link in our emails.
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Grievance Officer</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact our Grievance Officer at:
              <br />
              <a href="mailto:legal@aiyalgroups.com" className="text-teal-500 hover:text-teal-400 font-black tracking-wide">
                legal@aiyalgroups.com
              </a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
