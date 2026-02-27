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
            At MobiBix, we take your privacy seriously. This Privacy Policy explains how we collect, use,
            disclose, and safeguard your information when you visit our website or use our application.
          </p>
          
          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">1. Information We Collect</h2>
            <p>
              We may collect information about you in a variety of ways, including data you provide
              directly to us (such as account details, shop name, and contact information) and data
              collected automatically (such as usage metrics and analytics).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">2. Use of Your Information</h2>
            <p>
              Having accurate information about you permits us to provide you with a smooth, efficient,
              and customized experience. We use your data to manage your account, provide customer support,
              and improve our Retail OS.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">3. Data Security</h2>
            <p>
              We use administrative, technical, and physical security measures to help protect your
              personal information. While we have taken reasonable steps to secure the personal
              information you provide to us, please be aware that despite our efforts, no security
              measures are perfect or impenetrable.
            </p>
          </section>

          <section className="pt-8 border-t border-white/5">
            <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Contact Us</h2>
            <p>
              If you have questions or comments about this Privacy Policy, please contact us at:
              <br />
              <a href="mailto:support@REMOVED_DOMAIN" className="text-teal-500 hover:text-teal-400 font-black tracking-wide">
                support@REMOVED_DOMAIN
              </a>
            </p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}
