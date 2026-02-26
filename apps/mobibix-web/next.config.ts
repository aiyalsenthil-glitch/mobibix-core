import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
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


