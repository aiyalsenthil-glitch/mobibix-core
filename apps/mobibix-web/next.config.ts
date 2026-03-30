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
            value: `
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.REMOVED_PAYMENT_INFRA.com https://checkout.REMOVED_PAYMENT_INFRA.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net;
script-src-elem 'self' 'unsafe-inline' https://cdn.REMOVED_PAYMENT_INFRA.com https://checkout.REMOVED_PAYMENT_INFRA.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net;
style-src 'self' 'unsafe-inline';
connect-src 'self' ws: wss: 
https://REMOVED_ENDPOINT 
https://REMOVED_ENDPOINT 
https://*.REMOVED_AUTH_PROVIDERapp.com 
https://*.googleapis.com 
https://*.REMOVED_AUTH_PROVIDERio.com 
http://localhost_REPLACED:3000 
http://localhost_REPLACED:3001 
http://localhost_REPLACED:3005 
https://www.google-analytics.com
https://www.facebook.com
https://*.facebook.com;
img-src 'self' data: https://*.googleusercontent.com https://www.googletagmanager.com https://grainy-gradients.vercel.app https://www.facebook.com https://*.facebook.com;
frame-src 'self' https://*.REMOVED_AUTH_PROVIDERapp.com https://*.REMOVED_PAYMENT_INFRA.com https://www.facebook.com https://*.facebook.com;
frame-ancestors 'none';
            `.replace(/\n/g, " "),
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
  silent: true,
  org: "mobibix",
  project: "mobibix-web",
});