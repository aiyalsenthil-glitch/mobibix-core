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
            value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.REMOVED_PAYMENT_INFRA.com apis.google.com www.gstatic.com; connect-src 'self' *.REMOVED_AUTH_PROVIDERapp.com *.googleapis.com https://*.REMOVED_AUTH_PROVIDERio.com; img-src 'self' data: https://*.googleusercontent.com; frame-src 'self' https://*.REMOVED_AUTH_PROVIDERapp.com https://*.REMOVED_PAYMENT_INFRA.com; frame-ancestors 'none'",
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
};

export default nextConfig;
