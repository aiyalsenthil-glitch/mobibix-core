import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/", "/onboarding/", "/select-tenant/"],
      },
    ],
    sitemap: "https://REMOVED_DOMAIN/sitemap.xml",
  };
}
