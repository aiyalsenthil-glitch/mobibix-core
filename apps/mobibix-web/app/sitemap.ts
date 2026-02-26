import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://REMOVED_DOMAIN",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: "https://REMOVED_DOMAIN/pricing",
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: "https://REMOVED_DOMAIN/auth",
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    ...["vyapar", "khatabook", "mybillbook"].map((c) => ({
      url: `https://REMOVED_DOMAIN/compare/${c}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...["mumbai", "delhi", "bengaluru", "chennai", "hyderabad", "pune", "kochi"].map((city) => ({
      url: `https://REMOVED_DOMAIN/locations/${city}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
