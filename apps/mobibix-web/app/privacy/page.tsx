import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | MobiBix",
  description: "Privacy policy for MobiBix Mobile Shop OS.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-3xl prose prose-slate dark:prose-invert">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Privacy Policy</h1>
        <p className="text-muted-foreground mb-4">Last updated: February 26, 2026</p>
        <p className="text-foreground">
          At MobiBix, we take your privacy seriously. This Privacy Policy explains how we collect, use,
          disclose, and safeguard your information when you visit our website or use our application.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">1. Information We Collect</h2>
        <p className="text-foreground">
          We may collect information about you in a variety of ways, including data you provide
          directly to us (such as account details, shop name, and contact information) and data
          collected automatically (such as usage metrics and analytics).
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">2. Use of Your Information</h2>
        <p className="text-foreground">
          Having accurate information about you permits us to provide you with a smooth, efficient,
          and customized experience. We use your data to manage your account, provide customer support,
          and improve our Retail OS.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">3. Data Security</h2>
        <p className="text-foreground">
          We use administrative, technical, and physical security measures to help protect your
          personal information. While we have taken reasonable steps to secure the personal
          information you provide to us, please be aware that despite our efforts, no security
          measures are perfect or impenetrable.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">Contact Us</h2>
        <p className="text-foreground">
          If you have questions or comments about this Privacy Policy, please contact us at:
          <br />
          <a href="mailto:support@REMOVED_DOMAIN" className="text-teal-500 hover:text-teal-400">
            support@REMOVED_DOMAIN
          </a>
        </p>
      </div>
    </div>
  );
}
