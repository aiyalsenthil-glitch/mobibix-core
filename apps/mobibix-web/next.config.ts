import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.REMOVED_PAYMENT_INFRA.com checkout.REMOVED_PAYMENT_INFRA.com apis.google.com www.gstatic.com www.googletagmanager.com connect.facebook.net; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: *.REMOVED_AUTH_PROVIDERapp.com *.googleapis.com https://*.REMOVED_AUTH_PROVIDERio.com localhost_REPLACED:3000 localhost_REPLACED:3001 localhost_REPLACED:3005 www.google-analytics.com; img-src 'self' data: https://*.googleusercontent.com www.googletagmanager.com grainy-gradients.vercel.app; frame-src 'self' https://*.REMOVED_AUTH_PROVIDERapp.com https://*.REMOVED_PAYMENT_INFRA.com; frame-ancestors 'none'",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/dashboard/sales-detail",
        destination: "/reports/sales",
        permanent: true,
      },
      {
        source: "/dashboard/products-detail",
        destination: "/reports",
        permanent: true,
      },
      {
        source: "/dashboard/inventory-detail",
        destination: "/reports/inventory",
        permanent: true,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: "mobibix",
  project: "mobibix-web",

  // In v8+, some SDK options can be passed here or are handled automatically
  // tunnelRoute: "/monitoring",
  // hideSourceMaps: true,
});
