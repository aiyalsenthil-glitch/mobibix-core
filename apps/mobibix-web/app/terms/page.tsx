import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | MobiBix",
  description: "Terms of Service for MobiBix Mobile Shop OS.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background py-20 px-4">
      <div className="container mx-auto max-w-3xl prose prose-slate dark:prose-invert">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Terms of Service</h1>
        <p className="text-muted-foreground mb-4">Last updated: February 26, 2026</p>
        <p className="text-foreground">
          These Terms of Service constitute a legally binding agreement made between you and MobiBix,
          concerning your access to and use of the REMOVED_DOMAIN website as well as any other
          media form, media channel, mobile website or mobile application related, linked, or
          otherwise connected thereto.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">1. Agreement to Terms</h2>
        <p className="text-foreground">
          By accessing the Site, you agree that you have read, understood, and agree to be bound by
          all of these Terms of Service. If you do not agree with all of these Terms of Service,
          then you are expressly prohibited from using the Site and you must discontinue use immediately.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">2. Intellectual Property Rights</h2>
        <p className="text-foreground">
          Unless otherwise indicated, the Site and Software are our proprietary property and all
          source code, databases, functionality, software, website designs, audio, video, text,
          photographs, and graphics on the Site are owned or controlled by us or licensed to us.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">3. User Representations</h2>
        <p className="text-foreground">
          By using the Site, you represent and warrant that all registration information you submit
          will be true, accurate, current, and complete. You agree to maintain the accuracy of such
          information and promptly update such registration information as necessary.
        </p>
        <h2 className="text-2xl font-semibold mt-8 mb-4 text-foreground">Contact Us</h2>
        <p className="text-foreground">
          In order to resolve a complaint regarding the Site or to receive further information
          regarding use of the Site, please contact us at:
          <br />
          <a href="mailto:support@REMOVED_DOMAIN" className="text-teal-500 hover:text-teal-400">
            support@REMOVED_DOMAIN
          </a>
        </p>
      </div>
    </div>
  );
}
