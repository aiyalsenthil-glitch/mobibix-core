import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [390, 640, 750, 828, 1080, 1200, 1920],
  },

  turbopack: {
    root: __dirname,
  },

  async headers() {
    return [
      // Long-lived cache for static assets (Next.js fingerprints these)
      {
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Cache public images/fonts for 7 days
      {
        source: "/assets/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }],
      },
      // Cache public marketing pages at CDN edge for 60s, stale-while-revalidate 10min
      {
        source: "/(|features|pricing|partner|blog|regions/:path*|compare|support)",
        headers: [{ key: "Cache-Control", value: "public, s-maxage=60, stale-while-revalidate=600" }],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: `
default-src 'self';
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.REMOVED_PAYMENT_INFRA.com https://checkout.REMOVED_PAYMENT_INFRA.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net https://*.googlesyndication.com https://adservice.google.com;
script-src-elem 'self' 'unsafe-inline' https://cdn.REMOVED_PAYMENT_INFRA.com https://checkout.REMOVED_PAYMENT_INFRA.com https://apis.google.com https://www.gstatic.com https://www.googletagmanager.com https://connect.facebook.net https://*.googlesyndication.com https://adservice.google.com https://tpc.googlesyndication.com;
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
https://*.facebook.com
https://*.REMOVED_PAYMENT_INFRA.com
https://lumberjack.REMOVED_PAYMENT_INFRA.com
https://googleads.g.doubleclick.net
https://stats.g.doubleclick.net
https://*.adtrafficquality.google;
img-src 'self' data: https://*.googleusercontent.com https://www.googletagmanager.com https://grainy-gradients.vercel.app https://www.facebook.com https://*.facebook.com https://*.googlesyndication.com https://ad.doubleclick.net https://googleads.g.doubleclick.net;
frame-src 'self' https://*.REMOVED_AUTH_PROVIDERapp.com https://*.REMOVED_PAYMENT_INFRA.com https://www.facebook.com https://*.facebook.com https://googleads.g.doubleclick.net https://*.doubleclick.net https://tpc.googlesyndication.com;
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