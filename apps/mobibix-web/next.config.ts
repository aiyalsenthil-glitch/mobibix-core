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

export default nextConfig;
